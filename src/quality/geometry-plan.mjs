export function geometryInventory(data, clips, toOut) {
  const fps = data.fps ?? 30,
    inventory = [];
  for (const clip of clips) {
    const id = `c${clip.index}`,
      override = data.studio?.[id];
    const from = override?.from ?? clip.from;
    const durationInFrames =
      override?.durationInFrames ?? clip.durationInFrames;
    inventory.push({ id, role: "caption", from, durationInFrames });
    for (const word of clip.words) {
      const wordId = `${id}w${clip.g.words.indexOf(word)}`;
      if (
        !data.renderAssets?.decorations?.some(
          (d) => d.wordId === wordId && d.emoji,
        )
      )
        continue;
      const local = Math.max(
        0,
        Math.round((toOut(word.start, data.segments) - clip.start) * fps),
      );
      if (local < durationInFrames)
        inventory.push({
          id: wordId,
          role: "emoji",
          from: from + local,
          durationInFrames: durationInFrames - local,
        });
    }
  }
  for (const [i, o] of (data.overlays ?? []).entries()) {
    if (
      !["title", "emoji"].includes(o.type) ||
      (o.type === "emoji" && o.label === "word")
    )
      continue;
    const id = `o${i}`,
      from = Math.round(toOut(o.start, data.segments) * fps);
    const duration = Math.round(toOut(o.end, data.segments) * fps) - from;
    if (duration < 1) continue;
    const override = data.studio?.[id];
    inventory.push({
      id,
      role: o.type === "title" ? "hook" : "emoji",
      from: override?.from ?? from,
      durationInFrames: override?.durationInFrames ?? duration,
    });
  }
  return inventory;
}
