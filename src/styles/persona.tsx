import { fitText } from "@remotion/layout-utils";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Dir, StyleProps } from "../Reel";

// Styl "persona": 2–6 słów na ekranie, słowo-klucz duże, reszta mała.
// Grupa wjeżdża z boku (sprężyna z lekkim odbiciem), dryfuje i wyjeżdża dalej w tę samą stronę.
// Słowa pojawiają się dokładnie wtedy, gdy padają; klucz robi "pop".
// Słowa zawsze zwarte i wycentrowane, nigdy rozrzucone po kadrze (PREFERENCJE.md).
// Układy (group.layout):
//   stack  — małe słowa nad i pod dużym kluczem
//   inline — słowa płyną w 1–2 liniach, klucz większy w środku zdania
// ——— Tokeny: tu stroisz wygląd ———
const T = {
  font: '"MADE Tommy Soft", Nunito, sans-serif',
  keySize: 190, // max px słowa-klucza (kadr 1080 px szerokości)
  smallSize: 64, // max px małych słów (stack)
  inlineKey: 140, // klucz w układzie inline
  inlineSmall: 74, // małe słowa w układzie inline
  keyWeight: 900,
  smallWeight: 800,
  keyUpper: true,
  keyColor: "#FFFFFF",
  smallColor: "rgba(255,255,255,0.92)",
  accent: "#FF6B1A", // słowa z group.hl — pomarańcz (frame.md)
  shadow: "0 8px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.35)",
  maxWidth: 0.76, // szerokość bloku względem kadru (820 px w 1080 px — safe zone)
  lineChars: 16, // powyżej tylu liter małe słowa idą w 2 równe linie
  y: 0.64, // środek bloku względem wysokości kadru (nad UI Instagrama, pod twarzą)
  yRaised: 0.59, // DOLNA krawędź bloku, gdy na dole jest grafika — napis stoi tuż nad nią
  travel: 160, // px przesunięcia przy wjeździe i wyjeździe
  drift: 28, // px powolnego dryfu, gdy napis stoi
  exitFrames: 6,
};

type W = StyleProps["words"][number];
type Align = "flex-start" | "center" | "flex-end";
type Line = { ws: W[]; key: boolean };

const VEC: Record<Dir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const clean = (t: string) => t.replace(/[.,;:…]+$/u, "");

// Małe słowa w 1 linii; za długie -> 2 możliwie równe linie (bez samotnego słowa w linii)
const lines = (ws: W[]): W[][] => {
  const len = (a: W[]) => a.reduce((n, x) => n + clean(x.text).length + 1, -1);
  if (ws.length < 2 || len(ws) <= T.lineChars) return ws.length ? [ws] : [];
  const cost = (i: number) => Math.max(len(ws.slice(0, i)), len(ws.slice(i)));
  let best = 1;
  for (let i = 2; i < ws.length; i++) if (cost(i) < cost(best)) best = i;
  return [ws.slice(0, best), ws.slice(best)];
};

// k < 0 = grupa bez słowa-klucza (same małe słowa, np. wstęp do liczby w grafice)
const stackLines = (words: W[], k: number): Line[] =>
  k < 0
    ? lines(words).map((ws) => ({ ws, key: false }))
    : [
        ...lines(words.slice(0, k)).map((ws) => ({ ws, key: false })),
        { ws: [words[k]], key: true },
        ...lines(words.slice(k + 1)).map((ws) => ({ ws, key: false })),
      ];

export const Persona: React.FC<StyleProps> = ({
  group,
  words,
  durationInFrames: D,
  raised,
}) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = group.layout ?? "stack";

  const k = words.findIndex((w) => w.key);
  const box = width * T.maxWidth;
  const align: Align =
    group.align === "left"
      ? "flex-start"
      : group.align === "right"
        ? "flex-end"
        : "center";
  const fit = (text: string, isKey: boolean, max: number) =>
    Math.min(
      max,
      fitText({
        text,
        withinWidth: box,
        fontFamily: T.font,
        fontWeight: isKey ? T.keyWeight : T.smallWeight,
        textTransform: isKey && T.keyUpper ? "uppercase" : "none",
        validateFontIsLoaded: false,
      }).fontSize,
    );

  // Ruch całej grupy wzdłuż kierunku wjazdu
  const [dx, dy] = VEC[group.from ?? "right"];
  const enter = spring({
    frame: f,
    fps,
    config: { damping: 14, stiffness: 170, mass: 0.7 },
  });
  const exitLen = Math.max(1, Math.min(T.exitFrames, Math.floor(D / 3)));
  const exit = interpolate(f, [D - exitLen, D], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const off =
    T.travel * (1 - enter) +
    interpolate(f, [0, D], [T.drift, -T.drift]) -
    T.travel * exit;
  const opacity = Math.min(interpolate(f, [0, 4], [0, 1], clamp), 1 - exit);
  const blur = Math.max(0, 1 - enter) * 10 + exit * 10;

  // Pojedyncze słowo: pojawia się w chwili, gdy pada; klucz robi pop z lekkim obrotem
  const word = (w: W) => {
    const wf = f - Math.round(w.at * fps);
    const s = spring({
      frame: Math.max(0, wf),
      fps,
      config: w.key
        ? { damping: 11, stiffness: 200, mass: 0.6 }
        : { damping: 20, stiffness: 220 },
    });
    return (
      <span
        key={w.start}
        style={{
          display: "inline-block",
          opacity: wf < 0 ? 0 : interpolate(wf, [0, 3], [0, 1], clamp),
          transform: w.key
            ? `scale(${interpolate(s, [0, 1], [0.6, 1])}) rotate(${interpolate(s, [0, 1], [-5, 0])}deg)`
            : `translateY(${(1 - s) * 24}px)`,
          transformOrigin: "50% 60%",
          color: w.hl
            ? T.accent
            : w.key
              ? (group.color ?? T.keyColor)
              : T.smallColor,
          fontWeight: w.key ? T.keyWeight : T.smallWeight,
          textTransform: w.key && T.keyUpper ? "uppercase" : undefined,
          letterSpacing: w.key ? "-0.01em" : undefined,
        }}
      >
        {clean(w.text)}
      </span>
    );
  };

  const body =
    layout === "inline" ? (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: align,
          alignItems: "baseline",
          columnGap: 18,
          lineHeight: 1,
        }}
      >
        {words.map((w) => (
          <span
            key={w.start}
            style={{
              fontSize: w.key
                ? fit(clean(w.text), true, T.inlineKey)
                : T.inlineSmall,
            }}
          >
            {word(w)}
          </span>
        ))}
      </div>
    ) : (
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: align }}
      >
        {stackLines(words, k).map((line) => (
          <div
            key={line.ws[0].start}
            style={{
              display: "flex",
              gap: "0.24em",
              whiteSpace: "nowrap",
              fontSize: fit(
                line.ws.map((w) => clean(w.text)).join(" "),
                line.key,
                line.key ? T.keySize : T.smallSize,
              ),
              lineHeight: line.key ? 0.92 : 1.04,
            }}
          >
            {line.ws.map(word)}
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
          top: (raised ? T.yRaised : T.y) * height,
          transform: `translate(${dx * off}px, calc(${raised ? -100 : -50}% + ${dy * off}px))`,
          opacity,
          filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
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
