import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { scanReelGeometry } from "./quality/geometry-scan.mjs";
export async function runGeometry(
  args,
  { root = process.cwd(), signal, onProgress } = {},
) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      all: { type: "boolean" },
      pixels: { type: "boolean" },
      frames: { type: "string" },
      help: { type: "boolean" },
    },
  });
  const help =
    "reel:geometry <nazwa> --all | --frames 0,12,30 [--pixels] (lokalnie, bez AI; pełny skan zużywa CPU)";
  if (values.help) return help;
  if (
    positionals.length !== 1 ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(positionals[0]) ||
    Boolean(values.all) === (values.frames !== undefined) ||
    (values.frames !== undefined && !/^\d+(,\d+)*$/.test(values.frames))
  )
    throw Error(help);
  const result = await scanReelGeometry({
    root,
    reelName: positionals[0],
    frames: values.frames?.split(",").map(Number),
    pixels: values.pixels ?? false,
    signal,
    onProgress,
  });
  return {
    status: result.geometry.status,
    measuredFrames: result.frameBounds.frames.length,
    expectedFrames: result.expectedFrames,
    manifestSignature: result.manifestSignature,
    findings: result.geometry.findings.length,
    reportPath: result.directory + "/geometry.json",
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const controller = new AbortController(),
    abort = () => controller.abort();
  process.once("SIGINT", abort);
  try {
    const result = await runGeometry(process.argv.slice(2), {
      signal: controller.signal,
      onProgress: ({ completed, total, stage }) =>
        process.stderr.write(
          `Pomiar ${stage === "pixels" ? "pikseli" : "klatek"}: ${completed}/${total}\r`,
        ),
    });
    process.stdout.write(
      (typeof result === "string" ? result : JSON.stringify(result, null, 2)) +
        "\n",
    );
    if (result?.status === "fail") process.exitCode = 1;
  } catch (e) {
    process.stderr.write(`Kontrola geometrii: ${e.message}\n`);
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", abort);
  }
}
