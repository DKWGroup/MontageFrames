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
    .filter((c) => c.words.length);
  return visible.flatMap(({ g, index, words }, i) => {
    const start = toOut(words[0].start, segments);
    const next = visible[i + 1];
    const end = Math.min(
      reelFrames(data) / fps,
      g.end == null ? Infinity : toOut(g.end, segments),
      next ? toOut(next.words[0].start, segments) : Infinity,
      Math.max(toOut(words[words.length - 1].end, segments) + 1, start + 0.8),
    );
    const from = Math.round(start * fps);
    const durationInFrames = Math.round(end * fps) - from;
    return durationInFrames > 0
      ? [{ g, index, words, start, end, from, durationInFrames }]
      : [];
  });
};
