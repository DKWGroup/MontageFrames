import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { safePath } from "../scripts/quickcontent-ingest.mjs";
import { isName, fileName } from "./lib.mjs";
const fail = (status, message) => Object.assign(new Error(message), { status });
export async function acceptClientUpload(root, req, { client, kind, name }) {
  if (
    !isName(client) ||
    !["surowe", "przebitki"].includes(kind) ||
    fileName(name) !== name ||
    !name
  )
    throw fail(400, "Zły klient, rodzaj albo nazwa pliku");
  const clientDir = await safePath(root, `klienci/${client}`);
  if (!(await fs.stat(clientDir).catch(() => null))?.isDirectory())
    throw fail(404, "Nie ma takiego klienta");
  const relative = `klienci/${client}/${kind === "surowe" ? "surowe pliki" : "przebitki"}/${name}`;
  const dest = await safePath(root, relative, { create: true });
  if (await fs.stat(dest).catch(() => null))
    throw fail(409, `Plik „${name}” już jest u klienta — zmień nazwę pliku`);
  const temporary = path.join(
    path.dirname(dest),
    `.upload-${randomUUID()}.part`,
  );
  try {
    await pipeline(req, createWriteStream(temporary, { flags: "wx" }));
    // link publishes the complete file only if the destination is still free.
    await fs.link(temporary, dest);
    return { path: relative };
  } catch (e) {
    if (e.code === "EEXIST")
      throw fail(409, `Plik „${name}” już jest u klienta — zmień nazwę pliku`);
    throw e;
  } finally {
    await fs.unlink(temporary).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
