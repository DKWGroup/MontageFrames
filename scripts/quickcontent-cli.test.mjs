import test from "node:test";
import assert from "node:assert/strict";
import { parseCLIArgs } from "./quickcontent-cli.mjs";
test("terminal operator is explicit and invalid providers fail before scheduling work", () => {
  assert.equal(
    parseCLIArgs(["montage", "qc-one", "--operator", "claude"]).options
      .operator,
    "claude",
  );
  assert.throws(
    () => parseCLIArgs(["retry", "job-one", "--operator", "invalid"]),
    /operator/,
  );
  assert.equal(parseCLIArgs(["status", "job-one"]).positionals[0], "status");
});

test("terminal status works with its own service when the GUI server is absent", async () => {
  const fs = await import("node:fs/promises"),
    path = await import("node:path"),
    os = await import("node:os"),
    process = await import("node:process");
  const { createStore } = await import("./quickcontent-store.mjs");
  const { runCLI } = await import("./quickcontent-cli.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "qc-cli-own-"));
  await fs.mkdir(path.join(root, "src/styles"), { recursive: true });
  await fs.writeFile(path.join(root, "src/styles/persona.tsx"), "style");
  await fs.writeFile(path.join(root, "PREFERENCJE.md"), "rules");
  const p = await createStore(root).createProject({
    sourceKind: "youtube",
    url: "https://youtu.be/abcdefghijk",
  });
  const oldFetch = globalThis.fetch,
    oldWrite = process.stdout.write;
  let out = "";
  globalThis.fetch = async () => {
    throw Error("offline localhost");
  };
  process.stdout.write = (chunk) => {
    out += chunk;
    return true;
  };
  try {
    await runCLI(["status", p.id], root);
  } finally {
    globalThis.fetch = oldFetch;
    process.stdout.write = oldWrite;
    await fs.rm(root, { recursive: true, force: true });
  }
  assert.equal(JSON.parse(out).id, p.id);
  assert.equal(JSON.parse(out).aiProvider, "codex");
});
