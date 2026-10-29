import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Overlay } from "./overlays";
import type { BrandingSnapshot } from "./branding/types";
import { brandFontFamily } from "./branding/fonts";
import { fitText } from "@remotion/layout-utils";

const K = {
  ink: "#111111",
  white: "#FFFFFF",
  gold: "#ECDF8C",
  navy: "#282E3F",
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const num = (n: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(n);
type Props = {
  o: Overlay;
  dur: number;
  src: (file: string) => string;
  at: (t: number) => number;
  branding: BrandingSnapshot;
  holdExit?: boolean;
};

const paths: Record<string, string> = {
  shield:
    "M50 8 84 22v25c0 23-16 38-34 47C32 85 16 70 16 47V22Z M34 49l11 12 23-28",
  home: "M9 47 50 12 91 47 M21 42v46h58V42 M41 88V62h18v26",
  book: "M50 24C35 11 16 15 9 19v65c12-6 27-4 41 6 14-10 29-12 41-6V19c-7-4-26-8-41 5v66",
  coins:
    "M17 64c0-7 15-12 33-12s33 5 33 12-15 12-33 12-33-5-33-12Z M17 64v15c0 8 15 13 33 13s33-5 33-13V64 M17 79V49c0-7 15-12 33-12s33 5 33 12v15 M28 38V23c0-7 14-12 31-12s31 5 31 12-14 12-31 12-31-5-31-12 M90 23v17",
  family:
    "M50 43a12 12 0 1 0 0-24 12 12 0 0 0 0 24 M50 51c-15 0-22 13-22 31h44c0-18-7-31-22-31 M18 51a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M82 51a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M7 82c0-14 3-23 15-23 M93 82c0-14-3-23-15-23",
  work: "M12 33h76v53H12Z M35 33V18h30v15 M12 51c24 16 52 16 76 0 M45 51h10v18H45Z",
  document: "M24 9h36l19 20v62H24Z M59 9v22h20 M36 46h30 M36 59h30 M36 72h17",
  calendar:
    "M17 23h66v65H17Z M17 40h66 M34 12v22 M66 12v22 M32 55h10 M57 55h10 M32 72h10 M57 72h10",
};
const Icon: React.FC<{ kind?: string; size?: number; progress?: number }> = ({
  kind = "shield",
  size = 82,
  progress = 1,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke={K.gold}
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d={paths[kind] ?? paths.shield}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  </svg>
);

export const WalczakBackdrop: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const opacity = Math.min(
    interpolate(f, [0, 10], [0, 1], clamp),
    interpolate(f, [dur - 8, dur - 1], [1, 0], clamp),
  );
  return <AbsoluteFill style={{ background: K.ink, opacity }} />;
};

export const WalczakOverlay: React.FC<Props> = ({
  o,
  dur,
  src,
  at,
  branding,
  holdExit = false,
}) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = width / 1080;
  const t = f / fps;
  const enter = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: ease });
  const exit = holdExit
    ? 0
    : interpolate(f, [dur - 8, dur - 1], [0, 1], {
        ...clamp,
        easing: Easing.in(Easing.cubic),
      });
  const alpha = Math.min(enter, 1 - exit);
  const sans = branding.fonts.primary
    ? brandFontFamily(branding.fonts.primary)
    : "sans-serif";
  const serif = branding.fonts.emphasis
    ? brandFontFamily(branding.fonts.emphasis)
    : sans;
  const full = o.side === "full";
  const textStyle: React.CSSProperties = { fontFamily: sans, color: K.white };
  const footer = (o.source || o.credit) && (
    <div
      style={{
        fontSize: (full ? 31 : 25) * s,
        lineHeight: 1.35,
        color: K.white,
        opacity: 0.8,
        marginTop: 14 * s,
      }}
    >
      {o.source ?? o.credit}
    </div>
  );

  if (o.type === "scrim" && o.kind === "cut-cover") {
    // Source-time center is mapped to the edited timeline, so a removed pause never shifts the cover off its cut.
    const center = at(o.resultAt ?? (o.start + o.end) / 2) * fps;
    const cover =
      f <= center
        ? interpolate(f, [0, Math.max(1, center - 1)], [0, 1], {
            ...clamp,
            easing: Easing.inOut(Easing.cubic),
          })
        : interpolate(f, [center + 1, dur - 1], [1, 0], {
            ...clamp,
            easing: Easing.inOut(Easing.cubic),
          });
    const variant = (o.n ?? 0) % 3;
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {variant === 1 ? (
          <AbsoluteFill
            style={{
              background: K.navy,
              clipPath: `circle(${cover * 112}% at ${o.flip ? 25 : 75}% 45%)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 30 * s,
                border: `${2 * s}px solid ${K.gold}`,
                borderRadius: 20 * s,
                opacity: 0.7,
              }}
            />
          </AbsoluteFill>
        ) : (
          <AbsoluteFill
            style={{
              transform: `translateX(${f <= center ? (1 - cover) * (o.flip ? -110 : 110) : (1 - cover) * (o.flip ? 110 : -110)}%)`,
              background: variant === 2 ? K.ink : K.navy,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "20%",
                bottom: "20%",
                width: 2 * s,
                background: K.gold,
                transform: `rotate(${o.flip ? -22 : 22}deg)`,
              }}
            />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  }
  if (o.type === "scrim")
    return (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 40%, rgba(17,17,17,.28) 58%, rgba(17,17,17,.72) 100%)",
          pointerEvents: "none",
        }}
      />
    );

  if (o.type === "media" || o.type === "broll") {
    if (!o.src) return null;
    const reveal = Math.min(1, enter * 1.1);
    const mediaStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: `scale(${1.035 + (0.035 * t) / Math.max(1, dur / fps)})`,
    };
    return (
      <AbsoluteFill
        style={{
          background: K.ink,
          clipPath: `inset(${(1 - reveal) * 100}% 0 ${exit * 100}% 0)`,
          overflow: "hidden",
        }}
      >
        {/\.(png|jpe?g|webp)$/i.test(o.src) ? (
          <Img src={src(o.src)} style={mediaStyle} />
        ) : (
          <OffthreadVideo
            src={src(o.src)}
            trimBefore={Math.round((o.trim ?? 0) * fps)}
            muted
            toneMapped={false}
            style={mediaStyle}
          />
        )}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(17,17,17,.12) 30%, rgba(17,17,17,.2) 50%, rgba(17,17,17,.85) 100%)",
          }}
        />
        {o.text && (
          <div
            style={{
              ...textStyle,
              position: "absolute",
              top: height * 0.17,
              left: width * 0.075,
              fontSize: 34 * s,
              padding: `${13 * s}px ${22 * s}px`,
              background: K.ink,
              borderRadius: 99,
              border: `${s}px solid ${K.gold}`,
            }}
          >
            {o.text}
          </div>
        )}
        {o.credit && (
          <div
            style={{
              ...textStyle,
              position: "absolute",
              top: height * 0.78,
              left: width * 0.075,
              fontSize: 22 * s,
              opacity: 0.8,
            }}
          >
            {o.credit}
          </div>
        )}
      </AbsoluteFill>
    );
  }

  if (o.type === "title")
    return (
      <div
        style={{
          ...textStyle,
          position: "absolute",
          left: "7%",
          right: "14%",
          top: `${(o.y ?? 0.64) * 100}%`,
          opacity: alpha,
          transform: `translateY(${(1 - enter) * 30 * s}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontFamily: serif,
            fontWeight: 500,
            fontSize: (o.size ?? 66) * s,
            lineHeight: 1.1,
            color: K.gold,
            background: K.ink,
            padding: `${20 * s}px ${28 * s}px`,
            borderRadius: 12 * s,
            boxShadow: "0 12px 35px rgba(0,0,0,.28)",
          }}
        >
          {o.text}
        </div>
      </div>
    );

  if (o.type === "logo" && o.src)
    return (
      <div
        data-walczak-cta
        style={{
          ...textStyle,
          position: "absolute",
          top: "68.4%",
          left: "9%",
          right: "16%",
          height: 104 * s,
          display: "flex",
          alignItems: "center",
          gap: 22 * s,
          padding: `${10 * s}px ${18 * s}px`,
          background: K.ink,
          borderRadius: 12 * s,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 14 * s}px)`,
          boxShadow: "0 12px 30px rgba(0,0,0,.22)",
        }}
      >
        <Img
          src={src(o.src)}
          style={{
            width: 156 * s,
            height: 82 * s,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: serif,
              fontSize: 34 * s,
              lineHeight: 1.15,
              color: K.gold,
            }}
          >
            {o.text ?? "Porozmawiajmy o Twoim planie"}
          </div>
          <div style={{ fontSize: 25 * s, marginTop: 9 * s }}>
            dominik-walczak.pl
          </div>
        </div>
      </div>
    );

  if (o.kind === "note")
    return (
      <div
        style={{
          ...textStyle,
          position: "absolute",
          left: full ? 0 : "7%",
          right: full ? 0 : "14%",
          top: full ? 0 : `${(o.y ?? 0.66) * 100}%`,
          bottom: full ? 0 : undefined,
          opacity: alpha,
          transform: `translateY(${(1 - enter) * 12 * s}px)`,
          padding: full
            ? `${height * 0.23}px ${width * 0.14}px 0 ${width * 0.07}px`
            : 23 * s,
          background: K.ink,
          borderRadius: full ? 0 : 15 * s,
          border: full ? undefined : `${1.5 * s}px solid rgba(236,223,140,.5)`,
          boxShadow: "0 12px 30px rgba(0,0,0,.25)",
        }}
      >
        {full && (
          <div
            style={{
              color: K.gold,
              fontFamily: serif,
              fontSize: 68 * s,
              marginBottom: 28 * s,
            }}
          >
            {o.title ?? "Warto wiedzieć"}
          </div>
        )}
        <div
          style={{
            fontSize: (o.size ?? (full ? 48 : 32)) * s,
            lineHeight: 1.35,
          }}
        >
          {o.text}
        </div>
        {footer}
      </div>
    );

  const items = (o.items ?? []).map((item) =>
    typeof item === "string" ? { text: item } : item,
  );
  const timeOf = (sourceTime?: number) =>
    sourceTime === undefined ? 0 : at(sourceTime);
  const cardStyle: React.CSSProperties = {
    ...textStyle,
    position: "absolute",
    left: full ? 0 : "7%",
    right: full ? 0 : "14%",
    top: full ? 0 : `${(o.y ?? 0.59) * 100}%`,
    bottom: full ? 0 : undefined,
    padding: full
      ? `${height * 0.22}px ${width * 0.14}px 0 ${width * 0.07}px`
      : 30 * s,
    background: K.ink,
    backgroundImage: full
      ? "radial-gradient(ellipse at 80% 30%, rgba(236,223,140,.1), transparent 60%)"
      : undefined,
    borderRadius: full ? 0 : 22 * s,
    border: full ? undefined : `${1.5 * s}px solid rgba(236,223,140,.45)`,
    opacity: alpha,
    transform: `translateY(${(1 - enter) * 16 * s - exit * 6 * s}px)`,
    boxShadow: "0 18px 50px rgba(0,0,0,.3)",
  };
  const heading = o.title && (
    <div
      style={{
        fontSize: (full ? 39 : 28) * s,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: K.gold,
        marginBottom: 16 * s,
      }}
    >
      {o.title}
    </div>
  );

  if (o.type === "counter" || o.type === "ring") {
    const finalText = `${o.prefix ?? ""}${num(o.to ?? o.value ?? 0)}${o.suffix ?? ""}`;
    const numberSize = Math.min(
      (o.size ?? (full ? 164 : 100)) * s,
      fitText({
        text: finalText,
        withinWidth: width * 0.79 - (full ? 135 : 92) * s - 28 * s,
        fontFamily: serif,
        fontWeight: 500,
        validateFontIsLoaded: false,
      }).fontSize,
    );
    const p = interpolate(f, [4, Math.min(38, dur - 10)], [0, 1], {
      ...clamp,
      easing: ease,
    });
    return (
      <div style={cardStyle}>
        {heading}
        <div style={{ display: "flex", gap: 25 * s, alignItems: "center" }}>
          <Icon
            kind={o.kind ?? "coins"}
            size={(full ? 135 : 92) * s}
            progress={p}
          />
          <div
            style={{
              fontFamily: serif,
              fontWeight: 500,
              fontSize: numberSize,
              whiteSpace: "nowrap",
              lineHeight: 1.02,
              color: K.gold,
            }}
          >
            {o.prefix}
            {num((o.to ?? o.value ?? 0) * p)}
            {o.suffix}
          </div>
        </div>
        {o.label && (
          <div style={{ fontSize: (full ? 43 : 32) * s, marginTop: 22 * s }}>
            {o.label}
          </div>
        )}
        {footer}
      </div>
    );
  }
  if (o.kind === "deposit") {
    const p = interpolate(f, [0, Math.min(dur - 10, 85)], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
    return (
      <div style={cardStyle}>
        {heading}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            minWidth: 0,
            alignItems: "center",
            gap: 15 * s,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: serif,
                color: K.gold,
                fontSize: (full ? 88 : 65) * s,
              }}
            >
              {o.prefix ?? "Co miesiąc"}
            </div>
            <div style={{ fontSize: (full ? 43 : 31) * s, marginTop: 18 * s }}>
              {o.label ?? "Budujesz kapitał na przyszłość"}
            </div>
          </div>
          <svg
            width={(full ? 330 : 240) * s}
            height={(full ? 220 : 155) * s}
            style={{ flexShrink: 0, overflow: "visible" }}
            viewBox="0 0 260 155"
          >
            {Array.from({ length: 18 }, (_, i) => {
              const q = Math.max(0, Math.min(1, p * 20 - i));
              return (
                <rect
                  key={i}
                  x={8 + (i % 6) * 40}
                  y={145 - Math.floor(i / 6) * 44 - q * 37}
                  width={33}
                  height={q * 37}
                  rx={4}
                  fill={K.gold}
                  opacity={0.42 + 0.58 * q}
                />
              );
            })}
          </svg>
        </div>
        {footer}
      </div>
    );
  }
  if (o.kind === "foundation" || o.kind === "protection") {
    const iconP = interpolate(f, [14, 36], [0, 1], { ...clamp, easing: ease });
    return (
      <div style={cardStyle}>
        {heading}
        <div style={{ display: "flex", alignItems: "center", gap: 32 * s }}>
          <div
            style={{
              width: 230 * s,
              height: 300 * s,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24 * s,
            }}
          >
            <div
              style={{
                height: 140 * s,
                transform: `translateY(${(1 - iconP) * -12 * s}px)`,
              }}
            >
              <Icon
                kind={o.kind === "foundation" ? "home" : "shield"}
                size={140 * s}
                progress={iconP}
              />
            </div>
            <svg
              width={230 * s}
              height={130 * s}
              viewBox="0 0 230 130"
              overflow="visible"
            >
              {Array.from({ length: 9 }, (_, i) => {
                const q = interpolate(f, [i * 2, i * 2 + 12], [0, 1], {
                  ...clamp,
                  easing: ease,
                });
                return (
                  <rect
                    key={i}
                    x={5 + (i % 3) * 75}
                    y={94 - Math.floor(i / 3) * 42 - (1 - q) * 20}
                    width={65}
                    height={30}
                    rx={4}
                    fill={K.gold}
                    opacity={q}
                  />
                );
              })}
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: serif,
                fontSize: (full ? 74 : 52) * s,
                lineHeight: 1.12,
                color: K.gold,
                textWrap: "balance",
              }}
            >
              {o.text}
            </div>
            {o.label && (
              <div
                style={{
                  fontSize: (full ? 39 : 29) * s,
                  lineHeight: 1.3,
                  marginTop: 20 * s,
                }}
              >
                {o.label}
              </div>
            )}
          </div>
        </div>
        {footer}
      </div>
    );
  }
  if (o.type === "bars")
    return (
      <div style={cardStyle}>
        {heading}
        {(o.data ?? []).map((row, i) => {
          const p = interpolate(
            t,
            [timeOf(row.at), timeOf(row.at) + 0.65],
            [0, 1],
            { ...clamp, easing: ease },
          );
          return (
            <div key={i} style={{ marginTop: i ? 18 * s : 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  minWidth: 0,
                  fontSize: 30 * s,
                  marginBottom: 8 * s,
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: K.gold }}>
                  {num(row.value)}
                  {o.suffix}
                </span>
              </div>
              <div
                style={{ height: 16 * s, background: K.navy, borderRadius: 99 }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(row.value / (o.max ?? Math.max(...(o.data ?? []).map((x) => x.value)))) * p * 100}%`,
                    background: K.gold,
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>
          );
        })}
        {footer}
      </div>
    );

  if (o.type === "steps" || o.type === "process" || o.type === "list")
    return (
      <div style={cardStyle}>
        {heading}
        <div style={{ display: "flex", gap: 20 * s, alignItems: "flex-start" }}>
          {items.map((item, i) => {
            const p = interpolate(
              t,
              [
                item.at === undefined ? i * 0.14 : timeOf(item.at),
                (item.at === undefined ? i * 0.14 : timeOf(item.at)) + 0.45,
              ],
              [0, 1],
              { ...clamp, easing: ease },
            );
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 0,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 20 * s}px)`,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 * s }}
                >
                  <Icon
                    kind={
                      o.labels?.[i] ?? ["document", "coins", "shield"][i % 3]
                    }
                    size={(full ? 120 : 60) * s}
                    progress={p}
                  />
                  {i < items.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2 * s,
                        background: K.gold,
                        opacity: 0.5,
                        transform: `scaleX(${p})`,
                        transformOrigin: "left",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: (full ? 40 : 31) * s,
                    lineHeight: 1.25,
                    marginTop: 14 * s,
                  }}
                >
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>
        {footer}
      </div>
    );

  if (o.type === "compare")
    return (
      <div style={cardStyle}>
        {heading}
        <div style={{ display: "flex", gap: 25 * s }}>
          {[o.left, o.right].map((col, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                padding: 20 * s,
                opacity: interpolate(f, [i * 5, i * 5 + 14], [0, 1], clamp),
                transform: `translateY(${(1 - interpolate(f, [i * 5, i * 5 + 14], [0, 1], clamp)) * 12 * s}px)`,
                background: i ? K.navy : "rgba(255,255,255,.04)",
                borderRadius: 14 * s,
              }}
            >
              <Icon
                kind={i ? "shield" : "work"}
                size={(full ? 110 : 56) * s}
                progress={enter}
              />
              <div
                style={{
                  fontFamily: serif,
                  fontSize: (full ? 65 : 47) * s,
                  color: K.gold,
                  marginTop: 8 * s,
                }}
              >
                {col?.title}
              </div>
              {col?.items.map((item, j) => (
                <div
                  key={j}
                  style={{
                    fontSize: (full ? 40 : 29) * s,
                    marginTop: 10 * s,
                    lineHeight: 1.25,
                  }}
                >
                  {typeof item === "string" ? item : item.text}
                </div>
              ))}
            </div>
          ))}
        </div>
        {footer}
      </div>
    );
  return null;
};
