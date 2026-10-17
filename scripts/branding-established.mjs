import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { brandingPath } from "./branding-store.mjs";
import { clientIdSchema, defaultBranding } from "../src/branding/schema.mjs";
import { establishedStyles } from "../src/branding/established-styles.mjs";
const registry = JSON.parse(
  await fs.readFile(
    new URL("../src/quickcontent/templates.json", import.meta.url),
    "utf8",
  ),
);
const fontInfo = {
  "Nunito.ttf": ["Nunito", "200 1000"],
  "Inter.ttf": ["Inter", "100 900"],
  "Inter-Italic.ttf": ["Inter", "100 900", "italic"],
  "Montserrat.ttf": ["Montserrat", "100 900"],
  "LibreBaskerville.ttf": ["Libre Baskerville", "400 700"],
  "LibreBaskerville-Italic.ttf": ["Libre Baskerville", "400 700", "italic"],
  "PlusJakartaSans.ttf": ["Plus Jakarta Sans", "200 800"],
  "PlusJakartaSans-Italic.ttf": ["Plus Jakarta Sans", "200 800", "italic"],
  "Poppins-Regular.ttf": ["Poppins", "400"],
  "Poppins-Medium.ttf": ["Poppins", "500"],
  "Poppins-SemiBold.ttf": ["Poppins", "600"],
  "Poppins-ExtraBold.ttf": ["Poppins", "800"],
  "Poppins-Black.ttf": ["Poppins", "900"],
  "BebasNeue-Regular.ttf": ["Bebas Neue", "400"],
};
async function optionalRead(file) {
  try {
    return await fs.readFile(file);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
export async function getEstablishedBranding(root, clientId) {
  clientIdSchema.parse(clientId);
  const prefPath = `klienci/${clientId}/PREFERENCJE.md`;
  const content = await optionalRead(await brandingPath(root, prefPath));
  const preferences =
    content === null
      ? null
      : { content: content.toString("utf8"), path: prefPath };
  const template = registry.find((t) => t.clientId === clientId);
  const metadata = template && establishedStyles[template.styleId];
  let established = null;
  if (metadata) {
    const profile = {
      ...defaultBranding(clientId, template.name),
      styleId: template.styleId,
    };
    const roles = [
      "text",
      "accent",
      "background",
      "secondary",
      "highlight",
      "muted",
    ];
    profile.palette.colors = metadata.colors.map((hex, i) => ({
      id: `native-${i}`,
      hex,
      role: roles[i],
    }));
    profile.captions = {
      ...profile.captions,
      position: Math.min(0.75, metadata.position),
      size: metadata.size,
      emojiEnabled: metadata.emojiEnabled,
    };
    profile.websiteUrl =
      preferences?.content.match(/https?:\/\/[^\s)\]>]+/)?.[0] ??
      (clientId === "skyclass" ? "https://skyclass.pl" : "");
    for (const file of metadata.requiredFonts) {
      const data = await optionalRead(
        await brandingPath(root, `public/${file}`),
      );
      if (!data) continue;
      const [family, weight, style = "normal"] = fontInfo[path.basename(file)];
      const ref = {
        id: path.basename(file).replace(/\W/g, "-"),
        family,
        weight,
        style,
        file,
        source: "bundled",
        sha256: createHash("sha256").update(data).digest("hex"),
      };
      if (!profile.fonts.primary) profile.fonts.primary = ref;
      else if (
        family !== profile.fonts.primary.family &&
        !profile.fonts.emphasis
      )
        profile.fonts.emphasis = ref;
    }
    established = {
      profile,
      description: metadata.description,
      fonts: metadata.fonts,
      colors: metadata.colors,
    };
  }
  const materials = [];
  const add = async (file) => {
    if (materials.length >= 200 || materials.some((m) => m.file === file))
      return;
    const full = await brandingPath(root, file);
    const stat = await fs.stat(full).catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
    materials.push({
      file,
      label: path.basename(file),
      available: !!stat?.isFile(),
    });
  };
  for (const file of template?.assets ?? []) await add(file);
  // Only immediate curated assets: never scan recordings, masters, or project folders.
  const roots = [
    `klienci/${clientId}/logo`,
    `klienci/${clientId}/produkty`,
    `klienci/${clientId}/przebitki`,
  ];
  const brandDirs = new Set(
    (template?.assets ?? [])
      .filter((f) => f.startsWith("public/Brandings/"))
      .map((f) => path.posix.dirname(f)),
  );
  if (template) {
    const normalize = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const identities = [template.name, template.clientId, template.styleId].map(
      normalize,
    );
    const base = await brandingPath(root, "public/Brandings");
    const entries = await fs
      .readdir(base, { withFileTypes: true })
      .catch((e) => {
        if (e.code === "ENOENT") return [];
        throw e;
      });
    for (const entry of entries) {
      if (!identities.includes(normalize(entry.name))) continue;
      await brandingPath(root, `public/Brandings/${entry.name}`);
      if (entry.isDirectory()) brandDirs.add(`public/Brandings/${entry.name}`);
    }
  }
  for (const dir of [
    ...roots,
    ...[...brandDirs].flatMap((dir) => [
      dir,
      ...["logo", "produkty", "przebitki"].map((sub) => `${dir}/${sub}`),
    ]),
  ]) {
    const full = await brandingPath(root, dir);
    const files = await fs.readdir(full, { withFileTypes: true }).catch((e) => {
      if (e.code === "ENOENT") return [];
      throw e;
    });
    for (const entry of files.sort((a, b) => a.name.localeCompare(b.name))) {
      if (materials.length >= 200) break;
      if (!/\.(png|jpe?g|webp|mp4|mov|webm|json)$/i.test(entry.name)) continue;
      const file = `${dir}/${entry.name}`;
      await brandingPath(root, file);
      if (entry.isFile()) await add(file);
    }
  }
  return { established, preferences, materials };
}
