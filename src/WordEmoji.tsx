import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const WordEmoji: React.FC<{ emoji?: string | null; frame?: number }> = ({
  emoji,
  frame,
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!emoji) return null;
  const at = frame ?? currentFrame;
  const pop = spring({
    frame: Math.max(0, at),
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const glyphs = Array.from(emoji);
  const tilt = (glyphs[glyphs.length - 1].codePointAt(0)! % 2 ? -1 : 1) * 7;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        position: "relative",
        zIndex: 2,
        fontFamily: '"Apple Color Emoji", "Apple Emoji Local"',
        fontSize: "min(1.5em, 150px)",
        lineHeight: 1,
        marginLeft: "0.14em",
        verticalAlign: "0.02em",
        textShadow: "none",
        WebkitTextFillColor: "initial",
        WebkitTextStroke: 0,
        opacity: at < 0 ? 0 : Math.min(1, pop * 3),
        transform: `scale(${0.35 + 0.65 * pop}) rotate(${tilt + (1 - pop) * -12}deg)`,
        transformOrigin: "50% 70%",
      }}
    >
      {emoji}
    </span>
  );
};
