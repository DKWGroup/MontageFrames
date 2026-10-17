export function brandAppearance(branding) {
  const c = branding.captions;
  const color = (role, fallback) =>
    branding.palette.colors.find((x) => x.role === role)?.hex ?? fallback;
  return {
    animated: c.presetId !== "plain",
    pop: c.presetId === "pop",
    accent: color("accent", "#1D4ED8"),
    text: color("text", "#FFFFFF"),
    background: color("background", "transparent"),
    emphasis: c.emphasis,
    size: c.size,
    position: c.position,
  };
}
export function brandingRenderFiles(branding) {
  if (!branding) return [];
  const files = [branding.fonts.primary?.file, branding.fonts.emphasis?.file];
  if (branding.logo.enabled)
    files.push(
      branding.assets.find((a) => a.id === branding.logo.assetId)?.file,
    );
  return [...new Set(files.filter(Boolean))].sort();
}
const EMOJI = {
  samolot: "✈️",
  podróż: "✈️",
  wakacje: "🏖️",
  dom: "🏠",
  pieniądze: "💰",
  serce: "❤️",
  kawa: "☕",
  książka: "📖",
  telefon: "📱",
  samochód: "🚗",
};
export function brandingEmoji(word, branding) {
  return branding?.captions.emojiEnabled
    ? (EMOJI[word.toLocaleLowerCase("pl").replace(/[^\p{L}]/gu, "")] ?? null)
    : null;
}
