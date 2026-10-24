import { inspectReelQuality } from "./quality/reel-quality.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { safePath } from "./quickcontent-ingest.mjs";
import { validateReelEdit } from "./reel-validation.mjs";

export async function checkReel(args, root = process.cwd()) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      before: { type: "string" },
      help: { type: "boolean" },
      quality: { type: "boolean" },
    },
  });
  if (values.help)
    return "reel:check <nazwa> [--before <poprzedni.json>] [--quality]";
  const [name] = positionals;
  if (positionals.length !== 1 || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(name ?? ""))
    throw new Error(
      "Podaj nazwę rolki: npm run reel:check -- <nazwa> [--before <plik.json>]",
    );
  const read = async (relative) =>
    JSON.parse(await fs.readFile(await safePath(root, relative), "utf8"));
  const data = await read(`public/reels/${name}/reel.json`);
  const before = values.before ? await read(values.before) : data;
  validateReelEdit(before, data);
  if (values.quality) return inspectReelQuality(root, name, data);
  return `Rolka ${name}: dane poprawne. Kontrola nie ocenia obrazu, dźwięku ani pełnych wytycznych klienta.`;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await checkReel(process.argv.slice(2));
    process.stdout.write(
      (typeof result === "string" ? result : JSON.stringify(result, null, 2)) +
        "\n",
    );
    if (result?.status === "fail") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Kontrola rolki: ${error.message}\n`);
    process.exitCode = 1;
  }
}
