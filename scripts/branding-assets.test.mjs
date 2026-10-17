import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { importBrandAsset } from "./branding-assets.mjs";
test("rejects forged image, interrupted stream and SVG without partial files", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "brand-asset-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/acme"), { recursive: true });
  await assert.rejects(
    importBrandAsset(root, "acme", "logo", Readable.from(["<svg/>"]), {
      name: "logo.png",
    }),
  );
  await assert.rejects(
    importBrandAsset(
      root,
      "acme",
      "image",
      Readable.from(
        (async function* () {
          yield Buffer.from("abc");
          throw Error("interrupted");
        })(),
      ),
      { name: "a.jpg" },
    ),
  );
  const dir = path.join(root, "public/Brandings/acme/assets");
  assert(
    !(await fs.readdir(dir).catch(() => [])).some((n) => n.endsWith(".part")),
  );
});
test("valid PNG is published by content hash and extension spoofing rejected", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "brand-png-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/acme"), { recursive: true });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl9sAAAAASUVORK5CYII=",
    "base64",
  );
  const first = await importBrandAsset(
    root,
    "acme",
    "logo",
    Readable.from([png]),
    { name: "logo.png" },
  );
  const second = await importBrandAsset(
    root,
    "acme",
    "logo",
    Readable.from([png]),
    { name: "other.png" },
  );
  assert.equal(first.file, second.file);
  assert.equal(first.bytes, png.length);
  await assert.rejects(
    importBrandAsset(root, "acme", "image", Readable.from([png]), {
      name: "fake.jpg",
    }),
    /Rozszerzenie/,
  );
});
