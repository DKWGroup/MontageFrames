export function shotIntervals(cuts = [], duration) {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("Nieprawidłowy czas źródła");
  const bounds = [
    0,
    ...[
      ...new Set(
        cuts.filter((t) => Number.isFinite(t) && t > 0 && t < duration),
      ),
    ].sort((a, b) => a - b),
    duration,
  ];
  return bounds
    .slice(0, -1)
    .map((start, i) => ({ shotId: `shot-${i}`, start, end: bounds[i + 1] }));
}
