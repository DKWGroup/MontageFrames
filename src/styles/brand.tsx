import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { StyleProps } from "../Reel";
import { brandAppearance, brandingEmoji } from "../branding/appearance.mjs";
import { brandFontFamily } from "../branding/fonts";
import { WordEmoji } from "../WordEmoji";
import { measureText } from "@remotion/layout-utils";

export const Brand: React.FC<StyleProps> = ({
  branding,
  words,
  raised,
  minTop,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!branding) return null;
  const a = brandAppearance(branding),
    scale = width / 1080;
  const entrance = a.animated
    ? interpolate(frame, [0, 8], [18, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 0;
  const primary = branding.fonts.primary;
  const boxWidth = width * 0.79 - 24 * scale;
  let fontSize = a.size * scale;
  const dimensions = () => {
    let lines = 1,
      lineWidth = 0;
    for (const word of words) {
      const font =
        word.key || word.hl ? (branding.fonts.emphasis ?? primary) : primary;
      const wordWidth =
        measureText({
          text: word.text,
          fontFamily: font ? brandFontFamily(font) : "sans-serif",
          fontSize,
          fontWeight: font?.weight.split(" ")[0] ?? "700",
          validateFontIsLoaded: false,
        }).width + (brandingEmoji(word.text, branding) ? fontSize * 1.7 : 0);
      if (lineWidth && lineWidth + 15 * scale + wordWidth > boxWidth) {
        lines++;
        lineWidth = 0;
      }
      lineWidth += (lineWidth ? 15 * scale : 0) + wordWidth;
      if (wordWidth > boxWidth) lines += Math.ceil(wordWidth / boxWidth) - 1;
    }
    return lines;
  };
  let lineCount = dimensions();
  while (lineCount > 2 && fontSize > 18 * scale) {
    fontSize *= 0.92;
    lineCount = dimensions();
  }
  const blockHeight =
    lineCount * fontSize * 1.2 +
    (lineCount - 1) * 8 * scale +
    24 * scale +
    12 * scale;
  const bottom = height * (raised ? 0.6 : 0.78);
  const top = Math.min(
    Math.max(
      (minTop ?? 0.15) * height,
      (raised ? Math.min(a.position, 0.5) : a.position) * height,
    ),
    bottom - blockHeight,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "13%",
        top,
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: `${8 * scale}px ${15 * scale}px`,
        transform: `translateY(${entrance * scale}px)`,
        fontFamily: primary ? brandFontFamily(primary) : "sans-serif",
        fontSize,
        fontWeight: primary?.weight.split(" ")[0] ?? "700",
        lineHeight: 1.2,
        textAlign: "center",
        color: a.text,
        textShadow: "0 2px 8px rgba(0,0,0,.8)",
        background: a.background,
        padding: 12 * scale,
        borderRadius: 8 * scale,
      }}
    >
      {words.map((word, i) => {
        const local = frame - word.at * fps;
        const highlight = word.key || word.hl;
        const font = highlight ? (branding.fonts.emphasis ?? primary) : primary;
        const visible = !a.animated || local >= 0;
        const pop =
          a.pop && visible
            ? spring({
                frame: Math.max(0, local),
                fps,
                config: { damping: 16, stiffness: 220 },
              })
            : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: visible ? 1 : 0,
              transform: `scale(${a.pop ? 0.8 + 0.2 * pop : 1})`,
              fontFamily: font ? brandFontFamily(font) : undefined,
              fontWeight: font?.weight.split(" ")[0],
              color: highlight && a.emphasis === "color" ? a.accent : a.text,
              textDecoration:
                highlight && a.emphasis === "underline"
                  ? "underline"
                  : undefined,
              textDecorationColor: a.accent,
              textDecorationThickness: 4 * scale,
              textUnderlineOffset: 8 * scale,
              overflowWrap: "anywhere",
              maxWidth: "100%",
            }}
          >
            {word.text}
            <WordEmoji
              emoji={visible ? brandingEmoji(word.text, branding) : null}
              frame={local}
            />
          </span>
        );
      })}
    </div>
  );
};
