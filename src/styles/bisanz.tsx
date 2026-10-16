import { WordEmoji } from "../WordEmoji";
import { titleHighlight } from "../caption-decoration.mjs";
import { fitText } from "@remotion/layout-utils";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Overlay, OverlayView } from "../overlays";
import type { Dir, StyleProps } from "../Reel";
import { tokensFor } from "../reel-timing";
import { atoms, clean, joins, stackLines } from "./skyclass";

// Silnik ruchu Bisanza z motywem: napisy kineticCaptions(T), grafiki kineticOverlay(T).
// Edytorski ruch: słowa wysuwają się spod maski, klucz WERSALIKAMI z kreską (albo zakreślaczem, gdy T.marker).
// Motywy: BISANZ (niżej) i AMERYKA (./ameryka.tsx). Pełne opisy: klienci/<klient>/PREFERENCJE.md
export type Theme = {
  instantTitle?: boolean;
  readable?: boolean; // animacje łagodniejsze o15%, wejście kończy się przed zmianą grupy
  font: string;
  label: { font: string; size: number; spacing: string }; // etykiety kart i metki
  text: string; // napisy i tytuł-hak
  accent: string; // liczby, numery, CTA, kreska pod kluczem, kropka metki
  onAccent: string; // tekst na akcencie
  glow: string; // RGB poświaty akcentu
  shade: string; // RGB cieni i przyciemnień
  card: string; // tło kart i passe-partout
  cardText: string;
  cardBorder: string;
  cardLine: string; // separatory list
  pill: string; // metka przebitki
  pillText: string;
  labelShadow?: string; // etykieta nad CTA stoi prosto na wideo
  keyFont?: string; // osobny krój słowa-klucza (GlowUp: Bebas Neue), domyślnie `font`
  keySpacing?: string; // rozstrzelenie klucza, domyślnie -0.03em
  keyCase?: "uppercase" | "none"; // Vital: klucz zapisem zdaniowym jak na stronie; domyślnie wersaliki
  markerRadius?: string; // zaokrąglenie zakreślacza, domyślnie 0.12em
  raisedScale?: number; // napis nad kartą pod twarzą: skala bloku (mniej miejsca między twarzą a kartą)
  keyWeight: number;
  smallWeight: number;
  titleStyle: "italic" | "normal";
  ctaRadius: number;
  keySize: number;
  smallSize: number;
  inlineKey: number;
  inlineSmall: number;
  shadow: string;
  maxWidth: number;
  y: number; // środek bloku napisów
  yRaised: number; // dolna krawędź bloku, gdy pod nim stoi karta
  gap: number; // odstęp napis -> karta
  travel: number;
  exitFrames: number;
  radius: number;
  // Zakreślacz na całe słowo zamiast kreski: [tło, tekst] dla klucza i dla `hl`.
  marker?: {
    key: [string, string];
    hl: [string, string];
    hlWeight?: number; // waga słowa na zakreślaczu `hl`
    hlPop?: boolean; // zakreślacz `hl` wyskakuje zamiast przejeżdżać od lewej
  };
  // Drugi kolor zakreślacza (Happy News: róż / zieleń) — grupy napisów dostają go na przemian.
  markerAlt?: { key: [string, string]; hl: [string, string] };
  // Kadr poziomy: karty w kolumnie z boku (środek x, góra, szerokość — ułamki kadru) zamiast pod napisami.
  cardColumn?: { x: number; top: number; width: number };
};

// Kacper Bisanz (bisanz.pl): Inter 700/600/400 + Menlo 400, biel i niebieski #066FED.
export const BISANZ: Theme = {
  font: "Inter, sans-serif",
  label: { font: "Menlo, ui-monospace, monospace", size: 26, spacing: "0.2em" },
  text: "#FFFFFF",
  accent: "#066FED",
  onAccent: "#FFFFFF",
  marker: { key: ["#066FED", "#FFFFFF"], hl: ["#066FED", "#FFFFFF"] },
  glow: "6,111,237",
  shade: "20,20,20",
  card: "#FFFFFF",
  cardText: "#141414", // tekst na białych kartach (jak na stronie)
  cardBorder: "#E6E6E6",
  cardLine: "#E6E6E6",
  pill: "#FFFFFF",
  pillText: "#141414",
  keyWeight: 700,
  smallWeight: 600,
  titleStyle: "italic",
  ctaRadius: 100,
  keySize: 108,
  smallSize: 55,
  inlineKey: 86,
  inlineSmall: 55,
  shadow: "0 6px 22px rgba(20,20,20,0.55), 0 2px 4px rgba(20,20,20,0.6)",
  maxWidth: 0.76,
  y: 0.7,
  yRaised: 0.63,
  gap: 32,
  travel: 70,
  exitFrames: 7,
  radius: 32,
};

