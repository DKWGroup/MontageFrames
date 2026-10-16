import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { RoughCut } from "../src/longform/schema.mjs";

const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const lex = json("../src/longform/profanity-pl.json");
const fillers = json("../src/longform/fillers-pl.json");

const cut = { id: "c1", start: 1.2, end: 1.9, wordIds: ["w4"], kind: "filler", reason: "yyy", confidence: 0.95, auto: true, decision: "cut" };
test("roughcut: poprawny dokument", () => {
  RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [cut], mutes: [] });
});
test("roughcut: kind spoza listy odrzucony", () => {
  assert.throws(() => RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [{ ...cut, kind: "inne" }], mutes: [] }));
});
test("roughcut: start >= end odrzucony", () => {
  assert.throws(() => RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [{ ...cut, start: 2, end: 2 }], mutes: [] }));
});
test("roughcut: confidence poza [0,1] odrzucone", () => {
  assert.throws(() => RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [{ ...cut, confidence: 1.2 }], mutes: [] }));
});
test("leksykon wtrąceń: pewne i wieloznaczne", () => {
  assert.ok(fillers.sure.includes("yyy"));
  assert.ok(fillers.ambiguous.includes("w sensie"));
});

import { applyDecisions, censorMutes, fillerCuts, isProfane, silenceCuts, speechRms, validateCuts, voicedGaps } from "./longform-roughcut.mjs";

const POS = ["kurwa", "Kurwa!", "kurwy", "skurwysyn", "wkurwiony", "chuj", "chujowy", "huj", "jebać", "zajebisty", "wyjebane", "pojebany", "jeb...", "pierdolę", "spierdalaj", "zapierdala", "rozpierdol", "pizda", "kutasie", "cipka"];
const NEG = ["kurek", "kurs", "kurtka", "kurczak", "kurde", "kurczę", "kurier", "cholera", "Kurtyka", "chustka", "huta", "hulajnoga", "jeden", "jedzenie", "pierwszy", "pierogi", "dziwny", "kutia", "Cypr", "Cipriani"];
test("leksykon przekleństw: 20 pozytywów", () => {
  for (const w of POS) assert.ok(isProfane(w, lex), w);
});
test("leksykon przekleństw: 20 negatywów", () => {
  for (const w of NEG) assert.ok(!isProfane(w, lex), w);
});
test("leksykon przekleństw: wyjątek z except", () => {
  assert.ok(!isProfane("kurwik", { stems: ["kurw"], except: ["kurwik"] }));
});

test("cenzura: 80% słowa wyciszone, początek słyszalny", () => {
  const [m] = censorMutes([{ id: "w1", text: "kurwa", start: 10, end: 10.5 }], lex, {});
  assert.ok(Math.abs(m.start - 10.1) < 1e-6);
  assert.ok(Math.abs(m.end - 10.53) < 1e-6);
  assert.equal(m.sfx, "kruk");
  assert.equal(m.wordId, "w1");
});
test("kurek nie jest cenzurowany", () => {
  assert.equal(censorMutes([{ id: "w1", text: "kurek", start: 1, end: 1.4 }], lex, {}).length, 0);
});

test("cisza: zostawia oddech i nie tnie słowa", () => {
  const cuts = silenceCuts([{ start: 5, end: 6.2 }],
    [{ id: "w1", start: 4.2, end: 5.05 }, { id: "w2", start: 6.2, end: 6.6 }], {});
  assert.deepEqual(cuts.map((c) => [c.start, c.end]), [[5.2, 6.05]]);
  assert.equal(cuts[0].kind, "silence");
  assert.equal(cuts[0].decision, "cut");
});
test("cisza: słowo w środku ciszy dzieli cięcie, krótkie przerwy zostają", () => {
  const cuts = silenceCuts([{ start: 1, end: 4 }], [{ id: "w1", start: 2, end: 2.5 }, { id: "w2", start: 4.2, end: 5 }], {});
  assert.deepEqual(cuts.map((c) => [c.start, c.end]), [[1.15, 1.85], [2.65, 3.85]]);
  assert.equal(silenceCuts([{ start: 1, end: 1.3 }], [], {}).length, 0);
});

const W = (id, text, start, end) => ({ id, text, start, end });
test("wtrącenia: pewne tniemy, wieloznaczne i dźwięczne dziury do decyzji", () => {
  const words = [W("w1", "Dzień", 0, 0.4), W("w2", "yyy", 0.5, 0.9), W("w3", "w", 1, 1.1), W("w4", "sensie", 1.1, 1.5), W("w5", "dobry.", 1.6, 2)];
  const cuts = fillerCuts(words, fillers, [{ start: 2.2, end: 2.6 }, { start: 3, end: 3.1 }]);
  assert.deepEqual(cuts.map((c) => [c.wordIds.join("+"), c.decision, c.auto]), [
    ["w2", "cut", true],
    ["w3+w4", "undecided", false],
    ["", "undecided", false],
  ]);
  assert.deepEqual([cuts[1].start, cuts[1].end], [1, 1.5]);
  assert.equal(cuts[2].confidence, 0.6);
});

test("speechRms: średni poziom wypowiedzi wokół wyciszenia, bez samego wyciszenia i ciszy", () => {
  const frames = [{ t: 9.5, db: -20 }, { t: 9.9, db: -24 }, { t: 10.2, db: -5 }, { t: 10.8, db: -22 }, { t: 11, db: -80 }, { t: 13, db: -1 }];
  assert.equal(speechRms(frames, 10.1, 10.5), -22);
  assert.equal(speechRms([], 1, 2), null);
});

