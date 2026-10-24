import { createHash } from "node:crypto";
import {
  contractRuleSchema,
  clientContractSchema,
} from "../../src/branding/contracts.mjs";

const invalid = (message) => Object.assign(new Error(message), { status: 400 });
const levels = { default: 0, general: 1, branding: 2, client: 3 };
const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const canonicalJson = (value) => JSON.stringify(canonical(value));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
const digest = (value) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");

export function compileClientContract({ clientId, brandingSnapshot, rules }) {
  if (brandingSnapshot.clientId !== clientId)
    throw invalid("Kontrakt należy do innego klienta");
  const groups = new Map();
  for (const input of rules) {
    const r = contractRuleSchema.parse(input);
    if (r.source.level === "client" && r.source.clientId !== clientId)
      throw invalid("Reguła należy do innego klienta");
    const key = `${r.scope}:${r.id}`;
    const rank = [levels[r.source.level], r.source.date, r.source.order];
    const previous = groups.get(key);
    const compare = previous
      ? rank.reduce(
          (cmp, part, i) =>
            cmp ||
            (part > previous.rank[i] ? 1 : part < previous.rank[i] ? -1 : 0),
          0,
        )
      : 1;
    if (compare > 0) groups.set(key, { rank, candidates: [r] });
    else if (compare === 0) previous.candidates.push(r);
  }
  const selected = [...groups.entries()]
    .sort(([a], [b]) => compareText(a, b))
    .map(([key, { candidates }]) => {
      const meaning = (r) => canonicalJson([r.value, r.checkKind, r.severity]);
      if (new Set(candidates.map(meaning)).size > 1)
        throw invalid(`Nierozstrzygnięty konflikt reguły: ${key}`);
      return candidates.sort((a, b) =>
        compareText(canonicalJson(a), canonicalJson(b)),
      )[0];
    });
  const body = {
    version: 1,
    clientId,
    brandingRevision: brandingSnapshot.revision,
    styleId: brandingSnapshot.styleId ?? "brand",
    coverage: "partial",
    rules: selected,
  };
  return clientContractSchema.parse({ ...body, hash: digest(body) });
}

export function verifyClientContract(contract, profile) {
  const parsed = clientContractSchema.parse(contract);
  const { hash, ...body } = parsed;
  if (
    hash !== digest(body) ||
    parsed.clientId !== profile.clientId ||
    parsed.brandingRevision !== profile.revision ||
    parsed.styleId !== (profile.styleId ?? "brand")
  )
    throw invalid("Zmieniono lub błędnie przypięto kontrakt klienta");
  return parsed;
}

export function assertContractMigration({
  before,
  after,
  retainedMaster,
  retainedTranscript,
}) {
  const keepsSilence = (c) =>
    c?.rules.some(
      (r) => r.scope === "audio" && r.id === "keep-silence" && r.value === true,
    );
  const restoreSpeech = !!keepsSilence(after) && !keepsSilence(before);
  if (restoreSpeech && !retainedMaster)
    throw invalid("Zmiana kontraktu wymaga zachowanego mastera");
  if (restoreSpeech && !retainedTranscript)
    throw invalid("Zmiana kontraktu wymaga zachowanej transkrypcji");
  return { restoreSpeech };
}
