import {
  kineticCaptions,
  kineticOverlay,
  BISANZ,
  type OverlayProps,
  type Theme,
} from "./bisanz";
import { isVslOverlay, VslOverlay, type VslPalette } from "./vital-vsl";

// Oskar Stuglik (oskar-three.vercel.app): trener online. Silnik ruchu Bisanza z kreską pod kluczem,
// klucz Cabinet Grotesk 800, treść Satoshi 400. Krem zamiast bieli, bordo jako karta, róż jako jedyny
// akcent (kreska, `hl`, liczby), granat jako druga powierzchnia. Grafiki VSL z silnika vital-vsl.
// Zasady: klienci/oskar-stuglik/PREFERENCJE.md
const CREAM = "#EFEDE5";
const BURGUNDY = "#6D1E32";
const NAVY = "#193548";
const INK = "#24343B";
const PINK = "#EFCBD3"; // bordo na różu 7,6:1, róż na granacie 9,4:1
const CABINET = "'Cabinet Grotesk', sans-serif";
const SATOSHI = "Satoshi, sans-serif";

export const OSKAR: Theme = {
  ...BISANZ,
  marker: undefined, // kreska pod kluczem, nie zakreślacz
  font: SATOSHI,
  keyFont: CABINET,
  keySpacing: "-0.01em",
  label: { font: SATOSHI, size: 26, spacing: "0.14em" },
  text: CREAM,
  accent: PINK,
  onAccent: BURGUNDY,
  glow: "239,203,211",
  shade: "36,52,59",
  card: BURGUNDY,
  cardText: CREAM,
  cardBorder: "rgba(239,203,211,0.22)",
  cardLine: "rgba(239,237,229,0.14)",
  pill: BURGUNDY,
  pillText: CREAM,
  keyWeight: 800,
  smallWeight: 400,
  titleStyle: "normal",
  shadow: "0 6px 22px rgba(36,52,59,0.6), 0 2px 4px rgba(36,52,59,0.7)",
  radius: 24,
};

// VSL 16:9 na landing (2026-11-02): napisy na dole, jedna linia 5–7 słów, grafiki po prawej.
export const OSKAR16: Theme = {
  ...OSKAR,
  readable: true,
  keySize: 60,
  smallSize: 46,
  inlineKey: 60,
  inlineSmall: 46,
  maxWidth: 0.82,
  y: 0.88,
  yRaised: 0.88,
  travel: 40,
  shadow: "0 4px 18px rgba(36,52,59,0.8), 0 2px 4px rgba(36,52,59,0.85)",
};

export const OSKAR_VSL: VslPalette = {
  bg: BURGUNDY,
  bg2: NAVY,
  paper: CREAM,
  ink: INK,
  accent: PINK,
  muted: "#D9C3C8",
  line: "rgba(239,203,211,0.22)",
  head: CABINET,
  body: SATOSHI,
  disclaimer:
    "Efekty są indywidualne i zależą m.in. od punktu wyjścia i zaangażowania.",
  bgRgb: "109,30,50",
  accentRgb: "239,203,211",
  inkRgb: "36,52,59",
};

export const Oskar = kineticCaptions(OSKAR, OSKAR16);
const Base = kineticOverlay(OSKAR);

export const OskarOverlay: React.FC<OverlayProps> = (props) =>
  isVslOverlay(props.o.type) ? (
    <VslOverlay {...props} palette={OSKAR_VSL} />
  ) : (
    <Base {...props} />
  );