const c = (id, start, end, extra = {}) => ({ id, start, end, wordIds: [], kind: "filler", reason: "", confidence: 0.9, auto: true, decision: "cut", ...extra });
test("walidator: cięcie przez słowo chronione -> undecided", () => {
  const words = [W("w1", "To", 0, 0.3), W("w2", "nie", 0.4, 0.6), W("w3", "działa", 0.7, 1.2)];
  const { cuts, report } = validateCuts([c("x", 0.35, 0.65, { wordIds: ["w2"], kind: "false-start" })], words, {});
  assert.equal(cuts[0].decision, "undecided");
  assert.equal(report.degraded[0].id, "x");
});
test("walidator: słowo chronione zostaje w zachowanym dublu -> cięcie zostaje", () => {
  const words = [W("w1", "nie", 0, 0.3), W("w2", "wiem", 0.3, 0.6), W("w3", "nie", 1, 1.3), W("w4", "wiem.", 1.3, 1.6)];
  const { cuts } = validateCuts([c("x", 0, 0.9, { wordIds: ["w1", "w2"], kind: "retake" })], words, {});
  assert.equal(cuts[0].decision, "cut");
});
test("walidator: liczby i wielka litera w środku zdania chronione", () => {
  const words = [W("w1", "mam", 0, 0.3), W("w2", "15", 0.4, 0.7), W("w3", "lat", 0.8, 1), W("w4", "w", 1.1, 1.2), W("w5", "Krakowie.", 1.2, 1.8)];
  const { cuts } = validateCuts([c("a", 0.35, 0.75, { wordIds: ["w2"] }), c("b", 1.2, 1.85, { wordIds: ["w5"] })], words, {});
  assert.deepEqual(cuts.map((x) => x.decision), ["undecided", "undecided"]);
});
test("walidator: cięcie w połowie słowa -> undecided", () => {
  const { cuts } = validateCuts([c("x", 0.2, 0.9)], [W("w1", "słowo", 0, 0.5)], {});
  assert.equal(cuts[0].decision, "undecided");
});
test("walidator: limit 35% w oknie 120 s zdejmuje najmniej pewne cięcia", () => {
  const cuts = [c("a", 0, 20, { confidence: 0.9, kind: "silence" }), c("b", 30, 50, { confidence: 0.5, kind: "silence" }), c("c", 60, 70, { confidence: 0.8, kind: "silence" })];
  const out = validateCuts(cuts, [], {});
  assert.deepEqual(out.cuts.map((x) => x.decision), ["cut", "undecided", "cut"]);
});
test("walidator: SkyClass bez cięcia ciszy i wtrąceń", () => {
  const out = validateCuts([c("a", 0, 1, { kind: "silence" }), c("b", 2, 3), c("r", 4, 5, { kind: "retake" })], [], { client: "skyclass" });
  assert.deepEqual(out.cuts.map((x) => x.id), ["r"]);
});

test("applyDecisions: dopełnienie cięć, scalanie, krótkie segmenty odrzucone, naprzemienny zoom", () => {
  const segs = applyDecisions(10, [c("a", 2, 3), c("b", 2.5, 4), c("u", 5, 6, { decision: "undecided" }), c("k", 6, 7, { decision: "keep" }), c("d", 7, 7.9), c("e", 8, 9)]);
  assert.deepEqual(segs, [
    { start: 0, end: 2, zoom: 1 },
    { start: 4, end: 7, zoom: 1.1 },
    { start: 9, end: 10, zoom: 1 },
  ]);
});

test("voicedGaps: dźwięk poza ciszą i poza słowami", () => {
  assert.deepEqual(voicedGaps([{ start: 0, end: 1 }, { start: 3, end: 4 }], [W("w1", "a", 1, 2)], 5), [
    { start: 2, end: 3 },
    { start: 4, end: 5 },
  ]);
});

import { buildRoughCut } from "./longform-roughcut.mjs";
test("buildRoughCut: ręczne decyzje i własne cięcia przeżywają ponowne propose, propozycje automatu nie", () => {
  const words = [W("w1", "Dzień", 0, 0.4), W("w2", "yyy", 0.5, 0.9), W("w3", "dobry", 2.5, 3)];
  const first = buildRoughCut({ words, duration: 4, silences: [{ start: 1, end: 2.4 }], lex: { fillers, profanity: lex } }).doc;
  const filler = first.cuts.find((c) => c.kind === "filler");
  const prev = {
    ...first,
    cuts: [
      ...first.cuts.map((c) => (c.id === filler.id ? { ...c, decision: "keep", auto: false } : c)),
      c("user-3.000", 3, 3.5, { auto: false }),
    ],
  };
  const again = buildRoughCut({ words, duration: 4, silences: [{ start: 1, end: 2.4 }], lex: { fillers, profanity: lex }, prev }).doc;
  assert.equal(again.cuts.find((x) => x.id === filler.id).decision, "keep");
  assert.ok(again.cuts.some((x) => x.id === "user-3.000"));
  assert.equal(again.cuts.find((x) => x.kind === "silence").decision, "cut");
});

test("buildRoughCut: przekleństwa wskazane przez model wyciszane jak z leksykonu", () => {
  const words = [W("w1", "jesteś", 0, 0.4), W("w2", "je...", 0.5, 1)];
  const { doc } = buildRoughCut({ words, duration: 2, silences: [], lex: { fillers, profanity: lex }, extraProfanity: ["w2"] });
  assert.deepEqual(doc.mutes.map((m) => [m.wordId, m.start, m.end]), [["w2", 0.6, 1.03]]);
});
