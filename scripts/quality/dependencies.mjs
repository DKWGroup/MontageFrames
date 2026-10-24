import { canonicalJson } from "./contracts.mjs";
const speech = (data) =>
  data.captions
    .flatMap((g) => g.words)
    .filter((w) =>
      data.segments.some((s) => w.end > s.start && w.start < s.end),
    )
    .map((w) => w.text)
    .join(" ");
export function planRecompute(before, after) {
  if (canonicalJson(before) === canonicalJson(after)) return [];
  if (before.source !== after.source)
    return [
      "ingest",
      "asr",
      "vision",
      "edit",
      "geometry",
      "render",
      "publication",
    ];
  const stages = [];
  if (
    before.client !== after.client ||
    before.style !== after.style ||
    canonicalJson(before.branding ?? null) !==
      canonicalJson(after.branding ?? null)
  )
    stages.push("contract");
  stages.push("geometry", "render");
  if (speech(before) !== speech(after)) stages.push("publication");
  return stages;
}
