import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { safePath, hashFile, probeSource } from "../quickcontent-ingest.mjs";
import { outputDimensions } from "../quickcontent-portrait.mjs";
import { checkGeometry } from "./geometry-check.mjs";
import { checkMedia } from "./media-check.mjs";
import { qualityReport } from "./report.mjs";
export async function inspectReelQuality(root, reelName, data) {
  const dir = `public/reels/${reelName}`;
  const file = await safePath(root, `${dir}/${data.source}`);
  let observations,
    sourceHash = null,
    probe,
    sourceError = null,
    observationError = null,
    before;
  try {
    before = await fs.stat(file);
    sourceHash = await hashFile(file);
    probe = await probeSource(file, { root });
  } catch (error) {
    sourceError = {
      status:
        error.code === "ENOENT" && error.path !== file ? "unknown" : "fail",
      evidence: "Nie można potwierdzić obrazu i audio źródła: " + error.message,
    };
  }
  try {
    observations = JSON.parse(
      await fs.readFile(
        await safePath(root, `${dir}/framing.observations.json`),
        "utf8",
      ),
    );
  } catch (error) {
    if (error.code !== "ENOENT")
      observationError = "Nieprawidłowy zapis obserwacji kadru";
  }
  const stale = observations && observations.sourceSha256 !== sourceHash;
  if (stale) observations = undefined;
  const signature = createHash("sha256")
    .update(JSON.stringify([data, sourceHash, observations ?? null]))
    .digest("hex");
  const context = {
    signature,
    inputs: { data, sourceSha256: sourceHash },
    output: {
      ...(data.format ?? outputDimensions(data.outputResolution)),
      fps: data.fps ?? 30,
    },
  };
  const geometry = checkGeometry({ manifest: context, observations });
  if (stale)
    geometry.findings.push({
      ruleId: "tracking.source-binding",
      severity: "critical",
      status: "unknown",
      frameRange: null,
      evidence:
        "Obserwacje pochodzą z innej lub niepotwierdzonej wersji źródła",
    });
  if (observationError)
    geometry.findings.push({
      ruleId: "tracking.observations",
      severity: "critical",
      status: "fail",
      frameRange: null,
      evidence: observationError,
    });
  Object.assign(geometry, qualityReport(context, geometry.findings));
  const media = checkMedia({ manifest: context, probe });
  if (sourceError) {
    media.findings.push({
      ruleId: "media.probe",
      severity: "critical",
      frameRange: null,
      ...sourceError,
    });
    Object.assign(media, qualityReport(context, media.findings));
  }
  const after = await fs.stat(file).catch(() => null);
  if (
    before &&
    (!after ||
      ["size", "mtimeMs", "ctimeMs"].some((k) => before[k] !== after[k]))
  )
    throw Object.assign(
      Error("Źródło zmieniło się podczas kontroli. Ponów pomiar."),
      { status: 409 },
    );
  const latest = JSON.parse(
    await fs.readFile(
      await safePath(root, path.posix.join(dir, "reel.json")),
      "utf8",
    ),
  );
  if (JSON.stringify(latest) !== JSON.stringify(data))
    throw Object.assign(
      Error("Rolka zmieniła się podczas kontroli. Ponów pomiar."),
      { status: 409 },
    );
  return {
    reel: reelName,
    signatureKind: "draft-and-source",
    revisionSignature: signature,
    sourceSha256: sourceHash,
    status: [geometry.status, media.status].includes("fail")
      ? "fail"
      : [geometry.status, media.status].includes("unknown")
        ? "unknown"
        : "pass",
    geometry,
    media,
  };
}
