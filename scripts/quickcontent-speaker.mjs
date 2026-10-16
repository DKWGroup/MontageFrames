import { faceFraming } from "./quickcontent-portrait.mjs";

// Kto mówi, na której kamerze: ujęcia (cięcia kamer) → twarze śledzone w ujęciu → ruch ust w chwilach,
// gdy w transkrypcie pada słowo = głos tej twarzy. Ujęcie bez mówiącej twarzy (materiał z newsa,
// lektor) pokazujemy w całości (`fit`). Kalibracja na próbkach co 1/fps s:
export const MOUTH_ACTIVE = 0.015; // średnia |Δ otwarcia ust| / wysokość twarzy — powyżej = mówi
const MIN_FACE = 0.05; // twarze mniejsze niż 5% wysokości kadru (tłum, tło) pomijamy
const MIN_PRESENCE = 0.4; // twarz widoczna w ≥40% klatek ujęcia
const CLOSE_UP = 0.25; // twarz ≥25% wysokości kadru = kamera na osobę (pauza w mowie ≠ materiał z newsa)
const SWITCH = 1.5; // nowy mówca musi ruszać ustami 1,5× mocniej niż obecny (bez skakania kadru)

const center = (f) => [f.x + f.width / 2, f.y + f.height / 2];
const valid = (f) =>
  [f.x, f.y, f.width, f.height].every(Number.isFinite) &&
  f.height >= MIN_FACE &&
  f.x >= 0 &&
  f.y >= 0 &&
  f.x + f.width <= 1.001 &&
  f.y + f.height <= 1.001;

function tracksIn(samples, from, to) {
  const tracks = [];
  for (let i = from; i < to; i++) {
    const taken = new Set();
    for (const face of (samples[i] ?? []).filter(valid)) {
      const [cx, cy] = center(face);
      let best,
        dist = 0.12;
      for (const t of tracks) {
        if (taken.has(t)) continue;
        const [tx, ty] = center(t.frames.at(-1).face);
        const d = Math.hypot(cx - tx, cy - ty);
        if (d < dist) [best, dist] = [t, d];
      }
      if (!best) tracks.push((best = { frames: [] }));
      taken.add(best);
      best.frames.push({ i, face });
    }
  }
  return tracks.filter((t) => t.frames.length >= MIN_PRESENCE * (to - from));
}

// średnia |Δ ust| klatek ścieżki w [from, to); null = brak danych o ustach
function activity(track, from, to) {
  const m = track.frames.filter(
    (f) => f.i >= from && f.i < to && Number.isFinite(f.face.mouth),
  );
  if (m.length < 2) return null;
  let sum = 0;
  for (let k = 1; k < m.length; k++)
    sum += Math.abs(m[k].face.mouth - m[k - 1].face.mouth);
  return sum / (m.length - 1);
}

const faceAt = (track, from, to) => {
  const near = track.frames.filter((f) => f.i >= from && f.i < to);
  const list = near.length ? near : track.frames;
  return list[Math.floor(list.length / 2)].face;
};

