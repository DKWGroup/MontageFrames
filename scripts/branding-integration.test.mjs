import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { createBrandingStore, snapshotBranding } from "./branding-store.mjs";
import { defaultBranding } from "../src/branding/schema.mjs";
import { createStore } from "./quickcontent-store.mjs";
import { buildCandidateReel } from "./quickcontent-adapter.mjs";
import { buildReel } from "./prep.mjs";
test("new branding retains protected SkyClass speech and Bisanz camera rules", () => {
  const words = [
    { text: "Pełna", start: 0, end: 0.3 },
    { text: "wypowiedź", start: 1.4, end: 1.8 },
  ];
  const sky = buildCandidateReel({
    words,
    duration: 2,
    styleId: "brand",
    clientId: "skyclass",
    silences: [{ start: 0.35, end: 1.3 }],
  });
  assert.deepEqual(
    sky.segments.map(({ start, end }) => ({ start, end })),
    [{ start: 0, end: 2 }],
  );
  const bisanz = buildCandidateReel({
    words,
    duration: 2,
    styleId: "brand",
    clientId: "kacper-bisanz",
  });
  assert(bisanz.segments.every((s) => s.zoom === 1 && s.zoomTo === 1));
});
test("both workflows consume the same version while later profile changes leave existing project unchanged", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "brand-integration-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const dir of ["klienci/test", "src/styles", "public/fonts"])
    await fs.mkdir(path.join(root, dir), { recursive: true });
  await fs.writeFile(path.join(root, "PREFERENCJE.md"), "general");
  await fs.writeFile(
    path.join(root, "klienci/test/PREFERENCJE.md"),
    "client rules",
  );
  await fs.writeFile(path.join(root, "src/styles/brand.tsx"), "style");
  await fs.writeFile(path.join(root, "public/fonts/Fustat.ttf"), "font");
  const profile = defaultBranding("test", "Test");
  profile.notes = "Private knowledge";
  profile.fonts.primary = {
    id: "fustat",
    family: "Fustat",
    file: "fonts/Fustat.ttf",
    weight: "700",
    style: "normal",
    sha256: createHash("sha256").update("font").digest("hex"),
    source: "bundled",
  };
  const brands = createBrandingStore(root);
  await brands.save("test", profile, 0);
  const qc = createStore(root);
  const templates = await qc.getTemplates("test");
  const template = templates.find((x) => x.styleId === "brand");
  assert.ok(template?.ready);
  const project = await qc.createProject({
    sourceKind: "upload",
    uploadId: "upload",
    clientId: "test",
    templateId: template.id,
  });
  const snap = await snapshotBranding(root, "test", 1);
  assert.deepEqual(project.templateSnapshot.branding, snap);
  assert.equal(snap.notes, undefined);
  const words = [{ text: "Test", start: 0, end: 1 }];
  const ordinary = buildReel({
    source: "source.mp4",
    words,
    silences: [],
    duration: 2,
    style: "brand",
    client: "test",
    branding: snap,
  });
  const candidate = buildCandidateReel({
    words,
    duration: 2,
    styleId: "brand",
    clientId: "test",
    branding: project.templateSnapshot.branding,
  });
  assert.deepEqual(ordinary.branding, candidate.branding);
  await brands.save(
    "test",
    {
      ...profile,
      notes: "new knowledge",
      captions: { ...profile.captions, presetId: "plain" },
    },
    1,
  );
  assert.deepEqual(
    (await qc.getProject(project.id)).templateSnapshot.branding,
    snap,
  );
  assert.equal(
    (await snapshotBranding(root, "test", 1)).captions.presetId,
    "kinetic",
  );
  assert.equal(
    (await snapshotBranding(root, "test", 2)).captions.presetId,
    "plain",
  );
});
