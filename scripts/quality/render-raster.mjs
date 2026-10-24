import { createHash } from "node:crypto";
import { alphaBounds, decodePngRgba } from "./raster-mask.mjs";
export async function measureRasterFrame({
  frame,
  manifest,
  renderMask,
  signal,
}) {
  const boxes = [],
    hidden = [],
    rasters = [];
  const issues = frame.issues.filter((s) =>
    /^(missing|unexpected|empty canvas)/.test(s),
  );
  const { width, height } = manifest.output;
  for (const item of frame.expected) {
    signal?.throwIfAborted();
    const { buffer, measurement } = await renderMask(item);
    if (
      !buffer ||
      measurement?.frame !== frame.frame ||
      measurement.manifestSignature !== manifest.signature ||
      measurement.isolation?.id !== item.id
    )
      throw Error("Maska nie odpowiada klatce i elementowi renderera");
    const isolation = measurement.isolation;
    const rgba = await decodePngRgba(buffer, width, height, { signal }),
      bounds = alphaBounds(rgba, width, height);
    const problems = [...isolation.issues];
    if (
      isolation.status !== "measured" ||
      isolation.width !== width ||
      isolation.height !== height
    )
      problems.push("unverified isolation");
    const invisible = frame.hidden.some(
      (i) => i.id === item.id && i.role === item.role,
    );
    if (!bounds && !invisible)
      problems.push("empty mask may be offscreen or missing");
    if (bounds && invisible) problems.push("hidden element painted pixels");
    const status = problems.length ? "unknown" : bounds ? "measured" : "hidden";
    const raster = {
      ...item,
      frame: frame.frame,
      manifestSignature: manifest.signature,
      method: "isolated-alpha-v1",
      status,
      issues: problems,
      width,
      height,
      pngSha256: createHash("sha256").update(buffer).digest("hex"),
      pixels: bounds?.pixels ?? 0,
      bounds,
    };
    rasters.push(raster);
    if (status === "measured") {
      boxes.push({
        ...item,
        extent: "raster",
        x: bounds.x / width,
        y: bounds.y / height,
        width: bounds.width / width,
        height: bounds.height / height,
      });
      if (bounds.touchesEdge)
        issues.push(`${item.id}: mask touches viewport; extent may be clipped`);
    } else if (status === "hidden") hidden.push(item);
    else {
      issues.push(`${item.id}: ${problems.join(", ")}`);
      boxes.push(...frame.boxes.filter((b) => b.id === item.id));
    }
  }
  return { ...frame, boxes, hidden, issues, rasters };
}
