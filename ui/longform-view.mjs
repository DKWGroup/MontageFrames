// Logika ekranu „Cięcia” (LongForm) bez Reacta — testowana w node (ui/longform-view.test.mjs).
const r1 = (n) => Math.round(n * 10) / 10;

export function parseLfHash(hash) {
  const m = /^#lf(?:\/([a-z0-9-]+))?(?:\/([a-z]+))?$/.exec(hash);
  return m ? { id: m[1] ?? null, step: m[2] ?? null } : null;
}

export function cutStats(doc) {
  const cut = doc.cuts.filter((c) => c.decision === "cut");
  const removed = r1(cut.reduce((n, c) => n + c.end - c.start, 0));
  return {
    removed,
    total: r1(doc.sourceDuration),
    pct: Math.round((removed / doc.sourceDuration) * 100),
    count: cut.length,
    undecided: doc.cuts.filter((c) => c.decision === "undecided").length,
  };
}

// Słowa w kolejności + cięcia bez słów (cisza, dźwięk bez słowa) jako osobne elementy na swoim miejscu.
export function transcriptItems(words, doc) {
  const byWord = new Map();
  for (const c of doc.cuts)
    for (const id of c.wordIds) if (!byWord.has(id) || c.decision === "cut") byWord.set(id, c);
  const muted = new Set(doc.mutes.map((m) => m.wordId));
  const items = words.map((word) => ({ type: "word", at: word.start, word, cut: byWord.get(word.id) ?? null, mute: muted.has(word.id) }));
  for (const c of doc.cuts) if (!c.wordIds.length) items.push({ type: "gap", at: c.start, cut: c });
  return items.sort((a, b) => a.at - b.at || (a.type === "gap" ? 1 : -1));
}

const edit = (doc, fn) => ({ ...doc, cuts: doc.cuts.map((c) => fn(c) ?? c) });

export const toggleCut = (doc, id) =>
  edit(doc, (c) => (c.id === id ? { ...c, decision: c.decision === "cut" ? "keep" : "cut", auto: false } : null));

export const restoreKind = (doc, kind) =>
  edit(doc, (c) => (c.kind === kind && c.decision !== "keep" ? { ...c, decision: "keep", auto: false } : null));

export function userCut(doc, words, ids) {
  const sel = words.filter((w) => ids.includes(w.id));
  if (!sel.length) return doc;
  const start = sel[0].start;
  const cut = {
    id: `user-${start.toFixed(3)}`,
    start,
    end: sel.at(-1).end,
    wordIds: sel.map((w) => w.id),
    kind: "manual",
    reason: "własne cięcie",
    confidence: 1,
    auto: false,
    decision: "cut",
  };
  return { ...doc, cuts: [...doc.cuts.filter((c) => c.id !== cut.id), cut].sort((a, b) => a.start - b.start) };
}

export const removeMute = (doc, wordId) => ({ ...doc, mutes: doc.mutes.filter((m) => m.wordId !== wordId) });

export const confidenceLabel = (c) =>
  c.decision === "undecided" || c.confidence < 0.7 ? "do decyzji" : c.confidence >= 0.9 ? "pewne" : "prawdopodobne";

export const KIND_LABEL = {
  silence: "Cisza",
  filler: "Wtrącenie",
  "false-start": "Falstart",
  retake: "Dubel",
  repetition: "Powtórzenie",
  offtopic: "Do realizatora",
  manual: "Własne",
};

const STAGE_LABEL = { edit: "Redakcja", censor: "Cenzura", chapters: "Rozdziały i hook", plan: "Plan efektów", research: "Research" };
const PROVIDER_LABEL = { claude: "Claude Code · konto", codex: "Codex · konto", openai: "OpenAI API" };

// Zużycie AI projektu: rzeczywiste tokeny/koszt albo jawne „brak danych” (PREFERENCJE: brak danych ≠ zero).
export const usageSummary = (usage = []) =>
  usage.map((u) => {
    const known = u.inputTokens != null && u.outputTokens != null;
    const account = u.billingKind === "subscription";
    return {
      label: `${PROVIDER_LABEL[u.provider] ?? u.provider} (${u.model})`,
      stage: STAGE_LABEL[u.stage] ?? u.stage ?? "",
      tokens: known ? `${u.inputTokens} wej. / ${u.outputTokens} wyj.` : "brak danych",
      cost: account
        ? known
          ? "w ramach konta"
          : "w ramach konta (brak danych o zużyciu)"
        : `${(u.costMicroUsd / 1e6).toFixed(4).replace(".", ",")} USD (rzeczywisty)`,
    };
  });

const ORDER = ["material", "ciecia", "plan", "montaz", "wynik"];
// Kroki steppera: bieżący wynika ze stanu projektu; zablokowane mają powód (gui.md: „Najpierw zatwierdź cięcia”).
export function steps(p) {
  const s = p.state;
  const current =
    s === "done" ? "wynik" : s === "montage" ? "montaz" : ["cuts-approved", "planning", "plan-review"].includes(s) || (s === "failed" && p.failedFrom && p.failedFrom !== "processing") ? "plan" : "ciecia";
  const reach = Math.max(ORDER.indexOf(current), p.renders?.length ? 4 : 0);
  return {
    current,
    open: ORDER.slice(0, reach + 1),
    why: { plan: "Najpierw zatwierdź cięcia", montaz: "Najpierw zaakceptuj plan", wynik: "Po montażu i renderze" },
  };
}

export const EFFECT_TRACK = {
  "kinetic-captions": "Napisy",
  typography: "Grafiki",
  "chapter-card": "Grafiki",
  numbers: "Grafiki",
  "chart-grow": "Grafiki",
  compare: "Grafiki",
  list: "Grafiki",
  logo: "Grafiki",
  broll: "Przebitki",
  "face-track": "Kadr i zoom",
  "digital-zoom": "Kadr i zoom",
  "transition-cut": "Przejścia",
  "zoom-through-cut": "Przejścia",
};
