import assert from "node:assert/strict";
import { test } from "node:test";
import { confidenceLabel, cutStats, parseLfHash, removeMute, restoreKind, toggleCut, transcriptItems, userCut } from "./longform-view.mjs";

const W = (i, text) => ({ id: `w${i}`, text, start: i, end: i + 0.8 });
const words = ["To", "yyy", "jest", "dobra", "jeszcze", "raz", "kurwa"].map((t, i) => W(i, t));
const cut = (id, start, end, extra = {}) => ({ id, start, end, wordIds: [], kind: "filler", reason: "", confidence: 0.95, auto: true, decision: "cut", ...extra });
const doc = {
  version: 1,
  sourceDuration: 10,
  cuts: [
    cut("f", 1, 1.8, { wordIds: ["w1"] }),
    cut("s", 7.9, 9.5, { kind: "silence" }),
    cut("o", 3, 5.8, { wordIds: ["w3", "w4", "w5"], kind: "offtopic", decision: "undecided", auto: false, confidence: 0.6 }),
  ],
  mutes: [{ wordId: "w6", start: 6.16, end: 6.83, ramp: 0.005, sfx: "kruk" }],
};

test("adres #lf: lista, projekt, krok", () => {
  assert.deepEqual(parseLfHash("#lf"), { id: null, step: null });
  assert.deepEqual(parseLfHash("#lf/wywiad"), { id: "wywiad", step: null });
  assert.deepEqual(parseLfHash("#lf/wywiad/ciecia"), { id: "wywiad", step: "ciecia" });
  assert.equal(parseLfHash("#qc"), null);
});

test("statystyki: wycięty czas, procent, liczba cięć i decyzji", () => {
  assert.deepEqual(cutStats(doc), { removed: 2.4, total: 10, pct: 24, count: 2, undecided: 1 });
});

test("transkrypt: słowa z cięciem, cisza jako osobny element na swoim miejscu, cenzura", () => {
  const items = transcriptItems(words, doc);
  assert.deepEqual(items.map((x) => (x.type === "gap" ? `[${x.cut.id}]` : `${x.word.text}${x.cut ? `:${x.cut.id}` : ""}${x.mute ? "!" : ""}`)), [
    "To", "yyy:f", "jest", "dobra:o", "jeszcze:o", "raz:o", "kurwa!", "[s]",
  ]);
});

test("przełącznik cięcia i przywracanie typu to ręczne decyzje", () => {
  const off = toggleCut(doc, "f");
  assert.deepEqual([off.cuts[0].decision, off.cuts[0].auto], ["keep", false]);
  assert.equal(toggleCut(off, "f").cuts[0].decision, "cut");
  assert.equal(toggleCut(doc, "o").cuts[2].decision, "cut");
  assert.equal(restoreKind(doc, "silence").cuts[1].decision, "keep");
  assert.equal(doc.cuts[0].decision, "cut"); // bez mutacji
});

test("własne cięcie z zaznaczenia i wyłączenie cenzury", () => {
  const d = userCut(doc, words, ["w2"]);
  const c = d.cuts.find((x) => x.kind === "manual");
  assert.deepEqual([c.id, c.start, c.end, c.decision, c.auto], ["user-2.000", 2, 2.8, "cut", false]);
  assert.equal(removeMute(doc, "w6").mutes.length, 0);
});

test("pewność słownie", () => {
  assert.equal(confidenceLabel(doc.cuts[0]), "pewne");
  assert.equal(confidenceLabel({ ...doc.cuts[0], confidence: 0.8 }), "prawdopodobne");
  assert.equal(confidenceLabel(doc.cuts[2]), "do decyzji");
});

import { usageSummary } from "./longform-view.mjs";
test("zużycie konta: tokeny albo „brak danych”, nigdy fikcyjne zero", () => {
  const rows = usageSummary([
    { provider: "claude", model: "opus", inputTokens: null, outputTokens: null, costMicroUsd: 0, billingKind: "subscription", stage: "edit" },
    { provider: "codex", model: "konto ChatGPT", inputTokens: 900, outputTokens: 120, costMicroUsd: 0, billingKind: "subscription", stage: "edit" },
    { provider: "openai", model: "gpt-6-luna", inputTokens: 987, outputTokens: 214, costMicroUsd: 205.7, stage: "edit" },
  ]);
  assert.deepEqual(rows, [
    { label: "Claude Code · konto (opus)", stage: "Redakcja", tokens: "brak danych", cost: "w ramach konta (brak danych o zużyciu)" },
    { label: "Codex · konto (konto ChatGPT)", stage: "Redakcja", tokens: "900 wej. / 120 wyj.", cost: "w ramach konta" },
    { label: "OpenAI API (gpt-6-luna)", stage: "Redakcja", tokens: "987 wej. / 214 wyj.", cost: "0,0002 USD (rzeczywisty)" },
  ]);
});

import { EFFECT_TRACK, steps } from "./longform-view.mjs";
test("kroki: bieżący i dostępne z powodem blokady", () => {
  const s = (state, extra = {}) => steps({ state, ...extra });
  assert.equal(s("awaiting-cut-review").current, "ciecia");
  assert.match(s("awaiting-cut-review").why.plan, /zatwierdź cięcia/i);
  assert.equal(s("cuts-approved").current, "plan");
  assert.equal(s("planning").current, "plan");
  assert.equal(s("montage").current, "montaz");
  assert.equal(s("done").current, "wynik");
  assert.equal(s("failed", { failedFrom: "processing" }).current, "ciecia");
  assert.equal(s("failed", { failedFrom: "cuts-approved" }).current, "plan");
  assert.deepEqual(s("done").open, ["material", "ciecia", "plan", "montaz", "wynik"]);
  assert.ok(!s("plan-review").open.includes("wynik"));
  assert.ok(s("plan-review", { renders: [{}] }).open.includes("wynik"));
});
test("tory efektów jak w gui.md §3", () => {
  assert.equal(EFFECT_TRACK.broll, "Przebitki");
  assert.equal(EFFECT_TRACK["digital-zoom"], "Kadr i zoom");
  assert.equal(EFFECT_TRACK["zoom-through-cut"], "Przejścia");
});
