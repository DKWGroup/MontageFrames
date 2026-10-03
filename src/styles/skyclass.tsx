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

// SkyClass: Poppins 500/900, granatowy cień, start i odlot po skosie.
// Zwarty blok pod twarzą; kwoty i dane wyświetla osobna grafika.
const T = {
  font: "Poppins, sans-serif",
  keySize: 150, // Maksymalny rozmiar klucza na szerokości 1080 px
  smallSize: 60, // max px małych słów (stack)
  inlineKey: 110, // klucz w układzie inline
  inlineSmall: 62, // małe słowa w układzie inline
  keyWeight: 900,
  smallWeight: 500,
  keyUpper: false,
  keyColor: "#FFFFFF",
  smallColor: "#F7FAFC",
  accent: "#FF395C", // Akcent klienta SkyClass
  shadow: "0 8px 24px rgba(12,58,96,0.9), 0 3px 5px rgba(12,58,96,0.95)",
  maxWidth: 0.76, // szerokość bloku względem kadru (820 px w 1080 px — safe zone)
  lineChars: 16, // powyżej tylu liter małe słowa idą w 2 równe linie
  y: 0.73, // środek bloku względem wysokości kadru (nad UI Instagrama, pod twarzą)
  yRaised: 0.63, // DOLNA krawędź bloku, gdy na dole jest grafika — napis stoi tuż nad nią
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

// Przyimki i spójniki są nierozdzielne z następnym słowem także podczas animacji.
const JOIN = new Set([
  "i",
  "a",
  "o",
  "u",
  "w",
  "z",
  "do",
  "na",
  "od",
  "po",
  "za",
  "ze",
  "we",
  "bez",
  "przed",
  "nad",
  "pod",
]);
const joins = (w: W) => JOIN.has(clean(w.text).toLowerCase());
const atoms = (ws: W[]): W[][] => {
  const out: W[][] = [];
  let pending: W[] = [];
  for (const w of ws) {
    pending.push(w);
    if (!joins(w)) {
      out.push(pending);
      pending = [];
    }
  }
  if (pending.length) {
    if (out.length) out[out.length - 1].push(...pending);
    else out.push(pending);
  }
  return out;
};
const lines = (ws: W[]): W[][] => {
  const as = atoms(ws);
  const len = (a: W[]) => a.reduce((n, x) => n + clean(x.text).length + 1, -1);
  if (as.length < 2 || len(ws) <= T.lineChars) return ws.length ? [ws] : [];
  const candidates = as.slice(1).map((_, i) => i + 1);
  const cost = (i: number) =>
    Math.max(len(as.slice(0, i).flat()), len(as.slice(i).flat()));
  const best = candidates.reduce(
    (best, i) => (cost(i) < cost(best) ? i : best),
    1,
  );
  return [as.slice(0, best).flat(), as.slice(best).flat()];
};
const stackLines = (words: W[], k: number): Line[] => {
  if (k < 0) return lines(words).map((ws) => ({ ws, key: false }));
  const as = atoms(words);
  const a = as.findIndex((ws) => ws.includes(words[k]));
  return [
    ...lines(as.slice(0, a).flat()).map((ws) => ({ ws, key: false })),
    { ws: as[a], key: true },
    ...lines(as.slice(a + 1).flat()).map((ws) => ({ ws, key: false })),
  ];
};

export const SkyClass: React.FC<StyleProps> = ({
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
  const word = (w: W, fontSize?: number) => {
    const atom = atoms(words).find((ws) => ws.includes(w))!;
    const reveal = joins(w) ? (atom.find((x) => !joins(x))?.at ?? w.at) : w.at;
    const wf = f - Math.round(reveal * fps);
    const s = spring({
      frame: Math.max(0, wf),
      fps,
      config: w.key
        ? { damping: 11, stiffness: 200, mass: 0.6 }
        : { damping: 20, stiffness: 220 },
    });
    return (
      <span
        key={`${w.start}-${w.text}`}
        style={{
          fontSize,
          display: "inline-block",
          opacity: wf < 0 ? 0 : interpolate(wf, [0, 3], [0, 1], clamp),
          transform: w.key
            ? `scale(${interpolate(s, [0, 1], [1.2, 1])}) rotate(${interpolate(s, [0, 1], [-5, 0])}deg)`
            : `translateY(${(1 - s) * 24}px)`,
          transformOrigin: "50% 60%",
          color: w.hl
            ? T.accent
            : w.key
              ? (group.color ?? T.keyColor)
              : T.smallColor,
          fontWeight: w.key ? T.keyWeight : T.smallWeight,
          textTransform: w.key && T.keyUpper ? "uppercase" : undefined,
          background: w.key && group.effect === "stamp" ? "#FF395C" : undefined,
          borderRadius: 100,
          padding: w.key && group.effect === "stamp" ? "8px 28px" : undefined,
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
        {atoms(words).map((ws) => (
          <span
            key={ws[0].start}
            style={{
              whiteSpace: "nowrap",
              display: "inline-flex",
              gap: 18,
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
        style={{ display: "flex", flexDirection: "column", alignItems: align }}
      >
        {stackLines(words, k).map((line) => (
          <div
            key={line.ws[0].start}
            style={{
              display: "flex",
              gap: 18,
              alignItems: "baseline",
              whiteSpace: "nowrap",
              fontSize: fit(
                line.ws.map((w) => clean(w.text)).join(" "),
                line.key,
                line.key ? T.keySize : T.smallSize,
              ),
              lineHeight: line.key ? 1.12 : 1.2,
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
          top: (raised ? T.yRaised : T.y) * height,
          transform: `translate(${dx * off}px, calc(${raised ? -100 : -50}% + ${dy * off - exit * 90}px)) rotate(${(1 - enter) * 6 - exit * 6}deg)`,
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
