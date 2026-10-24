import { createHash } from "node:crypto";
import { safeAssetPath } from "./manifest.mjs";

export async function verifyManifestAssets(
  manifest,
  readAsset,
  { inspectFont } = {},
) {
  const findings = [];
  for (const asset of manifest.assets) {
    const owner = asset.path.match(
      /^public\/Brandings\/([^/]+)\/(?:fonts|assets)\//,
    )?.[1];
    if (!safeAssetPath(asset.path) || (owner && owner !== manifest.clientId)) {
      findings.push({
        assetId: asset.id,
        status: "fail",
        reason: "Nieprawidłowa lub cudza ścieżka zasobu",
      });
      continue;
    }
    let bytes;
    try {
      bytes = await readAsset(asset.path);
    } catch {
      findings.push({
        assetId: asset.id,
        status: "fail",
        reason: "Brak dostępnego pliku zasobu",
      });
      continue;
    }
    if (
      bytes.length !== asset.byteLength ||
      createHash("sha256").update(bytes).digest("hex") !== asset.sha256
    ) {
      findings.push({
        assetId: asset.id,
        status: "fail",
        reason: "Niezgodna zawartość zasobu",
      });
      continue;
    }
    if (asset.kind === "font") {
      let check = { status: "unknown" };
      if (inspectFont) {
        try {
          check = await inspectFont(asset, bytes);
        } catch {
          check = { status: "unknown" };
        }
      }
      if (check.status !== "pass")
        findings.push({
          assetId: asset.id,
          status: check.status === "fail" ? "fail" : "unknown",
          reason: "Pokrycie polskich znaków",
          missing: check.missing ?? [],
        });
    }
  }
  return {
    status: findings.some((f) => f.status === "fail")
      ? "fail"
      : findings.length
        ? "unknown"
        : "pass",
    findings,
  };
}
