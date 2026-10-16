import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, constants } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  statfs,
  unlink,
  writeFile,
} from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { URL } from "node:url";
import process from "node:process";

export const mediaId = (id) => {
  if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id))
    throw new Error("Nieprawidłowy identyfikator materiału.");
  return id;
};
export async function safePath(root, relative, { create = false } = {}) {
  if (
    typeof relative !== "string" ||
    path.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.split("/").some((s) => s === ".." || s === "")
  )
    throw new Error("Niedozwolona ścieżka materiału.");
  const base = await realpath(root);
  let current = base;
  const parts = relative.split("/");
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    try {
      const s = await lstat(current);
      if (s.isSymbolicLink())
        throw new Error("Symlink w ścieżce materiału jest niedozwolony.");
      const resolved = await realpath(current);
      if (resolved !== base && !resolved.startsWith(base + path.sep))
        throw new Error("Ścieżka poza katalogiem projektu.");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      if (create && i < parts.length - 1)
        await mkdir(current).catch((e) => {
          if (e.code !== "EEXIST") throw e;
        });
    }
  }
  return current;
}
export async function runMediaTool(executable, args, ctx = {}) {
  ctx.signal?.throwIfAborted();
  // Launchers may inject another Python venv, which breaks Homebrew yt-dlp/Whisper imports.
  const env = ["yt-dlp", "whisper"].includes(path.basename(executable))
    ? { PYTHONPATH: undefined, PYTHONHOME: undefined }
    : {};
  if (ctx.runTool) {
    const result = await ctx.runTool(executable, args, {
      cwd: ctx.root,
      onLine: ctx.onLine,
      maxBuffer: 32 * 1024 * 1024,
      env,
    });
    if (result.exitCode != null && result.exitCode !== 0)
      throw new Error(`${executable}: niepowodzenie (${result.exitCode}).`);
    if (result.outputTruncated)
      throw new Error(`${executable}: zbyt duży wynik narzędzia (truncated).`);
    return result;
  }
  return new Promise((resolve, reject) => {
    const p = spawn(executable, args, {
      cwd: ctx.root,
      signal: ctx.signal,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "",
      stderr = "";
    p.stdout.on("data", (b) => {
      stdout += b;
      ctx.onLine?.(String(b));
    });
    p.stderr.on("data", (b) => {
      stderr += b;
      ctx.onLine?.(String(b));
    });
    p.on("error", reject);
    p.on("close", (exitCode) =>
      exitCode === 0
        ? resolve({ exitCode, stdout, stderr })
        : reject(
            new Error(
              `${executable}: niepowodzenie (${exitCode}). ${stderr.slice(-1000)}`,
            ),
          ),
    );
  });
}
export async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest("hex");
}
export async function writeMediaJson(file, value) {
  const temp = file + "." + randomUUID() + ".tmp";
  await writeFile(temp, JSON.stringify(value, null, 2), { flag: "wx" });
  await rename(temp, file);
}
export async function probeSource(file, ctx = {}) {
  const { stdout, stderr } = await runMediaTool(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_packets",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      file,
    ],
    ctx,
  );
  if (stderr?.trim())
    throw new Error(
      "Plik jest uszkodzony lub niekompletny: " + stderr.slice(-1000),
    );
  let info;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new Error("ffprobe zwrócił nieprawidłowe metadane.");
  }
  const video = info.streams?.find((s) => s.codec_type === "video"),
    audio = info.streams?.find((s) => s.codec_type === "audio");
  const duration = Number(info.format?.duration);
  if (
    !video ||
    !Number.isFinite(video.width) ||
    video.width <= 0 ||
    !Number.isFinite(video.height) ||
    video.height <= 0 ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    throw new Error("Plik nie zawiera poprawnego filmu.");
  if (!audio) throw new Error("Film nie zawiera dźwięku audio.");
  return {
    width: video.width,
    height: video.height,
    duration,
    videoCodec: video.codec_name,
    audioCodec: audio.codec_name,
    fps: video.avg_frame_rate ?? video.r_frame_rate,
    colorTransfer: video.color_transfer,
    colorPrimaries: video.color_primaries,
    pixelFormat: video.pix_fmt,
    audioLanguage: audio.tags?.language ?? null,
    streams: info.streams,
  };
}
export function normalizeYouTubeUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new Error("Podaj poprawny link YouTube.");
  }
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.port ||
    !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
      u.hostname,
    )
  )
    throw new Error("Dozwolone są wyłącznie linki do filmu YouTube.");
  const id =
    u.hostname === "youtu.be"
      ? u.pathname.slice(1)
      : u.pathname === "/watch"
        ? u.searchParams.get("v")
        : u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)$/)?.[1];
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id ?? ""))
    throw new Error("Link nie wskazuje pojedynczego filmu YouTube.");
  return `https://www.youtube.com/watch?v=${id}`;
}
export async function ensureDiskSpace(dir, bytes = 100 * 1024 * 1024) {
  const info = await statfs(dir);
  if (info.bavail * info.bsize < bytes)
    throw new Error(
      "Za mało miejsca na dysku na kolejny etap. Zwolnij miejsce i ponów.",
    );
}
export async function acceptUpload(req, { root, fileName, runTool, signal }) {
  if (
    typeof fileName !== "string" ||
    fileName.length > 255 ||
    path.basename(fileName) !== fileName ||
    fileName.includes("\\") ||
    !/^.+\.(mp4|mov|mkv|webm|m4v|avi)$/i.test(fileName)
  )
    throw new Error("Wybierz plik filmowy MP4, MOV, MKV lub WebM.");
  const uploadId = randomUUID(),
    rel = `.quickcontent/uploads/${uploadId}`,
    file = await safePath(root, rel + path.extname(fileName).toLowerCase(), {
      create: true,
    }),
    part = file + ".part";
  await ensureDiskSpace(path.dirname(file));
  let bytes = 0,
    nextCheck = 64 * 1024 * 1024;
  const monitor = new Transform({
    transform(chunk, enc, done) {
      bytes += chunk.length;
      if (bytes < nextCheck) return done(null, chunk);
      nextCheck += 64 * 1024 * 1024;
      ensureDiskSpace(path.dirname(file)).then(() => done(null, chunk), done);
    },
  });
  try {
    await pipeline(req, monitor, createWriteStream(part, { flags: "wx" }), {
      signal,
    });
    if (!bytes) throw new Error("Plik jest pusty.");
    const media = await probeSource(part, { root, runTool, signal });
    const hash = await hashFile(part);
    await rename(part, file);
    await writeMediaJson(await safePath(root, rel + ".json"), {
      uploadId,
      fileName,
      path: path.relative(await realpath(root), file),
      bytes,
      hash,
      media,
    });
    return { uploadId };
  } catch (e) {
    await unlink(part).catch(() => {});
    throw e;
  }
}
function chooseFormats(info, resolution) {
  const video = info.formats
    ?.filter(
      (f) =>
        f.vcodec &&
        f.vcodec !== "none" &&
        f.acodec === "none" &&
        Number.isFinite(f.width) &&
        Number.isFinite(f.height) &&
        Math.min(f.width, f.height) <= resolution &&
        Math.max(f.width, f.height) <= (resolution * 16) / 9,
    )
    .sort(
      (a, b) =>
        Math.min(b.width, b.height) - Math.min(a.width, a.height) ||
        (b.tbr ?? 0) - (a.tbr ?? 0),
    )[0];
  const audioFormats =
    info.formats?.filter(
      (f) => f.vcodec === "none" && f.acodec && f.acodec !== "none",
    ) ?? [];
  const originals = audioFormats.filter(
    (f) =>
      /original/i.test(f.format_note ?? "") || f.language_preference === 10,
  );
  const undubbed = audioFormats.filter(
    (f) =>
      !/dubbed|descriptive|audio description/i.test(f.format_note ?? "") &&
      // yt-dlp uses -1 for an unlabelled track, -10 for audio description.
      (f.language_preference ?? -1) >= -1,
  );
  const audio = (originals.length ? originals : undubbed).sort(
    (a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0),
  )[0];
  if (!video || !audio)
    throw new Error(
      "Brak oddzielnego obrazu lub oryginalnej ścieżki audio w dostępnych formatach YouTube.",
    );
  if (
    !/^[a-zA-Z0-9_-]+$/.test(video.format_id) ||
    !/^[a-zA-Z0-9_-]+$/.test(audio.format_id)
  )
    throw new Error("Nieprawidłowe identyfikatory formatów YouTube.");
  return { video, audio };
}
export async function ingestSource(project, ctx) {
  const id = mediaId(project.id);
  if (project.clientId) {
    mediaId(project.clientId);
    const client = await safePath(ctx.root, `klienci/${project.clientId}`);
    if (!(await stat(client).catch(() => null))?.isDirectory())
      throw new Error("Katalog wybranego klienta nie istnieje.");
  }
  const dataDir = project.clientId
    ? `klienci/${project.clientId}/QuickContent/${id}`
    : `.quickcontent/workspace/${id}`;
  const sourceFile = await safePath(ctx.root, `${dataDir}/source.json`, {
    create: true,
  });
  const cached = await readFile(sourceFile, "utf8")
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
  if (cached) {
    const master = await safePath(ctx.root, cached.masterPath);
    if ((await hashFile(master)) !== cached.hash)
      throw new Error("Master zmienił się od zapisania projektu.");
    await probeSource(master, ctx);
    await probeSource(await safePath(ctx.root, cached.proxyPath), ctx);
    return cached;
  }
  await ensureDiskSpace(path.dirname(sourceFile));
  let masterPath,
    title,
    metadata,
    audioLanguage = null,
    warnings = [],
    formats = {};
  if (project.sourceKind === "upload") {
    const upload = JSON.parse(
      await readFile(
        await safePath(
          ctx.root,
          `.quickcontent/uploads/${mediaId(project.uploadId)}.json`,
        ),
        "utf8",
      ),
    );
    const input = await safePath(ctx.root, upload.path);
    if ((await hashFile(input)) !== upload.hash)
      throw new Error("Wgrany plik zmienił się przed importem.");
    masterPath = `${dataDir}/master${path.extname(input)}`;
    const master = await safePath(ctx.root, masterPath);
    const present = await stat(master).catch(() => null);
    if (!present) {
      await ensureDiskSpace(
        path.dirname(master),
        upload.bytes + 100 * 1024 * 1024,
      );
      const part = await safePath(ctx.root, masterPath + ".part");
      const partial = await stat(part).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      });
      if (partial && !partial.isFile())
        throw new Error("Nieprawidłowy tymczasowy master.");
      const complete = partial && (await hashFile(part)) === upload.hash;
      if (partial && !complete) await unlink(part);
      if (!complete) await copyFile(input, part, constants.COPYFILE_EXCL);
      ctx.signal?.throwIfAborted();
      if ((await hashFile(part)) !== upload.hash)
        throw new Error("Kopia uploadu jest niezgodna ze źródłem.");
      await rename(part, master);
    } else if ((await hashFile(master)) !== upload.hash)
      throw new Error("Niezgodny istniejący master.");
    title = upload.fileName;
    metadata = {
      kind: "upload",
      fileName: title,
      bytes: upload.bytes,
      hash: upload.hash,
    };
  } else if (project.sourceKind === "youtube") {
    const url = normalizeYouTubeUrl(project.url);
    const resolution = project.resolution ?? 1080;
    if (![1080, 2160].includes(resolution))
      throw new Error("Dozwolona jakość to 1080p lub 4K.");
    await ctx.report?.({ stage: "metadata", progress: null });
    const node = await runMediaTool("node", ["--version"], ctx);
    if (!(Number(node.stdout.match(/^v(\d+)/)?.[1]) >= 22))
      throw new Error("YouTube wymaga Node co najmniej 22.");
    await runMediaTool("yt-dlp", ["--version"], ctx);
    await runMediaTool("ffmpeg", ["-version"], ctx);
    const args = ["--ignore-config", "--no-playlist", "--js-runtimes", "node"];
    const result = await runMediaTool(
      "yt-dlp",
      [...args, "--verbose", "--skip-download", "--dump-single-json", url],
      ctx,
    );
    const providers =
      result.stderr?.match(/JS Challenge Providers:\s*([^\r\n]+)/)?.[1] ?? "";
    const nodeAvailable = providers
      .split(/,\s*(?![^()]*\))/)
      .some(
        (provider) =>
          /^node(?:\s|$)/i.test(provider.trim()) &&
          !/unavailable/i.test(provider),
      );
    if (
      !nodeAvailable ||
      /no supported javascript runtime|EJS.*(?:missing|unavailable)/i.test(
        result.stderr ?? "",
      )
    )
      throw new Error("Brak działającego runtime JavaScript/EJS w yt-dlp.");
    const info = JSON.parse(result.stdout),
      { video, audio } = chooseFormats(info, resolution);
    title = String(info.title ?? info.id);
    audioLanguage = audio.language ?? null;
    formats = {
      videoFormatId: video.format_id,
      audioFormatId: audio.format_id,
    };
    if (Math.min(video.width, video.height) < resolution)
      warnings.push(
        `Wybrano ${Math.min(video.width, video.height)}p; źródło nie udostępnia żądanych ${resolution === 2160 ? "4K" : "1080p"}.`,
      );
    // Only persist descriptive metadata; remote stream URLs can contain credentials.
    metadata = {
      kind: "youtube",
      id: info.id,
      title,
      duration: info.duration,
      url,
      width: video.width,
      height: video.height,
      audioLanguage,
      ...formats,
      warnings,
      formats: info.formats?.map(
        ({
          format_id,
          width,
          height,
          vcodec,
          acodec,
          language,
          format_note,
          abr,
          tbr,
        }) => ({
          format_id,
          width,
          height,
          vcodec,
          acodec,
          language,
          format_note,
          abr,
          tbr,
        }),
      ),
    };
    const videoFile = await safePath(ctx.root, `${dataDir}/video.download`),
      audioFile = await safePath(ctx.root, `${dataDir}/audio.download`);
    const estimated =
      (video.filesize ?? video.filesize_approx ?? 0) +
      (audio.filesize ?? audio.filesize_approx ?? 0);
    await ensureDiskSpace(
      path.dirname(sourceFile),
      Math.max(estimated * 2, 100 * 1024 * 1024),
    );
    for (const [stage, format, file] of [
      ["video", video, videoFile],
      ["audio", audio, audioFile],
    ]) {
      await ctx.report?.({ stage, progress: null });
      if (!(await stat(file).catch(() => null))?.size) {
        const relative = path.relative(await realpath(ctx.root), file);
        await safePath(ctx.root, relative + ".part");
        await safePath(ctx.root, relative + ".part.part");
        // A retry may resolve a different delivery format; never append to unverified bytes.
        const part = await safePath(
          ctx.root,
          relative + "." + randomUUID() + ".part",
        );
        await safePath(
          ctx.root,
          path.relative(await realpath(ctx.root), part) + ".part",
        );
        await runMediaTool(
          "yt-dlp",
          [...args, "--no-overwrites", "-f", format.format_id, "-o", part, url],
          ctx,
        );
        await rename(part, file);
      }
      await ctx.checkpoint?.(stage, [
        path.relative(await realpath(ctx.root), file),
      ]);
    }
    masterPath = `${dataDir}/master.mkv`;
    const master = await safePath(ctx.root, masterPath);
    await ctx.report?.({ stage: "mux", progress: null });
    if (!(await stat(master).catch(() => null))?.size) {
      const part = await safePath(ctx.root, masterPath + ".part");
      await runMediaTool(
        "ffmpeg",
        [
          "-hide_banner",
          "-v",
          "error",
          "-y",
          "-i",
          videoFile,
          "-i",
          audioFile,
          "-map",
          "0:v:0",
          "-map",
          "1:a:0",
          "-c",
          "copy",
          "-f",
          "matroska",
          part,
        ],
        ctx,
      );
      await probeSource(part, ctx);
      await rename(part, master);
    }
  } else throw new Error("Nieznany rodzaj źródła.");
  const master = await safePath(ctx.root, masterPath),
    media = await probeSource(master, ctx),
    hash = await hashFile(master);
  await ctx.checkpoint?.("mux", [masterPath]);
  const metadataPath = `${dataDir}/metadata.json`;
  await writeMediaJson(await safePath(ctx.root, metadataPath), metadata);
  const proxyPath = `${dataDir}/proxy.mp4`,
    proxy = await safePath(ctx.root, proxyPath);
  await ctx.report?.({ stage: "proxy", progress: null });
  await ensureDiskSpace(path.dirname(proxy));
  if (!(await stat(proxy).catch(() => null))?.size) {
    const part = await safePath(ctx.root, proxyPath + ".part");
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
        "0:v:0",
        "-map",
        "0:a:0",
        "-vf",
        "scale=w=1280:h=1280:force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-f",
        "mp4",
        part,
      ],
      ctx,
    );
    await probeSource(part, ctx);
    await rename(part, proxy);
  } else await probeSource(proxy, ctx);
  const source = {
    id: `source-${id}`,
    dataDir,
    masterPath,
    proxyPath,
    metadataPath,
    hash,
    duration: media.duration,
    width: media.width,
    height: media.height,
    audioLanguage: audioLanguage ?? media.audioLanguage,
    title,
    warnings,
    ...formats,
  };
  await writeMediaJson(sourceFile, source);
  await ctx.checkpoint?.("ingest", [metadataPath, masterPath, proxyPath]);
  return source;
}
