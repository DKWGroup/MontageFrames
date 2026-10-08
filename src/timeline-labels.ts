import type { Overlay } from "./overlays";

const KINDS: Record<string, string> = {
  title: "Tytuł",
  counter: "Licznik",
  bars: "Paski",
  ring: "Pierścień",
  line: "Wykres",
  list: "Lista",
  compare: "Porównanie",
  emoji: "Emoji",
  media: "Przebitka",
  money: "Kwota",
  ticket: "Bilet",
  cta: "Wezwanie do akcji",
  travel: "Podróż",
};

export const overlayLabel = (o: Overlay) => ({
  kind: KINDS[o.type] ?? o.type,
  detail:
    o.text ??
    o.title ??
    o.label ??
    o.emoji ??
    o.src ??
    (o.to != null
      ? `${o.prefix ?? ""}${o.to}${o.suffix ?? ""}`
      : o.value != null
        ? `${o.value}%`
        : (o.country ?? "")),
});
