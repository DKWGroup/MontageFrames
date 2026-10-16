import {
  readFile,
  stat,
  mkdir,
  rename,
  copyFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { buildReel, matchProducts } from "./prep.mjs";
import {
  safePath,
  mediaId,
  runMediaTool,
  probeSource,
  writeMediaJson,
  ensureDiskSpace,
  hashFile,
} from "./quickcontent-ingest.mjs";
import { detectPortraitFraming } from "./quickcontent-portrait.mjs";
const local = (t) => Number(t.toFixed(6));
export function rebaseWords(words, sourceStart, sourceEnd) {
  if (
    !Number.isFinite(sourceStart) ||
    !Number.isFinite(sourceEnd) ||
    sourceStart < 0 ||
    sourceEnd <= sourceStart
  )
    throw new Error("Nieprawidłowy zakres wycinka.");
  const selected = words.filter(
    (w) => w.end > sourceStart && w.start < sourceEnd,
  );
  if (
    selected.some(
      (w) =>
        !Number.isFinite(w.start) ||
        !Number.isFinite(w.end) ||
        w.start < sourceStart ||
        w.end > sourceEnd ||
        w.end < w.start,
    )
  )
    throw new Error("Granica wycinka przecina słowo.");
  const localWords = selected.map((w) => ({
    ...w,
    start: local(w.start - sourceStart),
    end: local(w.end - sourceStart),
  }));
  return {
    words: localWords,
    wordMap: selected.map((w, index) => ({
      sourceWordId: w.id,
      localWordIndex: index,
      sourceStart: w.start,
      sourceEnd: w.end,
      localStart: localWords[index].start,
      localEnd: localWords[index].end,
    })),
  };
}
export function buildCandidateReel({
  words,
  duration,
  styleId,
  clientId,
  silences = [],
  catalog = [],
}) {
  if (!styleId || typeof styleId !== "string")
    throw new Error("Brak jawnego stylu szablonu QuickContent.");
  // Product aliases may merge words, so SkyClass always retains the original speech 1:1.
  const products = catalog.length
    ? matchProducts(words, catalog)
    : { words, overlays: [] };
  const data = buildReel({
    source: "source.mp4",
    words: styleId === "skyclass" ? words : products.words,
    duration,
    silences: styleId === "skyclass" ? [] : silences,
    style: styleId,
    client: clientId,
  });
  data.overlays = products.overlays.map((o) => ({
    ...o,
    end: Math.min(o.end, duration),
  }));
  if (styleId === "bisanz")
    data.segments = data.segments.map((s) => ({ ...s, zoom: 1, zoomTo: 1 }));
  data.framing = {
    mode: "crop",
    centerX: 0.5,
    centerY: 0.5,
  };
  return data;
}
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const templateHash = (snapshot) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(snapshot ?? null)))
    .digest("hex");
const sameOrigin = (a, b) =>
  [
    "projectId",
    "candidateId",
    "sourceId",
    "sourceStart",
    "sourceEnd",
    "transcriptHash",
    "sourceHash",
    "styleId",
  ].every((k) => a[k] === b[k]) &&
  templateHash(a.templateSnapshot) === b.templateSnapshotHash &&
  (!a.templateSnapshotHash ||
    a.templateSnapshotHash === b.templateSnapshotHash);
