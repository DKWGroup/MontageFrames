import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import type { StyleProps } from "../Reel";
import { brandFontFamily } from "../branding/fonts";
import { balanceCaptionLines, captionUnits } from "../walczak-layout.mjs";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const WalczakCaption: React.FC<StyleProps> = ({
  branding,
  words,
  minTop,
  durationInFrames: D,
  group,
  raised,
}) => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  if (!branding?.fonts.primary) return null;
  const s = width / 1080;
  const sans = brandFontFamily(branding.fonts.primary);
  const serif = brandFontFamily(
    branding.fonts.emphasis ?? branding.fonts.primary,
  );
  const units = captionUnits(words);
  const box = width * 0.77;
  let size = Math.min(70, branding.captions.size + 4) * s;
  const measureWord = (w: (typeof words)[number]) =>
    measureText({
      text: w.text,
      fontFamily: w.key || w.hl ? serif : sans,
      fontSize: size * (w.key ? 1.38 : 1),
      fontWeight: w.key || w.hl ? 500 : 400,
      validateFontIsLoaded: false,
    }).width;
  const measureLine = (ws: typeof words) =>
    ws.reduce((n, w) => n + measureWord(w), 0) +
    Math.max(0, ws.length - 1) * size * 0.25;
  const layout = () =>
    balanceCaptionLines(units, units.map(measureLine), box, size * 0.25);
  let lines = layout();
  while (lines.some((line) => measureLine(line) > box) && size > 40 * s) {
    size *= 0.96;
    lines = layout();
  }
  const intro = (words[0]?.start ?? 3) < 3;
  // Only the compact CTA raises captions. Full-screen inserts keep the normal caption baseline.
  const bottom = height * (intro ? 0.647 : raised ? 0.673 : 0.745);
  const min = (minTop ?? 0.45) * height;
  const lineHeight = 1.5;
  while (lines.length * size * lineHeight > bottom - min && size > 40 * s)
    size *= 0.96;
  const h = lines.length * size * lineHeight;
  const center = height * (intro ? 0.595 : raised ? 0.6 : 0.685);
  const top = Math.max(min, Math.min(center - h / 2, bottom - h));
  const en = interpolate(f, [0, 12], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const ex = interpolate(f, [Math.max(0, D - 5), D], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const dir = group.from === "left" ? -1 : group.from === "right" ? 1 : 0;
  return (
    <div
      data-walczak-caption
      style={{
        position: "absolute",
        left: "7%",
        right: "14%",
        top,
        fontFamily: sans,
        fontSize: size,
        fontWeight: 400,
        color: "#FFFFFF",
        textAlign: "center",
        textShadow: "0 3px 8px #111111, 0 2px 18px #111111",
        opacity: Math.min(en, 1 - ex),
        transform: `translate(${dir * (1 - en) * 22 * s}px, ${(1 - en) * 10 * s - ex * 5 * s}px)`,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          data-walczak-line
          style={{
            height: size * lineHeight,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: size * 0.25,
            whiteSpace: "nowrap",
          }}
        >
          {captionUnits(line).map((unit) => {
            const local = f - unit[0].at * fps;
            const reveal = interpolate(local, [0, 5], [0, 1], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            return (
              <span
                key={unit[0].start}
                style={{
                  display: "inline-block",
                  opacity: reveal,
                  transform: `translateY(${(1 - reveal) * 7 * s}px)`,
                }}
              >
                {unit.map((w, j) => (
                  <span
                    key={w.start}
                    style={{
                      fontFamily: w.key || w.hl ? serif : sans,
                      fontWeight: w.key || w.hl ? 500 : 400,
                      fontSize: w.key ? "1.38em" : undefined,
                      color: w.key || w.hl ? "#ECDF8C" : "#FFFFFF",
                    }}
                  >
                    {j > 0 ? "\u00a0" : ""}
                    {w.text}
                  </span>
                ))}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
