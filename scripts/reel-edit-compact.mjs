import { z } from "zod";

const ref = z.string().regex(/^w(?:0|[1-9]\d*)$/);
export const compactEditSchema = z
  .object({
    version: z.literal(2),
    summary: z.string().min(1),
    wordEdits: z.array(
      z
        .object({
          wordId: ref,
          text: z.string().trim().min(1).max(500),
        })
        .strict(),
    ),
    groups: z
      .array(
        z
          .object({
            wordIds: z.array(ref).min(1),
            keyWordId: ref.nullable(),
          })
          .strict(),
      )
      .min(1)
      .nullable(),
  })
  .strict();

const error = (message) => Object.assign(new Error(message), { status: 400 });
const wordsOf = (data) => data.captions.flatMap((g) => g.words);
const indexOf = (id, prefix, length) => {
  const index = Number(id.slice(prefix.length));
  if (!Number.isSafeInteger(index) || index < 0 || index >= length)
    throw error("Nieznana referencja słowa lub grafiki w tej rewizji.");
  return index;
};

export function compactEditContext(data) {
  let cursor = 0;
  return {
    client: data.client ?? null,
    style: data.style,
    emojiEnabled:
      data.branding?.captions?.emojiEnabled ?? data.style === "happynews",
    words: wordsOf(data).map((w, i) => ({ id: `w${i}`, text: w.text })),
    groups: data.captions.map((g) => {
      const start = cursor;
      cursor += g.words.length;
      return {
        wordIds: g.words.map((_, i) => `w${start + i}`),
        keyWordId:
          g.key >= 0 && g.key < g.words.length ? `w${start + g.key}` : null,
      };
    }),
  };
}

export function applyCompactEdit(before, value) {
  const r = compactEditSchema.parse(value);
  const original = wordsOf(before),
    words = original.map((w) => ({ ...w }));
  const edited = new Set();
  for (const edit of r.wordEdits) {
    const i = indexOf(edit.wordId, "w", words.length);
    if (edited.has(i)) throw error("Powtórzona referencja słowa w poprawce.");
    edited.add(i);
    words[i].text = edit.text;
  }
  let cursor = 0;
  let captions = before.captions.map((g) => ({
    ...g,
    words: g.words.map(() => words[cursor++]),
  }));
  if (r.groups) {
    const all = r.groups.flatMap((g) => g.wordIds);
    if (all.length !== words.length || all.some((id, i) => id !== `w${i}`))
      throw error(
        "Grupowanie musi zachować wszystkie słowa i kolejność napisów.",
      );
    captions = r.groups.map((g) => {
      const groupWords = g.wordIds.map(
        (id) => words[indexOf(id, "w", words.length)],
      );
      const old = captions.find((c) => c.words.includes(groupWords[0]));
      const key = g.keyWordId === null ? -1 : g.wordIds.indexOf(g.keyWordId);
      if (g.keyWordId !== null && key < 0)
        throw error("Słowo-klucz nie należy do wskazanej grupy słów.");
      const next = { ...old, words: groupWords, key };
      if (old?.hl)
        next.hl = old.hl
          .map((i) => groupWords.indexOf(old.words[i]))
          .filter((i) => i >= 0);
      if (old?.words.at(-1) !== groupWords.at(-1)) delete next.end;
      return next;
    });
  }
  return { summary: r.summary, data: { ...before, captions } };
}
