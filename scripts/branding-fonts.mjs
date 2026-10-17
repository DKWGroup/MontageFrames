import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { brandingPath, brandingError } from "./branding-store.mjs";
import { receiveBrandFile, publishBrandFile } from "./branding-assets.mjs";
const exec = promisify(execFile);
const helper = fileURLToPath(
  new URL("./branding-fonts.swift", import.meta.url),
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
const cache = new Map();
async function coretext(...args) {
  if (process.platform !== "darwin")
    throw brandingError(
      400,
      "Odczyt fontów lokalnych wymaga macOS. Wybierz Google Fonts lub własny plik.",
    );
  try {
    return JSON.parse(
      (
        await exec(
          "swift",
          [
            "-module-cache-path",
            "/tmp/montage-branding-swift",
            helper,
            ...args,
          ],
          { maxBuffer: 10 * 1024 ** 2, timeout: 60000 },
        )
      ).stdout,
    );
  } catch (e) {
    throw brandingError(
      400,
      e.stderr?.trim() ||
        "Nie można odczytać fontu przez CoreText. Użyj poprawnego pliku TTF/OTF.",
    );
  }
}
async function remote(url, maxBytes = 20 * 1024 ** 2) {
  const response = await globalThis
    .fetch(url, {
      signal: globalThis.AbortSignal.timeout(20000),
      headers: { "User-Agent": "MontageFrames-local-branding" },
    })
    .catch(() => {
      throw brandingError(
        502,
        "Katalog Google Fonts jest niedostępny. Sprawdź połączenie internetowe.",
      );
    });
  if (!response.ok)
    throw brandingError(
      502,
      `Katalog Google Fonts jest niedostępny (${response.status})`,
    );
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxBytes)
      throw brandingError(413, "Plik fontu lub katalog jest za duży");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function googleCatalog(root, refresh = false) {
  const target = await brandingPath(root, ".branding/google-fonts.json", {
    create: true,
  });
  if (!refresh) {
    if (cache.has(root)) return cache.get(root);
    const saved = await fs
      .readFile(target, "utf8")
      .then(JSON.parse)
      .catch(() => null);
    if (saved) {
      cache.set(root, saved);
      return saved;
    }
  }
  const text = (
    await remote("https://fonts.google.com/metadata/fonts", 12 * 1024 ** 2)
  ).toString();
  const json = JSON.parse(text.replace(/^\)\]\}'\s*/, ""));
  const fonts = json.familyMetadataList
    .map((f) => ({
      id: f.family,
      family: f.family,
      source: "google",
      weight: "400",
      style: "normal",
      variants: Object.keys(f.fonts).map((v) => ({
        id: v,
        weight: v.replace(/i$/, "") || "400",
        style: v.endsWith("i") ? "italic" : "normal",
      })),
    }))
    .filter((f) => !/times new roman/i.test(f.family));
  await fs.writeFile(target, JSON.stringify(fonts));
  cache.set(root, fonts);
  return fonts;
}
export async function listFonts(
  root,
  { source = "local", query = "", refresh = false } = {},
) {
  let fonts = [];
  try {
    if (source === "local") {
      fonts = (await coretext("list")).map(({ file: _file, ...f }) => ({
        ...f,
        source: "local",
        importable: !["ttc", "dfont"].includes(f.format),
        reason: ["ttc", "dfont"].includes(f.format)
          ? "Kolekcja fontów — załaduj osobny plik TTF/OTF"
          : undefined,
        variants: [{ id: f.id, weight: f.weight, style: f.style }],
      }));
    } else if (source === "bundled") {
      const names = await fs
        .readdir(path.join(root, "public/fonts"))
        .catch(() => []);
      fonts = names
        .filter((n) => /\.(ttf|otf|woff2?)$/i.test(n) && !/times/i.test(n))
        .map((n) => ({
          id: n,
          family: n.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/-/g, " "),
          weight: /Black/.test(n) ? "900" : /Bold/.test(n) ? "700" : "400",
          style: /Italic/.test(n) ? "italic" : "normal",
          source: "bundled",
          variants: [
            {
              id: n,
              weight: /Black/.test(n) ? "900" : /Bold/.test(n) ? "700" : "400",
              style: /Italic/.test(n) ? "italic" : "normal",
            },
          ],
        }));
    } else if (source === "google") {
      fonts = await googleCatalog(root, refresh);
    } else throw brandingError(400, "Nieznane źródło fontów");
    return {
      fonts: fonts
        .filter((f) =>
          f.family
            .toLocaleLowerCase("pl")
            .includes(query.toLocaleLowerCase("pl")),
        )
        .slice(0, 200),
    };
  } catch (e) {
    return { fonts: [], warning: e.message };
  }
}
async function validateFont(file) {
  const head = Buffer.alloc(4);
  const handle = await fs.open(file);
  try {
    await handle.read(head, 0, 4, 0);
  } finally {
    await handle.close();
  }
  if (head.toString() === "ttcf")
    throw brandingError(
      400,
      "Kolekcja TTC nie jest obsługiwana. Wybierz osobny plik TTF/OTF.",
    );
  if (
    ![0x00010000, 0x4f54544f, 0x774f4646, 0x774f4632, 0x74727565].includes(
      head.readUInt32BE(0),
    )
  )
    throw brandingError(400, "To nie jest poprawny plik fontu");
  const info = await coretext("inspect", file);
  if (/times new roman/i.test(info.family))
    throw brandingError(400, "Times New Roman nie jest dostępny");
  return info;
}
export async function importUploadedFont(
  root,
  clientId,
  stream,
  { name, source = "upload" } = {},
) {
  if (
    typeof name !== "string" ||
    name.length > 255 ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes(String.fromCharCode(0)) ||
    !/\.(ttf|otf|woff2?)$/i.test(name)
  )
    throw brandingError(400, "Wybierz plik TTF, OTF, WOFF lub WOFF2");
  const upload = await receiveBrandFile(root, clientId, "fonts", stream);
  try {
    const info = await validateFont(upload.temp);
    const ext = path.extname(name).slice(1).toLowerCase();
    const content = await fs.readFile(upload.temp);
    const magic = content.toString("ascii", 0, 4);
    const actual =
      magic === "OTTO"
        ? "otf"
        : magic === "wOFF"
          ? "woff"
          : magic === "wOF2"
            ? "woff2"
            : "ttf";
    if (ext !== actual)
      throw brandingError(400, "Rozszerzenie nie odpowiada zawartości fontu");
    const file = await publishBrandFile(root, clientId, "fonts", upload, ext);
    return {
      id: upload.sha256,
      family: info.family,
      file,
      weight: info.weight,
      style: info.style,
      sha256: upload.sha256,
      source,
    };
  } finally {
    await fs.rm(upload.temp, { force: true });
  }
}
export async function importFont(root, clientId, { source, id, variant } = {}) {
  if (
    !["local", "google", "bundled"].includes(source) ||
    typeof id !== "string" ||
    id.length > 160
  )
    throw brandingError(400, "Nieprawidłowy wybór fontu");
  if (source === "google") {
    const family = (await googleCatalog(root)).find((f) => f.id === id);
    if (!family) throw brandingError(400, "Nieznana rodzina w Google Fonts");
    const selected = family.variants.find((v) => v.id === (variant || "400"));
    if (!selected)
      throw brandingError(400, "Brak wybranej odmiany Google Fonts");
    const slug = family.family.toLowerCase().replace(/[^a-z0-9]/g, "");
    let listing;
    for (const folder of ["ofl", "apache", "ufl"]) {
      try {
        listing = JSON.parse(
          (
            await remote(
              `https://api.github.com/repos/google/fonts/contents/${folder}/${slug}`,
            )
          ).toString(),
        );
        break;
      } catch {
        /* Try the next official license directory. */
      }
    }
    if (!Array.isArray(listing))
      throw brandingError(400, "Nie znaleziono plików rodziny Google Fonts");
    const matches = listing.filter(
      (f) =>
        /\.ttf$/.test(f.name) &&
        /Italic/i.test(f.name) === (selected.style === "italic"),
    );
    const font =
      matches.find((f) => f.name.includes("[")) ||
      matches.find((f) =>
        new RegExp(
          `-(?:${selected.weight}|${{ 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" }[selected.weight]}${selected.style === "italic" ? "Italic" : ""})\\.ttf$`,
          "i",
        ).test(f.name),
      ) ||
      (matches.length === 1 ? matches[0] : null);
    const license = listing.find((f) =>
      /^(OFL|LICENSE|LICENCE|UFL)(\.txt)?$/i.test(f.name),
    );
    if (!font || !license)
      throw brandingError(
        400,
        "Brak dokładnej odmiany lub licencji Google Fonts",
      );
    const content = await remote(font.download_url);
    const gitBlob = createHash("sha1")
      .update(`blob ${content.length}\0`)
      .update(content)
      .digest("hex");
    if (gitBlob !== font.sha)
      throw brandingError(
        400,
        "Plik Google Fonts nie odpowiada rewizji katalogu",
      );
    const result = await importUploadedFont(
      root,
      clientId,
      Readable.from([content]),
      { name: font.name, source: "google" },
    );
    const licenseData = await remote(license.download_url, 1024 ** 2);
    const licenseFile = `Brandings/${clientId}/fonts/${hash(licenseData)}.txt`;
    const licensePath = await brandingPath(root, `public/${licenseFile}`, {
      create: true,
    });
    await fs.writeFile(licensePath, licenseData, { flag: "wx" }).catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
    result.licenseFile = licenseFile;
    result.weight = font.name.includes("[") ? selected.weight : result.weight;
    if (result.style !== selected.style)
      throw brandingError(400, "Niezgodna odmiana fontu");
    return result;
  }
  let file, name;
  if (source === "local") {
    const entries = await coretext("list");
    const entry = entries.find((f) => f.id === id);
    if (!entry) throw brandingError(400, "Nie ma takiego lokalnego fontu");
    if (["ttc", "dfont"].includes(entry.format))
      throw brandingError(400, "Kolekcja fontów: załaduj osobny plik TTF/OTF");
    file = entry.file;
    name = path.basename(file);
  } else {
    if (!/^[a-zA-Z0-9_.-]+\.(ttf|otf|woff2?)$/.test(id))
      throw brandingError(400, "Nieprawidłowy font aplikacji");
    file = await brandingPath(root, `public/fonts/${id}`);
    name = id;
  }
  const data = await fs.readFile(file).catch(() => {
    throw brandingError(400, "Wybrany font jest niedostępny");
  });
  return importUploadedFont(root, clientId, Readable.from([data]), {
    name,
    source,
  });
}
