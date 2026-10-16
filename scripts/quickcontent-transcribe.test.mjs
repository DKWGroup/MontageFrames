import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
const module = await import("./quickcontent-transcribe.mjs");
const raw = {
  language: "pl",
  segments: [
    {
      start: 0.2,
      end: 1.8,
      text: " Łódź, 120 zł.",
      words: [
        { word: " Łódź,", start: 0.2, end: 0.8, probability: 0.91 },
        { word: " 120", start: 1, end: 1.3 },
        { word: " zł.", start: 1.3, end: 1.8 },
      ],
    },
  ],
};
test("normalizes real Whisper JSON preserving Polish punctuation and stable IDs", () => {
  assert.equal(typeof module.normalizeWhisper, "function");
  const a = module.normalizeWhisper(raw, 3);
  assert.deepEqual(a, module.normalizeWhisper(raw, 3));
  assert.equal(a.words[0].text, "Łódź,");
  assert.equal(a.words[0].probability, 0.91);
  assert.equal(a.words.length, 3);
  assert.equal(a.segments[0].firstWordId, a.words[0].id);
});
test("rejects missing timestamps, backward time, NaN and times beyond source", () => {
  assert.equal(typeof module.normalizeWhisper, "function");
  for (const words of [
    [{ word: "x", start: NaN, end: 1 }],
    [{ word: "x", start: 0, end: 9 }],
    [
      { word: "x", start: 1, end: 1.2 },
      { word: "y", start: 0.4, end: 0.5 },
    ],
  ])
    assert.throws(() =>
      module.normalizeWhisper({ segments: [{ start: 0, end: 3, words }] }, 3),
    );
  assert.throws(() =>
    module.normalizeWhisper(
      { segments: [{ start: 0, end: 1, text: "speech" }] },
      3,
    ),
  );
});
test("valid empty speech has explicit no-speech status", () => {
  assert.equal(typeof module.normalizeWhisper, "function");
  assert.equal(
    module.normalizeWhisper({ segments: [] }, 3).status,
    "no-speech",
  );
  assert.throws(() => module.normalizeWhisper({}, 3));
});
test("ASR cache reuses identical input and invalidates changed language/model/hash", async () => {
  assert.equal(typeof module.transcribeSource, "function");
  const root = await mkdtemp(path.join(tmpdir(), "qc-asr-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "master");
  let count = 0;
  const runTool = async (exe, args) => {
    if (exe === "ffmpeg") await writeFile(args.at(-1), "audio");
    if (exe === "whisper") {
      count++;
      const out = args[args.indexOf("--output_dir") + 1];
      await writeFile(path.join(out, "asr.json"), JSON.stringify(raw));
    }
    return { stdout: "", stderr: "" };
  };
  const source = {
    dataDir: "media",
    masterPath: "media/master.mkv",
    duration: 3,
    hash: "a",
  };
  const a = await module.transcribeSource(source, {}, { root, runTool });
  const b = await module.transcribeSource(source, {}, { root, runTool });
  assert.equal(a.hash, b.hash);
  assert.equal(count, 1);
  await module.transcribeSource(source, { language: "en" }, { root, runTool });
  await module.transcribeSource(source, { model: "small" }, { root, runTool });
  await module.transcribeSource(
    { ...source, hash: "b" },
    {},
    { root, runTool },
  );
  assert.equal(count, 4);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(root, a.rawPath), "utf8")),
    raw,
  );
});
test("Whisper exit zero without valid JSON fails", async () => {
  assert.equal(typeof module.transcribeSource, "function");
  const root = await mkdtemp(path.join(tmpdir(), "qc-asr-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "master");
  await assert.rejects(
    module.transcribeSource(
      {
        dataDir: "media",
        masterPath: "media/master.mkv",
        duration: 3,
        hash: "x",
      },
      {},
      {
        root,
        runTool: async (exe, args) => {
          if (exe === "ffmpeg") await writeFile(args.at(-1), "audio");
          return { stdout: "", stderr: "" };
        },
      },
    ),
  );
});
test("ASR publishes real audio progress and awaits reports before committing its result", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qc-asr-progress-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "master");
  const reports = [];
  await module.transcribeSource(
    {
      dataDir: "media",
      masterPath: "media/master.mkv",
      duration: 3,
      hash: "progress",
    },
    {},
    {
      root,
      report: async (update) => {
        reports.push(update);
      },
      runTool: async (exe, args, options) => {
        if (exe === "ffmpeg") await writeFile(args.at(-1), "audio");
        if (exe === "whisper") {
          options.onLine(
            " 50%|█████| 150/300 [00:02<00:02, 75.00frames/s]",
            "stderr",
          );
          options.onLine(
            " 40%|████| 120/300 [00:02<00:02, 75.00frames/s]",
            "stderr",
          );
          options.onLine(
            "100%|██████████| 300/300 [00:04<00:00, 75.00frames/s]",
            "stderr",
          );
          const out = args[args.indexOf("--output_dir") + 1];
          await writeFile(path.join(out, "asr.json"), JSON.stringify(raw));
        }
        return { stdout: "", stderr: "" };
      },
    },
  );
  assert.ok(
    reports.some(
      (r) =>
        r.progress === 0.5 &&
        r.completedUnits === 150 &&
        r.totalUnits === 300 &&
        r.progressUnit === "audioFrames",
    ),
  );
  assert.equal(
    reports.some((r) => r.completedUnits === 120),
    false,
  );
  assert.ok(reports.some((r) => /Ładowanie/.test(r.progressDetail ?? "")));
  assert.equal(reports.at(-1).progress, 1);
});
