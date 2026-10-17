import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import process from "node:process";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
export const blobHash = (bytes) =>
  createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const ROOT_FILES = new Set([
  "package.json",
  "package-lock.json",
  "README.md",
  "PANEL.md",
  "PREFERENCJE.md",
  "AGENTS.md",
  "CLAUDE.md",
  "PRODUCT.md",
  "DESIGN.md",
  "frame.md",
  "vite.config.mjs",
  "remotion.config.ts",
  "tsconfig.json",
  "eslint.config.mjs",
  "skills-lock.json",
  ".gitignore",
  ".prettierrc",
  ".env.example",
]);
export function managedPath(name) {
  if (
    typeof name !== "string" ||
    /[\\:]/.test(name) ||
    [...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    name.startsWith("/") ||
    name.split("/").some((x) => !x || x === "." || x === "..")
  )
    return false;
  if (
    /\.(mp4|mov|m4v|mkv|webm|avi|mxf|pem|key|log|tmp|prproj|otio)$/i.test(name)
  )
    return false;
  if (
    name
      .split("/")
      .some((x) => /^\.env(?:\.|$)/i.test(x) && x !== ".env.example")
  )
    return false;
  if (
    name === "src/Root.tsx" ||
    name.startsWith("src/studio/") ||
    name.startsWith("ui/dist/")
  )
    return false;
  if (name.startsWith("klienci/"))
    return (
      /^klienci\/[^/.][^/]*\//.test(name) &&
      !name
        .split("/")
        .some((x) =>
          /^(Render|QuickContent|surowe pliki|\.longform|\.quickcontent)$/i.test(
            x,
          ),
        )
    );
  return (
    ROOT_FILES.has(name) ||
    /^(src|ui|scripts|tests|docs)\//.test(name) ||
    /^public\/(fonts|Brandings|sfx)\//.test(name) ||
    /^\.(agents|claude)\/skills\//.test(name) ||
    name === ".claude/launch.json" ||
    /^\.github\/workflows\//.test(name) ||
    /^(plan-wdrozenia|zalozenia-funkcji)-[^/]+\.md$/.test(name)
  );
}
const personal = (name) =>
  /^(klienci\/|src\/styles\/|public\/Brandings\/|public\/fonts\/|\.(agents|claude)\/)/.test(
    name,
  ) || ["PREFERENCJE.md", "AGENTS.md", "CLAUDE.md", "frame.md"].includes(name);
export const manifestOf = (pkg) => ({
  format: 1,
  version: pkg.version,
  revision: pkg.revision,
  files: Object.fromEntries(
    Object.entries(pkg.files).map(([p, e]) => [
      p,
      { hash: e.hash, mode: e.mode },
    ]),
  ),
});
export function validateManifest(pkg) {
  if (
    pkg?.format !== 1 ||
    !/^[a-f0-9]{40}$/.test(pkg.version) ||
    !Number.isSafeInteger(pkg.revision) ||
    pkg.revision < 1 ||
    !pkg.files ||
    Array.isArray(pkg.files) ||
    typeof pkg.files !== "object" ||
    Object.keys(pkg.files).length > 10000
  )
    throw Error("Nieprawidłowy manifest aktualizacji.");
  const seen = new Set();
  for (const [name, e] of Object.entries(pkg.files)) {
    if (
      !managedPath(name) ||
      seen.has(name.toLowerCase()) ||
      !/^[a-f0-9]{40}$/.test(e?.hash) ||
      ![0o644, 0o755].includes(e.mode)
    )
      throw Error(`Niedozwolona ścieżka lub wpis manifestu: ${name}`);
    seen.add(name.toLowerCase());
  }
  return pkg;
}
export function validatePackage(pkg) {
  validateManifest(pkg);
  let total = 0;
  for (const [name, e] of Object.entries(pkg.files)) {
    if (
      typeof e.content !== "string" ||
      e.content.length > 45 * 1024 * 1024 ||
      Buffer.from(e.content, "base64").toString("base64") !== e.content
    )
      throw Error(`Błędne dane pliku: ${name}`);
    const bytes = Buffer.from(e.content, "base64");
    total += bytes.length;
    if (total > 256 * 1024 * 1024 || bytes.length > 32 * 1024 * 1024)
      throw Error("Paczka przekracza limit rozmiaru.");
    if (blobHash(bytes) !== e.hash)
      throw Error(`Niezgodny skrót pliku: ${name}`);
  }
  return pkg;
}
export function planUpdate(baseline, incoming, local) {
  if (!baseline)
    throw Error(
      "Brak wersji bazowej (baseline). Zainstaluj aplikację z oficjalnej paczki lub klona Git.",
    );
  validateManifest(baseline);
  validateManifest(incoming);
  const changes = [],
    preserved = [],
    conflicts = [];
  for (const name of new Set([
    ...Object.keys(baseline.files),
    ...Object.keys(incoming.files),
  ])) {
    const before = baseline.files[name]?.hash,
      after = incoming.files[name]?.hash,
      current = local[name];
    if (current === after || before === after) continue;
    if (!after && personal(name)) {
      if (current) preserved.push(name);
      continue;
    }
    if (current !== before) {
      (personal(name) ? preserved : conflicts).push(name);
      continue;
    }
    changes.push({ path: name, kind: after ? "write" : "delete" });
  }
  return { changes, preserved, conflicts };
}
export async function safeUpdatePath(root, relative) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.split("/").some((x) => !x || x === "." || x === "..")
  )
    throw Error("Niedozwolona ścieżka aktualizacji.");
  const base = await fs.realpath(root);
  let current = base;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    const st = await fs.lstat(current).catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
    if (st?.isSymbolicLink())
      throw Error(`Symlink w ścieżce aktualizacji: ${relative}`);
  }
  return current;
}
export const readJson = async (file, fallback = null) =>
  fs
    .readFile(file, "utf8")
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return fallback;
      throw e;
    });
