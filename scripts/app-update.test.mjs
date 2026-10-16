import process from "node:process";
import { Buffer } from "node:buffer";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  blobHash,
  managedPath,
  planUpdate,
  applyPackage,
  recoverUpdate,
  validatePackage,
  initializeInstallation,
} from "./app-update.mjs";

const entry = (s) => ({
  hash: blobHash(Buffer.from(s)),
  content: Buffer.from(s).toString("base64"),
  mode: 0o644,
});
const pack = (files, revision = 2) => ({
  format: 1,
  version: String(revision).repeat(40),
  revision,
  files: Object.fromEntries(
    Object.entries(files).map(([p, s]) => [p, entry(s)]),
  ),
});
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "mf-update-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const put = async (root, p, s) => {
  await fs.mkdir(path.dirname(path.join(root, p)), { recursive: true });
  await fs.writeFile(path.join(root, p), s);
};

test("manifest nie dopuszcza filmów, danych projektowych, sekretów ani wyjścia poza katalog", () => {
  for (const p of [
    "../x",
    "/tmp/x",
    "src/../x",
    "src\\x",
    "src/a.ts\n",
    "node_modules/x",
    ".env",
    ".env.local",
    ".git/config",
    "public/reels/a/reel.json",
    "motion-projects/a.json",
    "klienci/x/Render/a.mp4",
    "klienci/x/QuickContent/a.json",
    "src/studio/a.tsx",
    "src/Root.tsx",
    "public/test.MP4",
  ])
    assert.equal(managedPath(p), false, p);
  for (const p of [
    "ui/App.tsx",
    "src/styles/persona.tsx",
    "klienci/skyclass/PREFERENCJE.md",
    ".env.example",
    "package.json",
    "README.md",
  ])
    assert.equal(managedPath(p), true, p);
});

test("trzy wersje: zachowuje własne i zmienione szablony, aktualizuje niezmienione pliki autora", () => {
  const old = pack({
    "src/styles/persona.tsx": "old",
    "klienci/skyclass/PREFERENCJE.md": "old",
    "ui/App.tsx": "old",
    "ui/removed.ts": "old",
  });
  const next = pack({
    "src/styles/persona.tsx": "new",
    "klienci/skyclass/PREFERENCJE.md": "new",
    "ui/App.tsx": "new",
    "klienci/new/PREFERENCJE.md": "new",
  });
  const local = {
    "src/styles/persona.tsx": blobHash(Buffer.from("custom")),
    "klienci/skyclass/PREFERENCJE.md":
      old.files["klienci/skyclass/PREFERENCJE.md"].hash,
    "ui/App.tsx": old.files["ui/App.tsx"].hash,
    "ui/removed.ts": old.files["ui/removed.ts"].hash,
  };
  const plan = planUpdate(old, next, local);
  assert.deepEqual(plan.preserved, ["src/styles/persona.tsx"]);
  assert.deepEqual(plan.conflicts, []);
  assert.ok(
    plan.changes.some((x) => x.path === "ui/removed.ts" && x.kind === "delete"),
  );
  assert.ok(plan.changes.some((x) => x.path === "klienci/new/PREFERENCJE.md"));
  assert.equal(
    plan.changes.some((x) => x.path.includes("my-client")),
    false,
  );
});

test("lokalne zmiany kodu i nieznana kolizja blokują instalację zamiast nadpisania", () => {
  const old = pack({ "ui/App.tsx": "old" });
  const next = pack({ "ui/App.tsx": "new", "ui/new.ts": "new" });
  const plan = planUpdate(old, next, {
    "ui/App.tsx": blobHash(Buffer.from("custom")),
    "ui/new.ts": blobHash(Buffer.from("custom")),
  });
  assert.deepEqual(plan.conflicts, ["ui/App.tsx", "ui/new.ts"]);
  assert.throws(() => planUpdate(null, next, {}), /bazowej|baseline/i);
});

test("uszkodzony skrót i podwójne ścieżki o różnej wielkości liter odrzucane przed zapisem", () => {
  const p = pack({ "ui/App.tsx": "new" });
  p.files["ui/App.tsx"].content = Buffer.from("corrupt").toString("base64");
  assert.throws(() => validatePackage(p), /skrót|hash/i);
  const dupe = pack({ "ui/App.tsx": "a", "ui/app.tsx": "b" });
  assert.throws(() => validatePackage(dupe), /ścież/i);
});

test("instalacja robi backup, chroni lokalne dane i zapisuje nowy baseline", async (t) => {
  const root = await fixture(t);
  const old = pack({ "ui/App.tsx": "old", "src/styles/persona.tsx": "old" }, 1);
  await put(root, ".distribution.json", JSON.stringify(old));
  await initializeInstallation(root);
  await put(root, "ui/App.tsx", "old");
  await put(root, "src/styles/persona.tsx", "custom");
  await put(root, "klienci/my/PREFERENCJE.md", "mine");
  const result = await applyPackage(
    root,
    pack({ "ui/App.tsx": "new", "src/styles/persona.tsx": "new" }),
    { prepare: async () => {} },
  );
  assert.equal(await fs.readFile(path.join(root, "ui/App.tsx"), "utf8"), "new");
  assert.equal(
    await fs.readFile(path.join(root, "src/styles/persona.tsx"), "utf8"),
    "custom",
  );
  assert.equal(
    await fs.readFile(path.join(root, "klienci/my/PREFERENCJE.md"), "utf8"),
    "mine",
  );
  assert.equal(
    await fs.readFile(
      path.join(root, result.backup, "files/ui/App.tsx"),
      "utf8",
    ),
    "old",
  );
  assert.equal(
    JSON.parse(await fs.readFile(path.join(root, ".updates/installed.json")))
      .revision,
    2,
  );
});

