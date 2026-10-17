import fs from "node:fs/promises";
import {
  createBrandingStore,
  snapshotBranding,
  brandingPath,
  brandingError,
} from "../scripts/branding-store.mjs";
import { defaultBranding, clientIdSchema } from "../src/branding/schema.mjs";
import {
  listFonts,
  importFont,
  importUploadedFont,
} from "../scripts/branding-fonts.mjs";
import { importBrandAsset } from "../scripts/branding-assets.mjs";
import {
  startBrandScan,
  getBrandScan,
  cancelBrandScan,
} from "../scripts/branding-scan.mjs";

async function json(req) {
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > 256 * 1024)
      throw brandingError(413, "Za dużo danych formularza");
    parts.push(part);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8") || "{}");
  } catch {
    throw brandingError(400, "Nieprawidłowe dane formularza");
  }
}
function send(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
export async function brandingRoute(root, req, res, url) {
  try {
    return await routeBranding(root, req, res, url);
  } catch (error) {
    if (error.name === "ZodError")
      throw brandingError(
        400,
        "Nieprawidłowy branding: " +
          error.issues.map((issue) => issue.message).join("; "),
      );
    throw error;
  }
}
async function routeBranding(root, req, res, url) {
  const [, prefix, section, id, action, item] = url.pathname.split("/");
  if (prefix !== "branding")
    throw brandingError(404, "Nie ma takiej trasy brandingu");
  if (section === "fonts" && req.method === "GET")
    return send(
      res,
      await listFonts(root, {
        source: url.searchParams.get("source") ?? "local",
        query: url.searchParams.get("q") ?? "",
      }),
    );
  clientIdSchema.parse(id);
  const client = await brandingPath(root, `klienci/${id}`);
  if (!(await fs.stat(client).catch(() => null))?.isDirectory())
    throw brandingError(404, "Nie ma takiego klienta");
  if (section !== "clients")
    throw brandingError(404, "Nie ma takiej trasy brandingu");
  const store = createBrandingStore(root);
  const replyProfile = async (profile) => {
    let issues = [];
    if (!profile.revision) issues = ["Zapisz branding przed montażem."];
    else
      try {
        await snapshotBranding(root, id, profile.revision);
      } catch (e) {
        issues = [e.message];
      }
    res.setHeader("ETag", `"${profile.revision}"`);
    send(res, {
      profile,
      revision: profile.revision,
      ready: issues.length === 0,
      issues,
    });
  };
  if (!action && req.method === "GET") {
    const title = await fs
      .readFile(
        await brandingPath(root, `klienci/${id}/PREFERENCJE.md`),
        "utf8",
      )
      .catch(() => id);
    const label = title.match(/^#\s*(.+?)(?:\s+[—–-]\s.*)?$/m)?.[1] ?? id;
    return replyProfile((await store.get(id)) ?? defaultBranding(id, label));
  }
  if (!action && req.method === "PUT") {
    const match = /^"?(\d+)"?$/.exec(req.headers["if-match"] ?? "");
    if (!match)
      throw brandingError(
        428,
        "Brak rewizji brandingu. Otwórz klienta ponownie; zachowaj swój draft.",
      );
    return replyProfile(
      await store.save(id, await json(req), Number(match[1])),
    );
  }
  if (action === "assets" && req.method === "POST")
    return send(
      res,
      await importBrandAsset(root, id, url.searchParams.get("kind"), req, {
        name: url.searchParams.get("file"),
      }),
      201,
    );
  if (action === "fonts" && req.method === "POST")
    return send(
      res,
      item === "upload"
        ? await importUploadedFont(root, id, req, {
            name: url.searchParams.get("file"),
          })
        : await importFont(root, id, await json(req)),
      201,
    );
  if (action === "scans") {
    if (!item && req.method === "POST")
      return send(res, await startBrandScan(root, id, await json(req)), 202);
    if (item && req.method === "GET")
      return send(res, await getBrandScan(root, id, item));
    if (item && req.method === "DELETE")
      return send(res, await cancelBrandScan(root, id, item));
  }
  throw brandingError(404, "Nie ma takiej trasy brandingu");
}