export async function updateJson(root, relative, data) {
  const file = await safeUpdatePath(root, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2));
  await fs.rename(temp, file);
}
export async function initializeInstallation(root) {
  const existing = await readJson(
    await safeUpdatePath(root, ".updates/installed.json"),
  );
  if (existing) return validateManifest(existing);
  let baseline = await readJson(
    await safeUpdatePath(root, ".distribution.json"),
  );
  if (!baseline) {
    try {
      const [{ stdout: tree }, { stdout: version }, { stdout: revision }] =
        await Promise.all([
          exec("git", ["-C", root, "ls-tree", "-rz", "--full-tree", "HEAD"], {
            maxBuffer: 4 * 1024 * 1024,
          }),
          exec("git", ["-C", root, "rev-parse", "HEAD"]),
          exec("git", ["-C", root, "rev-list", "--count", "HEAD"]),
        ]);
      const files = {};
      for (const row of tree.split("\0").filter(Boolean)) {
        const [info, name] = row.split("\t");
        const [mode, type, hash] = info.split(" ");
        if (
          type === "blob" &&
          ["100644", "100755"].includes(mode) &&
          managedPath(name)
        )
          files[name] = { hash, mode: mode === "100755" ? 0o755 : 0o644 };
      }
      baseline = {
        format: 1,
        version: version.trim(),
        revision: Number(revision.trim()),
        files,
      };
    } catch {
      return null;
    }
  }
  validateManifest(baseline);
  baseline = manifestOf(baseline);
  await updateJson(root, ".updates/installed.json", baseline);
  return baseline;
}
export async function inspectPackage(root, pkg) {
  validatePackage(pkg);
  const baseline = await initializeInstallation(root),
    local = {};
  if (!baseline) return planUpdate(null, pkg, local);
  for (const name of new Set([
    ...Object.keys(baseline.files),
    ...Object.keys(pkg.files),
  ])) {
    const file = await safeUpdatePath(root, name);
    local[name] = await fs
      .readFile(file)
      .then(blobHash)
      .catch((e) => {
        if (e.code === "ENOENT") return undefined;
        throw e;
      });
  }
  return planUpdate(baseline, pkg, local);
}
async function restoreTransaction(root, tx) {
  for (const item of tx.changes) {
    const target = await safeUpdatePath(root, item.path);
    if (item.existed) {
      const backup = await safeUpdatePath(
        root,
        `${tx.backup}/files/${item.path}`,
      );
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(backup, target);
      await fs.chmod(target, item.mode);
    } else await fs.rm(target, { force: true });
  }
  const oldDeps = await safeUpdatePath(root, `${tx.backup}/node_modules`);
  if (await fs.stat(oldDeps).catch(() => null)) {
    const deps = await safeUpdatePath(root, "node_modules");
    await fs.rm(deps, { recursive: true, force: true });
    await fs.rename(oldDeps, deps);
  } else if (tx.dependencySwap && !tx.hadDependencies)
    await fs.rm(await safeUpdatePath(root, "node_modules"), {
      recursive: true,
      force: true,
    });
  await updateJson(root, ".updates/installed.json", tx.previous);
  await updateJson(root, ".updates/transaction.json", {
    ...tx,
    phase: "rolled-back",
  });
}
export async function recoverUpdate(root) {
  const tx = await readJson(
    await safeUpdatePath(root, ".updates/transaction.json"),
  );
  if (!tx || tx.phase !== "applying") return false;
  // A journal is local but still validated before using it as a list of filesystem operations.
  validateManifest(tx.previous);
  if (
    !/^\.updates\/backups\/[a-f0-9-]+$/.test(tx.backup) ||
    !Array.isArray(tx.changes) ||
    tx.changes.some(
      (x) =>
        !managedPath(x.path) ||
        typeof x.existed !== "boolean" ||
        ![0o644, 0o755].includes(x.mode),
    )
  )
    throw Error("Nieprawidłowy dziennik aktualizacji.");
  await restoreTransaction(root, tx);
  return true;
}
const processAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== "ESRCH";
  }
};
export async function acquireUpdateLock(root) {
  const lock = await safeUpdatePath(root, ".updates/install.lock");
  await fs.mkdir(path.dirname(lock), { recursive: true });
  const token = randomUUID();
  const temp = await safeUpdatePath(root, `.updates/install-${token}.owner`);
  await fs.writeFile(temp, JSON.stringify({ pid: process.pid, token }), {
    flag: "wx",
    mode: 0o600,
  });
  const create = () => fs.link(temp, lock);
  try {
    try {
      await create();
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const st = await fs.lstat(lock);
      let owner;
      try {
        owner = JSON.parse(await fs.readFile(lock, "utf8"));
      } catch {
        owner = null;
      }
      if (
        (Number.isSafeInteger(owner?.pid) &&
          owner.pid > 0 &&
          processAlive(owner.pid)) ||
        (!owner && Date.now() - st.mtimeMs < 30000)
      )
        throw Error(
          "Instalator lub odzyskiwanie już pracuje; świeża blokada nie została zmieniona.",
        );
      // Exactly one contender can claim this inode. Keeping the hard link prevents inode reuse.
      const claim = await safeUpdatePath(
        root,
        `.updates/claims/${st.dev}-${st.ino}`,
      );
      await fs.mkdir(path.dirname(claim), { recursive: true });
      try {
        await fs.link(lock, claim);
      } catch {
        throw Error("Inny proces odzyskuje blokadę aktualizacji.");
      }
      const current = await fs.lstat(lock);
      if (current.ino !== st.ino || current.dev !== st.dev)
        throw Error(
          "Blokada aktualizacji zmieniła właściciela. Ponów sprawdzenie.",
        );
      await fs.unlink(lock);
      try {
        await create();
      } catch {
        throw Error("Inna instalacja już pracuje.");
      }
    }
    const owned = await fs.lstat(temp);
    return async () => {
      const current = await fs.lstat(lock).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      });
      if (current?.ino === owned.ino && current.dev === owned.dev)
        await fs.unlink(lock);
    };
  } finally {
    await fs.rm(temp, { force: true });
  }
}

