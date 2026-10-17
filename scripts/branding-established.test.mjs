import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { getEstablishedBranding } from "./branding-established.mjs";
import { brandingProfileSchema } from "../src/branding/schema.mjs";
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "established-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/kacper-bisanz/logo"), {
    recursive: true,
  });
  return root;
}
test("native defaults use registry, actual theme, preferences and bundled hashes without writing", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, "public/fonts"), { recursive: true });
  await fs.writeFile(path.join(root, "public/fonts/Inter.ttf"), "font");
  await fs.writeFile(
    path.join(root, "klienci/kacper-bisanz/PREFERENCJE.md"),
    "# Kacper Bisanz\nStrona: https://bisanz.pl/",
  );
  await fs.writeFile(
    path.join(root, "klienci/kacper-bisanz/logo/a.png"),
    "image",
  );
  const r = await getEstablishedBranding(root, "kacper-bisanz");
  assert.equal(r.established.profile.styleId, "bisanz");
  assert.equal(r.established.profile.revision, 0);
  assert(brandingProfileSchema.safeParse(r.established.profile).success);
  assert.equal(
    r.established.profile.fonts.primary.sha256,
    createHash("sha256").update("font").digest("hex"),
  );
  assert(r.established.colors.includes("#066FED"));
  assert.equal(r.established.profile.websiteUrl, "https://bisanz.pl/");
  assert.equal(r.preferences.path, "klienci/kacper-bisanz/PREFERENCJE.md");
  assert(
    r.materials.some((x) => x.file.endsWith("/logo/a.png") && x.available),
  );
  await assert.rejects(
    fs.access(path.join(root, "klienci/kacper-bisanz/branding/profile.json")),
  );
});
test("unknown client has no native style and missing registry assets remain visible", async (t) => {
  const root = await fixture(t);
  assert.equal(
    (await getEstablishedBranding(root, "unknown")).established,
    null,
  );
  const r = await getEstablishedBranding(root, "skyclass");
  assert.equal(r.preferences, null);
  assert(
    r.materials.some((x) => x.file.includes("skyclass-logo") && !x.available),
  );
});
test("preferences and materials reject symlinks; never traverse source folders", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, "klienci/kacper-bisanz/master"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, "klienci/kacper-bisanz/master/private.mp4"),
    "private",
  );
  assert.equal(
    (await getEstablishedBranding(root, "kacper-bisanz")).materials.length,
    0,
  );
  await fs.symlink(
    "/etc/hosts",
    path.join(root, "klienci/kacper-bisanz/PREFERENCJE.md"),
  );
  await assert.rejects(
    getEstablishedBranding(root, "kacper-bisanz"),
    /Dowiązania/,
  );
  await fs.rm(path.join(root, "klienci/kacper-bisanz/PREFERENCJE.md"));
  await fs.symlink(
    "/etc/hosts",
    path.join(root, "klienci/kacper-bisanz/logo/leak.png"),
  );
  await assert.rejects(
    getEstablishedBranding(root, "kacper-bisanz"),
    /Dowiązania/,
  );
});
test("curated public folders match registry identities exactly and stop at 200 materials", async (t) => {
  const root = await fixture(t);
  const publicDir = path.join(root, "public/Brandings/Bisanz");
  await fs.mkdir(path.join(publicDir, "produkty"), { recursive: true });
  await fs.writeFile(path.join(publicDir, "logo.png"), "image");
  await fs.mkdir(path.join(root, "public/Brandings/Bisanz-private"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, "public/Brandings/Bisanz-private/leak.png"),
    "image",
  );
  let r = await getEstablishedBranding(root, "kacper-bisanz");
  assert.deepEqual(
    r.materials.map((m) => m.file),
    ["public/Brandings/Bisanz/logo.png"],
  );
  await Promise.all(
    Array.from({ length: 205 }, (_, i) =>
      fs.writeFile(path.join(publicDir, "produkty", `${i}.png`), "image"),
    ),
  );
  r = await getEstablishedBranding(root, "kacper-bisanz");
  assert.equal(r.materials.length, 200);
  assert(!r.materials.some((m) => m.file.includes("private")));
});
