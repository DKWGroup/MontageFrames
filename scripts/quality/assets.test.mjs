import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifyManifestAssets } from "./assets.mjs";
import { inspectFontCoverage } from "../branding-fonts.mjs";
import { fileURLToPath } from "node:url";
const bytes = Buffer.from("font-fixture");
const font = {
  id: "font",
  path: "public/fonts/font.ttf",
  sha256: createHash("sha256").update(bytes).digest("hex"),
  byteLength: bytes.length,
  mime: "font/ttf",
  kind: "font",
};
test("preflight rejects missing, changed and foreign client assets", async () => {
  const manifest = { clientId: "acme", assets: [font] };
  assert.equal(
    (
      await verifyManifestAssets(manifest, async () => {
        throw Object.assign(Error("missing"), { code: "ENOENT" });
      })
    ).status,
    "fail",
  );
  assert.equal(
    (await verifyManifestAssets(manifest, async () => Buffer.from("wrong")))
      .status,
    "fail",
  );
  assert.equal(
    (
      await verifyManifestAssets(
        {
          ...manifest,
          assets: [{ ...font, path: "public/Brandings/other/assets/font.ttf" }],
        },
        async () => bytes,
      )
    ).status,
    "fail",
  );
});
test("font coverage is measured separately: missing Polish glyph fails, unavailable measurement stays unknown", async () => {
  const manifest = { assets: [font] };
  assert.equal(
    (await verifyManifestAssets(manifest, async () => bytes)).status,
    "unknown",
  );
  assert.equal(
    (
      await verifyManifestAssets(manifest, async () => bytes, {
        inspectFont: async () => ({ status: "fail", missing: ["ą"] }),
      })
    ).status,
    "fail",
  );
  assert.equal(
    (
      await verifyManifestAssets(manifest, async () => bytes, {
        inspectFont: async () => ({ status: "pass" }),
      })
    ).status,
    "pass",
  );
});
test(
  "a real variable font with named instances can prove Polish coverage",
  { skip: process.platform !== "darwin" },
  async () => {
    const file = fileURLToPath(
      new URL("../../public/fonts/Nunito.ttf", import.meta.url),
    );
    assert.equal((await inspectFontCoverage(file)).status, "pass");
  },
);

test("Persona freezes installed MADE faces instead of substituting Nunito", async () => {
  const { requiredFontBindings } = await import("./render-assets.mjs");
  const installed = requiredFontBindings(
    { style: "persona" },
    { availableFiles: ["fonts/MADETommySoft-Black.otf"] },
  );
  assert.ok(installed.some((f) => f.file === "fonts/MADETommySoft-Black.otf"));
  assert.equal(
    installed.some(
      (f) => f.family === "MADE Tommy Soft" && f.file === "fonts/Nunito.ttf",
    ),
    false,
  );
  const fallback = requiredFontBindings({ style: "persona" });
  assert.ok(
    fallback.some(
      (f) => f.family === "MADE Tommy Soft" && f.file === "fonts/Nunito.ttf",
    ),
  );
});

test("generic overlays in custom branding pin their own Persona font dependencies", async () => {
  const { requiredFontBindings } = await import("./render-assets.mjs");
  const bindings = requiredFontBindings({
    style: "brand",
    overlays: [{ type: "title", text: "Hook" }],
  });
  assert.ok(bindings.some((f) => f.file === "fonts/Nunito.ttf"));
});
