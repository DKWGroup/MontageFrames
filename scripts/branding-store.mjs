import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import {
  brandingProfileSchema,
  clientIdSchema,
} from "../src/branding/schema.mjs";
export const brandingError = (status, message) =>
  Object.assign(new Error(message), { status });
export async function brandingPath(root, relative, { create = false } = {}) {
  const base = path.resolve(root);
  const dest = path.resolve(base, relative);
  if (!dest.startsWith(base + path.sep))
    throw brandingError(400, "Nieprawidłowa ścieżka");
  const parts = path.relative(base, dest).split(path.sep);
  let cursor = base;
  for (let i = 0; i < parts.length; i++) {
    cursor = path.join(cursor, parts[i]);
    const stat = await fs.lstat(cursor).catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
    if (stat?.isSymbolicLink())
      throw brandingError(400, "Dowiązania nie są dozwolone");
    if (!stat && create && i < parts.length - 1)
      await fs.mkdir(cursor).catch((e) => {
        if (e.code !== "EEXIST") throw e;
      });
  }
  return dest;
}
const queues = new Map();
async function fileDigest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function verifyReferences(root, profile) {
  const { clientId } = profile;
  const refs = [
    ...profile.assets,
    ...Object.values(profile.fonts).filter(Boolean),
  ];
  if (new Set(profile.assets.map((a) => a.id)).size !== profile.assets.length)
    throw brandingError(400, "Powtórzony identyfikator materiału");
  for (const ref of refs) {
    const bundled =
      ref.source === "bundled" && /^fonts\/[a-zA-Z0-9_.-]+$/.test(ref.file);
    if (
      !bundled &&
      !ref.file.startsWith(
        `Brandings/${clientId}/${ref.family ? "fonts" : "assets"}/`,
      )
    )
      throw brandingError(400, "Zasób należy do innego klienta");
    const file = await brandingPath(root, `public/${ref.file}`);
    const digest = await fileDigest(file).catch(() => {
      throw brandingError(400, "Brak wybranego pliku zasobu");
    });
    if (digest !== ref.sha256)
      throw brandingError(400, "Zmieniono zawartość zasobu");
    if (ref.licenseFile) {
      if (
        !ref.licenseFile.startsWith(`Brandings/${clientId}/fonts/`) &&
        !bundled
      )
        throw brandingError(400, "Nieprawidłowa licencja");
      await fs.access(await brandingPath(root, `public/${ref.licenseFile}`));
    }
  }
  if (
    profile.logo.enabled &&
    !profile.assets.some(
      (a) => a.id === profile.logo.assetId && a.kind === "logo",
    )
  )
    throw brandingError(400, "Wybierz dostępne logo");
}
export function createBrandingStore(root) {
  const dir = (id) => {
    clientIdSchema.parse(id);
    return `klienci/${id}/branding`;
  };
  const read = async (relative) => {
    try {
      return brandingProfileSchema.parse(
        JSON.parse(
          await fs.readFile(await brandingPath(root, relative), "utf8"),
        ),
      );
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  };
  const store = {
    get: async (id) => read(`${dir(id)}/profile.json`),
    version: async (id, revision) => {
      if (!Number.isSafeInteger(revision) || revision < 1)
        throw brandingError(400, "Nieprawidłowa wersja");
      return read(
        `${dir(id)}/versions/v${String(revision).padStart(3, "0")}.json`,
      );
    },
    save: async (id, input, expectedRevision) => {
      const key = path.resolve(root, dir(id));
      const previous = queues.get(key) || Promise.resolve();
      const next = previous
        .catch(() => {})
        .then(async () => {
          const client = await brandingPath(root, `klienci/${id}`);
          if (!(await fs.stat(client).catch(() => null))?.isDirectory())
            throw brandingError(404, "Nie ma takiego klienta");
          const current = await store.get(id);
          if (expectedRevision !== (current?.revision || 0))
            throw brandingError(
              409,
              "Branding został zmieniony w innym oknie. Zachowano Twoje zmiany.",
            );
          const profile = brandingProfileSchema.parse({
            ...input,
            clientId: id,
            revision: (current?.revision || 0) + 1,
            updatedAt: new Date().toISOString(),
          });
          await verifyReferences(root, profile);
          const version = await brandingPath(
            root,
            `${dir(id)}/versions/v${String(profile.revision).padStart(3, "0")}.json`,
            { create: true },
          );
          const active = await brandingPath(root, `${dir(id)}/profile.json`, {
            create: true,
          });
          const temp = `${active}.${randomUUID()}.part`;
          let createdVersion = false;
          try {
            await fs.writeFile(version, JSON.stringify(profile, null, 2), {
              flag: "wx",
            });
            createdVersion = true;
            await fs.writeFile(temp, JSON.stringify(profile, null, 2), {
              flag: "wx",
            });
            await fs.rename(temp, active);
          } catch (error) {
            if (createdVersion) await fs.rm(version, { force: true });
            throw error;
          } finally {
            await fs.rm(temp, { force: true });
          }
          return profile;
        });
      queues.set(key, next);
      try {
        return await next;
      } finally {
        if (queues.get(key) === next) queues.delete(key);
      }
    },
    templates: async (clientId) => {
      if (clientId === null) return [];
      const ids = clientId
        ? [clientId]
        : await fs.readdir(path.join(root, "klienci")).catch(() => []);
      const items = [];
      for (const id of ids) {
        if (!clientIdSchema.safeParse(id).success) continue;
        const profile = await store.get(id);
        if (!profile) continue;
        let reason;
        try {
          await snapshotBranding(root, id, profile.revision);
        } catch (e) {
          reason = e.message;
        }
        items.push({
          id: `brand-${id}-v${profile.revision}`,
          clientId: id,
          name: profile.name,
          styleId: "brand",
          brandingRevision: profile.revision,
          ready: !reason,
          ...(reason ? { reason } : {}),
        });
      }
      return items;
    },
  };
  return store;
}
export async function snapshotBranding(root, clientId, revision) {
  const store = createBrandingStore(root);
  const p = revision
    ? await store.version(clientId, revision)
    : await store.get(clientId);
  if (!p) throw brandingError(404, "Brak zapisanej wersji brandingu");
  if (!p.fonts.primary)
    throw brandingError(400, "Wybierz i zaimportuj font przed montażem");
  await verifyReferences(root, p);
  return {
    schemaVersion: 1,
    clientId: p.clientId,
    revision: p.revision,
    palette: p.palette,
    fonts: p.fonts,
    captions: p.captions,
    logo: p.logo,
    assets: p.logo.enabled
      ? p.assets.filter((a) => a.id === p.logo.assetId)
      : [],
  };
}
