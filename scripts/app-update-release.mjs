import console from "node:console";
// CI: builds an immutable, media-free package from committed Git objects only.
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  managedPath,
  blobHash,
  sha256,
  manifestOf,
  validatePackage,
} from "./app-update.mjs";
const exec = promisify(execFile);
export async function buildRelease(root, out) {
  await fs.mkdir(out, { recursive: true });
  const [{ stdout: tree }, { stdout: version }, { stdout: revision }] =
    await Promise.all([
      exec("git", ["-C", root, "ls-tree", "-rz", "--full-tree", "HEAD"], {
        maxBuffer: 4 * 1024 * 1024,
      }),
      exec("git", ["-C", root, "rev-parse", "HEAD"]),
      exec("git", ["-C", root, "rev-list", "--count", "HEAD"]),
    ]);
  const files = {},
    stage = path.join(out, "source");
  await fs.mkdir(stage, { recursive: true });
  for (const row of tree.split("\0").filter(Boolean)) {
    const [info, name] = row.split("\t");
    const [mode, type, hash] = info.split(" ");
    if (
      !managedPath(name) ||
      type !== "blob" ||
      !["100644", "100755"].includes(mode)
    )
      continue;
    const { stdout: bytes } = await exec(
      "git",
      ["-C", root, "cat-file", "blob", hash],
      { encoding: "buffer", maxBuffer: 34 * 1024 * 1024 },
    );
    files[name] = {
      hash: blobHash(bytes),
      mode: mode === "100755" ? 0o755 : 0o644,
      content: bytes.toString("base64"),
    };
    const target = path.join(stage, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { mode: files[name].mode });
  }
  const pkg = validatePackage({
    format: 1,
    version: version.trim(),
    revision: Number(revision.trim()),
    files,
  });
  const compressed = gzipSync(JSON.stringify(pkg));
  await fs.writeFile(
    path.join(out, "montageframes-update.json.gz"),
    compressed,
  );
  await fs.writeFile(
    path.join(out, "montageframes-version.json"),
    JSON.stringify({
      format: 1,
      version: pkg.version,
      revision: pkg.revision,
      sha256: sha256(compressed),
    }),
  );
  await fs.writeFile(
    path.join(stage, ".distribution.json"),
    JSON.stringify(manifestOf(pkg)),
  );
  // Portable ZIP for installations without Git; the generated manifest supplies their baseline.
  await exec("python3", [
    "-c",
    `import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1]); target=sys.argv[2]
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in root.rglob('*'):
  if p.is_file(): z.write(p,str(pathlib.Path('MontageFrames')/p.relative_to(root)))`,
    stage,
    path.join(out, "MontageFrames.zip"),
  ]);
  return {
    version: pkg.version,
    revision: pkg.revision,
    files: Object.keys(files).length,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    await buildRelease(
      process.cwd(),
      path.resolve(process.argv[2] ?? "out/release"),
    ),
  );
}
