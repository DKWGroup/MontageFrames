// LongForm L4: maska osoby (Apple Vision, scripts/longform-mask.swift) → wycięta osoba jako WebM VP9 z alfą.
// Liczona tylko dla zakresów efektów z maską; wynik w public/reels/<id>/assets/masks/<od>-<do>/cutout.webm (cache).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

const SWIFT = fileURLToPath(new URL("./longform-mask.swift", import.meta.url));

// Zakres maski w czasie źródła, wyrównany do klatek, z zapasem 0,1 s na wejście/wyjście efektu.
export function maskRange(start, end, fps, duration = Infinity) {
  const from = Math.max(0, Math.floor((start - 0.1) * fps)) / fps;
  const to = Math.min(Math.ceil((end + 0.1) * fps) / fps, duration);
  return { from: Math.round(from * 1000) / 1000, to: Math.round(to * 1000) / 1000, key: `${from.toFixed(2)}-${to.toFixed(2)}` };
}

// Binarka kompilowana raz (swiftc -O; interpreter `swift` jest dużo wolniejszy w pętlach po pikselach).
async function maskTool(root, ctx) {
  const bin = path.join(root, ".longform/tools/longform-mask");
  const [src, out] = await Promise.all([fs.stat(SWIFT), fs.stat(bin).catch(() => null)]);
  if (out && out.mtimeMs >= src.mtimeMs) return bin;
  await fs.mkdir(path.dirname(bin), { recursive: true });
  await ctx.runTool("swiftc", ["-O", "-swift-version", "5", "-module-cache-path", path.join(root, ".longform/tools/swift-cache"), SWIFT, "-o", bin], { cwd: root });
  return bin;
}

// onProgress(done, total) — prawdziwe klatki przetworzone przez Vision.
export async function buildMask({ root, reelDir, source, start, end, fps, width, height, duration }, ctx, onProgress = () => {}) {
  if (process.platform !== "darwin") throw new Error("maska osoby wymaga macOS (Apple Vision)");
  const { from, to, key } = maskRange(start, end, fps, duration);
  const rel = `assets/masks/${key}/cutout.webm`;
  const file = path.join(reelDir, rel);
  if (await fs.stat(file).catch(() => null)) return { src: rel, from, cached: true };
  const work = path.join(path.dirname(file), "frames");
  await fs.rm(work, { recursive: true, force: true });
  const bin = await maskTool(root, ctx);
  let pts = from;
  await ctx.runTool(bin, [path.join(reelDir, source), String(from), String(to), work], {
    cwd: root,
    onLine: (line) => {
      try {
        const ev = JSON.parse(line);
        if (ev.type === "start") pts = ev.pts;
        if (ev.type === "progress") onProgress(ev.done, ev.total);
      } catch {
        /* diagnostyka */
      }
    },
  });
  // Maska Vision ma własną rozdzielczość (np. 2016×1512) — skala do kadru; alfa = maska, VP9 yuva420p.
  const tmp = `${file}.part.webm`;
  await ctx.runTool(
    "ffmpeg",
    [
      "-v", "error", "-y", "-ss", String(pts), "-i", path.join(reelDir, source), "-framerate", String(fps), "-i", path.join(work, "%06d.png"),
      "-filter_complex", `[1]scale=${width}:${height}:flags=bicubic,format=gray[m];[0:v][m]alphamerge,format=yuva420p`,
      "-frames:v", String(Math.round((to - from) * fps)),
      "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "24", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-an", tmp,
    ],
    { cwd: root },
  );
  await fs.rename(tmp, file);
  await fs.rm(work, { recursive: true, force: true });
  return { src: rel, from, cached: false };
}
