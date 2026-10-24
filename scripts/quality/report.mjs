export function qualityReport(manifest, findings) {
  return {
    checkVersion: 1,
    manifestSignature: manifest?.signature ?? null,
    status: findings.some(
      (f) => f.severity === "critical" && f.status === "fail",
    )
      ? "fail"
      : findings.some(
            (f) => f.severity === "critical" && f.status === "unknown",
          )
        ? "unknown"
        : "pass",
    findings,
  };
}
