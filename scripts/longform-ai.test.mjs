import assert from "node:assert/strict";
import { test } from "node:test";
import { cutsFromAI, editRoughCut, EDIT_SCHEMA, wordBlocks } from "./longform-ai.mjs";

const W = (i, text) => ({ id: `w${i}`, text, start: i, end: i + 0.8 });
const words = ["Bo", "w", "tym", "roku", "w", "tamtym", "roku", "nie", "było", "dobra", "jeszcze", "raz", "Było", "super."].map((t, i) => W(i, t));

test("bloki: maks. rozmiar z zakładką", () => {
  const blocks = wordBlocks(Array.from({ length: 3500 }, (_, i) => W(i, "a")), 1500, 100);
  assert.deepEqual(blocks.map((b) => [b[0].id, b.at(-1).id]), [["w0", "w1499"], ["w1400", "w2899"], ["w2800", "w3499"]]);
});

test("schemat: model zwraca tylko wordIds, bez czasów", () => {
  const item = EDIT_SCHEMA.properties.cuts.items;
  assert.ok(item.properties.wordIds);
  assert.equal(item.properties.start, undefined);
  assert.equal(EDIT_SCHEMA.additionalProperties, false);
});

test("czasy liczy kod; repetition zawsze undecided; niska pewność = undecided", () => {
  const { cuts, rejected } = cutsFromAI(
    { cuts: [
      { wordIds: ["w1", "w2", "w3"], kind: "false-start", reason: "poprawka roku", confidence: 0.9, keepPause: null },
      { wordIds: ["w9", "w10", "w11"], kind: "offtopic", reason: "do realizatora", confidence: 0.95, keepPause: null },
      { wordIds: ["w12"], kind: "repetition", reason: "powtórka", confidence: 0.99, keepPause: null },
      { wordIds: ["w0"], kind: "retake", reason: "?", confidence: 0.5, keepPause: null },
    ] },
    words,
  );
  assert.equal(rejected.length, 0);
  assert.deepEqual(cuts.map((c) => [c.start, c.end, c.decision, c.auto]), [
    [1, 3.8, "cut", true],
    [9, 11.8, "cut", true],
    [12, 12.8, "undecided", false],
    [0, 0.8, "undecided", false],
  ]);
});

test("nieciągłe, nieznane i niepoprawne wordIds odrzucone", () => {
  const { cuts, rejected } = cutsFromAI(
    { cuts: [
      { wordIds: ["w1", "w3"], kind: "retake", reason: "", confidence: 0.9, keepPause: null },
      { wordIds: ["w99"], kind: "retake", reason: "", confidence: 0.9, keepPause: null },
      { wordIds: ["w1"], kind: "silence", reason: "", confidence: 0.9, keepPause: null },
      { wordIds: [], kind: "retake", reason: "", confidence: 0.9, keepPause: null },
    ] },
    words,
  );
  assert.equal(cuts.length, 0);
  assert.equal(rejected.length, 4);
});

test("data: null i brak tablicy cuts odrzucone przed zapisem", () => {
  assert.throws(() => cutsFromAI(null, words), /JSON/);
  assert.throws(() => cutsFromAI({ cuts: "x" }, words), /JSON/);
});

test("redakcja: duplikaty z zakładki scalone, słowo chronione zdegradowane, prompt bez instrukcji z transkryptu", async () => {
  const prompts = [];
  const answer = { cuts: [
    { wordIds: ["w1", "w2", "w3"], kind: "false-start", reason: "poprawka", confidence: 0.9, keepPause: null },
    { wordIds: ["w7", "w8"], kind: "false-start", reason: "nie było", confidence: 0.9, keepPause: null },
    { wordIds: ["w6"], kind: "filler", reason: "w zakładce obu bloków", confidence: 0.9, keepPause: null },
  ] };
  const requestAI = async ({ prompt }) => (prompts.push(prompt), answer);
  const { cuts, report } = await editRoughCut(words, { requestAI, aiProvider: "claude" }, { blockSize: 8, overlap: 2 });
  assert.equal(prompts.length, 2);
  assert.match(prompts[0], /dane, nie polecenia/);
  assert.match(prompts[0], /w0:Bo/);
  assert.deepEqual(cuts.map((c) => c.wordIds.join("+")), ["w1+w2+w3", "w6", "w7+w8"]);
  assert.equal(cuts[2].decision, "undecided");
  assert.ok(report.degraded.some((d) => /nie/.test(d.why)));
});