export async function materializeCandidate(
  { project, candidate, transcript },
  ctx,
) {
  const projectId = mediaId(project.id),
    candidateId = mediaId(candidate.id),
    source = project.source;
  if (!source) throw new Error("Projekt nie ma gotowego źródła.");
  const styleId =
    project.styleId ??
    project.templateSnapshot?.styleId ??
    project.template?.styleId;
  if (!styleId) throw new Error("Szablon nie zawiera jawnego styleId.");
  if (candidate.sourceEnd > source.duration)
    throw new Error("Wycinek wychodzi poza master.");
  const rebased = rebaseWords(
    transcript.words,
    candidate.sourceStart,
    candidate.sourceEnd,
  );
  if (
    !rebased.words.length ||
    !rebased.words.some((w) => w.id === candidate.firstWordId) ||
    !rebased.words.some((w) => w.id === candidate.lastWordId)
  )
    throw new Error("Słowa graniczne nie należą do wycinka.");
  const shortId = (id) =>
    createHash("sha256").update(id).digest("hex").slice(0, 16);
  const reelName = `qc-${shortId(projectId)}-${shortId(candidateId)}`,
    rel = `public/reels/${reelName}`,
    directory = await safePath(ctx.root, rel + "/reel.json", { create: true });
  const origin = {
    kind: "quickcontent",
    projectId,
    candidateId,
    sourceId: source.id,
    sourceStart: candidate.sourceStart,
    sourceEnd: candidate.sourceEnd,
    transcriptHash: transcript.hash,
    sourceHash: source.hash,
    styleId,
    wordMap: rebased.wordMap,
    templateSnapshot: project.templateSnapshot ??
      project.template ?? {
        id: project.templateId,
        styleId,
        clientId: project.clientId ?? null,
      },
  };
  origin.templateSnapshotHash = templateHash(origin.templateSnapshot);
  const existing = await readFile(directory, "utf8")
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
  if (existing) {
    let saved;
    try {
      saved = JSON.parse(
        await readFile(await safePath(ctx.root, rel + "/origin.json"), "utf8"),
      );
    } catch {
      throw new Error("Brak poprawnego origin istniejącej rolki.");
    }
    if (!sameOrigin(saved, origin))
      throw new Error(
        "Niezgodny origin: rolka pochodzi z innego wycinka lub szablonu.",
      );
    const clip = await safePath(ctx.root, rel + "/source.mp4");
    await probeSource(clip, ctx);
    if (saved.clipHash && (await hashFile(clip)) !== saved.clipHash)
      throw new Error("Źródło istniejącej rolki zostało zmienione.");
    return { reelName, origin: saved, data: existing };
  }
  await ctx.report?.({ stage: "materialize", progress: null });
  const master = await safePath(ctx.root, source.masterPath),
    info = await probeSource(master, ctx),
    duration = local(candidate.sourceEnd - candidate.sourceStart);
  const dir = path.dirname(directory);
  await ensureDiskSpace(dir);
  const work = await safePath(ctx.root, rel + "/materialize-" + randomUUID());
  await mkdir(work);
  const clip = path.join(work, "source.mp4");
  const hdr = ["smpte2084", "arib-std-b67"].includes(info.colorTransfer);
  const filters = hdr
    ? `scale=in_color_matrix=bt2020:in_primaries=bt2020:in_transfer=${info.colorTransfer}:out_primaries=bt709:out_transfer=linear,format=gbrpf32le,tonemap=tonemap=hable:desat=0,scale=in_primaries=bt709:in_transfer=linear:out_color_matrix=bt709:out_primaries=bt709:out_transfer=bt709,format=yuv420p`
    : "format=yuv420p";
  await runMediaTool(
    "ffmpeg",
    [
      "-hide_banner",
      "-v",
      "error",
      "-y",
      "-i",
      master,
      "-ss",
      String(candidate.sourceStart),
      "-t",
      String(duration),
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-vf",
      filters,
      "-r",
      "30",
      "-fps_mode",
      "cfr",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-af",
      "asetpts=PTS-STARTPTS",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-colorspace",
      "bt709",
      "-movflags",
      "+faststart",
      clip,
    ],
    ctx,
  );
  const cut = await probeSource(clip, ctx);
  if (
    Math.abs(cut.duration - duration) > 0.15 ||
    cut.videoCodec !== "h264" ||
    cut.audioCodec !== "aac"
  )
    throw new Error("Wycinek nie ma poprawnej długości lub kodeków H.264/AAC.");
  origin.clipHash = await hashFile(clip);
  let catalog = [];
  if (project.clientId) {
    mediaId(project.clientId);
    const prefs = await safePath(
      ctx.root,
      `klienci/${project.clientId}/PREFERENCJE.md`,
    );
    const preferences = await readFile(prefs, "utf8");
    await writeFile(path.join(work, "preferences.snapshot.md"), preferences);
    const catalogFile = await safePath(
      ctx.root,
      `klienci/${project.clientId}/produkty/produkty.json`,
    );
    catalog = await readFile(catalogFile, "utf8")
      .then(JSON.parse)
      .catch((e) => {
        if (e.code === "ENOENT") return [];
        throw e;
      });
  }
  const data = buildCandidateReel({
    words: rebased.words,
    duration,
    styleId,
    clientId: project.clientId,
    width: info.width,
    height: info.height,
    catalog,
  });
  data.outputResolution = project.outputResolution ?? 1080;
  Object.assign(
    data,
    await detectPortraitFraming(
      clip,
      work,
      duration,
      info.width,
      info.height,
      ctx,
      rebased.words,
      styleId,
    ),
  );
  for (const overlay of data.overlays) {
    const product = catalog.find(
      (p) => path.basename(p.file ?? "") === overlay.src,
    );
    for (const key of ["file", "logo"])
      if (product?.[key]) {
        const clientBase = `klienci/${project.clientId}/`;
        const relative = path.posix.normalize(
          `${clientBase}produkty/${product[key]}`,
        );
        if (!relative.startsWith(clientBase))
          throw new Error("Asset produktu poza katalogiem klienta.");
        const input = await safePath(ctx.root, relative);
        await copyFile(input, path.join(work, path.basename(product[key])));
      }
  }
  await writeMediaJson(path.join(work, "origin.json"), origin);
  await writeMediaJson(path.join(work, "transcript.json"), rebased.words);
  await writeMediaJson(path.join(work, "reel.json"), data);
  // Finalize reel.json last, so a partial materialization never looks ready.
  for (const name of [
    "source.mp4",
    "origin.json",
    "transcript.json",
    ...(project.clientId ? ["preferences.snapshot.md"] : []),
  ])
    await rename(
      path.join(work, name),
      await safePath(ctx.root, rel + "/" + name),
    );
  for (const overlay of data.overlays) {
    for (const file of [overlay.src, overlay.logo].filter(Boolean)) {
      const temp = path.join(work, path.basename(file));
      if (await stat(temp).catch(() => null))
        await rename(
          temp,
          await safePath(ctx.root, rel + "/" + path.basename(file)),
        );
    }
  }
  await rename(path.join(work, "reel.json"), directory);
  await ctx.checkpoint?.("materialize", [
    rel + "/reel.json",
    rel + "/origin.json",
    rel + "/source.mp4",
  ]);
  return { reelName, origin, data };
}
