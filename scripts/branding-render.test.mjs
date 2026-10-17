import test from "node:test";
import assert from "node:assert/strict";
import {
  brandAppearance,
  brandingRenderFiles,
  brandingEmoji,
} from "../src/branding/appearance.mjs";

const branding = {
  clientId: "test",
  revision: 1,
  palette: { colors: [{ role: "accent", hex: "#123456" }] },
  fonts: {
    primary: { file: "Brandings/test/fonts/abc.ttf" },
    emphasis: { file: "fonts/Fustat.ttf" },
  },
  captions: {
    presetId: "plain",
    emphasis: "underline",
    emojiEnabled: false,
    size: 74,
    position: 0.68,
  },
  logo: { enabled: true, assetId: "logo" },
  assets: [
    { id: "logo", file: "Brandings/test/assets/logo.png" },
    { id: "unused", file: "Brandings/test/assets/unused.png" },
  ],
};
test("render manifest includes only used fonts and selected enabled logo", () => {
  assert.deepEqual(brandingRenderFiles(branding), [
    "Brandings/test/assets/logo.png",
    "Brandings/test/fonts/abc.ttf",
    "fonts/Fustat.ttf",
  ]);
  assert.deepEqual(
    brandingRenderFiles({ ...branding, logo: { enabled: false } }),
    ["Brandings/test/fonts/abc.ttf", "fonts/Fustat.ttf"],
  );
});
test("plain preset is static and underline independent of motion", () => {
  assert.deepEqual(brandAppearance(branding), {
    animated: false,
    pop: false,
    accent: "#123456",
    text: "#FFFFFF",
    background: "transparent",
    emphasis: "underline",
    size: 74,
    position: 0.68,
  });
  assert.equal(
    brandAppearance({
      ...branding,
      captions: { ...branding.captions, presetId: "pop" },
    }).pop,
    true,
  );
});
test("emoji setting never changes words and enables only explicit semantic matches", () => {
  assert.equal(brandingEmoji("samolot", branding), null);
  const enabled = {
    ...branding,
    captions: { ...branding.captions, emojiEnabled: true },
  };
  assert.equal(brandingEmoji("samolot,", enabled), "✈️");
  assert.equal(brandingEmoji("niejednoznaczne", enabled), null);
});
