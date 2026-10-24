// CutRaw C3: auto-przełączanie kamer na mówiącego. Mówca słowa (mikrofon z największą energią) → kamera, która go pokazuje;
// kilka głosów naraz → plan ogólny; cisza → ujęcie zostaje. Minimalne ujęcie liczone na osi PO cięciach, zmiana ujęcia
// przesuwana na pobliskie cięcie (jedno przejście zamiast dwóch tuż obok siebie). Wejście i wynik w czasie mastera.

// Domyślne przypisanie: więcej kamer niż mikrofonów → kamera główna = plan ogólny, reszta po kolei na mikrofony;
// tyle samo lub mniej → wszystkie po kolei na mikrofony. Do poprawienia w panelu (Synchronizacja → „Pokazuje”).
export function defaultAngles(cameras, mics) {
  if (cameras.length < 2 || !mics.length) return Object.fromEntries(cameras.map((c) => [c, null]));
  const wide = cameras.length > mics.length;
  return Object.fromEntries(cameras.map((c, i) => [c, wide ? (i ? (mics[i - 1] ?? null) : "wide") : (mics[i] ?? null)]));
}

// words: [{ start, end, speaker }], cameras: [{ id, shows: mówca | "wide" | null }], segments: zachowane fragmenty mastera.
export function cameraPlan({ words, segments, cameras, duration, minShot = 2.5, lead = 0.25, join = 0.5, overlap = 0.4, step = 0.1 }) {
  const bySpeaker = new Map(cameras.filter((c) => c.shows && c.shows !== "wide").map((c) => [c.shows, c.id]));
  const wide = cameras.find((c) => c.shows === "wide")?.id ?? null;
  if (cameras.length < 2 || !bySpeaker.size || !segments.length) return null;

  const toOut = (t) => {
    let pos = 0;
    for (const s of segments) {
      if (t < s.start) return pos;
      if (t <= s.end) return pos + t - s.start;
      pos += s.end - s.start;
    }
    return pos;
  };
  const toMaster = (o) => {
    let pos = 0;
    for (const s of segments) {
      if (o < pos + s.end - s.start) return s.start + o - pos;
      pos += s.end - s.start;
    }
    return duration;
  };
  const length = toOut(duration);
  const joins = segments.slice(1).map((s) => toOut(s.start));

  // Kto mówi w każdym kroku osi; patrzymy `lead` s do przodu, żeby kamera była na mówiącym, zanim zacznie.
  const n = Math.ceil(length / step);
  const active = Array.from({ length: n }, () => new Set());
  for (const w of words) {
    if (!w.speaker) continue;
    const a = toOut(w.start);
    const b = toOut(w.end);
    if (b - a < 0.05) continue; // słowo wycięte
    for (let i = Math.max(0, Math.floor((a - lead) / step)); i < Math.min(n, Math.ceil((b - lead) / step)); i++) active[i].add(w.speaker);
  }
  // Krótkie „mhm” drugiej osoby w trakcie cudzej wypowiedzi nie jest nakładaniem — liczy się dopiero ≥ `overlap` s.
  const both = active.map((s) => s.size > 1);
  for (let i = 0; i < n; ) {
    if (!both[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && both[j]) j++;
    if ((j - i) * step < overlap) {
      const keep = i ? [...active[i - 1]][0] : undefined;
      for (let k = i; k < j; k++) active[k] = new Set(keep && active[k].has(keep) ? [keep] : [...active[k]].slice(0, 1));
    }
    i = j;
  }

  let current = wide ?? cameras[0].id;
  const runs = [];
  for (let i = 0; i < n; i++) {
    const who = [...active[i]];
    current = who.length > 1 ? (wide ?? current) : who.length ? (bySpeaker.get(who[0]) ?? current) : current;
    if (runs.at(-1)?.camera === current) runs.at(-1).end = (i + 1) * step;
    else runs.push({ camera: current, start: i * step, end: (i + 1) * step });
  }
  if (!runs.length) return null;
  runs.at(-1).end = length;

  // Ujęcia krótsze niż minShot dołączamy do poprzedniego (pierwsze — do następnego), potem sklejamy sąsiadów tej samej kamery.
  // ponytail: O(n²) po liczbie ujęć — przy 2 h to kilka tysięcy, wystarcza.
  const merge = () => {
    for (let i = runs.length - 1; i > 0; i--)
      if (runs[i].camera === runs[i - 1].camera) {
        runs[i - 1].end = runs[i].end;
        runs.splice(i, 1);
      }
  };
  merge();
  for (;;) {
    let k = -1;
    for (let i = 0; i < runs.length; i++)
      if (runs[i].end - runs[i].start < minShot && (k < 0 || runs[i].end - runs[i].start < runs[k].end - runs[k].start)) k = i;
    if (k < 0 || runs.length < 2) break;
    if (k) runs[k - 1].end = runs[k].end;
    else runs[1].start = runs[0].start;
    runs.splice(k, 1);
    merge();
  }

  // Granica ujęcia przy cięciu (± join s) → dokładnie na cięciu, jeśli oba ujęcia dalej mają ≥ minShot.
  for (let i = 1; i < runs.length; i++) {
    const t = runs[i].start;
    const near = joins.filter((j) => Math.abs(j - t) <= join && j - runs[i - 1].start >= minShot && runs[i].end - j >= minShot);
    if (near.length) runs[i - 1].end = runs[i].start = near.reduce((x, y) => (Math.abs(y - t) < Math.abs(x - t) ? y : x));
  }

  return runs.map((r, i) => ({ camera: r.camera, start: i ? toMaster(r.start) : 0, end: i < runs.length - 1 ? toMaster(r.end) : duration }));
}
