import fs from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  safePath,
  hashFile,
  probeSource,
  writeMediaJson,
} from "./quickcontent-ingest.mjs";
import { outputDimensions } from "./quickcontent-portrait.mjs";
import { brandingRenderFiles } from "../src/branding/appearance.mjs";
const digestCache = new Map();
async function cachedHash(file) {
  const s = await fs.stat(file),
    key = `${s.size}:${s.mtimeMs}:${s.ctimeMs}`;
  const old = digestCache.get(file);
  if (old?.key === key) return old.hash;
  const hash = await hashFile(file);
  digestCache.set(file, { key, hash });
  return hash;
}
async function filesUnder(root, relative) {
  const dir = await safePath(root, relative);
  const items = await fs.readdir(dir, { withFileTypes: true }).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  const files = [];
  for (const item of items) {
    if (item.isSymbolicLink())
      throw new Error("Dowiązanie w assetach renderu jest niedozwolone");
    const rel = relative + "/" + item.name;
    if (item.isDirectory()) files.push(...(await filesUnder(root, rel)));
    else if (item.isFile()) files.push(rel);
  }
  return files.sort();
}
async function inputFiles(root, reelName, data) {
  const media =
    /\.(mp4|mov|m4v|webm|mkv|png|jpg|jpeg|webp|svg|gif|wav|mp3|m4a|ogg|ttf|otf|woff2?)$/i;
  // Styles import each other for shared tokens; keep that explicit dependency closure.
  const styleDependencies = {
    brand: ["brand"],
    persona: ["persona"],
    skyclass: ["skyclass"],
    herod: ["herod"],
    bisanz: ["bisanz", "skyclass"],
    ameryka: ["ameryka", "bisanz", "skyclass"],
    glowup: ["glowup", "ameryka", "bisanz", "skyclass"],
    vital: ["vital", "ameryka", "bisanz", "skyclass"],
    happynews: ["happynews", "glowup", "ameryka", "bisanz", "skyclass"],
  };
  const styles = styleDependencies[data?.style ?? "persona"];
  const source = (await filesUnder(root, "src")).filter(
    (f) =>
      !f.startsWith("src/studio/") &&
      !f.startsWith("src/motion/") &&
      (!styles ||
        !f.startsWith("src/styles/") ||
        styles.some((s) => f === `src/styles/${s}.tsx`)) &&
      f !== "src/Root.tsx" &&
      /\.(tsx?|mjs|json|css)$/.test(f),
  );
  const publicFiles = (
    await Promise.all(
      [
        `public/reels/${reelName}`,
        ...(data?.branding ? [] : ["public/fonts"]),
        "public/sfx",
        ...(data?.branding ? [] : ["public/Brandings"]),
      ].map((dir) => filesUnder(root, dir)),
    )
  )
    .flat()
    .filter(
      (f) => media.test(f) && !/^review-.*\.png$/i.test(path.basename(f)) &&
        // New immutable branding assets cannot affect unrelated legacy styles.
        !/^public\/Brandings\/[^/]+\/(?:fonts|assets)\/[a-f0-9]{64}\./.test(f),
    );
  for (const file of brandingRenderFiles(data?.branding)) {
    const relative = `public/${file}`;
    const checked = await safePath(root, relative);
    if (!(await fs.stat(checked)).isFile()) throw new Error("Brak pliku brandingu.");
    publicFiles.push(relative);
  }
  const config = [];
  for (const file of ["package.json", "scripts/quickcontent-render.mjs"])
    if (await fs.stat(path.join(root, file)).catch(() => null))
      config.push(file);
  return [...source, ...publicFiles, ...config];
}
export async function renderInputSignature(root, reelName, data) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(reelName))
    throw new Error("Nieprawidłowa nazwa rolki");
  const hash = createHash("sha256").update(JSON.stringify(data));
  for (const file of await inputFiles(root, reelName, data)) {
    hash.update(file);
    hash.update(await cachedHash(await safePath(root, file)));
  }
  return hash.digest("hex");
}
export const isCurrentRender = (render, editRevision, signature) =>
  Boolean(
    render?.verified &&
    render.renderRevision === editRevision &&
    render.signature === signature,
  );
export async function nextRenderPath(root, reelName, clientId) {
  if (
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(reelName) ||
    (clientId && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(clientId))
  )
    throw new Error("Nieprawidłowy identyfikator renderu");
  const rel = clientId ? `klienci/${clientId}/Render` : "out",
    dir = await safePath(root, rel + "/placeholder", { create: true });
  const names = await fs.readdir(path.dirname(dir));
  let version = 1;
  for (const name of names) {
    const match = name.match(new RegExp(`^${reelName}-v(\\d+)\\.mp4$`));
    if (match) version = Math.max(version, Number(match[1]) + 1);
  }
  return `${rel}/${reelName}-v${String(version).padStart(3, "0")}.mp4`;
}
const durationOf = (data) =>
  Math.max(
    1,
    Math.round(
      data.segments.reduce((n, s) => n + s.end - s.start, 0) * (data.fps ?? 30),
    ),
  ) / (data.fps ?? 30);
