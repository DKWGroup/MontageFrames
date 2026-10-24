import { validTracking } from "../../src/quickcontent/framing.mjs";
import { qualityReport } from "./report.mjs";
const intersects = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
const rect = (b) =>
  b &&
  [b.x, b.y, b.width, b.height].every(Number.isFinite) &&
  b.width > 0 &&
  b.height > 0;
function validRaster(r, frame, manifest) {
  if (
    !r ||
    r.method !== "isolated-alpha-v1" ||
    r.manifestSignature !== manifest.signature ||
    r.frame !== frame.frame ||
    r.width !== manifest.output.width ||
    r.height !== manifest.output.height ||
    !/^[a-f0-9]{64}$/.test(r.pngSha256 ?? "") ||
    !Array.isArray(r.issues) ||
    r.issues.length ||
    !Number.isSafeInteger(r.pixels) ||
    r.pixels < 0
  )
    return false;
  if (r.status === "hidden") return r.pixels === 0 && r.bounds === null;
  const b = r.bounds;
  return (
    r.status === "measured" &&
    b &&
    [b.x, b.y, b.width, b.height].every(Number.isSafeInteger) &&
    b.x >= 0 &&
    b.y >= 0 &&
    b.width > 0 &&
    b.height > 0 &&
    b.x + b.width <= r.width &&
    b.y + b.height <= r.height &&
    r.pixels > 0 &&
    r.pixels <= b.width * b.height
  );
}
function rasterBoxMatches(box, frame, manifest) {
  const all =
    frame.rasters?.filter((r) => r.id === box.id && r.role === box.role) ?? [];
  const r = all[0];
  return (
    all.length === 1 &&
    validRaster(r, frame, manifest) &&
    r.status === "measured" &&
    Math.abs(box.x - r.bounds.x / r.width) < 1e-8 &&
    Math.abs(box.y - r.bounds.y / r.height) < 1e-8 &&
    Math.abs(box.width - r.bounds.width / r.width) < 1e-8 &&
    Math.abs(box.height - r.bounds.height / r.height) < 1e-8
  );
}
export function checkGeometry({
  manifest,
  observations,
  frameBounds,
  expectedInventory,
} = {}) {
  const findings = [],
    data = manifest?.inputs?.data,
    framing = data?.framing;
  const add = (ruleId, status, evidence, frameRange = null) =>
    findings.push({
      ruleId,
      status,
      severity: "critical",
      frameRange,
      evidence,
    });
  if (!data) {
    add("geometry.inputs", "unknown", "Brak danych rewizji filmu");
    return qualityReport(manifest, findings);
  }
  const duration =
    observations?.duration ??
    Math.max(
      0,
      ...(data.segments ?? []).map((s) => s.end),
      ...(framing?.tracking ?? []).map((p) => p?.time ?? 0),
    );
  if (!validTracking(framing, duration))
    add("tracking.valid", "fail", "Nieprawidłowa ścieżka kadru");
  const active =
    framing?.mode === "crop" &&
    framing.trackingEnabled !== false &&
    framing.tracking?.length;
  if (active) {
    if (framing.cameraCuts === undefined)
      add(
        "tracking.cut-evidence",
        "unknown",
        "Brak zmierzonych cięć źródła; nie wyznaczamy ich z wypowiedzi",
      );
    else
      for (const cut of framing.cameraCuts) {
        const points = framing.tracking,
          index = points.findIndex((p) => Math.abs(p.time - cut) < 1e-6);
        if (
          index < 0 ||
          (!points[index].cut &&
            !(
              index > 0 &&
              points[index].shotId &&
              points[index - 1].shotId &&
              points[index].shotId !== points[index - 1].shotId
            ))
        ) {
          const frame = Math.floor(cut * (manifest.output?.fps ?? 30));
          add(
            "tracking.cut-boundary",
            "fail",
            `Brak zmiany kadru na cięciu źródła ${cut}s`,
            [Math.max(0, frame - 2), frame + 2],
          );
        }
      }
    const expectedSource = manifest.inputs.sourceSha256;
    const measured =
      observations?.status === "measured" &&
      /^[a-f0-9]{64}$/.test(expectedSource ?? "") &&
      observations.sourceSha256 === expectedSource &&
      Number.isFinite(observations.sampleFps) &&
      observations.sampleFps > 0 &&
      Array.isArray(observations.samples) &&
      observations.samples.length ===
        Math.ceil(duration * observations.sampleFps) &&
      observations.samples.every(
        (p, i) =>
          p.sampleIndex === i &&
          Number.isFinite(p.time) &&
          Math.abs(p.time - i / observations.sampleFps) < 1e-6 &&
          p.time < duration &&
          Array.isArray(p.faces),
      );
    if (!measured)
      add(
        "tracking.observations",
        "unknown",
        "Brak kompletu zmierzonych obserwacji twarzy i ujęć",
      );
  }
  const frames = frameBounds?.frames ?? [],
    expected = manifest.inputs.expectedFrames;
  if (
    frameBounds?.manifestSignature !== manifest.signature ||
    frameBounds?.space !== "output-normalized" ||
    !Number.isSafeInteger(expected) ||
    expected <= 0 ||
    frames.length !== expected ||
    new Set(frames.map((f) => f.frame)).size !== expected ||
    frames.some(
      (f) =>
        !Number.isSafeInteger(f.frame) ||
        f.frame < 0 ||
        f.frame >= expected ||
        !Array.isArray(f.boxes),
    )
  )
    add(
      "animation.bounds",
      "unknown",
      "Brak obrysu tekstu i dekoracji we wszystkich klatkach animacji",
    );
  const key = (item) => `${item.id}|${item.role}`;
  const inventoryValid =
    Array.isArray(expectedInventory) &&
    new Set(expectedInventory.map(key)).size === expectedInventory.length &&
    expectedInventory.every(
      (i) =>
        typeof i.id === "string" &&
        ["caption", "hook", "emoji"].includes(i.role) &&
        Number.isSafeInteger(i.from) &&
        Number.isSafeInteger(i.durationInFrames) &&
        i.durationInFrames > 0,
    );
  const complete =
    inventoryValid &&
    ((frameBounds?.measurementVersion === 1 &&
      frameBounds?.collector === "remotion-dom-v1") ||
      (frameBounds?.measurementVersion === 2 &&
        frameBounds?.collector === "remotion-raster-v1")) &&
    frameBounds.manifestSignature === manifest.signature &&
    frames.length === expected &&
    frames.every((f) => {
      if (
        !Array.isArray(f.expected) ||
        !Array.isArray(f.hidden) ||
        !Array.isArray(f.issues) ||
        f.issues.length ||
        !Array.isArray(f.boxes)
      )
        return false;
      const wanted = expectedInventory
        .filter(
          (i) => f.frame >= i.from && f.frame < i.from + i.durationInFrames,
        )
        .map(key)
        .sort();
      if (frameBounds.collector === "remotion-raster-v1") {
        if (
          !Array.isArray(f.rasters) ||
          JSON.stringify(f.rasters.map(key).sort()) !==
            JSON.stringify(wanted) ||
          f.rasters.some((r) => !validRaster(r, f, manifest)) ||
          f.boxes.some(
            (b) =>
              b.role !== "face" &&
              (b.extent !== "raster" || !rasterBoxMatches(b, f, manifest)),
          ) ||
          f.hidden.some(
            (h) =>
              !f.rasters.some(
                (r) => key(r) === key(h) && r.status === "hidden",
              ),
          )
        )
          return false;
      }
      const declared = f.expected.map(key).sort();
      if (JSON.stringify(wanted) !== JSON.stringify(declared)) return false;
      const hidden = new Set(f.hidden.map(key));
      if (
        hidden.size !== f.hidden.length ||
        f.hidden.some((i) => !wanted.includes(key(i)))
      )
        return false;
      if (
        f.boxes.some(
          (b) =>
            b.role !== "face" &&
            (!wanted.includes(key(b)) || hidden.has(key(b))),
        )
      )
        return false;
      return wanted.every(
        (k) => hidden.has(k) || f.boxes.some((b) => key(b) === k && rect(b)),
      );
    });
  if (!complete)
    add(
      "animation.measurement-provenance",
      "unknown",
      "Brak kompletnego pomiaru elementów renderera dla tej wersji: wymagane wszystkie klatki, identyfikatory i obsługiwane efekty",
    );
  if (
    (data.captions ?? []).some((g) => !g.hidden && g.words?.length) ||
    (data.overlays ?? []).some((o) => ["title", "emoji"].includes(o.type))
  )
    add(
      "text.face-evidence",
      "unknown",
      "Brak pełnej, przypiętej projekcji twarzy do klatek wynikowych; brak kolizji w przekazanych prostokątach nie potwierdza ominięcia twarzy",
    );
  const boundFrames =
    frameBounds?.manifestSignature === manifest.signature &&
    frameBounds?.space === "output-normalized"
      ? frames
      : [];
  const safe = manifest.inputs.safezone ?? {
    left: 0.06,
    right: 0.89,
    top: 0.13,
    bottom: 0.79,
  };
  for (const frame of boundFrames) {
    const boxes = Array.isArray(frame.boxes) ? frame.boxes : [],
      faces = boxes.filter((b) => b.role === "face" && rect(b));
    for (const box of boxes.filter((b) =>
      ["caption", "hook", "emoji"].includes(b.role),
    )) {
      if (box.extent === "raster" && !rasterBoxMatches(box, frame, manifest))
        continue;
      if (!rect(box)) {
        add("text.bounds", "fail", "Nieprawidłowy zmierzony obrys", [
          frame.frame,
          frame.frame,
        ]);
        continue;
      }
      if (
        box.x < safe.left ||
        box.x + box.width > safe.right ||
        box.y < safe.top ||
        box.y + box.height > safe.bottom
      )
        add(
          "text.safezone",
          box.extent === "layout" ? "unknown" : "fail",
          `Obrys ${box.extent === "layout" ? "układu (wymaga potwierdzenia pikseli)" : "elementu"} ${box.id ?? "tekstu"} wychodzi poza strefę bezpieczną`,
          [frame.frame, frame.frame],
        );
      if (faces.some((face) => intersects(box, face)))
        add(
          "text.face-overlap",
          box.extent === "layout" ? "unknown" : "fail",
          `Element ${box.id ?? "tekstu"} nachodzi na twarz`,
          [frame.frame, frame.frame],
        );
    }
  }
  return qualityReport(manifest, findings);
}
