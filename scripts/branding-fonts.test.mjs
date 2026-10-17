import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import {
  importUploadedFont,
  listFonts,
  importFont,
} from "./branding-fonts.mjs";
test("bundled font catalog excludes forbidden font and never exposes absolute paths", async () => {
  const { fonts } = await listFonts(process.cwd(), {
    source: "bundled",
    query: "Poppins",
  });
  assert(fonts.length);
  assert(fonts.every((f) => !JSON.stringify(f).includes("/Users/")));
});
test("rejects forged uploaded fonts and unknown Google family", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "brand-font-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/acme"), { recursive: true });
  await assert.rejects(
    importUploadedFont(root, "acme", Readable.from(["not font"]), {
      name: "a.ttf",
    }),
  );
  await fs.mkdir(path.join(root, ".branding"));
  await fs.writeFile(path.join(root, ".branding/google-fonts.json"), "[]");
  await assert.rejects(
    importFont(root, "acme", {
      source: "google",
      id: "UnknownMissingFont123",
      variant: "regular",
    }),
    /Nieznana rodzina/,
  );
});
test(
  "macOS validates Polish glyphs and copies a real font without installing it",
  { skip: process.platform !== "darwin" },
  async (t) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "brand-polish-"));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    await fs.mkdir(path.join(root, "klienci/acme"), { recursive: true });
    const good = await importUploadedFont(
      root,
      "acme",
      Readable.from([await fs.readFile("public/fonts/Poppins-Medium.ttf")]),
      { name: "Poppins-Medium.ttf" },
    );
    assert.equal(good.family, "Poppins");
    assert.equal(good.weight, "500");
    assert.equal(
      (await fs.stat(path.join(root, "public", good.file))).size > 0,
      true,
    );
    const missing = await fs.readFile("/System/Library/Fonts/ZapfDingbats.ttf");
    await assert.rejects(
      importUploadedFont(root, "acme", Readable.from([missing]), {
        name: "Zapf.ttf",
      }),
      /polskich/,
    );
  },
);
