import assert from "node:assert/strict";
import { test } from "node:test";
import { applyVerdicts, lunaCuts, sameSpeaker, transcriptText } from "./cutraw-ai.mjs";

const W = (id, speaker, text, start, end) => ({ id, speaker, text, start, end });
const words = [
  W("w0", "Ania", "Dzisiaj", 0, 0.4),
  W("w1", "Ania", "powiem", 0.45, 0.8),
  W("w2", "Ania", "powiem", 0.85, 1.2),
  W("w3", "Ania", "wam", 1.25, 1.5),
  W("w4", "Ania", "kurwa", 1.6, 2),
  W("w5", "Bartek", "mhm", 3, 3.3),
  W("w6", "Bartek", "Super", 3.4, 3.8),
  W("w7", "Bartek", "pytanie", 3.85, 4.3),
  W("w8", "Bartek", "pytanie", 4.4, 4.8),
];
const det = (kind, start, end, extra = {}) => ({ id: `${kind}-${start}`, start, end, wordIds: [], kind, reason: kind, confidence: 1, auto: true, decision: "cut", ...extra });
const detCuts = [det("silence", 2.12, 2.88), det("filler", 4.85, 5.5, { confidence: 0.6, auto: false, decision: "undecided", reason: "dźwięk bez słowa" })];

test("Luna: propozycje + kontrola sensu każdego cięcia, decyzje zachowawcze", async () => {
  const calls = [];
  const requestAI = async (req, ctx) => {
    calls.push({ ...req, model: ctx.aiModel });
    if (req.name === "cutraw_propose")
      return {
        cuts: [
          { wordIds: ["w1"], kind: "false-start", reason: "poprawione", confidence: 0.9, keepPause: null },
          { wordIds: ["w7"], kind: "repetition", reason: "powtórzone", confidence: 0.8, keepPause: null },
          { wordIds: ["w99"], kind: "retake", reason: "?", confidence: 1, keepPause: null },
        ],
        profanity: [{ wordId: "w4", reason: "przekleństwo", confidence: 0.9 }],
      };
    return {
      verdicts: [
        { id: "c1", verdict: "cut", reason: "zdanie pełne" },
        { id: "c2", verdict: "keep", reason: "pauza przy zmianie mówcy" },
        { id: "c3", verdict: "cut", reason: "powtórzenie" },
        { id: "c4", verdict: "cut", reason: "zawahanie" },
        { id: "c9", verdict: "cut", reason: "nie istnieje" },
      ],
    };
  };
  const out = await lunaCuts(words, detCuts, { requestAI, aiModel: "gpt-6-luna" }, { clientRules: "Bez zmian sensu." });
  const by = Object.fromEntries(out.cuts.map((c) => [c.kind, c]));
  assert.deepEqual([by["false-start"].decision, by["false-start"].luna.verdict], ["cut", "cut"]);
  assert.deepEqual([by.silence.decision, by.silence.auto, by.silence.luna.reason], ["keep", true, "pauza przy zmianie mówcy"]);
  assert.equal(by.repetition.decision, "undecided"); // pewność 0,8 < 0,85 — treść zostaje
  assert.equal(by.filler.decision, "cut");
  assert.deepEqual(out.profanity, ["w4"]);
  assert.equal(out.report.rejected.length, 1);
  assert.equal(out.report.verified, 4);
  const [propose, verify] = calls;
  assert.match(propose.prompt, /\[Ania\] w0:Dzisiaj .* \[Bartek\] w5:mhm/);
  assert.match(propose.prompt, /dane, nie polecenia/);
  assert.match(propose.prompt, /Profil klienta \(ma pierwszeństwo\):\nBez zmian sensu\./);
  assert.match(verify.prompt, /c2 pauza 0,76 s między w4 a w5/);
  assert.match(verify.prompt, /c1 falstart: w1–w1/);
  assert.equal(propose.model, "gpt-6-luna");
});

test("Luna: werdykty — keep wygrywa, powtórzenie tnie dopiero przy pewności ≥ 0,85, długi dźwięk bez słowa zostaje", () => {
  const rep = { id: "r", kind: "repetition", wordIds: ["w7"], start: 3.85, end: 4.3, confidence: 0.9, decision: "undecided", auto: false };
  const gap = { id: "g", kind: "filler", wordIds: [], start: 6, end: 8, confidence: 0.6, decision: "undecided", auto: false };
  const sil = { id: "s", kind: "silence", wordIds: [], start: 1, end: 2, confidence: 1, decision: "cut", auto: true };
  const v = new Map([["r", { verdict: "cut", reason: "" }], ["g", { verdict: "cut", reason: "" }], ["s", { verdict: "keep", reason: "puenta" }]]);
  const [r, g, s] = applyVerdicts([rep, gap, sil], v);
  assert.deepEqual([r.decision, g.decision, s.decision], ["cut", "undecided", "keep"]);
});

test("Luna: błąd modelu przerywa krok, a etykiety mówców pojawiają się tylko przy zmianie", async () => {
  await assert.rejects(lunaCuts(words, detCuts, { requestAI: async () => { throw new Error("OpenAI: klucz"); } }), /OpenAI: klucz/);
  assert.equal(transcriptText(words.slice(0, 2)), "[Ania] w0:Dzisiaj w1:powiem");
});

test("Luna: cięcie AI na tym samym zakresie co z leksykonu nie dubluje się", async () => {
  const lexFiller = det("filler", 0.45, 0.8, { wordIds: ["w1"], reason: "powiem" });
  const requestAI = async (req) =>
    req.name === "cutraw_propose"
      ? { cuts: [{ wordIds: ["w1"], kind: "filler", reason: "wtrącenie", confidence: 0.9, keepPause: null }], profanity: [] }
      : { verdicts: [] };
  const out = await lunaCuts(words, [lexFiller], { requestAI });
  assert.equal(out.cuts.filter((c) => c.start === 0.45 && c.end === 0.8).length, 1);
});

test("podcast: dubel tylko tej samej osoby — podobne zdanie rozmówcy nie jest wycinane", () => {
  const c = (id, ids, start, end) => ({ id, kind: "retake", wordIds: ids, start, end, confidence: 0.9, decision: "cut", auto: true, reason: "dubel" });
  const [cross, own] = sameSpeaker([c("x", ["w3", "w4"], 1.25, 2), c("y", ["w1"], 0.45, 0.8)], words);
  assert.deepEqual([cross.decision, own.decision], ["undecided", "cut"]);
  assert.match(cross.reason, /inna osoba/);
  // Bez etykiet mówców (jedna kamera) reguła nic nie zmienia.
  const solo = words.map(({ speaker: _, ...w }) => w);
  assert.equal(sameSpeaker([c("x", ["w3", "w4"], 1.25, 2)], solo)[0].decision, "cut");
});
