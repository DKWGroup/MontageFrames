export function parseWhisperProgress(line) {
  if (!/frames\/s|s\/frames/.test(line)) return null;
  const match = line.match(/\b(\d+)\/(\d+)\s*\[/);
  if (!match) return null;
  const completedUnits = Number(match[1]),
    totalUnits = Number(match[2]);
  if (
    !Number.isSafeInteger(completedUnits) ||
    !Number.isSafeInteger(totalUnits) ||
    totalUnits <= 0 ||
    completedUnits > totalUnits
  )
    return null;
  const remaining = line.match(/<((?:\d+:)?\d{2}:\d{2}),/);
  const etaSeconds = remaining
    ? remaining[1].split(":").reduce((n, part) => n * 60 + Number(part), 0)
    : null;
  return {
    progress: Math.min(0.99, completedUnits / totalUnits),
    completedUnits,
    totalUnits,
    progressUnit: "audioFrames",
    etaSeconds,
  };
}
