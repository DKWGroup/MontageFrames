import type { CaptionGroup, ReelData, Segment } from "./Reel";

const kept = (s: Segment) => s.end - s.start;

// Czas źródła -> czas po montażu. Czas wewnątrz wyciętego fragmentu przykleja się do miejsca cięcia.
export const toOut = (t: number, segments: Segment[]) => {
  let acc = 0;
  for (const s of segments) {
    if (t < s.start) return acc;
    if (t <= s.end) return acc + t - s.start;
    acc += kept(s);
  }
  return acc;
};

// Słowo zostaje, jeśli zaczyna się w zachowanym fragmencie (ASR startuje słowa do ~0.2 s za wcześnie) — wycięty dubel znika razem z napisem.
export const keptWords = (g: CaptionGroup, segments: Segment[]) =>
  g.words.filter((w) =>
    segments.some((s) => w.start >= s.start - 0.25 && w.start < s.end),
  );

// Długość rolki po montażu w klatkach — wspólna dla Studia i panelu (ui/).
export const reelFrames = (data: ReelData) =>
  Math.max(
    1,
    Math.round(
      data.segments.reduce((n, s) => n + kept(s), 0) * (data.fps ?? 30),
    ),
  );

// Wspólne czasy napisów w Studio, panelu i renderze.
export const captionClips = (data: ReelData) => {
  const { segments } = data;
  const fps = data.fps ?? 30;
  const visible = data.captions
    .map((g, index) => ({ g, index, words: keptWords(g, segments) }))
    .filter((c) => c.words.length && !c.g.hidden);
  // hold: ostatnie słowo grupy zostaje na ekranie min. tyle sekund od swojego startu — następna grupa
  // wjeżdża najwcześniej wtedy (jej słowa, które już padły, pokazują się od razu). 0 = start z pierwszym słowem.
  const hold = data.hold ?? (data.style === "bisanz" ? 0.45 : 0);
  const starts: number[] = [];
  let floor = 0;
  for (let i = 0; i < visible.length; i++) {
    const { words } = visible[i];
    const naturalStart = toOut(words[0].start, segments);
    // Szybkie zdania nie mogą kumulować opóźnienia i wypadać poza koniec filmu.
    const s =
      data.style === "bisanz"
        ? Math.max(
            naturalStart,
            Math.min(
              floor,
              naturalStart + 0.35,
              i + 1 < visible.length
                ? toOut(visible[i + 1].words[0].start, segments) - 1 / fps
                : Infinity,
              reelFrames(data) / fps - 1 / fps,
            ),
          )
        : Math.max(naturalStart, floor);
    starts.push(s);
    floor = Math.max(
      s + (data.style === "bisanz" ? 1 : 0),
      Math.max(s, toOut(words[words.length - 1].start, segments)) + hold,
    );
  }
  return visible.flatMap(({ g, index, words }, i) => {
    const start = starts[i];
    const end = Math.min(
      reelFrames(data) / fps,
      g.end == null ? Infinity : toOut(g.end, segments),
      i + 1 < starts.length ? starts[i + 1] : Infinity,
      Math.max(
        toOut(words[words.length - 1].end, segments) + 1,
        start + (data.style === "bisanz" ? 1 : 0.8),
      ),
    );
    const from = Math.round(start * fps);
    const durationInFrames = Math.round(end * fps) - from;
    return durationInFrames > 0
      ? [{ g, index, words, start, end, from, durationInFrames }]
      : [];
  });
};

// Wymiary kompozycji: brak `format` = pion 1080×1920 (wszystkie dotychczasowe rolki).
export function reelDimensions(data: { format?: { width: number; height: number } }) {
  const f = data.format;
  if (!f) return { width: 1080, height: 1920 };
  const ok = (n: number) => Number.isInteger(n) && n > 0 && n % 2 === 0;
  if (!ok(f.width) || !ok(f.height)) throw new Error(`Nieprawidłowy format: ${f.width}x${f.height}`);
  return { width: f.width, height: f.height };
}

// Tokeny stylu dla kadru: poziomy kadr bierze T16, a styl bez T16 dostaje T z flagą missing16x9 (GUI: „Styl poziomy wymaga uzupełnienia”).
export function tokensFor<Tok extends object>(
  style: { T: Tok; T16?: Tok },
  dims: { width: number; height: number },
): Tok & { missing16x9?: boolean } {
  if (dims.width <= dims.height) return style.T;
  return style.T16 ?? { ...style.T, missing16x9: true };
}

// LongForm: wyciszenia cenzury (czasy źródła). Gain 0 w środku, liniowa rampa `ramp` s na brzegach.
export type Mute = { wordId?: string; start: number; end: number; ramp?: number; sfx?: string | null; level?: number | null };
export const muteGain = (t: number, mutes: Mute[] | undefined) =>
  (mutes ?? []).reduce((g, m) => {
    const r = Math.max(m.ramp ?? 0, 1e-6);
    if (t <= m.start - r || t >= m.end + r) return g;
    if (t < m.start) return Math.min(g, (m.start - t) / r);
    if (t > m.end) return Math.min(g, (t - m.end) / r);
    return 0;
  }, 1);

// Napis wyciszonego słowa: „kurwa” → „k***a”, „jeb...” → „j***...”.
export const censorWord = (text: string) =>
  text.replace(/[\p{L}\p{N}]+/u, (w) => (w.length > 3 ? `${w[0]}***${w[w.length - 1]}` : `${w[0]}***`));

// LongForm `zoom-through-cut`: wideo najeżdża do granicy (0,3 s), wychodzi już w kolejnej scenie (0,3 s), z rozmyciem ruchu.
export const zoomThroughAt = (t: number, windows: { start: number }[] | undefined) => {
  const W = 0.3;
  for (const w of windows ?? []) {
    const d = t - w.start;
    if (Math.abs(d) >= W) continue;
    const k = 1 - Math.abs(d) / W; // 0 na brzegu okna, 1 na granicy
    const e = k * k * (3 - 2 * k);
    return { scale: Math.round((1 + 0.5 * e) * 1000) / 1000, blur: Math.round(16 * 0.5 * e * 100) / 100 };
  }
  return { scale: 1, blur: 0 };
};
