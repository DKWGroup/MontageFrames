import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import * as cli from "./reel-ops.mjs";
test("reel CLI applies the same limited account contract and rejects API or missing messages", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "reel-ops-cli-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "public/reels/clip"), { recursive: true });
  await fs.writeFile(path.join(root, "PREFERENCJE.md"), "Zasady");
  await fs.writeFile(
    path.join(root, "public/reels/clip/reel.json"),
    JSON.stringify({
      source: "source.mp4",
      style: "persona",
      segments: [{ start: 0, end: 2 }],
      captions: [{ words: [{ text: "test", start: 0, end: 1 }] }],
    }),
  );
  await fs.writeFile(path.join(root, "public/reels/clip/source.mp4"), "source");
  let calls = 0;
  const output = await cli.runReelOps(
    ["clip", "edit", "operations", "Popraw", "--provider=codex"],
    {
      root,
      requestAI: async (r, ctx) => {
        calls++;
        assert.equal(ctx.aiProvider, "codex");
        const c = JSON.parse(r.prompt.split("Kontekst operacji: ")[1]);
        return {
          version: 3,
          summary: "Gotowe",
          baseRevision: c.baseRevision,
          operations: [
            { type: "replaceWordText", wordId: c.words[0].id, text: "Test!" },
          ],
        };
      },
    },
  );
  assert.equal(output.ok, true);
  assert.equal(calls, 1);
  await assert.rejects(
    cli.runReelOps(
      ["clip", "edit", "operations", "Popraw", "--provider=openai"],
      { root },
    ),
    /konto|provider/,
  );
  await assert.rejects(
    cli.runReelOps(["clip", "edit", "operations"], { root }),
    /Użycie/,
  );
  assert.equal(
    (await cli.runReelOps(["clip", "context"], { root })).words[0].text,
    "Test!",
  );
});