export function verifyRenderInfo(info, data) {
  const size = outputDimensions(data.outputResolution);
  if (
    info.width !== size.width ||
    info.height !== size.height ||
    !info.audioCodec ||
    Math.abs(info.duration - durationOf(data)) > 0.15
  )
    throw new Error("Render nie ma poprawnego obrazu, audio lub długości");
  return true;
}
export function createProgressThrottle(emit, now = () => Date.now()) {
  let lastTime = -Infinity,
    lastValue = -1;
  return (progress) => {
    if (
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 1 ||
      progress <= lastValue
    )
      return;
    const time = now();
    if (progress !== 1 && time - lastTime < 250) return;
    lastTime = time;
    lastValue = progress;
    emit(progress);
  };
}
export async function publishVerifiedRender(
  temporary,
  output,
  operations = fs,
) {
  let staging;
  try {
    try {
      await operations.link(temporary, output);
    } catch (error) {
      if (error.code !== "EXDEV") throw error;
      staging = path.join(
        path.dirname(output),
        `.${path.basename(output)}.${randomUUID()}.tmp`,
      );
      await operations.copyFile(temporary, staging, constants.COPYFILE_EXCL);
      await operations.link(staging, output);
    }
    // Detach the source path so retry cannot mutate a published hardlink.
    await operations.unlink(temporary);
  } finally {
    if (staging)
      await operations.unlink(staging).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
  }
}
export async function renderReelSnapshot(
  { reelName, data, editRevision, outFile },
  ctx,
) {
  const checkCancelled = () => ctx.signal?.throwIfAborted();
  checkCancelled();
  const signature = await renderInputSignature(ctx.root, reelName, data),
    id = ctx.jobId ?? randomUUID();
  checkCancelled();
  const directory = `.quickcontent/render-snapshots/${id}`,
    metadata = await safePath(ctx.root, directory + "/input.json", {
      create: true,
    });
  const publicDir = await safePath(
    ctx.root,
    directory + "/public/placeholder",
    { create: true },
  );
  for (const file of (await inputFiles(ctx.root, reelName, data)).filter((f) =>
    f.startsWith("public/"),
  )) {
    const dest = await safePath(ctx.root, `${directory}/${file}`, {
      create: true,
    });
    checkCancelled();
    await fs.copyFile(await safePath(ctx.root, file), dest);
    checkCancelled();
  }
  const output =
    outFile ?? (await nextRenderPath(ctx.root, reelName, data.client ?? null));
  const out = await safePath(ctx.root, output, { create: true });
  const temp = `${directory}/render.mp4`;
  const input = {
    root: ctx.root,
    reelName,
    data,
    editRevision,
    signature,
    output,
    temp,
    publicDir: path.dirname(publicDir),
    bundleDir: `${directory}/bundle`,
  };
  await writeMediaJson(metadata, input);
  let progressReports = Promise.resolve(),
    progressError;
  const reportProgress = createProgressThrottle((progress) => {
    progressReports = progressReports
      .then(() => ctx.report({ stage: "render", progress }))
      .catch((error) => {
        progressError ??= error;
      });
  });
  reportProgress(0);
  await progressReports;
  if (progressError) throw progressError;
  checkCancelled();
  await ctx.runTool(
    process.execPath,
    [fileURLToPath(import.meta.url), "--render-snapshot", metadata],
    {
      cwd: ctx.root,
      onLine: (line) => {
        try {
          const event = JSON.parse(line);
          if (event.type === "render-progress") reportProgress(event.progress);
        } catch {
          /* renderer diagnostics */
        }
      },
    },
  );
  reportProgress(1);
  await progressReports;
  if (progressError) throw progressError;
  checkCancelled();
  const tmp = await safePath(ctx.root, temp);
  const info = await probeSource(tmp, ctx);
  checkCancelled();
  verifyRenderInfo(info, data);
  // Never overwrite an existing numbered output even if an external renderer used it meanwhile.
  await publishVerifiedRender(tmp, out);
  const record = {
    filePath: output,
    renderRevision: editRevision,
    signature,
    verified: true,
    createdAt: new Date().toISOString(),
    snapshotPath: path.relative(ctx.root, metadata),
  };
  await writeMediaJson(
    await safePath(ctx.root, directory + "/result.json"),
    record,
  );
  checkCancelled();
  await ctx.checkpoint("render", [output, directory + "/result.json"]);
  return record;
}
async function renderSnapshot(file) {
  const input = JSON.parse(await fs.readFile(file, "utf8"));
  const { bundle } = await import("@remotion/bundler");
  const { selectComposition, renderMedia } = await import("@remotion/renderer");
  const outDir = await safePath(input.root, input.bundleDir + "/placeholder", {
    create: true,
  });
  const serveUrl = await bundle({
    entryPoint: path.join(input.root, "src/quickcontent/index.ts"),
    outDir: path.dirname(outDir),
    publicDir: input.publicDir,
  });
  const inputProps = { reel: input.reelName, data: input.data };
  const composition = await selectComposition({
    serveUrl,
    id: "QuickContentRender",
    inputProps,
  });
  const reportProgress = createProgressThrottle((progress) =>
    process.stdout.write(
      JSON.stringify({ type: "render-progress", progress }) + "\n",
    ),
  );
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    scale: outputDimensions(input.data.outputResolution).scale,
    codec: "h264",
    crf: 18,
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    outputLocation: await safePath(input.root, input.temp, { create: true }),
    onProgress: ({ progress }) => reportProgress(progress),
  });
  reportProgress(1);
}
// Tylko gdy ten plik jest uruchomiony wprost — moduł importuje też renderer drugiego trybu (ta sama flaga).
if (
  process.argv[2] === "--render-snapshot" &&
  process.argv[1] === fileURLToPath(import.meta.url)
)
  renderSnapshot(process.argv[3]).catch((error) => {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  });