test("błąd po pierwszej podmianie odtwarza poprzednie pliki i wersję", async (t) => {
  const root = await fixture(t);
  const old = pack({ "ui/a.ts": "old", "ui/b.ts": "old" }, 1);
  await put(root, ".distribution.json", JSON.stringify(old));
  await initializeInstallation(root);
  await put(root, "ui/a.ts", "old");
  await put(root, "ui/b.ts", "old");
  await assert.rejects(
    applyPackage(root, pack({ "ui/a.ts": "new", "ui/b.ts": "new" }), {
      prepare: async () => {},
      afterWrite: async () => {
        throw Error("disk failure");
      },
    }),
    /disk failure/,
  );
  assert.equal(await fs.readFile(path.join(root, "ui/a.ts"), "utf8"), "old");
  assert.equal(await fs.readFile(path.join(root, "ui/b.ts"), "utf8"), "old");
  assert.equal(
    JSON.parse(await fs.readFile(path.join(root, ".updates/installed.json")))
      .revision,
    1,
  );
  assert.equal(await recoverUpdate(root), false);
});

test("symlink w pliku lub rodzicu blokuje instalację bez zapisu poza root", async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  const old = pack({ "ui/App.tsx": "old" }, 1);
  await put(root, ".distribution.json", JSON.stringify(old));
  await initializeInstallation(root);
  await fs.symlink(outside, path.join(root, "ui"));
  await assert.rejects(
    applyPackage(root, pack({ "ui/App.tsx": "new" }), {
      prepare: async () => {},
    }),
    /symlink/i,
  );
  assert.equal((await fs.readdir(outside)).length, 0);
});

test("blokada istnieje od razu z kompletnym PID; drugi instalator i recovery nie wchodzą równolegle", async (t) => {
  const root = await fixture(t);
  const { acquireUpdateLock } = await import("./app-update.mjs");
  const release = await acquireUpdateLock(root);
  const owner = JSON.parse(
    await fs.readFile(path.join(root, ".updates/install.lock")),
  );
  assert.equal(owner.pid, process.pid);
  await assert.rejects(acquireUpdateLock(root), /pracuje|instalac/i);
  await release();
  const next = await acquireUpdateLock(root);
  await next();
});
test("stara pusta blokada po awarii jest odzyskiwana, świeża pusta blokada nie jest zabierana", async (t) => {
  const root = await fixture(t);
  const { acquireUpdateLock } = await import("./app-update.mjs");
  await put(root, ".updates/install.lock", "");
  await assert.rejects(acquireUpdateLock(root), /blokad|pracuje/i);
  const old = new Date(Date.now() - 60000);
  await fs.utimes(path.join(root, ".updates/install.lock"), old, old);
  const release = await acquireUpdateLock(root);
  await release();
});
test("błąd przygotowania zależności nie zmienia aplikacji", async (t) => {
  const root = await fixture(t);
  const old = pack({ "package.json": "old" }, 1);
  await put(root, ".distribution.json", JSON.stringify(old));
  await initializeInstallation(root);
  await put(root, "package.json", "old");
  await assert.rejects(
    applyPackage(root, pack({ "package.json": "new" }), {
      prepare: async () => {
        throw Error("npm offline");
      },
    }),
    /npm offline/,
  );
  assert.equal(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
    "old",
  );
});

test("dwa procesy odzyskiwania nie przejmują tej samej starej blokady", async (t) => {
  const root = await fixture(t);
  const { acquireUpdateLock } = await import("./app-update.mjs");
  await put(root, ".updates/install.lock", "");
  const old = new Date(Date.now() - 60000);
  await fs.utimes(path.join(root, ".updates/install.lock"), old, old);
  const results = await Promise.allSettled([
    acquireUpdateLock(root),
    acquireUpdateLock(root),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  for (const r of results) if (r.status === "fulfilled") await r.value();
});
test("odzyskuje kompletny dziennik po twardym przerwaniu bez aktywnego instalatora", async (t) => {
  const root = await fixture(t);
  const old = pack({ "ui/a.ts": "old" }, 1);
  const id = "a".repeat(32);
  await put(root, ".updates/installed.json", JSON.stringify(old));
  await put(root, "ui/a.ts", "new");
  await put(root, `.updates/backups/${id}/files/ui/a.ts`, "old");
  await put(
    root,
    ".updates/transaction.json",
    JSON.stringify({
      phase: "applying",
      backup: `.updates/backups/${id}`,
      previous: old,
      changes: [{ path: "ui/a.ts", kind: "write", existed: true, mode: 0o644 }],
      dependencySwap: false,
      hadDependencies: false,
    }),
  );
  const { recoverInstaller } = await import("./app-update-cli.mjs");
  assert.equal(await recoverInstaller(root), true);
  assert.equal(await fs.readFile(path.join(root, "ui/a.ts"), "utf8"), "old");
  assert.equal(await recoverInstaller(root), false);
});
