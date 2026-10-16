import { buildHappyLayouts } from "../src/quickcontent/layout.mjs";
import process from "node:process";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { safePath } from "./quickcontent-ingest.mjs";
import { buildSpeakerTracking, speakerNote } from "./quickcontent-speaker.mjs";
const clamp = (n) => Math.min(1, Math.max(0, n));
export function outputDimensions(resolution = 1080) {
  if (![720, 1080, 2160].includes(resolution))
    throw new Error("Wybierz rozdzielczość pionową 720p, 1080p lub 4K.");
  return {
    width: resolution,
    height: (resolution * 16) / 9,
    scale: resolution / 1080,
  };
}
export function faceFraming(faces, width, height) {
  const face = faces
    .filter(
      (f) =>
        [f.x, f.y, f.width, f.height].every(Number.isFinite) &&
        f.width > 0 &&
        f.height > 0 &&
        f.x >= 0 &&
        f.y >= 0 &&
        f.x + f.width <= 1.001 &&
        f.y + f.height <= 1.001,
    )
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const ratio = 9 / 16 / (width / height);
  return {
    mode: "crop",
    centerX:
      face && ratio < 1
        ? clamp((face.x + face.width / 2 - ratio / 2) / (1 - ratio))
        : 0.5,
    centerY:
      face && ratio > 1
        ? clamp((face.y + face.height / 2 - 1 / ratio / 2) / (1 - 1 / ratio))
        : 0.5,
  };
}
export function buildFaceTracking(samples, width, height, duration) {
  let previous;
  const positions = [];
  for (const [index, faces] of samples.entries()) {
    const valid = faces.filter(
      (f) =>
        [f.x, f.y, f.width, f.height].every(Number.isFinite) &&
        f.width > 0 &&
        f.height > 0 &&
        f.x >= 0 &&
        f.y >= 0 &&
        f.x + f.width <= 1.001 &&
        f.y + f.height <= 1.001,
    );
    // Prefer continuity over another large face entering the frame.
    valid.sort((a, b) =>
      previous
        ? Math.abs(a.x + a.width / 2 - previous.x - previous.width / 2) -
          Math.abs(b.x + b.width / 2 - previous.x - previous.width / 2)
        : b.width * b.height - a.width * a.height,
    );
    const face = valid[0] ?? previous;
    if (!face) continue;
    previous = face;
    positions.push({
      time: Math.min(duration, index + 0.5),
      ...faceFraming([face], width, height),
      scale: Math.max(0.55, Math.min(1, 0.34 / face.height)),
    });
  }
  if (!positions.length) return faceFraming([], width, height);
  const points = positions.map((p, i) => {
    const window = positions.slice(Math.max(0, i - 1), i + 2);
    const median = (key) =>
      window.map((x) => x[key]).sort((a, b) => a - b)[
        Math.floor(window.length / 2)
      ];
    return {
      time: p.time,
      centerX: median("centerX"),
      centerY: median("centerY"),
      scale: median("scale"),
    };
  });
  for (let i = 1; i < points.length; i++) {
    for (const key of ["centerX", "centerY", "scale"]) {
      const delta = points[i][key] - points[i - 1][key];
      points[i][key] =
        points[i - 1][key] +
        (Math.abs(delta) < 0.006
          ? 0
          : Math.max(-0.12, Math.min(0.12, delta * 0.65)));
    }
  }
  const first = points[0];
  if (first.time > 0) points.unshift({ ...first, time: 0 });
  if (points.at(-1).time < duration)
    points.push({ ...points.at(-1), time: duration });
  return {
    mode: "crop",
    centerX: first.centerX,
    centerY: first.centerY,
    trackingEnabled: true,
    tracking: points,
  };
}
// Próbki twarzy co 1/SAMPLE_FPS s (ruch ust wymaga kilku klatek na sekundę), maks. MAX_FRAMES klatek.
const SAMPLE_FPS = 4;
const MAX_FRAMES = 2400;
const SCENE_CUT = 0.3; // próg ffmpeg scene: powyżej = cięcie kamery
export async function detectPortraitFraming(
  clip,
  work,
  duration,
  width,
  height,
  ctx,
  words = [],
  styleId,
) {
  let samples = [],
    panels = [];
  const cuts = [];
  const fps = Math.min(SAMPLE_FPS, MAX_FRAMES / Math.max(1, duration));
  if (process.platform === "darwin") {
    try {
      await ctx.report?.({
        stage: "framing",
        progress: null,
        progressDetail: "Cięcia kamer i twarze — lokalna analiza, kto mówi",
      });
      await ctx.runTool(
        "ffmpeg",
        [
          "-hide_banner",
          "-nostats",
          "-i",
          clip,
          "-an",
          "-vf",
          `scale=320:-2,select='gt(scene,${SCENE_CUT})',showinfo`,
          "-f",
          "null",
          "-",
        ],
        {
          onLine: (line) => {
            const t = line.match(/Parsed_showinfo.*pts_time:([\d.]+)/)?.[1];
            if (t) cuts.push(Number(t));
          },
        },
      );
      await ctx.runTool("ffmpeg", [
        "-hide_banner",
        "-v",
        "error",
        "-y",
        "-i",
        clip,
        "-an",
        "-vf",
        `fps=${fps},scale=960:-2`,
        "-frames:v",
        String(Math.ceil(duration * fps)),
        path.join(work, "tracking-%05d.jpg"),
      ]);
      const frames = (await readdir(work))
        .filter((f) => /^tracking-\d+\.jpg$/.test(f))
        .sort()
        .map((f) => path.join(work, f));
      if (frames.length) {
        const result = await ctx.runTool(
          "swift",
          [
            "-module-cache-path",
            path.dirname(
              await safePath(
                ctx.root,
                ".quickcontent/tools/swift-cache/placeholder",
                { create: true },
              ),
            ),
            fileURLToPath(
              new URL("./quickcontent-face.swift", import.meta.url),
            ),
            ...(styleId === "happynews" ? ["--with-panels"] : []),
            ...frames,
          ],
          { maxOutputBytes: 8 * 1024 * 1024 },
        );
        const detected = JSON.parse(result.stdout);
        samples = Array.isArray(detected) ? detected : detected.samples;
        panels = detected.panels ?? [];
      }
    } catch (error) {
      if (ctx.signal?.aborted) throw error;
    }
  }
  if (!samples.some((faces) => faces.length))
    return {
      framing: faceFraming([], width, height),
      framingNote:
        "Kadr9:16 wyśrodkowany — detektor nie znalazł twarzy lub jest niedostępny. Ustaw pozycję ręcznie.",
    };
  const { framing, shots } = buildSpeakerTracking({
    responsive: styleId === "happynews",
    samples,
    fps,
    cuts,
    speech: words.map((w) => [w.start, w.end]),
    width,
    height,
    duration,
  });
  if (styleId === "happynews") {
    framing.sourceAspect = width / height;
    framing.layouts = buildHappyLayouts({
      samples,
      panels,
      fps,
      duration,
      cuts,
      speech: words.map((w) => [w.start, w.end]),
    });
  }
  return {
    framing,
    framingNote:
      speakerNote(shots) +
      (framing.layouts?.length
        ? " Układy Happy News: osobne kadry prowadzących i widocznego ekranu z przebitką, synchronicznie ze źródłem."
        : ""),
  };
}
