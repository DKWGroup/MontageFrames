import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBrandingHash,
  brandingHash,
  applyBrandSuggestions,
  brandingSaveFailure,
  selectBrandStyle,
} from "./branding-view.mjs";
test("branding direct links and ordinary reel names remain distinct", () => {
  assert.deepEqual(parseBrandingHash("#branding/acme"), { clientId: "acme" });
  assert.deepEqual(parseBrandingHash("#branding"), { clientId: null });
  assert.equal(parseBrandingHash("#branding-reel"), null);
  assert.equal(parseBrandingHash("#branding/%E0%A4%A"), null);
  assert.equal(parseBrandingHash("#branding/../x"), null);
  assert.equal(brandingHash("acme"), "#branding/acme");
});
test("scan applies only checked fields, does not mutate draft, respects palette limit", () => {
  const draft = {
    name: "Moja marka",
    notes: "Ręczne",
    palette: { maxColors: 4, colors: [] },
  };
  const result = applyBrandSuggestions(
    draft,
    {
      name: { value: "Strona" },
      notes: { value: "Nie stosuj" },
      palette: {
        value: ["#112233", "#223344", "#334455", "#445566", "#556677"],
      },
    },
    ["name", "palette"],
  );
  assert.equal(result.name, "Strona");
  assert.equal(result.notes, "Ręczne");
  assert.equal(draft.name, "Moja marka");
  assert.equal(result.palette.colors.length, 4);
});
test("409 preserves draft and original revision for explicit conflict recovery", () => {
  const draft = { notes: "Niezapisane" };
  const state = brandingSaveFailure(draft, 2, 409);
  assert.equal(state.draft, draft);
  assert.equal(state.revision, 2);
  assert.equal(state.conflict, true);
});

test("scan colors without internal IDs become valid unique draft colors", () => {
  const result = applyBrandSuggestions(
    { palette: { maxColors: 4, colors: [] } },
    {
      palette: {
        value: [
          { hex: "#123456", role: "accent" },
          { hex: "#654321", role: "text" },
        ],
      },
    },
    ["palette"],
  );
  assert.deepEqual(
    result.palette.colors.map((c) => c.id),
    ["scan-0", "scan-1"],
  );
});

test("explicit native selection replaces appearance and preserves brand data and assets", () => {
  const draft = {
    name: "Ręczna nazwa",
    notes: "Moja wiedza",
    websiteUrl: "https://example.org",
    assets: [{ id: "logo-1" }],
    logo: { enabled: true, assetId: "logo-1" },
    palette: { colors: [] },
    fonts: { primary: null },
    captions: { size: 80 },
  };
  const established = {
    styleId: "skyclass",
    name: "Szablon",
    websiteUrl: "https://skyclass.pl",
    assets: [],
    logo: { enabled: false },
    palette: { colors: [{ hex: "#124F81" }] },
    fonts: { primary: { family: "Poppins" } },
    captions: { size: 70 },
  };
  const result = selectBrandStyle(draft, "skyclass", established);
  assert.equal(result.styleId, "skyclass");
  for (const field of ["name", "notes", "websiteUrl", "assets", "logo"]) {
    assert.deepEqual(result[field], draft[field]);
  }
  for (const field of ["palette", "fonts", "captions"]) {
    assert.deepEqual(result[field], established[field]);
    assert.notEqual(result[field], established[field]);
  }
  assert.equal(draft.styleId, undefined);
  const own = selectBrandStyle(result, "brand", established);
  assert.equal(own.styleId, "brand");
  assert.deepEqual(own.palette, result.palette);
  assert.deepEqual(own.fonts, result.fonts);
  assert.deepEqual(own.captions, result.captions);
});

test("a missing native seed does not fabricate or overwrite appearance", () => {
  const profile = { name: "Nowy klient", palette: { colors: [] } };
  assert.equal(selectBrandStyle(profile, "skyclass", null), profile);
  assert.equal(
    selectBrandStyle(profile, "skyclass", { styleId: "herod" }),
    profile,
  );
  assert.equal(selectBrandStyle(profile, "brand", null).styleId, "brand");
});
