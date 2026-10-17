import { Buffer } from "node:buffer";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createUpdateService, CHECK_INTERVAL } from "./update-server.mjs";
import { blobHash, manifestOf, sha256 } from "../scripts/app-update.mjs";
import { gzipSync } from "node:zlib";
const content = "new";
const pkg = {
  format: 1,
  version: "b".repeat(40),
  revision: 2,
  files: {
    "ui/new.ts": {
      hash: blobHash(Buffer.from(content)),
      mode: 0o644,
      content: Buffer.from(content).toString("base64"),
    },
  },
};
async function root(t) {
  const r = await fs.mkdtemp(path.join(tmpdir(), "mf-check-"));
  t.after(() => fs.rm(r, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(r, ".distribution.json"),
    JSON.stringify({
      ...manifestOf(pkg),
      version: "a".repeat(40),
      revision: 1,
      files: {},
    }),
  );
  return r;
}
const response = (body, status = 200) =>
  new globalThis.Response(
    typeof body === "string" || body instanceof Uint8Array
      ? body
      : JSON.stringify(body),
    { status },
  );

test("offline nie blokuje aplikacji, check jest ograniczony do sześciu godzin", async (t) => {
  const r = await root(t);
  let calls = 0;
  const service = createUpdateService(r, {
    now: () => 100,
    fetch: async () => {
      calls++;
      throw Error("offline");
    },
  });
  assert.equal((await service.check()).status, "offline");
  await service.check();
  assert.equal(calls, 1);
  assert.equal(CHECK_INTERVAL, 21600000);
  assert.equal((await service.get()).current.revision, 1);
});
test("pobiera tylko kompletną paczkę z własnego release, weryfikuje hash i pokazuje plan", async (t) => {
  const r = await root(t);
  const bytes = gzipSync(JSON.stringify(pkg));
  const prefix =
    "https://github.com/DKWGroup/MontageFrames/releases/download/x/";
  const release = {
    tag_name: `app-${pkg.version}`,
    assets: [
      {
        name: "montageframes-version.json",
        browser_download_url: prefix + "version",
      },
      {
        name: "montageframes-update.json.gz",
        browser_download_url: prefix + "package",
        digest: `sha256:${sha256(bytes)}`,
      },
    ],
  };
  const service = createUpdateService(r, {
    fetch: async (url) =>
      url.endsWith("/latest")
        ? response(release)
        : url.endsWith("/version")
          ? response({
              format: 1,
              version: pkg.version,
              revision: 2,
              sha256: sha256(bytes),
            })
          : response(bytes),
  });
  assert.equal((await service.check()).status, "available");
  assert.equal((await service.download()).pending.changes, 1);
  assert.equal((await service.pending()).version, pkg.version);
});
test("brak wydanej paczki to osobny stan, nie zapewnienie o aktualności", async (t) => {
  const r = await root(t);
  const service = createUpdateService(r, {
    fetch: async () => response("", 404),
  });
  assert.equal((await service.check()).status, "unpublished");
});
test("obcy URL paczki nigdy nie jest pobierany", async (t) => {
  const r = await root(t);
  let calls = 0;
  const service = createUpdateService(r, {
    fetch: async () => {
      calls++;
      return response({
        assets: [
          {
            name: "montageframes-version.json",
            browser_download_url: "https://evil.invalid/x",
          },
        ],
      });
    },
  });
  assert.equal((await service.check()).status, "offline");
  assert.equal(calls, 1);
});
