import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import process from "node:process";
import { parseWhisperProgress } from "./quickcontent-progress.mjs";
import {
  safePath,
  runMediaTool,
  writeMediaJson,
  hashFile,
  ensureDiskSpace,
} from "./quickcontent-ingest.mjs";
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function normalizeWhisper(raw, duration) {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !raw ||
    !Array.isArray(raw.segments)
  )
    throw new Error("Nieprawidłowy JSON transkrypcji Whisper.");
  const hash = digest(raw),
    words = [],
    segments = [];
  let previousStart = -1,
    previousSegment = -1;
  const validRange = (start, end) =>
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end >= start &&
    end <= duration;
  for (const s of raw.segments) {
    if (!validRange(s.start, s.end) || s.start < previousSegment)
      throw new Error("Nieprawidłowy zakres segmentu Whisper.");
    previousSegment = s.start;
    if (!Array.isArray(s.words)) {
      if (String(s.text ?? "").trim())
        throw new Error("Whisper nie zapisał czasów słów.");
      continue;
    }
    const first = words.length;
    for (const w of s.words) {
      const text = String(w.word ?? "").trim();
      if (!text) continue;
      if (!validRange(w.start, w.end) || w.start < previousStart)
        throw new Error("Nieprawidłowe lub cofające się czasy słów Whisper.");
      if (
        w.probability !== undefined &&
        (!Number.isFinite(w.probability) ||
          w.probability < 0 ||
          w.probability > 1)
      )
        throw new Error("Nieprawidłowa pewność słowa Whisper.");
      previousStart = w.start;
      words.push({
        id: `${hash.slice(0, 20)}-${words.length}`,
        text,
        start: w.start,
        end: w.end,
        ...(w.probability !== undefined ? { probability: w.probability } : {}),
      });
    }
    if (words.length > first)
      segments.push({
        id: `${hash.slice(0, 20)}-s${segments.length}`,
        start: s.start,
        end: s.end,
        text:
          typeof s.text === "string"
            ? s.text.trim()
            : words
                .slice(first)
                .map((w) => w.text)
                .join(" "),
        firstWordId: words[first].id,
        lastWordId: words.at(-1).id,
      });
    else if (String(s.text ?? "").trim())
      throw new Error("Whisper zwrócił mowę bez rzeczywistych słów.");
  }
  return {
    hash,
    words,
    segments,
    status: words.length ? "ready" : "no-speech",
    language: raw.language ?? null,
  };
}
export async function transcribeSource(
  source,
  { model = "large-v3-turbo", language = "pl" } = {},
  ctx,
) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(model) || !/^[a-zA-Z]{2,3}$/.test(language))
    throw new Error("Nieprawidłowy model lub język Whisper.");
  const cacheKey = digest({
    sourceHash: source.hash,
    model,
    language,
    task: "transcribe",
    wordTimestamps: true,
    normalizer: 1,
  });
  const rel = `${source.dataDir}/transcripts/${cacheKey}`;
  const manifest = await safePath(ctx.root, rel + "/transcript.json", {
    create: true,
  });
  const cached = await readFile(manifest, "utf8")
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
  if (cached) {
    const raw = JSON.parse(
      await readFile(await safePath(ctx.root, cached.rawPath), "utf8"),
    );
    const normalized = normalizeWhisper(raw, source.duration);
    if (normalized.hash !== cached.hash)
      throw new Error("Niezgodny cache transkrypcji.");
    const saved = JSON.parse(
      await readFile(await safePath(ctx.root, cached.wordsPath), "utf8"),
    );
    if (JSON.stringify(saved) !== JSON.stringify(normalized))
      throw new Error("Uszkodzony cache czasów słów.");
    return {
      ...cached,
      ...normalized,
      rawPath: cached.rawPath,
      wordsPath: cached.wordsPath,
      cacheKey,
    };
  }
  const totalUnits = Math.ceil(source.duration * 100);
  const runtimeLabel = `Whisper ${model} · ${process.platform === "darwin" ? "CPU" : "lokalnie"}`;
  await ctx.report?.({
    stage: "transcribe",
    progress: null,
    progressUnit: "audioFrames",
    completedUnits: 0,
    totalUnits,
    progressDetail: "Przygotowanie dźwięku do transkrypcji",
    runtimeLabel,
    etaSeconds: null,
  });
  const master = await safePath(ctx.root, source.masterPath),
    work = await safePath(ctx.root, rel + "/work-" + randomUUID());
  await mkdir(work);
  await ensureDiskSpace(
    work,
    Math.max(
      source.duration * 16000 * 2 + 100 * 1024 * 1024,
      100 * 1024 * 1024,
    ),
  );
  const audio = path.join(work, "asr.wav");
  await runMediaTool(
    "ffmpeg",
    [
      "-hide_banner",
      "-v",
      "error",
      "-y",
      "-i",
      master,
      "-map",
      "0:a:0",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      audio,
    ],
    ctx,
  );
  if (!(await stat(audio)).size)
    throw new Error("Nie udało się przygotować audio Whisper.");
  const modelDir = ctx.modelDir ?? path.join(homedir(), ".cache/whisper");
  // Refuse Whisper's implicit model download; installing models is a separate action.
  await runMediaTool("test", ["-f", path.join(modelDir, model + ".pt")], ctx);
  await ctx.report?.({
    stage: "transcribe",
    progress: null,
    progressDetail: "Ładowanie modelu Whisper z dysku",
    runtimeLabel,
  });
  let reported = -1,
    reporting = Promise.resolve();
  const progressCtx = {
    ...ctx,
    onLine: (value, stream) => {
      ctx.onLine?.(value, stream);
      for (const line of value.split(/\r?\n|\r/)) {
        const measured = parseWhisperProgress(line);
        if (!measured || measured.completedUnits <= reported) continue;
        reported = measured.completedUnits;
        reporting = reporting.then(() =>
          ctx.report?.({
            stage: "transcribe",
            ...measured,
            progressDetail:
              measured.completedUnits === measured.totalUnits
                ? "Zapisywanie transkrypcji i kontrola czasów słów"
                : "Rozpoznawanie mowy i dopasowanie czasów słów",
          }),
        );
        reporting.catch(() => {});
      }
    },
  };
  try {
    await runMediaTool(
      "whisper",
      [
        audio,
        "--model",
        model,
        "--model_dir",
        modelDir,
        "--language",
        language,
        "--task",
        "transcribe",
        "--output_format",
        "json",
        "--output_dir",
        work,
        "--word_timestamps",
        "True",
        "--fp16",
        "False",
        "--verbose",
        "False",
      ],
      progressCtx,
    );
  } finally {
    await reporting;
  }
  let raw;
  try {
    raw = JSON.parse(await readFile(path.join(work, "asr.json"), "utf8"));
  } catch {
    throw new Error(
      "Whisper zakończył pracę bez poprawnego nowego JSON. Ponów transkrypcję.",
    );
  }
  const normalized = normalizeWhisper(raw, source.duration);
  const rawPath = rel + "/transcript.raw.json",
    wordsPath = rel + "/transcript.words.json";
  await rename(path.join(work, "asr.json"), await safePath(ctx.root, rawPath));
  await writeMediaJson(await safePath(ctx.root, wordsPath), normalized);
  const result = {
    ...normalized,
    rawPath,
    wordsPath,
    cacheKey,
    audioHash: await hashFile(audio),
    model,
    language,
  };
  await writeMediaJson(manifest, result);
  await ctx.checkpoint?.("transcribe", [rawPath, wordsPath]);
  await ctx.report?.({
    stage: "transcribe",
    progress: 1,
    progressDetail: "Transkrypcja zapisana i sprawdzona",
    progressUnit: "audioFrames",
    completedUnits: totalUnits,
    totalUnits,
    etaSeconds: 0,
    runtimeLabel,
  });
  return result;
}