// Kadr poziomy 1920×1080 (LongForm): napis nisko (0,80), klucz ≈ 5% wysokości, blok ≤ 0,6, karty w prawej kolumnie.
// ponytail: kolumna zawsze po prawej; strona przeciwna do twarzy, gdy face dostanie x.
export const BISANZ16: Theme = {
  ...BISANZ,
  readable: true,
  keySize: 58,
  smallSize: 38,
  inlineKey: 54,
  inlineSmall: 38,
  maxWidth: 0.6,
  y: 0.8,
  yRaised: 0.86,
  travel: 50,
  cardColumn: { x: 0.75, top: 0.14, width: 0.4 },
};

type W = StyleProps["words"][number];
type Align = "flex-start" | "center" | "flex-end";
const VEC: Record<Dir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const PAD = 0.2; // zakreślacz wystaje poza litery o tyle em z każdej strony

export const kineticCaptions = (base: Theme, wide?: Theme): React.FC<StyleProps> => {
  const Captions: React.FC<StyleProps> = ({
    group,
    words,
    durationInFrames: D,
    raised,
    minTop,
  }) => {
    const f = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const T = tokensFor({ T: base, T16: wide }, { width, height });
    const k = words.findIndex((w) => w.key);
    const box = width * T.maxWidth;
    const align: Align =
      group.align === "left"
        ? "flex-start"
        : group.align === "right"
          ? "flex-end"
          : "center";
    const fit = (text: string, isKey: boolean, max: number) => {
      const size = fitText({
        text,
        withinWidth: box - (words.some((w) => w.emoji) ? max * 1.7 : 0),
        fontFamily: isKey ? (T.keyFont ?? T.font) : T.font,
        fontWeight: isKey ? T.keyWeight : T.smallWeight,
        textTransform: isKey ? (T.keyCase ?? "uppercase") : "none",
        validateFontIsLoaded: false,
      }).fontSize;
      // zakreślacz dokłada PAD em z obu stron słowa — blok nadal mieści się w szerokości
      return Math.min(
        max,
        T.marker ? size / (1 + (2 * PAD * size) / box) : size,
      );
    };

    const [dx, dy] = VEC[group.from ?? "right"];
    const enter = spring({
      frame: T.readable ? f * 1.15 : f,
      fps,
      config: { damping: 20, stiffness: 160 },
    });
    const exitLen = Math.max(
      1,
      Math.min(T.readable ? 2 : T.exitFrames, Math.floor(D / 3)),
    );
    const exit = interpolate(f, [D - exitLen, D], [0, 1], {
      ...clamp,
      easing: Easing.in(Easing.cubic),
    });
    const off = (T.readable ? T.travel * 0.85 : T.travel) * (1 - enter);
    const opacity = Math.min(interpolate(f, [0, 3], [0, 1], clamp), 1 - exit);

    // Słowo wysuwa się spod maski w chwili, gdy pada; krótkie spójniki razem z następnym słowem.
    const word = (w: W, fontSize?: number) => {
      const atom = atoms(words).find((ws) => ws.includes(w))!;
      const reveal = joins(w)
        ? (atom.find((x) => !joins(x))?.at ?? w.at)
        : w.at;
      const index = words.indexOf(w);
      const lead = T.readable
        ? Math.max(0, reveal - 0.25, words[Math.max(0, index - 1)].at)
        : reveal;
      const revealFrame = Math.min(
        Math.round(lead * fps),
        T.readable ? Math.max(0, D - 8) : Infinity,
      );
      const wf = f - revealFrame;
      const budget = Math.max(1, Math.min(14, D - revealFrame - 6));
      const complete = T.readable
        ? interpolate(wf, [0, budget], [0, 1], clamp)
        : 0;
      const mo = group.motion ?? "rise";
      const s =
        wf < 0
          ? 0
          : Math.max(
              complete,
              spring({
                frame: T.readable ? wf * 1.15 : wf,
                fps,
                // bounce: mało tłumienia = odbicie; pop: lekki overshoot
                config: {
                  damping: mo === "bounce" ? 7 : mo === "pop" ? 11 : 18,
                  stiffness: mo === "bounce" ? 170 : 210,
                },
              }),
            );
      const pill = w.key && group.effect === "stamp";
      const text = clean(w.text);
      // litera po literze: każda wysuwa się spod maski z małym opóźnieniem
      const STEP = T.readable
        ? Math.min(1.02, budget / Math.max(1, text.length * 2))
        : 1.2;
      const letters =
        mo === "letters"
          ? [...text].map((c, i) => {
              const lf = wf - i * STEP;
              const ls =
                lf < 0
                  ? 0
                  : Math.max(
                      T.readable
                        ? interpolate(
                            lf,
                            [0, Math.max(1, budget - i * STEP)],
                            [0, 1],
                            clamp,
                          )
                        : 0,
                      spring({
                        frame: T.readable ? lf * 1.15 : lf,
                        fps,
                        config: { damping: 18, stiffness: 230 },
                      }),
                    );
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    transform: `translateY(${(1 - ls) * 110}%)`,
                  }}
                >
                  {c}
                </span>
              );
            })
          : text;
      // kreska pod kluczem / zakreślacz rysuje się od lewej chwilę po wejściu słowa
      const draw = () =>
        spring({
          frame: Math.max(
            0,
            wf - 4 - (mo === "letters" ? text.length * STEP : 0),
          ),
          fps,
          config: { damping: 20, stiffness: 140 },
        });
      const masked = mo === "rise" || mo === "drop" || mo === "letters";
      const fill = T.readable
        ? Math.max(complete, interpolate(wf, [5, 14], [0, 1], clamp))
        : interpolate(wf, [6, 16], [0, 1], clamp);
      const outer: React.CSSProperties = {
        display: "inline-block",
        fontSize,
        // przed wejściem słowo całkiem ukryte (inaczej czubki wersalików wystają spod maski)
        opacity: wf < 0 ? 0 : masked ? 1 : Math.min(1, s * 1.6),
        // maska tylko od strony wjazdu i tylko w trakcie — cień i ogonki liter zostają
        clipPath:
          masked && s < 0.99
            ? mo === "drop"
              ? "inset(0 -20% -60% -20%)"
              : "inset(-60% -20% 0 -20%)"
            : mo === "color" && s < 0.99
              ? `inset(-60% ${(1 - s) * 100}% -60% -20%)` // kontur odsłania się od lewej
              : undefined,
        filter:
          mo === "slide" && s < 0.99
            ? `blur(${(1 - s) * (T.readable ? 8.5 : 10)}px)`
            : undefined,
      };
      const lift =
        mo === "drop"
          ? `translateY(${-(1 - s) * (T.readable ? 94 : 110)}%)`
          : mo === "slide"
            ? `translate(${dx * (1 - s) * (T.readable ? 1.19 : 1.4)}em, ${dy * (1 - s) * (T.readable ? 1.19 : 1.4)}em)`
            : mo === "pop"
              ? `scale(${(T.readable ? 0.405 : 0.3) + (T.readable ? 0.595 : 0.7) * s})`
              : mo === "bounce"
                ? `translateY(${-(1 - s) * 0.9}em)`
                : mo === "wiggle"
                  ? `rotate(${Math.sin(wf * 0.8) * 14 * Math.exp(-Math.max(0, wf) / 7)}deg) scale(${0.85 + 0.15 * s})`
                  : mo === "color"
                    ? "none"
                    : mo === "letters"
                      ? "none"
                      : `translateY(${(1 - s) * (T.readable ? 94 : 110)}%)`;
      const type: React.CSSProperties = {
        fontFamily: w.key ? T.keyFont : undefined,
        fontWeight: w.key ? T.keyWeight : T.smallWeight,
        textTransform: w.key ? (T.keyCase ?? "uppercase") : undefined,
        letterSpacing: w.key ? (T.keySpacing ?? "-0.03em") : "-0.01em",
        // color in: najpierw sam kontur, potem litery zalewają się kolorem
        ...(mo === "color" && fill < 1
          ? {
              WebkitTextFillColor: `color-mix(in srgb, currentColor ${fill * 100}%, transparent)`,
              WebkitTextStroke: "0.035em currentColor",
              textShadow: fill < 0.6 ? "none" : undefined,
            }
          : {}),
      };

      // Zakreślacz: dolna warstwa to jasne słowo z cieniem, górna to blok z ciemnym słowem,
      // odsłaniany od lewej. Litery leżą zawsze albo na bloku, albo na wideo — kontrast w każdej klatce.
      if (T.marker) {
        // ponytail: kolor z czasu startu grupy (deterministycznie), nie ścisła naprzemienność — Reel nie podaje indeksu grupy
        const mk =
          T.markerAlt && Math.round(group.words[0].start * 10) % 2
            ? { ...T.marker, ...T.markerAlt }
            : T.marker;
        const m = w.key ? mk.key : w.hl ? mk.hl : null;
        const popHl = !!(w.hl && !w.key && !pill && T.marker.hlPop);
        // pop out: blok rośnie sprężyście z przestrzeleniem i prostuje się z przechyłu
        const p = popHl
          ? spring({
              frame: Math.max(0, wf - 3),
              fps,
              config: { damping: 9, stiffness: 220 },
            })
          : 0;
        const sweep = !m ? 0 : pill ? 1 : popHl ? (wf >= 3 ? 1 : 0) : draw();
        return (
          <span key={`${w.start}-${w.text}`} style={outer}>
            <span
              style={{
                display: "inline-block",
                position: "relative",
                // pieczątka: blok od razu pełny, wskakuje z przechyłem
                transform: pill
                  ? `${lift} rotate(-3deg) scale(${1 + 0.25 * (1 - s)})`
                  : lift,
                color: T.text,
                ...type,
                ...(w.hl && !w.key && T.marker.hlWeight
                  ? { fontWeight: T.marker.hlWeight }
                  : {}),
                padding: m ? `0 ${PAD}em` : undefined,
              }}
            >
              {letters}
              {m && sweep > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: `0 ${PAD}em`,
                    borderRadius: T.markerRadius ?? "0.12em",
                    background: m[0],
                    color: m[1],
                    textShadow: "none",
                    // blok zakreślacza zawsze pełny, bez konturu z wejścia color in
                    WebkitTextFillColor: m[1],
                    WebkitTextStroke: "0",
                    clipPath: popHl
                      ? undefined
                      : `inset(0 ${(1 - sweep) * 100}% 0 0)`,
                    transform: popHl
                      ? `scale(${0.35 + 0.65 * p}) rotate(${(1 - p) * -7}deg)`
                      : undefined,
                    opacity: popHl ? Math.min(1, p * 2.5) : undefined,
                  }}
                >
                  {clean(w.text)}
                </span>
              )}
            </span>
            <WordEmoji emoji={w.emoji} frame={wf} />
          </span>
        );
      }

      const bar = w.key && !pill ? draw() : 0;
      return (
        <span key={`${w.start}-${w.text}`} style={outer}>
          <span
            style={{
              display: "inline-block",
              position: "relative",
              transform: lift,
              color: pill
                ? T.onAccent
                : w.hl
                  ? T.accent
                  : w.key
                    ? (group.color ?? T.text)
                    : T.text,
              ...type,
              background: pill ? T.accent : undefined,
              borderRadius: pill ? 22 : undefined,
              padding: pill ? "0.04em 0.28em" : undefined,
              textShadow: pill ? "none" : undefined,
            }}
          >
            {letters}
            {bar > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: "-0.04em",
                  height: "0.08em",
                  borderRadius: 6,
                  background: T.accent,
                  transform: `scaleX(${bar})`,
                  transformOrigin: "left",
                }}
              />
            )}
          </span>
          <WordEmoji emoji={w.emoji} frame={wf} />
        </span>
      );
    };

    const body =
      (group.layout ?? "stack") === "inline" ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: align,
            alignItems: "baseline",
            columnGap: 16,
            lineHeight: 1.1,
          }}
        >
          {atoms(words).map((ws) => (
            <span
              key={ws[0].start}
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                gap: 16,
                alignItems: "baseline",
              }}
            >
              {ws.map((w) =>
                word(
                  w,
                  w.key
                    ? fit(
                        ws.map((x) => clean(x.text)).join(" "),
                        true,
                        T.inlineKey,
                      )
                    : T.inlineSmall,
                ),
              )}
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: align,
          }}
        >
          {stackLines(words, k).map((line) => (
            <div
              key={line.ws[0].start}
              style={{
                display: "flex",
                gap: 16,
                alignItems: "baseline",
                whiteSpace: "nowrap",
                fontSize: fit(
                  line.ws.map((w) => clean(w.text)).join(" "),
                  line.key,
                  line.key ? T.keySize : T.smallSize,
                ),
                lineHeight: line.key ? 1.08 : 1.2,
              }}
            >
              {line.ws.map((w) =>
                word(w, line.key && !w.key ? T.smallSize : undefined),
              )}
            </div>
          ))}
        </div>
      );

    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: (width - box) / 2,
            width: box,
            // nad kartą: pod twarzą (minTop) zaczyna się blok; bez danych o twarzy dolna krawędź na yRaised
            top: (group.y ?? (raised ? (minTop ?? T.yRaised) : T.y)) * height,
            transform: `translate(${dx * off}px, calc(${raised && group.y == null && minTop == null ? -100 : raised && group.y == null ? 0 : -50}% + ${dy * off - exit * 50}px))${raised && minTop != null && group.y == null ? ` scale(${T.raisedScale ?? 1})` : ""}`,
            transformOrigin: "top center",
            opacity,
            filter: exit > 0.05 ? `blur(${exit * 8}px)` : undefined,
            display: "flex",
            flexDirection: "column",
            alignItems: align,
            fontFamily: T.font,
            textShadow: T.shadow,
          }}
        >
          {body}
        </div>
      </AbsoluteFill>
    );
  };
  return Captions;
};

