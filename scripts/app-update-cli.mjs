import console from "node:console";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  acquireUpdateLock,
  initializeInstallation,
  applyPackage,
  safeUpdatePath,
  readJson,
  updateJson,
  recoverUpdate,
} from "./app-update.mjs";
import { createUpdateService } from "../ui/update-server.mjs";

const root = path.resolve(import.meta.dirname, "..");
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== "ESRCH";
  }
};
export async function recoverInstaller(rootDir) {
  const release = await acquireUpdateLock(rootDir);
  try {
    return await recoverUpdate(rootDir);
  } finally {
    await release();
  }
}
async function runNpm(cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["ci"],
      { cwd, stdio: "inherit", shell: false },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error(`Instalacja zależności npm: kod ${code}.`)),
    );
  });
}
async function main() {
  const command = process.argv[2];
  if (command === "init") {
    await recoverInstaller(root);
    await initializeInstallation(root);
    return;
  }
  if (command === "recover") {
    console.log(
      (await recoverInstaller(root))
        ? "Przywrócono poprzednią wersję."
        : "Brak przerwanej transakcji.",
    );
    return;
  }
  if (command !== "install")
    throw Error("Użycie: node scripts/app-update-cli.mjs init|install|recover");
  const waitAt = process.argv.indexOf("--wait-for");
  const parent = waitAt >= 0 ? Number(process.argv[waitAt + 1]) : null;
  if (parent !== null) {
    if (!Number.isSafeInteger(parent) || parent < 1)
      throw Error("Błędny proces panelu.");
    let tries = 0;
    while (alive(parent) && tries++ < 120) await delay(500);
    if (alive(parent))
      throw Error("Panel nadal działa. Zamknij go przed instalacją.");
  }
  const server = await readJson(
    await safeUpdatePath(root, ".updates/server.json"),
  );
  if (server && server.pid !== parent && alive(server.pid))
    throw Error("Panel nadal działa. Zatrzymaj npm run ui przed instalacją.");
  const service = createUpdateService(root);
  let failed = false;
  try {
    await recoverInstaller(root);
    const pkg = await service.pending();
    await updateJson(root, ".updates/status.json", {
      ...(await service.get()),
      status: "installing",
      error: null,
    });
    const result = await applyPackage(root, pkg, { prepare: runNpm });
    await updateJson(root, ".updates/status.json", {
      status: "installed",
      current: { version: pkg.version, revision: pkg.revision },
      available: null,
      pending: null,
      checkedAt: Date.now(),
      error: null,
      result,
    });
    console.log(
      `Zaktualizowano ${result.updated} plików. Zachowano ${result.preserved.length} własnych zmian. Kopia: ${result.backup}`,
    );
  } catch (e) {
    failed = true;
    await updateJson(root, ".updates/status.json", {
      ...(await service.get()),
      status: "error",
      error: e.message,
    });
    console.error(e.message);
  }
  const restartAt = process.argv.indexOf("--restart-port");
  if (restartAt >= 0) {
    const port = Number(process.argv[restartAt + 1]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw Error("Błędny port restartu.");
    const log = await fs.open(
      await safeUpdatePath(root, ".updates/panel.log"),
      "a",
    );
    const child = spawn(
      process.execPath,
      [
        path.join(root, "node_modules/vite/bin/vite.js"),
        "--config",
        path.join(root, "vite.config.mjs"),
        "--port",
        String(port),
      ],
      { cwd: root, detached: true, stdio: ["ignore", log.fd, log.fd] },
    );
    child.unref();
    await log.close();
  }
  if (failed) process.exitCode = 1;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.join(root, "scripts/app-update-cli.mjs")
)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
