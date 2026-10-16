// Czyste operacje na cięciach — wspólne dla CLI, serwera i podglądu w panelu (bez modułów Node).
const ms = (t) => Math.round(t * 1000) / 1000;

// Segmenty = dopełnienie cięć z decision "cut"; scalanie, odrzucenie < 0,15 s, naprzemienny punch-in.
// ponytail: zoom naprzemiennie na wszystkich segmentach; „w obrębie ujęcia kamery”, gdy dojdzie wykrywanie cięć kamer.
export function applyDecisions(sourceDuration, cuts) {
  const removed = cuts
    .filter((c) => c.decision === "cut")
    .map((c) => [c.start, c.end])
    .sort((a, b) => a[0] - b[0]);
  const segs = [];
  let t = 0;
  for (const [a, b] of removed) {
    if (a > t) segs.push([t, a]);
    t = Math.max(t, b);
  }
  if (t < sourceDuration) segs.push([t, sourceDuration]);
  return segs
    .filter(([a, b]) => b - a >= 0.15)
    .map(([start, end], i) => ({ start: ms(start), end: ms(end), zoom: i % 2 ? 1.1 : 1 }));
}

// Czas źródła -> oś po montażu (lustro toOut z src/reel-timing.ts, którego Node nie importuje bez transpilacji).
export function outTime(t, segments) {
  let acc = 0;
  for (const s of segments) {
    if (t < s.start) return acc;
    if (t <= s.end) return acc + t - s.start;
    acc += s.end - s.start;
  }
  return acc;
}

// Oś po montażu -> czas źródła (odwrotność outTime).
export function sourceTime(out, segments) {
  let acc = 0;
  for (const s of segments) {
    const len = s.end - s.start;
    if (out <= acc + len) return s.start + out - acc;
    acc += len;
  }
  return segments.length ? segments[segments.length - 1].end : 0;
}
