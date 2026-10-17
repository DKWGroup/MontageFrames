import { renderInputSignature } from "../scripts/quickcontent-render.mjs";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { safePath, writeMediaJson } from "../scripts/quickcontent-ingest.mjs";
const hash = (data) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
export async function recordPublicationRender(
  root,
  name,
  data,
  out,
  signature,
) {
  const output = await fs.stat(await safePath(root, out));
  await writeMediaJson(
    await safePath(root, `public/reels/${name}/publication-render.json`),
    {
      dataHash: hash(data),
      out,
      signature: signature ?? (await renderInputSignature(root, name, data)),
      size: output.size,
      mtimeMs: output.mtimeMs,
    },
  );
}
export async function publicationRenderCurrent(root, name, data, out) {
  const output = await fs.stat(await safePath(root, out)).catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (!output) return false;
  const record = await fs
    .readFile(
      await safePath(root, `public/reels/${name}/publication-render.json`),
      "utf8",
    )
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
  if (record)
    return (
      record.dataHash === hash(data) &&
      record.out === out &&
      record.size === output.size &&
      record.mtimeMs === output.mtimeMs &&
      (!record.signature ||
        record.signature === (await renderInputSignature(root, name, data)))
    );
  // Older exports predate receipts; new panel renders always record their exact input.
  return (
    output.mtimeMs >=
    (await fs.stat(await safePath(root, `public/reels/${name}/reel.json`)))
      .mtimeMs
  );
}

export async function publicationOutput(root, name, fallback) {
  try {
    const record = JSON.parse(
      await fs.readFile(
        await safePath(root, `public/reels/${name}/publication-render.json`),
        "utf8",
      ),
    );
    if (
      typeof record.out === "string" &&
      (await fs.stat(await safePath(root, record.out)).catch(() => null))
    )
      return record.out;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return fallback;
}
