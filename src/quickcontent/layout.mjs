const clamp = (v, max = 1) => Math.max(0, Math.min(max, v));
export const validRect = (r) =>
  r &&
  [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
  r.x >= 0 &&
  r.y >= 0 &&
  r.width > 0 &&
  r.height > 0 &&
  r.x + r.width <= 1.001 &&
  r.y + r.height <= 1.001;
const box = ({ x, y, width, height }) => ({ x, y, width, height });
// Embedded Happy News topic screen: central, portrait, above the hosts' desks.
export function buildHappyLayouts({
  samples,
  panels = [],
  fps,
  duration,
  cuts = [],
}) {
  const layouts = [];
  const sameShot = (a, b) =>
    !cuts.some((t) => t > Math.min(a, b) / fps && t <= Math.max(a, b) / fps);
  const rawFaces = samples.map((faces) =>
    (faces ?? [])
      .filter((f) => validRect(f) && f.height >= 0.08)
      .sort((a, b) => a.x - b.x)
      .slice(0, 2),
  );
  // Bridge brief detector misses within the same camera shot, never across a cut.
  const faceSamples = rawFaces.map((faces, i) => {
    if (faces.length === 2) return faces;
    for (let distance = 1; distance <= Math.ceil(fps * 0.75); distance++) {
      for (const j of [i - distance, i + distance]) {
        if (rawFaces[j]?.length !== 2 || !sameShot(i, j)) continue;
        if (
          !faces.length ||
          faces.every((f) =>
            rawFaces[j].some(
              (p) => Math.abs(p.x - f.x) < 0.08 && Math.abs(p.y - f.y) < 0.08,
            ),
          )
        )
          return rawFaces[j];
      }
    }
    return faces;
  });
  const detected = samples.map((_, i) => {
    const faces = faceSamples[i];

    return (panels[i] ?? [])
      .filter(
        (r) =>
          validRect(r) &&
          r.x + r.width / 2 > 0.43 &&
          r.x + r.width / 2 < 0.57 &&
          r.y < 0.1 &&
          r.y + r.height < 0.62 &&
          r.width > 0.16 &&
          r.height > 0.18 &&
          !faces.some(
            (f) =>
              f.x + f.width / 2 > r.x &&
              f.x + f.width / 2 < r.x + r.width &&
              f.y + f.height / 2 > r.y &&
              f.y + f.height / 2 < r.y + r.height,
          ),
      )
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  });
  const stable = detected.map((r, i) => {
    const nearby = [];
    for (
      let j = Math.max(0, i - 2);
      j <= Math.min(samples.length - 1, i + 2);
      j++
    ) {
      if (
        detected[j] &&
        sameShot(i, j) &&
        faceSamples[j].length === faceSamples[i].length
      )
        nearby.push(detected[j]);
    }
    const reference = r ?? nearby[0];
    const matches = nearby.filter(
      (p) =>
        reference &&
        Math.abs(p.x - reference.x) < 0.07 &&
        Math.abs(p.width - reference.width) < 0.07 &&
        Math.abs(p.height - reference.height) < 0.07,
    );
    if (matches.length < 2) return null;
    return Object.fromEntries(
      ["x", "y", "width", "height"].map((key) => [
        key,
        matches.map((p) => p[key]).sort((a, b) => a - b)[
          Math.floor(matches.length / 2)
        ],
      ]),
    );
  });
  for (let i = 0; i < samples.length; i++) {
    const start = i / fps,
      end = Math.min(duration, (i + 1) / fps);
    if (start >= end) break;
    const faces = faceSamples[i];
    if (!faces.length) continue;
    // A background screen is only extracted from a wide shot showing both hosts.
    const media = faces.length === 2 ? stable[i] : null;
    layouts.push({
      start,
      end,
      kind: faces.length === 2 ? (media ? "duo-media" : "duo") : "speaker",
      people: faces.map(box),
      ...(media ? { media: box(media) } : {}),
      cut: cuts.some((t) => t >= start && t < end),
    });
  }
  return layouts;
}
// Detector samples around cuts can carry the previous camera for one tick.
// Repair only short, confirmed glitches; editorial photo changes stay intact.
const layoutCache = new WeakMap();
function stableLayouts(framing) {
  const entries = framing?.layouts ?? [];
  if (!framing) return entries;
  if (layoutCache.has(framing)) return layoutCache.get(framing);
  const result = entries.slice();
  for (let i = 0; i < entries.length; ) {
    const entry = entries[i];
    let end = i + 1;
    while (
      end < entries.length &&
      !entries[end].cut &&
      entries[end].kind === entry.kind &&
      !entries[end].mediaSrc &&
      Math.abs(entries[end - 1].end - entries[end].start) < 0.001
    )
      end++;
    const next = entries[end],
      previous = entries[i - 1],
      confirmed = entries[end + 1];
    if (
      !entry.mediaSrc &&
      next &&
      !next.cut &&
      !next.mediaSrc &&
      next.start - entry.start <= 0.5 &&
      Math.abs(entries[end - 1].end - next.start) < 0.001 &&
      (((entry.cut || i === 0) &&
        confirmed &&
        !confirmed.cut &&
        confirmed.kind === next.kind &&
        Math.abs(next.end - confirmed.start) < 0.001) ||
        (!entry.cut &&
          previous?.kind === next.kind &&
          Math.abs(previous.end - entry.start) < 0.001))
    ) {
      for (let j = i; j < end; j++)
        result[j] = {
          ...next,
          start: entries[j].start,
          end: entries[j].end,
          cut: entries[j].cut,
        };
    }
    i = end;
  }
  // Layout sampling is 4 fps; tracking also retains the exact source cut time.
  for (let i = 1; !framing.cameraCuts && i < result.length; i++) {
    if (!result[i].cut) continue;
    const precise = (framing.tracking ?? [])
      .filter(
        (p) => p.cut && p.time >= result[i].start && p.time < result[i].end,
      )
      .at(-1);
    if (precise && Math.abs(result[i - 1].end - result[i].start) < 0.001) {
      result[i - 1] = { ...result[i - 1], end: precise.time };
      result[i] = { ...result[i], start: precise.time };
    }
  }
  let aligned = result;
  if (framing.cameraCuts) {
    aligned = result.map((l) => ({ ...l, cut: false }));
    for (const time of framing.cameraCuts) {
      // Layout bins may start before the actual cut. Keep the old camera until
      // that exact source frame; tracking cuts also include speaker switches.
      const bin = entries.findIndex(
        (l) => l.cut && l.start <= time && time <= l.end + 0.001,
      );
      if (bin > 0 && time > entries[bin].start) {
        const start = entries[bin].start;
        const previous = entries[bin - 1];
        aligned = aligned.flatMap((l) => {
          if (l.end <= start || l.start >= time) return [l];
          const before = {
            ...l,
            ...(!l.mediaSrc
              ? { media: previous.media, mediaSrc: previous.mediaSrc }
              : {}),
            end: Math.min(l.end, time),
            people: previous.people,
            kind: l.mediaSrc
              ? previous.people.length === 2
                ? "duo-media"
                : "speaker-media"
              : previous.kind,
            cut: false,
          };
          return l.end > time ? [before, { ...l, start: time }] : [before];
        });
      }
      aligned = aligned.flatMap((l) => {
        if (Math.abs(l.start - time) < 0.000001) return [{ ...l, cut: true }];
        if (l.start < time && time < l.end)
          return [
            { ...l, end: time },
            { ...l, start: time, cut: true },
          ];
        return [l];
      });
    }
  }
  layoutCache.set(framing, aligned);
  return aligned;
}
export function layoutAt(framing, time) {
  if (framing?.trackingEnabled === false || framing?.mode === "fit")
    return null;
  const entries = stableLayouts(framing);
  // FFmpeg reports six decimals; match the source frame without shifting the pan.
  const i = entries.findIndex(
    (e) => e.start <= time + 0.000001 && time + 0.000001 < e.end,
  );
  if (i < 0) return null;
  const a = entries[i],
    b = entries[i + 1];
  if (
    !b ||
    b.cut ||
    a.kind !== b.kind ||
    Math.abs(a.end - b.start) > 0.001 ||
    a.people.length !== b.people.length
  )
    return a;
  const t = clamp((time - a.start) / (a.end - a.start));
  return {
    ...a,
    people: a.people.map((p, k) =>
      Object.fromEntries(
        Object.keys(p).map((key) => [
          key,
          p[key] + (b.people[k][key] - p[key]) * t,
        ]),
      ),
    ),
  };
}
export function cropForFace(face, targetAspect, sourceAspect, anchorY = 0.48) {
  let height = Math.min(1, face.height / 0.22),
    width = (height * targetAspect) / sourceAspect;
  if (width > 1) {
    height /= width;
    width = 1;
  }
  return {
    x: clamp(face.x + face.width / 2 - width / 2, 1 - width),
    y: clamp(face.y + face.height / 2 - height * anchorY, 1 - height),
    width,
    height,
  };
}
export function validLayouts(framing, duration) {
  if (framing?.layouts === undefined) return true;
  return (
    Number.isFinite(framing.sourceAspect) &&
    framing.sourceAspect > 0 &&
    Array.isArray(framing.layouts) &&
    framing.layouts.length <= 2400 &&
    framing.layouts.every(
      (l, i, all) =>
        l &&
        Number.isFinite(l.start) &&
        Number.isFinite(l.end) &&
        l.start >= 0 &&
        l.end > l.start &&
        l.end <= duration + 0.001 &&
        (!i || l.start >= all[i - 1].end - 0.001) &&
        ["speaker", "duo", "duo-media", "speaker-media"].includes(l.kind) &&
        Array.isArray(l.people) &&
        l.people.length ===
          (["speaker", "speaker-media"].includes(l.kind) ? 1 : 2) &&
        l.people.every(validRect) &&
        (["duo", "speaker"].includes(l.kind) || validRect(l.media)) &&
        (l.mediaSrc === undefined ||
          (["duo-media", "speaker-media"].includes(l.kind) &&
            typeof l.mediaSrc === "string" &&
            /^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/.test(l.mediaSrc))),
    )
  );
}

// Stored per-caption positions must not put Happy News subtitles back on a face.
export function happyCaptionY(kind, storedY = 0.755) {
  if (kind === "duo") return 0.535;
  if (kind === "duo-media") return 0.565;
  if (kind === "speaker-media") return 0.49;
  return Math.min(0.73, Math.max(0.65, storedY + 0.035));
}
export function happyHookY(kind, storedY = 0.69) {
  if (kind === "duo") return 0.59;
  return kind === "duo-media"
    ? storedY + 0.025
    : Math.max(0.735, storedY + 0.035);
}

// Keep the viewport fixed; only an overscanned source moves behind its clipping edge.
export function speakerWindowAt(framing, time) {
  const entries = stableLayouts(framing);
  const index = entries.findIndex(
    (l) =>
      l.kind === "speaker" &&
      l.start <= time + 0.000001 &&
      time + 0.000001 < l.end,
  );
  if (index < 0) return null;
  let first = index;
  while (
    first > 0 &&
    !entries[first].cut &&
    entries[first - 1].kind === "speaker" &&
    Math.abs(entries[first - 1].end - entries[first].start) < 0.001
  )
    first--;
  const centre = (l) => ({
    x: l.people[0].x + l.people[0].width / 2,
    y: l.people[0].y + l.people[0].height / 2,
  });
  const seed = [];
  for (
    let i = first;
    i < entries.length && entries[i].start < entries[first].start + 1;
    i++
  ) {
    if (i > first && (entries[i].cut || entries[i].kind !== "speaker")) break;
    seed.push(centre(entries[i]));
  }
  let current = Object.fromEntries(
    ["x", "y"].map((key) => [
      key,
      seed.map((p) => p[key]).sort((a, b) => a - b)[
        Math.floor(seed.length / 2)
      ],
    ]),
  );
  const advance = (position, target, dt) =>
    Object.fromEntries(
      ["x", "y"].map((key) => {
        const delta = target[key] - position[key];
        const outside = Math.sign(delta) * Math.max(0, Math.abs(delta) - 0.018);
        const movement = outside * (1 - Math.exp(-dt / 0.9));
        return [
          key,
          position[key] + Math.max(-0.025 * dt, Math.min(0.025 * dt, movement)),
        ];
      }),
    );
  for (let i = first + 1; i <= index; i++)
    current = advance(
      current,
      centre(entries[i]),
      entries[i].start - entries[i - 1].start,
    );
  const next = entries[index + 1];
  if (
    next?.kind === "speaker" &&
    !next.cut &&
    Math.abs(entries[index].end - next.start) < 0.001
  ) {
    const target = advance(
      current,
      centre(next),
      next.start - entries[index].start,
    );
    const t = clamp(
      (time - entries[index].start) / (next.start - entries[index].start),
    );
    current = {
      x: current.x + (target.x - current.x) * t,
      y: current.y + (target.y - current.y) * t,
    };
  }
  const width = 1080,
    height = 1440,
    videoHeight = height * 1.08,
    videoWidth = videoHeight * (framing.sourceAspect ?? 16 / 9);
  return {
    left: 0,
    top: 220,
    width,
    height,
    videoWidth,
    videoHeight,
    videoLeft: Math.max(
      width - videoWidth,
      Math.min(0, width / 2 - current.x * videoWidth),
    ),
    videoTop: Math.max(
      height - videoHeight,
      Math.min(0, height * 0.45 - current.y * videoHeight),
    ),
    shotStart: entries[first].start,
  };
}

export function steadyFaceRect(framing, layout, person) {
  const entries = stableLayouts(framing);
  let first = entries.findIndex((l) => l.start === layout.start);
  if (first < 0) return layout.people[person];
  while (first > 0 && !entries[first].cut) first--;
  let end = first + 1;
  while (end < entries.length && !entries[end].cut) end++;
  const heights = entries
    .slice(first, end)
    .filter((l) => l.people.length === layout.people.length)
    .map((l) => l.people[person].height)
    .sort((a, b) => a - b);
  const face = layout.people[person],
    height = heights[Math.floor(heights.length / 2)] ?? face.height;
  return { ...face, y: face.y + (face.height - height) / 2, height };
}
