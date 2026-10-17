import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBrandingStore, snapshotBranding } from "./branding-store.mjs";
import {
  defaultBranding,
  brandingProfileSchema,
} from "../src/branding/schema.mjs";
const fixture = async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "branding-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/acme"), { recursive: true });
  return root;
};
test("schema enforces palette, colors and bounded input", () => {
  const p = defaultBranding("acme", "Acme");
  assert(brandingProfileSchema.safeParse(p).success);
  p.palette.colors = Array.from({ length: 7 }, (_, i) => ({
    id: `c${i}`,
    hex: "#ffffff",
    role: "accent",
  }));
  assert(!brandingProfileSchema.safeParse(p).success);
  p.palette.colors = [{ id: "a", hex: "red", role: "accent" }];
  assert(!brandingProfileSchema.safeParse(p).success);
});
test("immutable versions and concurrent stale revisions preserve preferences", async (t) => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, "klienci/acme/PREFERENCJE.md"), "manual");
  const store = createBrandingStore(root);
  const p = defaultBranding("acme", "Acme");
  const first = await store.save("acme", p, 0);
  assert.equal(first.revision, 1);
  const results = await Promise.allSettled([
    store.save("acme", { ...first, name: "Two" }, 1),
    store.save("acme", { ...first, name: "Three" }, 1),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(results.find((x) => x.status === "rejected").reason.status, 409);
  assert.equal((await store.version("acme", 1)).name, "Acme");
  assert.equal(
    await fs.readFile(path.join(root, "klienci/acme/PREFERENCJE.md"), "utf8"),
    "manual",
  );
  assert.equal((await store.get("acme")).revision, 2);
});
test("snapshot rejects missing font and strips private knowledge", async (t) => {
  const root = await fixture(t);
  const store = createBrandingStore(root);
  await store.save("acme", defaultBranding("acme", "Acme"), 0);
  await assert.rejects(snapshotBranding(root, "acme", 1), /font/i);
});
test("rejects foreign assets and symlinked directories", async (t) => {
  const root = await fixture(t);
  const store = createBrandingStore(root);
  const p = defaultBranding("acme", "Acme");
  p.assets = [
    {
      id: "a",
      kind: "image",
      file: "Brandings/other/assets/a.png",
      originalName: "a.png",
      description: "",
      mime: "image/png",
      bytes: 1,
      sha256: "a".repeat(64),
    },
  ];
  await assert.rejects(store.save("acme", p, 0));
  await fs.mkdir(path.join(root, "klienci/other"));
  await fs.symlink(
    path.join(root, "klienci/other"),
    path.join(root, "klienci/acme/branding"),
  );
  await assert.rejects(store.save("acme", defaultBranding("acme", "Acme"), 0));
});
test("failed active publication removes only its unpublished version so retry works", async (t) => {
  const root = await fixture(t);
  const store = createBrandingStore(root);
  const originalRename = fs.rename;
  fs.rename = async (...args) => {
    if (args[1].endsWith("branding/profile.json"))
      throw Object.assign(Error("disk failure"), { code: "EIO" });
    return originalRename(...args);
  };
  try {
    await assert.rejects(
      store.save("acme", defaultBranding("acme", "Acme"), 0),
      /disk failure/,
    );
  } finally {
    fs.rename = originalRename;
  }
  assert.equal(
    (await store.save("acme", defaultBranding("acme", "Acme"), 0)).revision,
    1,
  );
});
