import { qualityReport } from "./report.mjs";
export function checkMedia({ manifest, probe, samples, kind = "source" } = {}) {
  const findings = [];
  const add = (ruleId, status, evidence) =>
    findings.push({
      ruleId,
      status,
      severity: "critical",
      frameRange: null,
      evidence,
    });
  if (!probe) {
    add("media.probe", "unknown", "Brak metadanych pliku");
    return qualityReport(manifest, findings);
  }
  const streams = probe.streams ?? [],
    video = streams.find((s) => s.codec_type === "video");
  if (
    !video ||
    ![probe.width, probe.height, probe.duration].every(
      (x) => Number.isFinite(x) && x > 0,
    )
  )
    add(
      "media.video",
      "fail",
      "Brak poprawnego strumienia obrazu, wymiarów lub czasu",
    );
  if (!streams.some((s) => s.codec_type === "audio"))
    add("media.audio", "fail", "Brak strumienia audio");
  const segments = manifest?.inputs?.data?.segments ?? [],
    limit = Math.max(0, ...segments.map((s) => s.end));
  if (
    kind === "source" &&
    limit > probe.duration + 1 / (manifest?.output?.fps ?? 30)
  )
    add(
      "media.source-range",
      "fail",
      "Wybrane cięcia wychodzą poza koniec źródła",
    );
  if (kind === "render") {
    if (
      probe.width !== manifest?.output?.width ||
      probe.height !== manifest?.output?.height
    )
      add(
        "media.output-size",
        "fail",
        "Wymiary renderu różnią się od manifestu",
      );
    const expected = segments.reduce((sum, s) => sum + s.end - s.start, 0),
      tolerance =
        manifest?.inputs?.durationTolerance ??
        2 / (manifest?.output?.fps ?? 30);
    if (Math.abs(probe.duration - expected) > tolerance)
      add(
        "media.output-duration",
        "fail",
        "Czas renderu różni się od planu ponad zapisaną tolerancję",
      );
  }
  const pts = samples?.frameMap;
  if (!Array.isArray(pts) || !pts.length)
    add(
      "media.frame-map",
      "unknown",
      "Brak zmierzonej mapy klatka→PTS; średni FPS nie dowodzi stałego klatkażu",
    );
  else if (
    pts.some(
      (p, i) =>
        !Number.isSafeInteger(p.frame) ||
        !Number.isFinite(p.pts) ||
        p.frame < 0 ||
        p.pts < 0 ||
        p.pts > probe.duration ||
        (i > 0 && (p.frame <= pts[i - 1].frame || p.pts <= pts[i - 1].pts)),
    )
  )
    add(
      "media.frame-map",
      "fail",
      "Nieprawidłowa lub niemonotoniczna mapa klatek",
    );
  const expectedHash = manifest?.inputs?.sourceSha256;
  const count = Number(video?.nb_frames ?? video?.nb_read_frames);
  const completeMap =
    Array.isArray(pts) &&
    Number.isSafeInteger(count) &&
    count > 0 &&
    pts.length === count &&
    pts.every((p, i) => p.frame === i) &&
    pts[0].pts === 0 &&
    Number.isFinite(pts.at(-1).duration) &&
    pts.at(-1).duration > 0 &&
    Math.abs(pts.at(-1).pts + pts.at(-1).duration - probe.duration) <= 1e-3;
  const bound =
    /^[a-f0-9]{64}$/.test(expectedHash ?? "") &&
    samples?.sourceSha256 === expectedHash;
  if (Array.isArray(pts) && (!completeMap || !bound))
    add(
      "media.frame-map-coverage",
      "unknown",
      "Mapa nie pokrywa wszystkich klatek/czasu lub nie jest związana z wersją źródła",
    );
  if (
    samples?.decodeComplete !== true ||
    !bound ||
    !completeMap ||
    samples?.audioDecoded !== true ||
    samples?.decodedFrames !== count
  )
    add(
      "media.decode",
      "unknown",
      "Metadane nie potwierdzają zdekodowania całego obrazu i dźwięku",
    );
  return qualityReport(manifest, findings);
}