export function buildSpeakerTracking({
  samples,
  fps,
  cuts = [],
  speech = [],
  width,
  height,
  duration,
  responsive = false,
}) {
  const bounds = [
    0,
    ...cuts.filter((c) => c > 0.5 && c < duration - 0.5).sort((a, b) => a - b),
    duration,
  ];
  const talking = (a, b) => speech.some(([s, e]) => s < b && e > a);
  const idx = ([a, b]) => [Math.floor(a * fps), Math.ceil(b * fps)];
  const point = (time, face, cut) => ({
    time,
    ...faceFraming([face], width, height),
    mode: undefined,
    scale: Math.max(0.55, Math.min(1, 0.34 / face.height)),
    ...(cut && { cut: true }),
  });
  const points = [];
  const shots = [];
  for (let s = 0; s + 1 < bounds.length; s++) {
    const [start, end] = [bounds[s], bounds[s + 1]];
    const from = Math.floor(start * fps),
      to = Math.max(from + 1, Math.floor(end * fps));
    const tracks = tracksIn(samples, from, to);
    const windows = [];
    for (let t = start; t < end - 1e-6; t += responsive ? 0.25 : 1)
      windows.push([t, Math.min(end, t + (responsive ? 0.25 : 1))]);
    // aktywność ust każdej twarzy w oknach z mową
    const spoken = windows.filter((w) => talking(...w));
    const score = tracks.map((t) => {
      const v = spoken
        .map((w) =>
          activity(
            t,
            ...idx(
              responsive
                ? [Math.max(start, w[0] - 0.25), Math.min(end, w[1] + 0.25)]
                : w,
            ),
          ),
        )
        .filter((x) => x !== null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const known = score.some((x) => x !== null);
    const best = score.reduce(
      (bi, x, i) => ((x ?? -1) > (score[bi] ?? -1) ? i : bi),
      0,
    );
    const closeUp = tracks.some((t) => faceAt(t, from, to).height >= CLOSE_UP);
    const kind = !tracks.length
      ? "footage"
      : spoken.length && known && score[best] < MOUTH_ACTIVE && !closeUp
        ? "footage" // małe twarze, nikt nie mówi: lektor na materiale z newsa
        : spoken.length && known && score[best] >= MOUTH_ACTIVE
          ? "speaker"
          : "face";
    shots.push({ start, end, kind, faces: tracks.length });
    if (kind === "footage") {
      points.push({
        time: start,
        centerX: 0.5,
        centerY: 0.5,
        fit: true,
        cut: true,
      });
      continue;
    }
    // bez danych o ustach: największa twarz
    let current = known
      ? best
      : tracks.reduce(
          (bi, t, i) =>
            faceAt(t, from, to).height > faceAt(tracks[bi], from, to).height
              ? i
              : bi,
          0,
        );
    windows.forEach((w, n) => {
      let cut = n === 0;
      const [wf, wt] = idx(w);
      const present = tracks
        .map((t, i) => (t.frames.some((f) => f.i >= wf && f.i < wt) ? i : -1))
        .filter((i) => i >= 0);
      // A missed camera cut must not borrow a face from a later part of this shot.
      if (present.length && !present.includes(current)) {
        current = present.reduce(
          (a, b) => ((score[b] ?? -1) > (score[a] ?? -1) ? b : a),
          present[0],
        );
        cut = true;
      }
      if (!present.length) {
        const visible = samples
          .slice(wf, wt)
          .flat()
          .filter(valid)
          .sort((a, b) => b.width * b.height - a.width * a.height)[0];
        if (visible) points.push(point(w[0], visible, true));
        return;
      }
      if (kind === "speaker" && talking(...w)) {
        const act = tracks.map(
          (t) =>
            activity(
              t,
              ...idx(
                responsive
                  ? [Math.max(start, w[0] - 0.25), Math.min(end, w[1] + 0.25)]
                  : w,
              ),
            ) ?? 0,
        );
        const next = present.reduce(
          (a, b) => (act[b] > act[a] ? b : a),
          present[0],
        );
        if (
          next !== current &&
          act[next] >= MOUTH_ACTIVE &&
          act[next] > act[current] * SWITCH
        ) {
          current = next;
          cut = true; // zmiana mówcy w szerokim ujęciu = cięcie kadru, nie przejazd
        }
      }
      points.push(
        point(
          cut ? w[0] : (w[0] + w[1]) / 2,
          faceAt(tracks[current], ...idx(w)),
          cut,
        ),
      );
    });
  }
  // wygładzanie między cięciami: mediana z 3 sąsiadów i ograniczona prędkość
  const raw = points.map((p) => ({ ...p }));
  for (let i = 1; i < points.length; i++) {
    if (points[i].fit || points[i].cut) continue;
    for (const key of ["centerX", "centerY", "scale"]) {
      const near = [raw[i - 1], raw[i], raw[i + 1]]
        .filter((p, k) => p && !p.fit && !(k === 2 && p.cut))
        .map((p) => p[key])
        .sort((a, b) => a - b);
      const delta = near[Math.floor(near.length / 2)] - points[i - 1][key];
      points[i][key] =
        points[i - 1][key] +
        (Math.abs(delta) < 0.006
          ? 0
          : Math.max(
              responsive ? -0.25 : -0.12,
              Math.min(
                responsive ? 0.25 : 0.12,
                delta * (responsive ? 0.95 : 0.65),
              ),
            ));
    }
  }
  if (!points.length) return { framing: faceFraming([], width, height), shots };
  const last = points.at(-1);
  if (last.time < duration)
    points.push({ ...last, time: duration, cut: undefined });
  return {
    framing: {
      mode: "crop",
      centerX: points[0].centerX,
      centerY: points[0].centerY,
      trackingEnabled: true,
      tracking: points,
    },
    shots,
  };
}

export function speakerNote(shots) {
  const n = (k) => shots.filter((s) => s.kind === k).length;
  const people = Math.max(0, ...shots.map((s) => s.faces));
  return [
    `Śledzenie mówcy w pionie 9:16: ujęcia kamer: ${shots.length}, maks. ${people} os. w kadrze.`,
    n("speaker") &&
      `${n("speaker")} z mówcą rozpoznanym po ruchu ust (kadr na tej osobie, przy zmianie mówcy cięcie).`,
    n("face") &&
      `${n("face")} z twarzą bez wyraźnego ruchu ust (kadr na tej twarzy).`,
    n("footage") &&
      `${n("footage")} bez mówiącej twarzy (np. materiał z newsa) — w całości, z rozmytym tłem.`,
    "Możesz wyłączyć śledzenie i ustawić kadr ręcznie.",
  ]
    .filter(Boolean)
    .join(" ");
}
