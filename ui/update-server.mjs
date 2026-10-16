import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  initializeInstallation,
  safeUpdatePath,
  readJson,
  updateJson,
  sha256,
  validatePackage,
  inspectPackage,
} from "../scripts/app-update.mjs";

export const UPDATE_REPO = "DKWGroup/MontageFrames";
export const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const endpoint = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "MontageFrames-Updater",
};
const permittedDownload = (value) =>
  typeof value === "string" &&
  value.startsWith(`https://github.com/${UPDATE_REPO}/releases/download/`);
async function boundedResponse(response, max) {
  if (!response.ok) throw Error(`GitHub: HTTP ${response.status}.`);
  let size = 0;
  const chunks = [];
  for await (const bytes of response.body) {
    size += bytes.length;
    if (size > max) throw Error("Zbyt duża odpowiedź aktualizacji.");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}
export function createUpdateService(
  root,
  { fetch: fetcher = globalThis.fetch, now = Date.now } = {},
) {
  let status = {
      status: "idle",
      checkedAt: null,
      current: null,
      available: null,
      pending: null,
      error: null,
    },
    task = null;
  const save = () => updateJson(root, ".updates/status.json", status);
  const get = async () => {
    const current = await initializeInstallation(root);
    if (!status.current) {
      const cached = await readJson(
        await safeUpdatePath(root, ".updates/status.json"),
      );
      if (cached) status = { ...status, ...cached };
    }
    status.current = current
      ? { version: current.version, revision: current.revision }
      : null;
    return status;
  };
  const retrieve = async (url, max) =>
    boundedResponse(
      await fetcher(url, {
        headers,
        signal: globalThis.AbortSignal.timeout(30000),
      }),
      max,
    );
  async function exclusive(work) {
    if (task)
      throw Object.assign(Error("Aktualizator już pracuje."), { status: 409 });
    task = Promise.resolve().then(work);
    try {
      return await task;
    } finally {
      task = null;
    }
  }
  async function check(force = false) {
    return exclusive(async () => {
      await get();
      if (
        !force &&
        status.checkedAt &&
        now() - status.checkedAt < CHECK_INTERVAL
      )
        return status;
      try {
        const response = await fetcher(endpoint, {
          headers,
          signal: globalThis.AbortSignal.timeout(15000),
        });
        if (response.status === 404) {
          status = {
            ...status,
            status: "unpublished",
            checkedAt: now(),
            available: null,
            error: null,
          };
          await save();
          return status;
        }
        const release = JSON.parse(
          (await boundedResponse(response, 2 * 1024 * 1024)).toString(),
        );
        const meta = release.assets?.find(
          (x) => x.name === "montageframes-version.json",
        );
        const asset = release.assets?.find(
          (x) => x.name === "montageframes-update.json.gz",
        );
        if (
          release.draft ||
          release.prerelease ||
          !permittedDownload(meta?.browser_download_url) ||
          !permittedDownload(asset?.browser_download_url)
        )
          throw Error("Brak kompletnej oficjalnej paczki aktualizacji.");
        const version = JSON.parse(
          (await retrieve(meta.browser_download_url, 64 * 1024)).toString(),
        );
        if (
          version.format !== 1 ||
          !/^[a-f0-9]{40}$/.test(version.version) ||
          !Number.isSafeInteger(version.revision) ||
          version.revision < 1 ||
          !/^[a-f0-9]{64}$/.test(version.sha256) ||
          release.tag_name !== `app-${version.version}`
        )
          throw Error("Nieprawidłowy opis wersji aktualizacji.");
        const newer =
          status.current && version.revision > status.current.revision;
        status = {
          ...status,
          status: newer
            ? "available"
            : status.current
              ? "current"
              : "uninitialized",
          checkedAt: now(),
          error: null,
          available: newer
            ? {
                ...version,
                url: asset.browser_download_url,
                digest: asset.digest ?? null,
              }
            : null,
        };
        await save();
        return status;
      } catch (e) {
        status = {
          ...status,
          status: "offline",
          checkedAt: now(),
          error: e.message,
        };
        await save();
        return status;
      }
    });
  }
  async function download() {
    return exclusive(async () => {
      await get();
      const version = status.available;
      if (!version || !permittedDownload(version.url))
        throw Error("Najpierw sprawdź nową wersję.");
      status = { ...status, status: "downloading", error: null };
      await save();
      try {
        const bytes = await retrieve(version.url, 160 * 1024 * 1024);
        const hash = sha256(bytes);
        if (
          hash !== version.sha256 ||
          (version.digest && version.digest !== `sha256:${hash}`)
        )
          throw Error("Niezgodny SHA-256 pobranej paczki.");
        const pkg = validatePackage(
          JSON.parse(
            gunzipSync(bytes, {
              maxOutputLength: 384 * 1024 * 1024,
            }).toString(),
          ),
        );
        if (
          pkg.version !== version.version ||
          pkg.revision !== version.revision
        )
          throw Error("Paczka nie pasuje do wybranej wersji.");
        const plan = await inspectPackage(root, pkg);
        const file = await safeUpdatePath(root, ".updates/pending.json.gz");
        await fs.writeFile(file, bytes);
        status = {
          ...status,
          status: "ready",
          pending: {
            version: version.version,
            sha256: hash,
            preserved: plan.preserved,
            conflicts: plan.conflicts,
            changes: plan.changes.length,
          },
          error: null,
        };
        await save();
        return status;
      } catch (e) {
        status = { ...status, status: "error", error: e.message };
        await save();
        throw e;
      }
    });
  }
  const pending = async () => {
    await get();
    if (!status.pending) throw Error("Brak pobranej aktualizacji.");
    const bytes = await fs.readFile(
      await safeUpdatePath(root, ".updates/pending.json.gz"),
    );
    if (sha256(bytes) !== status.pending.sha256)
      throw Error("Pobrana paczka została zmieniona. Pobierz ponownie.");
    return validatePackage(
      JSON.parse(
        gunzipSync(bytes, { maxOutputLength: 384 * 1024 * 1024 }).toString(),
      ),
    );
  };
  return { get, check, download, pending };
}
