import { GLOWUP } from "./glowup";
import { kineticCaptions, kineticOverlay, type Theme } from "./bisanz";

// Happy News (program newsowy): silnik ruchu Bisanza, klucz Bebas Neue na zakreślaczu
// różowym, małe słowa Poppins 600.
// Zasady: klienci/happy-news/PREFERENCJE.md
const PINK = "#FF3D8B"; // biel na różu tylko duży tekst (Bebas 150 px)

const INK = "#0B0B0F";
const WHITE = "#FFFFFF";

export const HAPPYNEWS: Theme = {
  ...GLOWUP,
  instantTitle: true,
  y: 0.755,
  yRaised: 0.535,
  accent: PINK,
  onAccent: WHITE,
  glow: "255,61,139",
  shade: "11,11,15",
  card: INK,
  pill: INK,
  marker: {
    key: [PINK, WHITE],
    hl: [PINK, WHITE],
    hlWeight: 600,
    hlPop: true,
  },
  // Róż dominuje; zieleń pozostaje wyłącznie do jawnie dobranych grafik.
};

export const HappyNews = kineticCaptions(HAPPYNEWS);
export const HappyNewsOverlay = kineticOverlay(HAPPYNEWS);
