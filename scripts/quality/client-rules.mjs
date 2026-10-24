import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { compileClientContract } from "./contracts.mjs";

// This is a curated partial mapping. Markdown remains authoritative until explicit migration.
const clientRules = {
  skyclass: [
    [
      "keep-silence",
      "audio",
      true,
      "data",
      "Aktualne poprawki użytkowniczki",
      "2026-10-03",
    ],
    [
      "verbatim-captions",
      "captions",
      true,
      "semantic",
      "Aktualne poprawki użytkowniczki",
      "2026-10-03",
    ],
    [
      "continuous-travel-background",
      "graphics",
      true,
      "human",
      "Aktualne poprawki użytkowniczki",
      "2026-10-03",
    ],
    [
      "people-broll-required",
      "graphics",
      true,
      "human",
      "Przebitki: znane miejsca",
      "2026-10-03",
    ],
  ],
  "kacper-bisanz": [
    ["camera-scale", "camera", 1, "data", "Bez zoomów kamery", "2026-10-15"],
    [
      "tracking-position-only",
      "camera",
      true,
      "geometry",
      "Bez zoomów kamery",
      "2026-10-15",
    ],
    [
      "caption-readability",
      "captions",
      "full-readable-words-with-varied-motion",
      "human",
      "Ruch napisów — korekta",
      "2026-10-15",
    ],
  ],
  "happy-news": [
    [
      "layout-change",
      "camera",
      "source-camera-cut-only",
      "geometry",
      "Spokojny kadr i przebitka w ujęciu duo",
      "2026-10-17",
    ],
    [
      "wide-shot",
      "camera",
      "steady-duo-with-complete-source-broll",
      "human",
      "Spokojny kadr i przebitka w ujęciu duo",
      "2026-10-17",
    ],
    [
      "closeup",
      "camera",
      "single-speaker-without-broll-panel",
      "human",
      "Spokojny kadr i przebitka w ujęciu duo",
      "2026-10-17",
    ],
    [
      "tracking-scale",
      "camera",
      "constant-within-shot",
      "geometry",
      "Stabilne okno kamery i automatyczne emotki",
      "2026-10-16",
    ],
    [
      "credit-alignment",
      "graphics",
      "full-frame-center",
      "geometry",
      "Spokojne cięcia i centrowanie metki",
      "2026-10-17",
    ],
    [
      "emoji-meaning",
      "captions",
      "unambiguous-only-no-cjk",
      "semantic",
      "Zakres i trafność emotek",
      "2026-10-16",
    ],
  ],
  "magdalena-herod": [
    [
      "caption-motion",
      "captions",
      "calm-no-aggressive-pop-or-flashing",
      "human",
      "Typografia i kinetic subtitles",
      "2026-10-03",
    ],
    [
      "caption-lines",
      "captions",
      2,
      "geometry",
      "Typografia i kinetic subtitles",
      "2026-10-03",
    ],
    [
      "card-position",
      "graphics",
      "directly-below-captions",
      "geometry",
      "Pozycja napisów i animacji",
      "2026-10-03",
    ],
  ],
  "glowup-nutrition": [
    [
      "product-card",
      "graphics",
      "named-product-minimum-three-seconds-after-mention",
      "human",
      "Wytyczne od użytkowniczki *(2026-10-09)*",
      "2026-10-09",
    ],
    [
      "claims-review",
      "reel",
      "review-product-claims-against-client-preferences",
      "human",
      "Compliance — twarde zasady",
      "2026-10-09",
    ],
    [
      "safezone",
      "graphics",
      { left: 86 / 1080, right: 930 / 1080, top: 250 / 1920, bottom: 0.75 },
      "geometry",
      "Strefa bezpieczna",
      "2026-10-09",
    ],
  ],
  "swieza-bryka-ameryka": [
    [
      "model-name-review",
      "captions",
      "verify-car-model-and-Christoff-name",
      "human",
      "Wytyczne od użytkowniczki",
      "2026-10-08",
    ],
    [
      "broll-in-skit",
      "graphics",
      "respect-explicit-no-broll",
      "human",
      "Wytyczne od użytkowniczki",
      "2026-10-08",
    ],
    [
      "cost-breakdown",
      "graphics",
      "include-commission-when-costs-are-listed",
      "semantic",
      "Zakazy w treści",
      "2026-10-07",
    ],
  ],
  "vital-hormone": [
    [
      "claims-review",
      "reel",
      "medical-register-no-outcome-promises",
      "human",
      "Compliance — rejestr medyczny",
      "2026-10-09",
    ],
    [
      "face-clear",
      "graphics",
      "captions-hook-cards-below-chin",
      "geometry",
      "Napisy: kinetic subtitles",
      "2026-10-09",
    ],
    [
      "caption-group-size",
      "captions",
      { min: 2, max: 5 },
      "semantic",
      "Napisy: kinetic subtitles",
      "2026-10-09",
    ],
  ],
};
const sha = (text) => createHash("sha256").update(text).digest("hex");
const sectionHashes = JSON.parse(
  await fs.readFile(
    new URL("./client-rule-sources.json", import.meta.url),
    "utf8",
  ),
);
function sectionText(content, title) {
  const lines = content.split("\n");
  const start = lines.findIndex(
    (line) => /^#{1,3} /.test(line) && line.includes(title),
  );
  if (start < 0) return null;
  const end = lines.findIndex((line, i) => i > start && /^#{1,2} /.test(line));
  return lines
    .slice(start, end < 0 ? undefined : end)
    .join("\n")
    .trim();
}

export async function contractForBranding(profile, readText) {
  const rules = [];
  for (const [path, level] of [
    ["PREFERENCJE.md", "general"],
    [`klienci/${profile.clientId}/PREFERENCJE.md`, "client"],
  ]) {
    const content = await readText(path);
    rules.push({
      id: `${level}-preferences-review`,
      scope: "reel",
      value: { status: "unknown", available: content !== null },
      checkKind: "human",
      severity: "critical",
      source: {
        path,
        section: "Cały dokument — niepełna kodyfikacja",
        date: "2026-10-18",
        order: 0,
        level,
        ...(level === "client" ? { clientId: profile.clientId } : {}),
        ...(content !== null ? { sha256: sha(content) } : {}),
      },
    });
    if (level !== "client" || content === null) continue;
    const curated = Object.hasOwn(clientRules, profile.clientId)
      ? clientRules[profile.clientId]
      : [];
    // A custom document has no approved mapping; retain the explicit unknown review rule.
    if (!curated.some(([, , , , section]) => sectionText(content, section)))
      continue;
    for (const [id, scope, value, checkKind, section, date] of curated) {
      if (profile.clientId === "magdalena-herod" && profile.styleId !== "herod")
        continue;
      const text = sectionText(content, section);
      if (!text || sha(text) !== sectionHashes[profile.clientId]?.[section])
        throw Object.assign(
          new Error(
            `Wytyczne zmieniły się: sprawdź sekcję „${section}” klienta ${profile.clientId}`,
          ),
          { status: 400 },
        );
      rules.push({
        id,
        scope,
        value,
        checkKind,
        severity: "critical",
        source: {
          path,
          section,
          date,
          order: 0,
          level,
          clientId: profile.clientId,
          sha256: sha(content),
        },
      });
    }
  }
  const skyclass =
    profile.clientId === "skyclass" || profile.styleId === "skyclass";
  rules.push({
    id: "keep-silence",
    scope: "audio",
    value: skyclass,
    checkKind: "data",
    severity: "critical",
    source: {
      path: "AGENTS.md",
      section: "Workflow jednej rolki",
      date: "2026-10-18",
      order: 0,
      level: "default",
    },
  });
  if (profile.clientId === "kacper-bisanz" || profile.styleId === "bisanz")
    rules.push({
      id: "camera-scale",
      scope: "camera",
      value: 1,
      checkKind: "data",
      severity: "critical",
      source: {
        path: "scripts/reel-validation.mjs",
        section: "Bisanz camera invariant",
        date: "2026-10-18",
        order: 0,
        level: "default",
      },
    });
  rules.push({
    id: "appearance",
    scope: "captions",
    value: {
      palette: profile.palette,
      fonts: profile.fonts,
      captions: profile.captions,
    },
    checkKind: "geometry",
    severity: "critical",
    source: {
      path: `klienci/${profile.clientId}/branding/versions/v${String(profile.revision).padStart(3, "0")}.json`,
      section: "Jawnie wybrany wygląd",
      date: "2026-10-18",
      order: 0,
      level: "branding",
    },
  });
  return compileClientContract({
    clientId: profile.clientId,
    brandingSnapshot: profile,
    rules,
  });
}