// ——— Grafiki ———
// Karty pod napisami, etykiety „boardingowe” („/01”, „GATE”), liczby w akcencie.
// Typy spoza tej listy spadają na wspólne OverlayView.
export type OverlayProps = {
  o: Overlay;
  dur: number;
  src: (file: string) => string;
  at: (t: number) => number;
};
const fmt = (v: number, d = 0) =>
  new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(v);
const isVideo = (file: string) => /\.(mp4|mov|webm|m4v)$/i.test(file);

export const kineticOverlay = (base: Theme, wide?: Theme): React.FC<OverlayProps> => {
  const Tag: React.FC<{
    children: React.ReactNode;
    color?: string;
    shadow?: string;
  }> = ({ children, color = base.accent, shadow }) => (
    <div
      style={{
        fontFamily: base.label.font,
        fontWeight: 400,
        fontSize: base.label.size,
        letterSpacing: base.label.spacing,
        textTransform: "uppercase",
        color,
        textShadow: shadow,
      }}
    >
      {children}
    </div>
  );

  const KineticOverlay: React.FC<OverlayProps> = (props) => {
    const { o, dur, src, at } = props;
    const f = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const T = tokensFor({ T: base, T16: wide }, { width, height });
    const col = T.cardColumn;
    const cardTop = col ? col.top * height : height * T.yRaised + T.gap;
    const enter = spring({
      frame: f,
      fps,
      config: { damping: 18, stiffness: 150, mass: 0.8 },
    });
    const exit = interpolate(f, [dur - 9, dur], [0, 1], {
      ...clamp,
      easing: Easing.in(Easing.cubic),
    });
    const opacity = Math.min(enter, 1 - exit);

    // Przebitka: pełny kadr, powolny najazd, opcjonalna metka (np. „BALI · INDONEZJA”).
    if (o.type === "media" && o.fit !== "card" && o.src) {
      const fade = Math.min(
        interpolate(f, [0, 8], [0, 1], clamp),
        interpolate(f, [dur - 8, dur], [1, 0], clamp),
      );
      const media: React.CSSProperties = {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${interpolate(f, [0, dur], [1.08, 1])})`,
      };
      return (
        <AbsoluteFill style={{ opacity: fade }}>
          {isVideo(o.src) ? (
            <OffthreadVideo
              src={src(o.src)}
              trimBefore={Math.round((o.trim ?? 0) * fps)}
              toneMapped={false}
              volume={o.volume ?? 0}
              style={media}
            />
          ) : (
            <Img src={src(o.src)} style={media} />
          )}
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, rgba(${T.shade},0.3) 0%, transparent 22%, transparent 52%, rgba(${T.shade},0.55) 100%)`,
            }}
          />
          {o.text && (
            <div
              style={{
                position: "absolute",
                left: 90,
                top: height * 0.15,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 28px",
                borderRadius: 100,
                background: T.pill,
                color: T.pillText,
                boxShadow: `0 12px 30px rgba(${T.shade},0.3)`,
                transform: `translateX(${(1 - enter) * -60}px)`,
                opacity: enter,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: T.accent,
                }}
              />
              <Tag color={T.pillText}>{o.text}</Tag>
            </div>
          )}
        </AbsoluteFill>
      );
    }

    // Zdjęcie pod napisami (media `card`): passe-partout, lekki skos, pop; `text` = metka.
    if (o.type === "media" && o.fit === "card" && o.src) {
      const h = o.size ?? 300;
      const tilt = (o.x ?? 0.5) < 0.5 ? -2.5 : 2.5;
      return (
        <div
          style={{
            position: "absolute",
            left: (o.x ?? col?.x ?? 0.5) * width,
            top: o.y != null ? o.y * height : cardTop,
            transform: `translate(-50%, ${o.y != null ? -50 : 0}%) translateY(${(1 - enter) * 90 + exit * 40}px) rotate(${tilt * enter}deg) scale(${0.85 + 0.15 * enter})`,
            opacity,
            background: T.card,
            padding: 12,
            borderRadius: 22,
            boxShadow: `0 24px 60px rgba(${T.shade},0.35)`,
          }}
        >
          {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
          <Img
            src={src(o.src)}
            style={{
              display: "block",
              height: h,
              width: o.aspect ? h / o.aspect : undefined,
              objectFit: "cover",
              borderRadius: 12,
            }}
          />
          {o.text && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: -26,
                transform: `translateX(-50%) rotate(${-tilt}deg)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 22px",
                borderRadius: 100,
                background: T.accent,
                whiteSpace: "nowrap",
                boxShadow: `0 10px 24px rgba(${T.glow},0.4)`,
              }}
            >
              <Tag color={T.onAccent}>{o.text}</Tag>
            </div>
          )}
        </div>
      );
    }

    // Tytuł-hak: WERSALIKI, fragment `hl` w akcencie albo na zakreślaczu (jak „MARZ. PLANUJ. DZIAŁAJ.”).
    if (o.type === "title" && o.text) {
      const highlight = titleHighlight(o.text, o.hl);
      const [before, ...rest] = highlight ? o.text.split(highlight) : [o.text];
      const hl: React.CSSProperties = T.marker
        ? {
            background: T.marker.key[0],
            color: T.marker.key[1],
            textShadow: "none",
            // inline-block: blok ma wysokość linii i nie nachodzi na wiersz wyżej
            display: "inline-block",
            padding: "0 0.12em",
            borderRadius: T.instantTitle ? 0 : "0.08em",
          }
        : { color: T.accent };
      return (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: (o.y ?? (T.instantTitle ? 0.7 : 0.17)) * height,
            width: width * 0.86,
            transform: `translate(-50%, calc(-50% + ${(T.instantTitle ? exit : 1 - enter) * 60}px))`,
            opacity: T.instantTitle ? 1 - exit : opacity,
            boxSizing: "border-box",
            textAlign: "center",
            fontFamily: T.font,
            fontWeight: T.instantTitle ? 800 : T.keyWeight,
            fontStyle: T.titleStyle,
            textTransform: "uppercase",
            fontSize: o.size ?? 110,
            lineHeight: T.instantTitle ? 1.22 : 1,
            letterSpacing: "-0.03em",
            color: T.text,
            textShadow: T.shadow,
          }}
        >
          <span style={T.instantTitle ? {
            background: "rgba(11,11,15,.96)", padding: "2px 7px",
            boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
          } : undefined}>
            {before}
            {highlight && <span style={hl}>{highlight}</span>}
            {rest.join(highlight ?? "")}
          </span>
        </div>
      );
    }

    // Karty pod napisami: zaokrąglone, z cienką krawędzią jak na stronie klienta.
    const cardWidth = width * (col?.width ?? 0.8);
    const card = (children: React.ReactNode) => (
      <div
        style={{
          position: "absolute",
          left: col ? col.x * width : "50%",
          top: o.y != null ? o.y * height : cardTop,
          width: cardWidth,
          transform: `translate(-50%, ${o.y != null ? -50 : 0}%) translateY(${(1 - enter) * 80 + exit * 40}px) scale(${0.94 + 0.06 * enter})`,
          opacity,
          background: T.card,
          border: `2px solid ${T.cardBorder}`,
          borderRadius: T.radius,
          boxShadow: `0 24px 60px rgba(${T.shade},0.28)`,
          padding: "40px 48px",
          boxSizing: "border-box",
          fontFamily: T.font,
          color: T.cardText,
        }}
      >
        {children}
      </div>
    );

    // Licznik jak sekcja „Liczby mówią same za siebie”: „/01”, duża liczba w akcencie, etykieta wersalikami.
    if (o.type === "counter") {
      const to = o.to ?? 0;
      const v = interpolate(f / fps, [0.15, 1.3], [o.from ?? 0, to], {
        ...clamp,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });
      const final = `${o.prefix ?? ""}${fmt(to, o.decimals)}${o.suffix ?? ""}`;
      const size = Math.min(
        150,
        fitText({
          text: final,
          withinWidth: cardWidth - 110,
          fontFamily: T.font,
          fontWeight: T.keyWeight,
          validateFontIsLoaded: false,
        }).fontSize,
      );
      return card(
        <>
          {o.title && <Tag>{o.title}</Tag>}
          <div
            style={{
              fontWeight: T.keyWeight,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: T.accent,
              fontVariantNumeric: "tabular-nums",
              marginTop: o.title ? 14 : 0,
            }}
          >
            {o.prefix}
            {fmt(v, o.decimals)}
            {o.suffix}
          </div>
          {o.label && (
            <div
              style={{
                fontWeight: 600,
                fontSize: 34,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginTop: 16,
              }}
            >
              {o.label}
            </div>
          )}
        </>,
      );
    }

    // Lista jak manifest „01 Biznes / 02 Content…”: numery w akcencie, punkty wchodzą, gdy padają (`at`).
    if (o.type === "list") {
      const items = o.items ?? [];
      return card(
        <>
          {o.title && <Tag>{o.title}</Tag>}
          {items.map((it, i) => {
            const text = typeof it === "string" ? it : it.text;
            const t0 =
              typeof it !== "string" && it.at != null
                ? at(it.at)
                : 0.3 + i * 0.4;
            const s = spring({
              frame: f - Math.round(t0 * fps),
              fps,
              config: { damping: 16, stiffness: 180 },
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 28,
                  padding: "18px 0",
                  borderTop: i ? `2px solid ${T.cardLine}` : undefined,
                  opacity: s,
                  transform: `translateX(${(1 - s) * 40}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: T.label.font,
                    fontSize: 30,
                    color: T.accent,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontWeight: T.smallWeight,
                    fontSize: 46,
                    lineHeight: 1.15,
                  }}
                >
                  {text}
                </span>
              </div>
            );
          })}
        </>,
      );
    }

    // CTA: etykieta + przycisk w akcencie (jak „Dołącz do SkyClass”, „Porozmawiajmy”).
    if (o.type === "cta" && o.text) {
      const pulse =
        1 + 0.05 * Math.sin(Math.min(1, Math.max(0, (f - 12) / 10)) * Math.PI);
      return (
        <div
          style={{
            position: "absolute",
            left: col ? col.x * width : "50%",
            top: o.y != null ? o.y * height : cardTop,
            transform: `translate(-50%, ${o.y != null ? -50 : 0}%) translateY(${(1 - enter) * 60}px) scale(${pulse})`,
            opacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            fontFamily: T.font,
          }}
        >
          {o.label && (
            <Tag color={T.text} shadow={T.labelShadow}>
              {o.label}
            </Tag>
          )}
          <div
            style={{
              background: T.accent,
              color: T.onAccent,
              fontWeight: T.keyWeight,
              fontSize: 56,
              padding: "26px 56px",
              borderRadius: T.ctaRadius,
              whiteSpace: "nowrap",
              boxShadow: `0 18px 44px rgba(${T.glow},0.45)`,
            }}
          >
            {o.text}
          </div>
        </div>
      );
    }

    return <OverlayView {...props} />;
  };
  return KineticOverlay;
};

export const Bisanz = kineticCaptions({ ...BISANZ, readable: true }, BISANZ16);
export const BisanzOverlay = kineticOverlay(BISANZ, BISANZ16);
