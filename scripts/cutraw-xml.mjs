// CutRaw: Final Cut Pro 7 XML (xmeml) do importu w Premiere Pro (Plik → Importuj).
// Wejście w sekundach mastera; offset ścieżki = czas mastera − czas pliku. Klatki z zaokrąglonych granic segmentów,
// więc suma klipów = długość osi bez dryfu. Ścieżki mowy CutRaw generuje w czasie mastera (offset 0) — dokładne co do próbki.
// C3: dryf zegara (offset(t) = offset + k·(t − at)) liczony osobno dla każdego klipu; ścieżka `shots` = montaż kamer
// (przełączanie na mówiącego), markery sekwencji, `link` obrazu z dźwiękiem tej samej kamery (wspólny klucz `link`).
// ponytail: elementy jak w eksporcie Premiere z pamięci; po wzorcu z C0 (docs/cutraw/premiere-wzorzec.xml) dopasować.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { offsetAt } from "./cutraw-audio.mjs";

export function rateOf(fps) {
  const [n, d = 1] = String(fps).split("/").map(Number);
  const timebase = Math.round(n / d);
  if (!(timebase > 0)) throw new Error(`Nieprawidłowy fps: ${fps}`);
  const ntsc = Math.abs(n / d - timebase) > 0.001;
  return { timebase, ntsc, real: ntsc ? (timebase * 1000) / 1001 : timebase };
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
const bool = (b) => (b ? "TRUE" : "FALSE");
const v = (name, value) => `<${name}>${esc(value)}</${name}>`;
const el = (open, ...kids) => `<${open}>\n${kids.filter(Boolean).join("\n")}\n</${open.split(" ")[0]}>`;

// Premiere oczekuje file://localhost/…; spacje, polskie znaki i <> zakodowane procentowo, & escapowane w XML.
export const pathurl = (p) => pathToFileURL(p).href.replace(/^file:\/\/\//, "file://localhost/");

// Segmenty mastera (klatki) → kawałki z pozycją na osi po cięciach.
const withPos = (frames) => {
  let pos = 0;
  return frames.map(([a, b]) => {
    const r = { a, b, pos };
    pos += b - a;
    return r;
  });
};

// Kawałek osi z pliku przesuniętego o `shift` klatek; część poza zakresem pliku = luka (null, gdy nic nie zostaje).
function placePiece({ a, b, pos }, shift, fileFrames) {
  const from = Math.max(a - shift, 0);
  const to = Math.min(b - shift, fileFrames);
  if (to <= from) return null;
  const start = pos + from - (a - shift);
  return { start, end: start + to - from, in: from, out: to };
}

export const placeClips = (frames, shift, fileFrames) => withPos(frames).map((p) => placePiece(p, shift, fileFrames)).filter(Boolean);

export function toXmeml({ name, fps, width, height, sampleRate = 48000, segments, files, video, audio, markers = [] }) {
  const rate = rateOf(fps);
  const f = (t) => Math.round(t * rate.real);
  const frames = segments.map((s) => [f(s.start), f(s.end)]).filter(([a, b]) => b > a);
  frames.forEach(([a], i) => {
    if (i && a < frames[i - 1][1]) throw new Error("Segmenty nachodzą na siebie albo nie są posortowane.");
  });
  const pieces = withPos(frames);
  const total = frames.reduce((n, [a, b]) => n + b - a, 0);
  const rateXml = el("rate", v("timebase", rate.timebase), v("ntsc", bool(rate.ntsc)));
  const byId = new Map(files.map((x, i) => [x.id, { ...x, xmlId: `file-${i + 1}` }]));
  const seen = new Set();
  let clipN = 0;

  const fileOf = (id, kind) => {
    const file = byId.get(id);
    if (!file) throw new Error(`Ścieżka wskazuje nieznany plik: ${id}`);
    if (kind === "video" ? !file.width : !file.channels)
      throw new Error(`Plik ${path.basename(file.path)} nie ma strumienia ${kind === "video" ? "wideo" : "audio"}.`);
    return file;
  };
  // Przesunięcie w klatkach w środku kawałka: przy dryfie każdy klip ma własne (różnica w obrębie klipu < ½ klatki).
  const place = (src, p, file) => placePiece(p, Math.round(offsetAt(src, (p.a + p.b) / 2 / rate.real) * rate.real), f(file.duration));

  // Klipy ścieżki: zwykła = jeden plik; `shots` = kawałki dzielone na granicach ujęć, plik z ujęcia,
  // a gdy kamera ujęcia nie obejmuje całego kawałka — `fallback` (kamera główna), żeby na V1 nie było dziury.
  const clipsOf = (t, kind) => {
    if (!t.shots) {
      const file = fileOf(t.file, kind);
      return pieces.map((p) => place(t, p, file)).filter(Boolean).map((c) => ({ ...c, file, label: t.label ?? path.basename(file.path) }));
    }
    const bounds = t.shots.map((x) => [f(x.start), f(x.end), x]);
    const out = [];
    for (const p of pieces)
      for (const [sa, sb, shot] of bounds) {
        const sub = { a: Math.max(p.a, sa), b: Math.min(p.b, sb) };
        if (sub.b <= sub.a) continue;
        sub.pos = p.pos + sub.a - p.a;
        let src = shot;
        let file = fileOf(src.file, kind);
        let c = place(src, sub, file);
        if ((!c || c.end - c.start < sub.b - sub.a) && t.fallback) {
          src = t.fallback;
          file = fileOf(src.file, kind);
          c = place(src, sub, file);
        }
        if (c) out.push({ ...c, file, label: src.label ?? path.basename(file.path) });
      }
    return out;
  };

  const tracks = [
    ...video.map((t, i) => ({ t, kind: "video", index: i + 1 })),
    ...audio.map((t, i) => ({ t, kind: "audio", index: i + 1 })),
  ].map((x) => ({ ...x, clips: clipsOf(x.t, x.kind).map((c) => ({ ...c, id: `clipitem-${++clipN}` })) }));

  // link: klip i obrazu ↔ klip i audio tej samej kamery (ten sam plik i offset → te same kawałki).
  const groups = Object.values(Object.groupBy(tracks.filter((x) => x.t.link), (x) => x.t.link));
  const links = new Map();
  for (const g of groups) {
    if (g.length < 2 || g.some((x) => x.clips.length !== g[0].clips.length)) continue;
    g[0].clips.forEach((_, i) => {
      const xml = g.map((x) =>
        el("link", v("linkclipref", x.clips[i].id), v("mediatype", x.kind), v("trackindex", x.index), v("clipindex", i + 1), x.kind === "audio" && v("groupindex", 1)),
      );
      for (const x of g) links.set(x.clips[i].id, xml);
    });
  }

  const fileXml = (file) => {
    if (seen.has(file.xmlId)) return `<file id="${file.xmlId}"/>`;
    seen.add(file.xmlId);
    return el(
      `file id="${file.xmlId}"`,
      v("name", path.basename(file.path)),
      v("pathurl", pathurl(file.path)),
      rateXml,
      v("duration", f(file.duration)),
      el(
        "media",
        file.width &&
          el("video", el("samplecharacteristics", rateXml, v("width", file.width), v("height", file.height), v("anamorphic", "FALSE"), v("pixelaspectratio", "square"), v("fielddominance", "none"))),
        file.channels &&
          el("audio", el("samplecharacteristics", v("depth", 16), v("samplerate", file.sampleRate ?? sampleRate)), v("channelcount", file.channels)),
      ),
    );
  };

  const trackXml = ({ t, kind, clips }) =>
    el(
      "track",
      ...clips.map((c) =>
        el(
          `clipitem id="${c.id}"`,
          v("name", c.label),
          v("enabled", bool(t.enabled !== false)),
          v("duration", f(c.file.duration)),
          rateXml,
          v("start", c.start),
          v("end", c.end),
          v("in", c.in),
          v("out", c.out),
          fileXml(c.file),
          kind === "audio" && el("sourcetrack", v("mediatype", "audio"), v("trackindex", 1)),
          ...(links.get(c.id) ?? []),
        ),
      ),
      v("enabled", "TRUE"),
      v("locked", "FALSE"),
    );

  // Marker w czasie mastera → klatka osi po cięciach; czas wycięty = bez markera.
  const markerXml = markers
    .map((m) => {
      const t = f(m.at);
      const p = pieces.find((x) => t >= x.a && t < x.b);
      return p && el("marker", v("comment", m.comment ?? ""), v("name", m.name), v("in", p.pos + t - p.a), v("out", -1));
    })
    .filter(Boolean);

  const sequence = el(
    'sequence id="sequence-1"',
    v("name", name),
    v("duration", total),
    rateXml,
    el("timecode", rateXml, v("string", "00:00:00:00"), v("frame", 0), v("displayformat", "NDF")),
    ...markerXml,
    el(
      "media",
      el(
        "video",
        el("format", el("samplecharacteristics", rateXml, v("width", width), v("height", height), v("anamorphic", "FALSE"), v("pixelaspectratio", "square"), v("fielddominance", "none"))),
        ...tracks.filter((x) => x.kind === "video").map(trackXml),
      ),
      el(
        "audio",
        v("numOutputChannels", 2),
        el("format", el("samplecharacteristics", v("depth", 16), v("samplerate", sampleRate))),
        ...tracks.filter((x) => x.kind === "audio").map(trackXml),
      ),
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n${el('xmeml version="4"', sequence)}\n`;
}
