import path from "node:path";
import { validTracking } from "../src/quickcontent/framing.mjs";
const invalid = (message) => Object.assign(new Error(message), { status: 400 });

export function validateReelEdit(before, after, { lockStyle = true } = {}) {
  if (
    !before ||
    !after ||
    typeof after.source !== "string" ||
    !after.source ||
    path.isAbsolute(after.source) ||
    /^[a-z]+:/i.test(after.source) ||
    after.source.split(/[\\/]/).includes("..") ||
    after.source !== before.source ||
    after.client !== before.client ||
    (lockStyle && after.style !== before.style) ||
    JSON.stringify(after.format) !== JSON.stringify(before.format) ||
    JSON.stringify(after.branding) !== JSON.stringify(before.branding) ||
    !Array.isArray(after.segments) ||
    !Array.isArray(after.captions)
  )
    throw invalid("Operator zmienił źródło, klienta lub format rolki");
  if (
    !Number.isFinite(after.fps ?? 30) ||
    (after.fps ?? 30) <= 0 ||
    (after.fps ?? 30) !== (before.fps ?? 30) ||
    !after.segments.length
  )
    throw invalid("Nieprawidłowy klatkaż lub pusta rolka");
  const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  // Captions outside kept segments still refer to the unchanged source timeline.
  const limit = before.captions
    .flatMap((g) => g?.words ?? [])
    .reduce(
      (max, w) => Math.max(max, w?.end ?? 0),
      before.segments.reduce((max, s) => Math.max(max, s?.end ?? 0), 0),
    );
  if (
    after.segments.some(
      (s, i) =>
        !s ||
        !finite(s.start, 0, limit) ||
        !finite(s.end, s.start, limit) ||
        s.end <= s.start ||
        (i > 0 && s.start < after.segments[i - 1].end) ||
        (s.zoom !== undefined && !finite(s.zoom, 0.1, 10)) ||
        (s.zoomTo !== undefined && !finite(s.zoomTo, 0.1, 10)),
    )
  )
    throw invalid("Nieprawidłowe cięcia lub zoom");
  if (
    after.framing &&
    (!["fit", "crop"].includes(after.framing.mode) ||
      !finite(after.framing.centerX, 0, 1) ||
      !finite(after.framing.centerY, 0, 1) ||
      !validTracking(
        after.framing,
        Math.max(limit, ...(before.framing?.tracking ?? []).map((p) => p.time)),
      ))
  )
    throw invalid("Nieprawidłowy kadr");
  if (
    after.captions.some(
      (g) =>
        !g ||
        !Array.isArray(g.words) ||
        !g.words.length ||
        g.words.some(
          (w) =>
            !w ||
            typeof w.text !== "string" ||
            !finite(w.start, 0, limit) ||
            !finite(w.end, w.start, limit),
        ) ||
        (g.key !== undefined &&
          (!Number.isInteger(g.key) ||
            g.key < -1 ||
            g.key >= g.words.length)) ||
        (g.hl !== undefined &&
          (!Array.isArray(g.hl) ||
            g.hl.some(
              (i) => !Number.isInteger(i) || i < 0 || i >= g.words.length,
            ))),
    )
  )
    throw invalid("Nieprawidłowa grupa napisów");
  const original = before.captions.flatMap((g) => g.words),
    updated = after.captions.flatMap((g) => g.words);
  let cursor = 0;
  for (const word of updated) {
    const offset = original
      .slice(cursor)
      .findIndex((o) => o.start === word.start && o.end === word.end);
    if (offset < 0)
      throw invalid("Operator zmienił czasy, kolejność lub powielił słowa");
    cursor += offset + 1;
  }
  if (
    after.overlays !== undefined &&
    (!Array.isArray(after.overlays) ||
      after.overlays.some(
        (o) =>
          !o ||
          typeof o.type !== "string" ||
          !finite(o.start, 0, limit) ||
          // Existing edits round graphic times to centiseconds; allow one source frame.
          !finite(o.end, o.start, limit + 1 / (after.fps ?? 30)) ||
          o.end <= o.start ||
          (o.src !== undefined &&
            (typeof o.src !== "string" ||
              path.isAbsolute(o.src) ||
              o.src.split(/[\\/]/).some((p) => p === "..") ||
              /^[a-z]+:/i.test(o.src))),
      ))
  )
    throw invalid("Nieprawidłowa grafika lub ścieżka assetu");
  if (
    (after.style === "bisanz" || after.client === "kacper-bisanz") &&
    after.segments.some((s) => {
      // Old Bisanz drafts store zoom ignored by cameraScale(); do not block a text-only save.
      const old =
        before.style === "bisanz" || before.client === "kacper-bisanz"
          ? before.segments.find((b) => b.start === s.start && b.end === s.end)
          : null;
      return ["zoom", "zoomTo"].some(
        (key) => (s[key] ?? 1) !== 1 && s[key] !== old?.[key],
      );
    })
  )
    throw invalid(
      "Bisanz: skalowanie kamery musi pozostać wyłączone (zoom=1).",
    );
  if (
    (before.style === "skyclass" || before.client === "skyclass") &&
    (JSON.stringify(before.segments) !== JSON.stringify(after.segments) ||
      JSON.stringify(original.map((w) => [w.start, w.end])) !==
        JSON.stringify(updated.map((w) => [w.start, w.end])))
  )
    throw invalid("SkyClass musi zachować całą wypowiedź i wszystkie napisy");
}
