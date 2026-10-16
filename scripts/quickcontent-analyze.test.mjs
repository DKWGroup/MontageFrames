import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalysisWindows,
  validateCandidate,
  dedupeCandidates,
  scoreCandidate,
  parseOperatorJSON,
  analyzeTranscript,
} from "./quickcontent-analyze.mjs";

const words = Array.from({ length: 70 }, (_, i) => ({
  id: `w${i}`,
  text: i % 10 === 9 ? "koniec." : "słowo",
  start: i,
  end: i + 0.6,
}));
const transcript = { words, hash: "transcript", duration: 70 };
const proposal = {
  firstWordId: "w0",
  lastWordId: "w29",
  title: "Pełna myśl",
  summary: "O kosztach prowadzenia firmy.",
  topic: "firma",
  thesis: "Cena to nie wszystko",
  kind: "mocna opinia",
  reason: "Autor wyjaśnia własne stanowisko i jego konsekwencje.",
  confidence: "high",
  contextRisk: "",
  scoreBreakdown: { hook: 4, value: 4, emotion: 3, novelty: 3, focusMatch: 5 },
  completeness: { opening: 4, context: 4, development: 4, closing: 4 },
  meaningPreserved: true,
  sentenceStart: true,
  sentenceEnd: true,
};
test("complete candidates use real word boundaries, padding, duration and explicit semantic gates", () => {
  const result = validateCandidate(proposal, transcript, {
    duration: { min: 15, max: 60 },
  });
  assert.equal(result.ok, true);
  assert.equal(result.candidate.sourceStart, 0);
  assert.equal(result.candidate.sourceEnd, 29.85);
  assert.equal(
    validateCandidate({ ...proposal, lastWordId: "invented" }, transcript, {
      duration: { min: 15, max: 60 },
    }).ok,
    false,
  );
  assert.equal(
    validateCandidate({ ...proposal, meaningPreserved: false }, transcript, {
      duration: { min: 15, max: 60 },
    }).ok,
    false,
  );
  assert.equal(
    validateCandidate(
      { ...proposal, completeness: { ...proposal.completeness, closing: 2 } },
      transcript,
      { duration: { min: 15, max: 60 } },
    ).ok,
    false,
  );
  assert.equal(
    validateCandidate({ ...proposal, lastWordId: "w69" }, transcript, {
      duration: { min: 30, max: 60 },
    }).ok,
    false,
  );
});
test("ranking cannot conceal a missing ending and same thesis variants are grouped", () => {
  assert.equal(
    scoreCandidate({
      hook: 4,
      value: 4,
      emotion: 3,
      novelty: 3,
      focusMatch: 5,
    }),
    75,
  );
  const old = {
    id: "existing",
    sourceStart: 0,
    sourceEnd: 35,
    thesis: "Cena to nie wszystko",
    title: "A",
  };
  const duplicate = {
    id: "new",
    sourceStart: 1,
    sourceEnd: 34,
    thesis: "Cena to nie wszystko",
    title: "B",
  };
  const different = {
    id: "other",
    sourceStart: 15,
    sourceEnd: 45,
    thesis: "Dobry brief oszczędza czas",
    title: "C",
  };
  const result = dedupeCandidates([old], [duplicate, different]);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].id, "other");
  assert.equal(result.grouped.length, 1);
  assert.equal(old.id, "existing");
});
test("windows cover the final word and include context across boundaries", () => {
  const many = Array.from({ length: 420 }, (_, i) => ({
    id: `s${i}`,
    text: i % 10 === 9 ? "koniec." : "słowo",
    start: i,
    end: i + 0.6,
  }));
  const windows = buildAnalysisWindows(many, 420);
  assert.ok(windows.length >= 3);
  assert.ok(windows.at(-1).words.some((w) => w.id === "s419"));
  assert.ok(windows[1].words.some((w) => Number(w.id.slice(1)) < 180));
});
test("structured Claude output accepts actual result envelope and rejects model errors", () => {
  assert.deepEqual(
    parseOperatorJSON(
      JSON.stringify({
        type: "result",
        is_error: false,
        structured_output: { candidates: [] },
      }),
    ),
    { candidates: [] },
  );
  assert.throws(
    () =>
      parseOperatorJSON(
        JSON.stringify({ type: "result", is_error: true, result: "failed" }),
      ),
    /failed/,
  );
});
test("find more keeps existing candidates and only marks exhausted after completed analysis", async () => {
  let requests = 0;
  const ctx = {
    root: "/tmp",
    signal: new globalThis.AbortController().signal,
    report: async () => {},
    request: async (input) => {
      requests++;
      return input.stage === "discover"
        ? { summary: "Firma", themes: ["firma"], candidates: [proposal] }
        : { candidates: [proposal] };
    },
  };
  const project = {
    id: "p",
    focus: { mode: "auto" },
    duration: { min: 15, max: 60 },
  };
  const first = await analyzeTranscript(
    { project, transcript, previousCandidates: [] },
    ctx,
  );
  assert.equal(first.candidates.length, 1);
  assert.equal(first.run.exhausted, false);
  const next = await analyzeTranscript(
    { project, transcript, previousCandidates: first.candidates },
    ctx,
  );
  assert.equal(next.candidates.length, 0);
  assert.equal(next.run.exhausted, true);
  assert.ok(requests >= 4);
});
test("ASR overlaps cannot cut off the first or last selected word", () => {
  const overlap = globalThis.structuredClone(transcript);
  overlap.words[0].end = 1.25;
  overlap.words[29].end = 30.25;
  const result = validateCandidate(
    { ...proposal, firstWordId: "w1" },
    overlap,
    { duration: { min: 15, max: 60 } },
  );
  assert.equal(result.ok, true);
  assert.ok(result.candidate.sourceStart <= overlap.words[1].start);
  assert.ok(result.candidate.sourceEnd >= overlap.words[29].end);
});
test("all windows discover topics before review and preserve the requested analysis run id", async () => {
  const many = {
    words: Array.from({ length: 420 }, (_, i) => ({
      id: `w${i}`,
      text: "koniec.",
      start: i,
      end: i + 0.6,
    })),
    duration: 420,
  };
  const calls = [];
  const project = { focus: { mode: "auto" }, duration: { min: 15, max: 60 } };
  const result = await analyzeTranscript(
    { project, transcript: many, analysisRunId: "a-requested" },
    {
      report: async () => {},
      request: async (input) => {
        calls.push(input);
        return {
          themes: [`temat-${input.words[0].id}`],
          candidates: [proposal],
        };
      },
    },
  );
  const discoveries = calls.filter((c) => c.stage === "discover");
  const reviews = calls.filter((c) => c.stage === "review");
  assert.ok(discoveries.length > 1);
  assert.equal(
    calls.slice(0, discoveries.length).every((c) => c.stage === "discover"),
    true,
  );
  assert.equal(reviews[0].themes.length, discoveries.length);
  assert.equal(result.run.id, "a-requested");
});
