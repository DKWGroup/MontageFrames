import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createReelStore } from "../ui/reel-store.mjs";
import { editOrdinaryReel } from "./reel-edit-service.mjs";
const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export async function runReelOps(
  args,
  { root = defaultRoot, requestAI, ctx = {} } = {},
) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { provider: { type: "string", default: "claude" } },
  });
  const [name, action, input, message, ...extra] = positionals;
  if (
    !name ||
    !["context", "apply", "edit"].includes(action) ||
    extra.length ||
    (action === "apply" && (!input || message)) ||
    (action === "context" && input) ||
    (action === "edit" &&
      (!["captions", "operations"].includes(input) || !message))
  )
    throw Error(
      "Użycie: reel:ops <rolka> context | <rolka> apply <operacje.json> | <rolka> edit captions|operations <polecenie> [--provider=claude|codex]",
    );
  const store = createReelStore(root);
  if (action === "edit") {
    if (!["claude", "codex"].includes(values.provider))
      throw Error("Wybierz provider konta: claude albo codex");
    return editOrdinaryReel(
      { root, reelName: name, scope: input, message },
      { ...ctx, aiProvider: values.provider },
      { store, ...(requestAI && { requestAI }) },
    );
  }
  return store.operations(
    name,
    action === "apply"
      ? JSON.parse(await fs.readFile(input, "utf8"))
      : undefined,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const controller = new AbortController();
  const stop = () => controller.abort(new Error("Zatrzymano"));
  process.once("SIGINT", stop);
  try {
    console.log(
      JSON.stringify(
        await runReelOps(process.argv.slice(2), {
          ctx: { signal: controller.signal },
        }),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", stop);
  }
}
