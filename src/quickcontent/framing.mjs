import { validLayouts } from "./layout.mjs";
const clamp = (value) => Math.min(1, Math.max(0, value));
export function trackingPosition(framing, sourceTime) {
  const points = framing?.tracking;
  if (
    framing?.mode !== "crop" ||
    framing?.trackingEnabled === false ||
    !points?.length
  )
    return {
      centerX: framing?.centerX ?? 0.5,
      centerY: framing?.centerY ?? 0.5,
    };
  let right = points.findIndex((point) => point.time > sourceTime);
  if (right === 0) return points[0];
  if (right < 0) return points[points.length - 1];
  const a = points[right - 1],
    b = points[right];
  // cięcie kamery / zmiana mówcy: kadr przeskakuje, bez przejazdu; ujęcie `fit` (news) bez śledzenia
  if (b.cut || a.fit || b.fit) return a;
  const t = clamp((sourceTime - a.time) / (b.time - a.time));
  const ease = t * t * (3 - 2 * t);
  return {
    centerX: a.centerX + (b.centerX - a.centerX) * ease,
    centerY: a.centerY + (b.centerY - a.centerY) * ease,
    ...(a.scale !== undefined || b.scale !== undefined
      ? { scale: (a.scale ?? 1) + ((b.scale ?? 1) - (a.scale ?? 1)) * ease }
      : {}),
  };
}
export function validTracking(framing, duration) {
  if (!validLayouts(framing, duration)) return false;
  if (
    framing?.trackingEnabled !== undefined &&
    typeof framing.trackingEnabled !== "boolean"
  )
    return false;
  if (framing?.tracking === undefined) return true;
  return (
    Array.isArray(framing.tracking) &&
    framing.tracking.length <= 2401 &&
    framing.tracking.every(
      (p, i, all) =>
        p &&
        typeof p === "object" &&
        [p.time, p.centerX, p.centerY].every(Number.isFinite) &&
        p.time >= 0 &&
        p.time <= duration &&
        p.centerX >= 0 &&
        p.centerX <= 1 &&
        p.centerY >= 0 &&
        p.centerY <= 1 &&
        [p.fit, p.cut].every(
          (x) => x === undefined || typeof x === "boolean",
        ) &&
        (p.scale === undefined ||
          (Number.isFinite(p.scale) && p.scale >= 0.55 && p.scale <= 1)) &&
        (!i || p.time > all[i - 1].time),
    )
  );
}

export function cameraScale(styleId, segment, trackedScale = 1, progress = 0) {
  if (styleId === "bisanz") return 1;
  const from = segment.zoom ?? 1,
    to = segment.zoomTo ?? from;
  return trackedScale * (from + (to - from) * clamp(progress));
}
