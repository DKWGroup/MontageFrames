// Bind speech units before line layout and animation so a preposition never appears alone.
export const isCaptionJoiner = (text) =>
  /^(a|i|w|z|o|u|na|do|od|po|za|ze|we|bez|dla|przez|przy|pod|nad|przed|nie|że|czy|jak|gdy|żeby|aby|oraz|lub|albo|ale|bo|więc|niż|ani|to|się|jest|są|już|tylko|też|jeszcze)$/iu.test(
    text.replace(/[^\p{L}]/gu, ""),
  );
export function captionUnits(words) {
  const units = [];
  for (let i = 0; i < words.length; i++) {
    const unit = [words[i]];
    while (isCaptionJoiner(unit.at(-1).text) && i + 1 < words.length)
      unit.push(words[++i]);
    units.push(unit);
  }
  return units;
}
export function repairCaptionGroups(groups) {
  const out = groups.map((g) => [...g]);
  for (let i = 0; i < out.length - 1; i++) {
    while (
      out[i].length &&
      isCaptionJoiner(out[i].at(-1).text) &&
      !/[.!?]$/.test(out[i].at(-1).text)
    )
      out[i + 1].unshift(out[i].pop());
  }
  const nonempty = out.filter((g) => g.length);
  for (let i = 0; i < nonempty.length; i++) {
    if (nonempty[i].length !== 1) continue;
    if (i && nonempty[i - 1].length < 6) {
      nonempty[i - 1].push(...nonempty[i]);
      nonempty.splice(i--, 1);
    } else if (i + 1 < nonempty.length && nonempty[i + 1].length < 6) {
      nonempty[i + 1].unshift(...nonempty[i]);
      nonempty.splice(i--, 1);
    } else if (i && nonempty[i - 1].length > 2) {
      const units = captionUnits(nonempty[i - 1]);
      const last = units.at(-1);
      if (nonempty[i - 1].length - last.length >= 2) {
        nonempty[i].unshift(...nonempty[i - 1].splice(-last.length));
      }
    }
  }
  const result = [];
  for (const group of nonempty) {
    if (group.length <= 6) {
      result.push(group);
      continue;
    }
    const units = captionUnits(group);
    let best = 1,
      cost = Infinity;
    for (let i = 1; i < units.length; i++) {
      const left = units.slice(0, i).flat().length,
        right = group.length - left;
      const score =
        (left < 2 || right < 2 || left > 6 || right > 6 ? 100 : 0) +
        Math.abs(left - right);
      if (score < cost) {
        best = i;
        cost = score;
      }
    }
    result.push(units.slice(0, best).flat(), units.slice(best).flat());
  }
  return result;
}
export function balanceCaptionLines(units, widths, maxWidth, gap) {
  const lineWidth = (a, b) =>
    widths.slice(a, b).reduce((s, n) => s + n, 0) +
    Math.max(0, b - a - 1) * gap;
  if (lineWidth(0, units.length) <= maxWidth || units.length < 2)
    return [units.flat()];
  let best = 1,
    score = Infinity;
  for (let i = 1; i < units.length; i++) {
    const a = lineWidth(0, i),
      b = lineWidth(i, units.length);
    const singleton =
      units.slice(0, i).flat().length === 1 ||
      units.slice(i).flat().length === 1;
    const cost =
      Math.max(0, a - maxWidth, b - maxWidth) * 100 +
      Math.abs(a - b) +
      (singleton && units.flat().length > 3 ? maxWidth : 0);
    if (cost < score) {
      best = i;
      score = cost;
    }
  }
  return [units.slice(0, best).flat(), units.slice(best).flat()];
}
export function walczakFullRuns(overlays) {
  const runs = [];
  for (const o of overlays
    .filter(
      (o) => o.side === "full" && o.type !== "logo" && o.kind !== "cut-cover",
    )
    .sort((a, b) => a.start - b.start)) {
    const last = runs.at(-1);
    if (last && o.start <= last.end + 0.65)
      last.end = Math.max(last.end, o.end);
    else runs.push({ start: o.start, end: o.end });
  }
  return runs;
}
