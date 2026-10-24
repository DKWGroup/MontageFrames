import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { safePath } from "../quickcontent-ingest.mjs";
import { establishedStyles } from "../../src/branding/established-styles.mjs";
import { fontCatalog } from "../../src/font-catalog.mjs";
import { inspectFontCoverage } from "../branding-fonts.mjs";
import { verifyManifestAssets } from "./assets.mjs";
import { hashFile } from "../quickcontent-ingest.mjs";
import { freezeCaptionDecorations } from "../../src/caption-decoration.mjs";

const exec = promisify(execFile),
  coverage = new Map();
export function requiredFontBindings(data, { availableFiles = [] } = {}) {
  const style = data.style ?? "persona";
  const files =
    style === "brand" ? [] : establishedStyles[style]?.requiredFonts;
  if (!files) throw new Error("Nieznany styl renderu");
  const bindings = fontCatalog.filter((f) => files.includes(f.file));
  // Shared overlays keep the same family as Studio, independent of caption branding.
  if (style === "persona" || (data.overlays ?? []).length) {
    const optional = fontCatalog.filter(
      (f) => f.family === "MADE Tommy Soft" && availableFiles.includes(f.file),
    );
    if (!bindings.some((f) => f.file === "fonts/Nunito.ttf"))
      bindings.push(fontCatalog.find((f) => f.family === "Nunito"));
    bindings.push(
      ...(optional.length
        ? optional
        : [
            {
              family: "MADE Tommy Soft",
              file: "fonts/Nunito.ttf",
              weight: "700 900",
            },
          ]),
    );
  }
  return bindings;
}
export async function preflightReelAssets(root, reelName, data) {
  const decorations = freezeCaptionDecorations(data);
  const availableFiles = (
    await fs.readdir(path.join(root, "public/fonts")).catch(() => [])
  ).map((f) => `fonts/${f}`);
  const bindings = requiredFontBindings(data, { availableFiles });
  if (data.style === "brand" && !data.branding?.fonts?.primary)
    throw new Error("Brak fontu własnego brandingu");
  const refs = [
    { file: `reels/${reelName}/${data.source}` },
    ...(data.overlays ?? [])
      .filter((o) => o.src)
      .map((o) => ({ file: `reels/${reelName}/${o.src}` })),
    ...bindings.map((f) => ({ file: f.file })),
    ...(data.style === "brand"
      ? Object.values(data.branding?.fonts ?? {}).filter(Boolean)
      : []),
    ...(data.branding?.logo?.enabled
      ? (data.branding.assets ?? []).filter(
          (a) => a.id === data.branding.logo.assetId,
        )
      : []),
  ];
  const assets = [];
  for (const ref of refs) {
    const relative = `public/${ref.file}`;
    let bytes;
    try {
      bytes = await fs.readFile(await safePath(root, relative));
    } catch {
      throw new Error(`Brak wymaganego fontu lub zasobu: ${ref.file}`);
    }
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (ref.sha256 && ref.sha256 !== hash)
      throw new Error(`Zmieniono przypięty zasób: ${ref.file}`);
    if (assets.some((a) => a.path === relative)) continue;
    assets.push({
      id: relative,
      path: relative,
      sha256: hash,
      byteLength: bytes.length,
      mime: /\.(ttf|otf|woff2?)$/i.test(relative)
        ? "font/sfnt"
        : "application/octet-stream",
      kind: /\.(ttf|otf|woff2?)$/i.test(relative) ? "font" : "media",
    });
  }
  const report = await verifyManifestAssets(
    { clientId: data.client ?? data.branding?.clientId ?? null, assets },
    (relative) => fs.readFile(path.join(root, relative)),
    {
      inspectFont: async (a) => {
        if (!coverage.has(a.sha256))
          coverage.set(
            a.sha256,
            await inspectFontCoverage(path.join(root, a.path)),
          );
        return coverage.get(a.sha256);
      },
    },
  );
  if (report.status !== "pass")
    throw new Error(
      `Nie można potwierdzić fontów/zasobów: ${report.findings.map((f) => f.reason).join(", ")}`,
    );
  return { bindings, assets, report, decorations };
}
export async function renderRuntime(root) {
  const read = async (file) => {
    try {
      return JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
    } catch {
      return null;
    }
  };
  const version = async (exe, args) => {
    try {
      return (await exec(exe, args, { timeout: 5000, maxBuffer: 65536 })).stdout
        .trim()
        .split("\n")[0];
    } catch {
      return null;
    }
  };
  const lock = await read("package-lock.json"),
    pkg = await read("package.json");
  const { ensureBrowser } = await import("@remotion/renderer");
  const browser = await ensureBrowser({
    logLevel: "error",
    onBrowserDownload: () => {
      throw new Error(
        "Przygotuj Chromium przed renderem; automatyczne pobranie jest wyłączone.",
      );
    },
  });
  if (!("path" in browser)) throw new Error("Brak przygotowanego Chromium");
  return {
    node: process.version,
    os: process.platform,
    arch: process.arch,
    remotion:
      lock?.packages?.["node_modules/remotion"]?.version ??
      pkg?.dependencies?.remotion ??
      null,
    ffmpeg: await version("ffmpeg", ["-version"]),
    chromium: await version(browser.path, ["--version"]),
    browserPath: browser.path,
    browserSha256: await hashFile(browser.path),
    detector: "quickcontent-face.swift",
    portability: "host-bound",
  };
}