export async function applyPackage(
  root,
  pkg,
  { prepare, afterWrite = async () => {} } = {},
) {
  validatePackage(pkg);
  const release = await acquireUpdateLock(root);
  const id = randomUUID(),
    backup = `.updates/backups/${id}`,
    stage = `.updates/staging/${id}`;
  try {
    await recoverUpdate(root);
    const previous = await initializeInstallation(root);
    if (!previous || pkg.revision <= previous.revision)
      throw Error("To nie jest nowsza wersja aplikacji.");
    const plan = await inspectPackage(root, pkg);
    if (plan.conflicts.length)
      throw Error(
        `Lokalne zmiany kodu blokują aktualizację: ${plan.conflicts.join(", ")}`,
      );
    const stageDir = await safeUpdatePath(root, stage);
    await fs.mkdir(stageDir, { recursive: true });
    for (const [name, e] of Object.entries(pkg.files)) {
      const file = await safeUpdatePath(root, `${stage}/${name}`);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, Buffer.from(e.content, "base64"), {
        mode: e.mode,
      });
    }
    const depsChanged = plan.changes.some((x) =>
      ["package.json", "package-lock.json"].includes(x.path),
    );
    if (depsChanged && !prepare)
      throw Error("Instalator zależności jest wymagany.");
    if (depsChanged) await prepare(stageDir);
    // Recheck after a potentially long download of dependencies, before touching user files.
    const latest = await inspectPackage(root, pkg);
    if (JSON.stringify(latest) !== JSON.stringify(plan))
      throw Error(
        "Pliki zmieniły się podczas przygotowania aktualizacji. Ponów po zapisaniu pracy.",
      );
    const changes = [];
    for (const item of plan.changes) {
      const file = await safeUpdatePath(root, item.path),
        st = await fs.stat(file).catch((e) => {
          if (e.code === "ENOENT") return null;
          throw e;
        });
      changes.push({
        ...item,
        existed: Boolean(st),
        mode: st?.mode & 0o111 ? 0o755 : 0o644,
      });
      if (st) {
        const dest = await safeUpdatePath(root, `${backup}/files/${item.path}`);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(file, dest);
      }
    }
    const stagedDeps = await fs
      .stat(path.join(stageDir, "node_modules"))
      .catch(() => null);
    const hadDependencies = Boolean(
      await fs
        .stat(await safeUpdatePath(root, "node_modules"))
        .catch(() => null),
    );
    const tx = {
      phase: "applying",
      backup,
      previous,
      changes,
      dependencySwap: Boolean(stagedDeps),
      hadDependencies,
    };
    await updateJson(root, ".updates/transaction.json", tx);
    try {
      if (stagedDeps) {
        const deps = await safeUpdatePath(root, "node_modules");
        if (hadDependencies) {
          await fs.mkdir(path.join(root, backup), { recursive: true });
          await fs.rename(deps, path.join(root, backup, "node_modules"));
        }
        await fs.rename(path.join(stageDir, "node_modules"), deps);
      }
      for (const item of changes) {
        const target = await safeUpdatePath(root, item.path);
        if (item.kind === "delete") await fs.rm(target, { force: true });
        else {
          await fs.mkdir(path.dirname(target), { recursive: true });
          const temp = `${target}.${id}.tmp`;
          await fs.copyFile(path.join(stageDir, item.path), temp);
          await fs.chmod(temp, pkg.files[item.path].mode);
          await fs.rename(temp, target);
        }
        await afterWrite(item);
      }
      await updateJson(root, ".updates/installed.json", manifestOf(pkg));
      await updateJson(root, ".updates/transaction.json", {
        ...tx,
        phase: "complete",
        preserved: plan.preserved,
      });
      return {
        version: pkg.version,
        backup,
        preserved: plan.preserved,
        updated: changes.length,
      };
    } catch (e) {
      await restoreTransaction(root, tx);
      throw e;
    }
  } finally {
    await release();
  }
}
