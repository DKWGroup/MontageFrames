// LongForm: render ze snapshotu (zamrożone dane reel.json) do <nazwa>-vNNN.mp4, ffprobe po renderze, bez nadpisywania wersji.
// Kompozycja 16:9 w src/longform/index.ts; numeracja i bezpieczna publikacja wspólne z QuickContent.
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createProgressThrottle, nextRenderPath, publishVerifiedRender } from "./quickcontent-render.mjs";
import { probeSource } from "./quickcontent-ingest.mjs";

const durationOf = (data) => Math.round(data.segments.reduce((n, s) => n + s.end - s.start, 0) * (data.fps ?? 30)) / (data.fps ?? 30);

export function verifyLongFormRender(info, data) {
  const want = data.format ?? { width: 1080, height: 1920 };
  if (info.width !== want.width || info.height !== want.height) throw new Error("Render nie ma poprawnego obrazu (wymiary).");
  if (!info.audioCodec) throw new Error("Render nie ma ścieżki audio.");
  if (Math.abs(info.duration - durationOf(data)) > 0.15) throw new Error("Render ma złą długość.");
  return true;
}

// Publiczne pliki potrzebne do renderu, jako twarde linki (natychmiast, bez kopiowania gigabajtów źródła).
export async function snapshotPublic(root, reelName, out) {
  const link = async (from, to) => {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.link(from, to).catch((e) => (e.code === "EXDEV" ? fs.copyFile(from, to) : Promise.reject(e)));
  };
  const walk = async (rel, skip = () => false) => {
    for (const e of await fs.readdir(path.join(root, "public", rel), { withFileTypes: true }).catch(() => [])) {
      const r = path.join(rel, e.name);
      if (skip(e.name)) continue;
      if (e.isDirectory()) await walk(r, skip);
      else if (e.isFile()) await link(path.join(root, "public", r), path.join(out, r));
    }
  };
  await walk(path.join("reels", reelName), (n) => n.startsWith(".") || /\.(tmp|part)$/.test(n) || /^reel\.before/.test(n));
  await walk("fonts");
  await walk("sfx");
}

export async function renderLongForm({ reelName, data, editRevision }, ctx) {
  const dir = path.join(ctx.root, ".longform/render-snapshots", randomUUID());
  await snapshotPublic(ctx.root, reelName, path.join(dir, "public"));
  const output = await nextRenderPath(ctx.root, reelName, data.client ?? null);
  const temp = path.join(dir, "render.mp4");
  const input = path.join(dir, "input.json");
  await fs.writeFile(input, JSON.stringify({ root: ctx.root, reelName, data, temp, publicDir: path.join(dir, "public"), bundleDir: path.join(dir, "bundle") }));
  const report = createProgressThrottle((progress) => ctx.report({ stage: "render", progress, progressDetail: "Render filmu" }));
  report(0);
  await ctx.runTool(process.execPath, [fileURLToPath(import.meta.url), "--render-snapshot", input], {
    cwd: ctx.root,
    onLine: (line) => {
      try {
        const ev = JSON.parse(line);
        if (ev.type === "render-progress") report(ev.progress);
      } catch {
        /* diagnostyka renderera */
      }
    },
  });
  verifyLongFormRender(await probeSource(temp), data);
  await publishVerifiedRender(temp, path.join(ctx.root, output));
  await fs.rm(dir, { recursive: true, force: true }); // snapshot danych zostaje w rekordzie wersji
  return { file: output, version: Number(output.match(/-v(\d+)\.mp4$/)[1]), editRevision, verified: true, createdAt: new Date().toISOString() };
}

async function renderSnapshot(file) {
  const input = JSON.parse(await fs.readFile(file, "utf8"));
  const { bundle } = await import("@remotion/bundler");
  const { selectComposition, renderMedia } = await import("@remotion/renderer");
  const serveUrl = await bundle({ entryPoint: path.join(input.root, "src/longform/index.ts"), outDir: input.bundleDir, publicDir: input.publicDir });
  const inputProps = { reel: input.reelName, data: input.data };
  const composition = await selectComposition({ serveUrl, id: "LongFormRender", inputProps });
  const report = createProgressThrottle((progress) => process.stdout.write(JSON.stringify({ type: "render-progress", progress }) + "\n"));
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    crf: 18,
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    outputLocation: input.temp,
    onProgress: ({ progress }) => report(progress),
  });
  report(1);
}
// Tylko gdy ten plik jest uruchomiony wprost — moduł importuje też renderer drugiego trybu (ta sama flaga).
if (process.argv[2] === "--render-snapshot" && process.argv[1] === fileURLToPath(import.meta.url))
  renderSnapshot(process.argv[3]).catch((e) => {
    process.stderr.write(e.message + "\n");
    process.exitCode = 1;
  });
