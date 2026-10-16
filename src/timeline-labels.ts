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
  product: "Produkt",
  process: "Proces",
  logo: "Logo",
  labs: "Badania",
  steps: "Kroki",
  mythfact: "Mit i fakt",
  quote: "Cytat",
  typography: "Typografia",
  "chapter-card": "Rozdział",
  "zoom-through": "Przejście",
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
