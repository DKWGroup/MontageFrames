import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { brandingPath, brandingError } from "./branding-store.mjs";
import { clientIdSchema } from "../src/branding/schema.mjs";
const exec = promisify(execFile);
export async function receiveBrandFile(
  root,
  clientId,
  folder,
  stream,
  { limit = 20 * 1024 ** 2 } = {},
) {
  clientIdSchema.parse(clientId);
  if (!["assets", "fonts"].includes(folder))
    throw brandingError(400, "Nieprawidłowy katalog");
  const client = await brandingPath(root, `klienci/${clientId}`);
  if (!(await fs.stat(client).catch(() => null))?.isDirectory())
    throw brandingError(404, "Nie ma takiego klienta");
  const temp = await brandingPath(
    root,
    `public/Brandings/${clientId}/${folder}/.${randomUUID()}.part`,
    { create: true },
  );
  let bytes = 0;
  const hash = createHash("sha256");
  try {
    await pipeline(
      stream,
      new Transform({
        transform(chunk, encoding, done) {
          bytes += chunk.length;
          if (bytes > limit)
            return done(
              brandingError(413, "Plik przekracza dozwolony rozmiar"),
            );
          hash.update(chunk);
          done(null, chunk);
        },
      }),
      createWriteStream(temp, { flags: "wx" }),
    );
    if (!bytes) throw brandingError(400, "Plik jest pusty");
    return { temp, bytes, sha256: hash.digest("hex") };
  } catch (e) {
    await fs.rm(temp, { force: true });
    throw e;
  }
}
export async function publishBrandFile(root, clientId, folder, upload, ext) {
  const file = `Brandings/${clientId}/${folder}/${upload.sha256}.${ext}`;
  const dest = await brandingPath(root, `public/${file}`, { create: true });
  try {
    await fs.link(upload.temp, dest);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    const existing = await fs.readFile(dest);
    if (createHash("sha256").update(existing).digest("hex") !== upload.sha256)
      throw brandingError(409, "Istniejący zasób ma inną zawartość");
  }
  return file;
}
export async function importBrandAsset(
  root,
  clientId,
  kind,
  stream,
  { name, description = "" } = {},
) {
  if (
    !["logo", "image", "video"].includes(kind) ||
    typeof name !== "string" ||
    name.length > 255 ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes(String.fromCharCode(0))
  )
    throw brandingError(400, "Nieprawidłowy materiał lub nazwa");
  if (description.length > 2000) throw brandingError(400, "Opis jest za długi");
  const upload = await receiveBrandFile(root, clientId, "assets", stream, {
    limit: kind === "video" ? 2 * 1024 ** 3 : 20 * 1024 ** 2,
  });
  try {
    const head = Buffer.alloc(32);
    const handle = await fs.open(upload.temp);
    try {
      await handle.read(head, 0, 32, 0);
    } finally {
      await handle.close();
    }
    let ext, mime;
    if (
      head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      ext = "png";
      mime = "image/png";
    } else if (head[0] === 255 && head[1] === 216 && head[2] === 255) {
      ext = "jpg";
      mime = "image/jpeg";
    } else if (
      head.toString("ascii", 0, 4) === "RIFF" &&
      head.toString("ascii", 8, 12) === "WEBP"
    ) {
      ext = "webp";
      mime = "image/webp";
    } else if (head.toString("ascii", 4, 8) === "ftyp") {
      ext = head.toString("ascii", 8, 12) === "qt  " ? "mov" : "mp4";
      mime = ext === "mov" ? "video/quicktime" : "video/mp4";
    } else if (head.readUInt32BE(0) === 0x1a45dfa3) {
      ext = "webm";
      mime = "video/webm";
    } else
      throw brandingError(
        400,
        "Nieobsługiwany lub uszkodzony plik. Użyj PNG, JPG, WebP, MP4, MOV lub WebM.",
      );
    if ((kind === "video") !== mime.startsWith("video/"))
      throw brandingError(
        400,
        "Zawartość pliku nie odpowiada rodzajowi materiału",
      );
    const supplied = path.extname(name).slice(1).toLowerCase();
    if (![ext, ...(ext === "jpg" ? ["jpeg"] : [])].includes(supplied))
      throw brandingError(400, "Rozszerzenie nie odpowiada zawartości pliku");
    let info;
    try {
      info = JSON.parse(
        (
          await exec(
            "ffprobe",
            [
              "-v",
              "error",
              "-show_streams",
              "-show_format",
              "-of",
              "json",
              upload.temp,
            ],
            { maxBuffer: 1024 ** 2, timeout: 15000 },
          )
        ).stdout,
      );
    } catch {
      throw brandingError(400, "Nie można odczytać obrazu lub filmu");
    }
    if (
      !info.streams?.some(
        (s) => s.codec_type === "video" && s.width > 0 && s.height > 0,
      )
    )
      throw brandingError(400, "Brak poprawnego obrazu w pliku");
    if (kind === "video" && !(Number(info.format?.duration) > 0))
      throw brandingError(400, "Film nie ma poprawnej długości");
    const file = await publishBrandFile(root, clientId, "assets", upload, ext);
    return {
      id: upload.sha256,
      kind,
      file,
      originalName: name,
      description,
      mime,
      bytes: upload.bytes,
      sha256: upload.sha256,
    };
  } finally {
    await fs.rm(upload.temp, { force: true });
  }
}
