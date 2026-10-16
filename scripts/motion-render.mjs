import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateMotion, productionReady } from "../src/motion/schema.mjs";
import { packageMotionSource } from './motion-source.mjs';
import {
  createMotionStore,
  outputDir,
  renderSignature,
  previewEvidence,
} from "../ui/motion-server.mjs";
const exec = promisify(execFile);
export function renderPlan(data, format, mode) {
  const d = validateMotion(data);
  if (
    !["preview", "draft", "final"].includes(mode) ||
    !d.formats.includes(format)
  )
    throw new Error("Zły format/tryb");
  return {
    codec: "h264",
    crf: 16,
    pixelFormat: "yuv420p",
    composition: "Motion-" + format.replace(":", "x"),
    frames: d.shots.map((s) => Math.round(((s.start + s.end) / 2) * d.fps)),
    audioTarget: -14,
    prefix: format.replace(":", "x") + "-" + mode,
  };
}
export async function renderMotion(
  root,
  name,
  format = "9:16",
  mode = "preview",
) {
  const store = createMotionStore(root);
  const data = await store.get(name);
  const signature = await renderSignature(root,data);
  const plan = renderPlan(data, format, mode);
  if (mode === "final" && !productionReady(data))
    throw new Error("Potrzeba 3 recenzji ≥8");
  if (mode === "final" && !(await previewEvidence(root, data, format)))
    throw new Error("Najpierw wyrenderuj podgląd formatu");
  const dir = outputDir(root, data);
  await fs.mkdir(dir, { recursive: true });
  const base = path.join(dir, plan.prefix);
  const props = { data, draft: mode !== "final" };
  await fs.writeFile(base + "-source.json", JSON.stringify(data, null, 2));
  const { bundle } = await import("@remotion/bundler");
  const { selectComposition, renderStill, renderMedia } =
    await import("@remotion/renderer");
  console.log("Bundlowanie Motion Studio…");
  const serveUrl = await bundle({
    entryPoint: path.join(root, "src/motion/index.tsx"),
    publicDir: path.join(root, "public"),
  });
  const composition = await selectComposition({
    serveUrl,
    id: plan.composition,
    inputProps: props,
  });
  for (const [i, frame] of plan.frames.entries()) {
    console.log(`Kontrola ${i + 1}/${plan.frames.length}: frame ${frame}`);
    await renderStill({
      serveUrl,
      composition,
      inputProps: props,
      frame,
      output: base + `-shot-${i.toString().padStart(2, "0")}.png`,
      scale: 0.4,
    });
  }
  await fs.copyFile(base + "-shot-00.png", base + "-poster.png");
  await exec("ffmpeg", [
    "-y",
    "-framerate",
    "1",
    "-i",
    base + "-shot-%02d.png",
    "-vf",
    `scale=240:-1,tile=${Math.min(3, plan.frames.length)}x${Math.ceil(plan.frames.length / 3)}`,
    "-frames:v",
    "1",
    base + "-contact.png",
  ]);
  await exec("ffmpeg", [
    "-y",
    "-i",
    base + "-poster.png",
    "-vf",
    "scale=360:-1",
    "-frames:v",
    "1",
    base + "-phone.png",
  ]);
  if (mode !== "preview") {
    const output = base + "-raw.mp4";
    console.log("Render H.264 CRF16 yuv420p…");
    await renderMedia({
      serveUrl,
      composition,
      inputProps: props,
      outputLocation: output,
      codec: plan.codec,
      crf: plan.crf,
      pixelFormat: plan.pixelFormat,
      concurrency: 2,
      onProgress: (p) => {
        if (p.renderedFrames % 60 === 0)
          console.log(`${p.renderedFrames}/${composition.durationInFrames}`);
      },
    });
    if (data.music) {
      console.log("Normalizacja muzyki: −14 LUFS, true peak −1 dB");
      const measured = await exec(
        "ffmpeg",
        [
          "-i",
          output,
          "-af",
          "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
          "-f",
          "null",
          "-",
        ],
        { maxBuffer: 10 * 1024 * 1024 },
      );
      const match = measured.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
      if (!match) throw new Error("Brak pomiaru LUFS");
      const m = JSON.parse(match[0]);
      const filter = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
      const normalized = await exec(
        "ffmpeg",
        [
          "-y",
          "-i",
          output,
          "-vf",
          "scale=in_range=pc:out_range=tv",
          "-color_range",
          "tv",
          "-c:v",
          "libx264",
          "-crf",
          "16",
          "-pix_fmt",
          "yuv420p",
          "-af",
          filter,
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          base + ".mp4",
        ],
        { maxBuffer: 10 * 1024 * 1024 },
      );
      await fs.writeFile(
        base + "-audio.json",
        JSON.stringify(
          {
            targetLUFS: -14,
            measurement: m,
            normalizationLog: normalized.stderr,
          },
          null,
          2,
        ),
      );
    } else {
      await exec(
        "ffmpeg",
        [
          "-y",
          "-i",
          output,
          "-vf",
          "scale=in_range=pc:out_range=tv",
          "-color_range",
          "tv",
          "-c:v",
          "libx264",
          "-crf",
          "16",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          base + ".mp4",
        ],
        { maxBuffer: 10 * 1024 * 1024 },
      );
    }
    await fs.unlink(output);
  }
  await fs.writeFile(
    base + "-review.json",
    JSON.stringify(
      {
        label:
          mode === "final" ? "production-ready" : "DRAFT — niezatwierdzony",
        manualReviews: data.reviews,
        beatGrid: data.beatGrid,
        audio: data.music
          ? "two-pass loudnorm target -14 LUFS"
          : "Brak audio; nie wykonano pomiarów",
        reference: data.reference,
      },
      null,
      2,
    ),
  );
  // Preserve import paths and only include explicitly used assets.
  await packageMotionSource(root,data,base+'-clean-source.zip',plan.composition,mode);
  if(await renderSignature(root,data)!==signature) throw new Error('Źródła lub assety zmieniły się podczas renderu. Wyrenderuj ponownie; kontrola nie została zatwierdzona.');
  await fs.writeFile(
    base + "-evidence.json",
    JSON.stringify(
      { hash: signature, format, mode, frames: plan.frames },
      null,
      2,
    ),
  );
  console.log("Gotowe: " + base);
  return base;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(import.meta.dirname, "..");
  renderMotion(root, ...process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