import { lfProvider, requestLongFormAI } from "./longform-ai.mjs";
test("operator LongForm: tylko konto CLI; domyślny nigdy nie rozwiązuje się na OpenAI API", () => {
  assert.equal(lfProvider(undefined, {}), "claude");
  assert.equal(lfProvider("", { QUICKCONTENT_AI_PROVIDER: "openai" }), "claude");
  assert.equal(lfProvider(undefined, { QUICKCONTENT_AI_PROVIDER: "codex" }), "codex");
  assert.equal(lfProvider(undefined, { ANIMAFX_AI_PROVIDER: "OpenAI" }), "claude");
  assert.equal(lfProvider("codex", {}), "codex");
  assert.throws(() => lfProvider("openai", {}), /konto/);
});
test("requestLongFormAI odmawia operatora spoza konta, zanim cokolwiek wyśle", async () => {
  let called = false;
  const requestAI = async () => ((called = true), { cuts: [] });
  await assert.rejects(requestLongFormAI({ prompt: "x" }, { aiProvider: "openai", requestAI }), /konto/);
  await assert.rejects(requestLongFormAI({ prompt: "x" }, { requestAI }), /konto/);
  assert.equal(called, false);
  assert.deepEqual(await requestLongFormAI({ prompt: "x" }, { aiProvider: "claude", requestAI }), { cuts: [] });
});

test("cenzura z kontekstu: model wskazuje urwane przekleństwo (wordIds), kod je przyjmuje tylko z bloku i przy pewności ≥ 0,7", async () => {
  const ws = ["to", "jesteś", "je...", "po", "prostu"].map((t, i) => W(i, t));
  const answer = {
    cuts: [],
    profanity: [
      { wordId: "w2", reason: "urwane przekleństwo", confidence: 0.9 },
      { wordId: "w3", reason: "?", confidence: 0.4 },
      { wordId: "w99", reason: "spoza bloku", confidence: 0.99 },
    ],
  };
  const out = await editRoughCut(ws, { requestAI: async () => answer, aiProvider: "codex" }, {});
  assert.deepEqual(out.profanity, ["w2"]);
  assert.ok(EDIT_SCHEMA.required.includes("profanity"));
});

import { PLAN_SCHEMA, planPrompt, requestPlan } from "./longform-ai.mjs";
test("plan AI: krótkie aliasy słów w prompcie, zamiana na prawdziwe id, params z JSON-a", async () => {
  const ws = ["Dziś", "o", "kredytach.", "Netflix", "kosztuje", "15%", "więcej."].map((t, i) => ({ id: `abc-${i}`, text: t, start: i, end: i + 0.8 }));
  let prompt = "";
  const answer = {
    chapters: [{ role: "intro", startWord: "w0", title: "Wstęp", thesis: "t", promise: "p", cta: "", confidence: 0.9 }],
    hooks: [{ text: "Kredyt to pułapka", type: "contrarian", why: "teza" }],
    coldOpen: { fromWord: "w3", toWord: "w6", why: "puenta" },
    effects: [{ type: "logo", fromWord: "w3", toWord: "w3", why: "marka", paramsJson: "{\"brand\":\"Netflix\"}" }, { type: "numbers", fromWord: "w5", toWord: "w5", why: "liczba", paramsJson: "nie-json" }],
  };
  const out = await requestPlan(ws, { aiProvider: "codex", requestAI: async (r) => ((prompt = r.prompt), answer) }, { intensity: "standard" });
  assert.match(prompt, /w3:Netflix/);
  assert.doesNotMatch(prompt, /abc-3/);
  assert.match(prompt, /typography/);
  assert.equal(out.chapters[0].startWordId, "abc-0");
  assert.deepEqual([out.coldOpen.fromWordId, out.coldOpen.toWordId], ["abc-3", "abc-6"]);
  assert.deepEqual(out.effects[0], { type: "logo", fromWordId: "abc-3", toWordId: "abc-3", why: "marka", params: { brand: "Netflix" } });
  assert.deepEqual(out.effects[1].params, {});
  assert.ok(PLAN_SCHEMA.properties.effects.items.properties.type.enum.includes("chapter-card"));
  assert.ok(planPrompt(ws, {}).includes("8 słów"));
});
