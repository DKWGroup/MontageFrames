import { z } from "zod";
import { createHash } from "node:crypto";
import { canonicalJson } from "./contracts.mjs";
import { validateReelEdit } from "../reel-validation.mjs";
import { applyCompactEdit } from "../reel-edit-compact.mjs";
import { planRecompute } from "./dependencies.mjs";
const ref = z.string().min(1).max(200),
  text = z.string().trim().min(1).max(500);
const textOperations = [
  z.object({ type: z.literal("replaceWordText"), wordId: ref, text }).strict(),
  z
    .object({
      type: z.literal("regroupCaptions"),
      groups: z
        .array(
          z
            .object({ wordIds: z.array(ref).min(1), keyWordId: ref.nullable() })
            .strict(),
        )
        .min(1),
    })
    .strict(),
  z.object({ type: z.literal("setHookText"), overlayId: ref, text }).strict(),
];
const operation = z.union([
  ...textOperations,
  z
    .object({
      type: z.literal("selectWordRange"),
      firstWordId: ref,
      lastWordId: ref,
    })
    .strict(),
  z
    .object({
      type: z.literal("selectAsset"),
      assetId: ref,
      firstWordId: ref,
      lastWordId: ref,
    })
    .strict(),
]);
export const editOperationsSchema = z
  .object({
    version: z.literal(3),
    baseRevision: z.union([z.number().int().nonnegative(), z.string().min(1)]),
    summary: z.string().min(1),
    operations: z.array(operation).max(100),
  })
  .strict();
export const textHookOperationsSchema = editOperationsSchema.extend({
  operations: z.array(z.union(textOperations)).max(100),
});
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const wordsOf = (d) => d.captions.flatMap((g) => g.words);
export function editOperationContext(
  data,
  revision,
  { sourceIdentity = "draft-local" } = {},
) {
  const namespace = createHash("sha256")
    .update(canonicalJson([sourceIdentity, revision, data]))
    .digest("hex")
    .slice(0, 24);
  let n = 0;
  return {
    baseRevision: revision,
    namespace,
    words: wordsOf(data).map((w, i) => ({
      id: `${namespace}:w${i}`,
      text: w.text,
      sourceWordId: w.id ?? null,
    })),
    groups: data.captions.map((g) => {
      const start = n;
      n += g.words.length;
      return {
        wordIds: g.words.map((_, i) => `${namespace}:w${start + i}`),
        keyWordId: g.key >= 0 ? `${namespace}:w${start + g.key}` : null,
      };
    }),
    hooks: (data.overlays ?? [])
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.type === "title" && o.start <= 0.1)
      .map(({ o, i }) => ({ id: `${namespace}:o${i}`, text: o.text })),
  };
}
const protectedWords = new Set([
  "nie",
  "nigdy",
  "bez",
  "jeśli",
  "jeżeli",
  "chyba",
  "oprócz",
  "tylko",
  "żaden",
  "żadna",
]);
const normalized = (text) =>
  text.toLocaleLowerCase("pl").replace(/[^\p{L}\p{N}]/gu, "");
const protectedWord = (w) =>
  protectedWords.has(normalized(w.text)) || /\d/.test(w.text);
export function applyEditOperations({
  before,
  baseRevision,
  currentRevision,
  operations,
  contract: _contract,
  sourceIdentity,
  availableAssets = [],
}) {
  if (currentRevision === undefined || baseRevision !== currentRevision)
    throw fail("Rolka zmieniła rewizję; zachowano szkic", 409);
  const context = editOperationContext(before, baseRevision, {
    sourceIdentity,
  });
  const original = wordsOf(before),
    index = new Map(context.words.map((w, i) => [w.id, i]));
  const wordIndex = (id) => {
    if (!index.has(id)) throw fail("Nieznana referencja w tej rewizji");
    return index.get(id);
  };
  let data = globalThis.structuredClone(before);
  const seen = new Set();
  for (const op of z.array(operation).max(100).parse(operations)) {
    const key =
      op.type + ":" + (op.wordId ?? op.overlayId ?? op.assetId ?? "single");
    if (seen.has(key)) throw fail("Powtórzona operacja na tym samym elemencie");
    seen.add(key);
    if (op.type === "replaceWordText") {
      const i = wordIndex(op.wordId);
      if (
        protectedWord(original[i]) &&
        (/\d/.test(original[i].text)
          ? original[i].text.trim() !== op.text.trim()
          : normalized(original[i].text) !== normalized(op.text))
      )
        throw fail(
          "Zmiana przeczenia, warunku lub liczby wymaga ręcznej kontroli",
        );
      wordsOf(data)[i].text = op.text;
    } else if (op.type === "regroupCaptions") {
      data = applyCompactEdit(data, {
        version: 2,
        summary: "Grupowanie",
        wordEdits: [],
        groups: op.groups.map((g) => ({
          wordIds: g.wordIds.map((id) => `w${wordIndex(id)}`),
          keyWordId: g.keyWordId === null ? null : `w${wordIndex(g.keyWordId)}`,
        })),
      }).data;
    } else if (op.type === "setHookText") {
      const hook = context.hooks.find((h) => h.id === op.overlayId);
      if (!hook) throw fail("Nieznana referencja hooka");
      const o = data.overlays?.[Number(op.overlayId.split(":o")[1])];
      if (!o || o.type !== "title" || o.start > 0.1)
        throw fail("Nieznana referencja hooka");
      o.text = op.text;
      if (o.hl && !op.text.includes(o.hl)) delete o.hl;
    } else {
      const a = wordIndex(op.firstWordId),
        b = wordIndex(op.lastWordId);
      if (a > b) throw fail("Odwrócona kolejność słów");
      if (op.type === "selectWordRange") {
        if (data.client === "skyclass" || data.style === "skyclass")
          throw fail("SkyClass zachowuje pełną wypowiedź");
        if (original.some((w, i) => (i < a || i > b) && protectedWord(w)))
          throw fail(
            "Cięcie może usunąć przeczenie, warunek lub liczbę; wymaga kontroli",
          );
        data.segments = data.segments
          .map((s) => ({
            ...s,
            start: Math.max(s.start, original[a].start),
            end: Math.min(s.end, original[b].end),
          }))
          .filter((s) => s.end > s.start);
      } else {
        const asset = availableAssets.find((x) => x.id === op.assetId);
        if (
          !asset ||
          typeof asset.src !== "string" ||
          asset.src.startsWith("/") ||
          asset.src.includes("..") ||
          asset.src.includes("\\") ||
          [...asset.src].some((c) => c.charCodeAt(0) < 32) ||
          /^[a-z]+:/i.test(asset.src)
        )
          throw fail("Nieznany lub niedozwolony zasób");
        data.overlays = [
          ...(data.overlays ?? []),
          {
            type: "media",
            fit: "card",
            src: asset.src,
            start: original[a].start,
            end: original[b].end,
          },
        ];
      }
    }
  }
  validateReelEdit(before, data);
  return { data, invalidatedStages: planRecompute(before, data) };
}
