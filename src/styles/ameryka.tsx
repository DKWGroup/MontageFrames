import { BISANZ, kineticCaptions, kineticOverlay, type Theme } from "./bisanz";

// Świeża Bryka Ameryka (swiezabrykaameryka.pl): silnik ruchu Bisanza, Poppins 900/600/400,
// zakreślacz na całe słowo zamiast kreski, ciemne karty ze złotą krawędzią.
// Kontrasty i zasady: klienci/swieza-bryka-ameryka/PREFERENCJE.md
const GOLD = "#B79154"; // czarny tekst na złotym 7,1:1
const BLACK = "#020203";
const BURGUNDY = "#651E1E"; // kremowy tekst na bordo 10,8:1
const CREAM = "#F6F3EE"; // tekst ze strony klienta

export const AMERYKA: Theme = {
  ...BISANZ,
  font: "Poppins, sans-serif",
  label: { font: "Poppins, sans-serif", size: 26, spacing: "0.3em" },
  text: CREAM,
  accent: GOLD,
  onAccent: BLACK,
  glow: "183,145,84",
  shade: "2,2,3",
  card: BLACK,
  cardText: CREAM,
  cardBorder: "rgba(183,145,84,0.45)",
  cardLine: "rgba(246,243,238,0.14)",
  pill: BLACK,
  pillText: CREAM,
  labelShadow: "0 2px 10px rgba(2,2,3,0.85)",
  keyWeight: 900,
  smallWeight: 600,
  titleStyle: "normal",
  ctaRadius: 18,
  keySize: 118,
  smallSize: 54,
  inlineKey: 92,
  inlineSmall: 54,
  shadow: "0 6px 22px rgba(2,2,3,0.6), 0 2px 4px rgba(2,2,3,0.7)",
  maxWidth: 0.8,
  y: 0.73,
  yRaised: 0.63,
  radius: 24,
  marker: { key: [GOLD, BLACK], hl: [BURGUNDY, CREAM] },
};

export const Ameryka = kineticCaptions(AMERYKA);
export const AmerykaOverlay = kineticOverlay(AMERYKA);
