import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFonts } from "../fonts";
import plan from "../../klienci/kacper-bisanz/Animacje/skyclass-poziom-1/plan.json";

type Rect = [number, number, number, number];
type Track = { t: number; box: Rect };
export type SkyItem = {
  id: string;
  at: number;
  dur: number;
  kind: string;
  title: string;
  sub?: string;
  value?: string;
  from?: number;
  to?: number;
  suffix?: string;
  rows?: string[];
  values?: number[];
  labels?: string[];
  formula?: string;
  logo?: string;
  photo?: string;
  rect: Rect;
  track?: Track[];
  source?: string;
  audioGain?: number;
  sound?: string;
  hit?: number;
};
const C = {
  blue: "#066FED",
  ink: "#141414",
  muted: "#595959",
  white: "#FFFFFF",
  line: "#E6E6E6",
  light: "#EDF4FF",
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fmt = (n: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(n);
const nb = (s: string) =>
  s
    .replace(/\b([aiouwz]|do|na|od|po|za|ze|we) /gi, "$1\u00a0")
    .replace(/(\d) (?=\d{3}|zł|€|%)/g, "$1\u00a0");

const Icon: React.FC<{ kind?: string }> = ({ kind }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {kind === "route" ? (
      <>
        <path d="M3 18h6l4-8 8-6-6 8-3 7-3 2-1-5-5-1z" />
      </>
    ) : kind === "check" ? (
      <path d="m5 12 4 4L19 6" />
    ) : (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4M8 14h3" />
      </>
    )}
  </svg>
);

function rectAt(track: Track[], t: number): Rect {
  if (t <= track[0].t) return track[0].box;
  const i = track.findIndex((p) => p.t >= t);
  if (i < 0) return track[track.length - 1].box;
  const a = track[i - 1],
    b = track[i],
    v = (t - a.t) / (b.t - a.t);
  return a.box.map((n, j) => n + (b.box[j] - n) * v) as Rect;
}

export const SkyclassItem: React.FC<{ item: SkyItem }> = ({ item }) => {
  const f = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = f / fps;
  const [handle] = useState(() => delayRender("Inter: SkyClass pack"));
  useEffect(() => {
    loadFonts([
      { family: "Inter", file: "fonts/Inter.ttf", weight: "100 900" },
    ]).then(() => continueRender(handle));
  }, [handle]);
  const enter = interpolate(t, [0, 0.38], [0, 1], { ...clamp, easing: ease });
  const exit = interpolate(t, [item.dur - 0.24, item.dur - 0.04], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const visible = interpolate(
    t,
    [0, 0.1, item.dur - 0.18, item.dur - 0.04],
    [0, 1, 1, 0],
    clamp,
  );
  const p = interpolate(t, [0.25, item.hit ?? 1.45], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const rect = item.track?.length ? rectAt(item.track, t) : item.rect;
  const [x, y, w, h] = rect;
  const footer = item.kind === "strip";
  const mini = w < 480;
  const textSize = footer ? 24 : mini ? 22 : 28;
  const amountSize = footer ? 46 : w < 300 ? 38 : mini ? 54 : 70;
  const titleSize = footer ? 24 : mini ? 25 : 32;
  const stagger = (i: number) =>
    interpolate(t, [0.14 + i * 0.12, 0.43 + i * 0.12], [0, 1], {
      ...clamp,
      easing: ease,
    });
  const renderBody = () => {
    if (item.kind === "photo")
      return (
        <>
          <div
            style={{ height: h - 100, overflow: "hidden", borderRadius: 10 }}
          >
            <Img
              src={staticFile(item.photo!)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${1.035 - 0.035 * enter})`,
              }}
            />
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 14 }}>
            {nb(item.title)}
          </div>
        </>
      );
    if (item.kind === "route")
      return (
        <>
          <div
            style={{
              fontSize: 13,
              fontFamily: "Menlo",
              letterSpacing: 1.3,
              color: C.muted,
              marginBottom: 17,
            }}
          >
            TRASA Z NAGRANIA
          </div>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 750,
              letterSpacing: -0.7,
            }}
          >
            {nb(item.title)}
          </div>
          <svg width={w - 48} height="74" viewBox={`0 0 ${w - 48} 74`}>
            <path
              d={`M8 56 Q ${(w - 48) / 2} -8 ${w - 56} 56`}
              fill="none"
              stroke={C.line}
              strokeWidth="2"
            />
            <path
              d={`M8 56 Q ${(w - 48) / 2} -8 ${w - 56} 56`}
              fill="none"
              stroke={C.blue}
              strokeWidth="3"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - p}
            />
            <circle cx="8" cy="56" r="5" fill={C.blue} />
            <circle cx={w - 56} cy="56" r="5" fill={C.blue} />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 18,
              fontWeight: 650,
            }}
          >
            {item.rows?.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </>
      );
    if (item.kind === "bars")
      return (
        <>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 750,
              marginBottom: 18,
              letterSpacing: -0.6,
            }}
          >
            {nb(item.title)}
          </div>
          {item.values?.map((v, i) => (
            <div key={i} style={{ marginTop: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 18,
                  marginBottom: 6,
                }}
              >
                <span>{item.labels?.[i]}</span>
                <b>{fmt(v)} zł</b>
              </div>
              <div
                style={{
                  height: 15,
                  background: C.light,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(v / Math.max(...item.values!)) * 100}%`,
                    height: "100%",
                    background:
                      i === item.values!.length - 1 ? C.blue : "#B0B0B0",
                    transformOrigin: "left",
                    transform: `scaleX(${stagger(i)})`,
                  }}
                />
              </div>
            </div>
          ))}
          {item.sub && (
            <div style={{ marginTop: 16, fontSize: 16, color: C.muted }}>
              {nb(item.sub)}
            </div>
          )}
        </>
      );
    if (footer)
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          {item.logo ? (
            <Img
              src={staticFile(item.logo)}
              style={{ width: 120, height: 32, objectFit: "contain" }}
            />
          ) : (
            <span style={{ color: C.blue, display: "flex" }}>
              <Icon kind="check" />
            </span>
          )}
          <div
            style={{
              flex: 1,
              fontSize: titleSize,
              fontWeight: 650,
              lineHeight: 1.2,
            }}
          >
            {nb(item.title)}
            {item.sub && (
              <div
                style={{
                  fontSize: 17,
                  color: C.muted,
                  fontWeight: 400,
                  marginTop: 5,
                }}
              >
                {nb(item.sub)}
              </div>
            )}
          </div>
          {(item.value || item.to !== undefined) && (
            <div
              style={{
                color: C.blue,
                fontSize: amountSize,
                fontWeight: 750,
                whiteSpace: "nowrap",
                letterSpacing: -1,
              }}
            >
              {item.to !== undefined
                ? fmt(
                    Number.isInteger(item.to)
                      ? Math.round(
                          (item.from ?? 0) + (item.to - (item.from ?? 0)) * p,
                        )
                      : (item.from ?? 0) + (item.to - (item.from ?? 0)) * p,
                  ) + (item.suffix ?? "")
                : item.value}
            </div>
          )}
        </div>
      );
    return (
      <>
        {item.logo && (
          <Img
            src={staticFile(item.logo)}
            style={{
              height: 30,
              maxWidth: w - 60,
              objectFit: "contain",
              objectPosition: "left",
              marginBottom: 18,
            }}
          />
        )}
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 750,
            lineHeight: 1.13,
            letterSpacing: -0.7,
          }}
        >
          {nb(item.title)}
        </div>
        {(item.value || item.to !== undefined) && (
          <div
            style={{
              fontSize: amountSize,
              color: C.blue,
              fontWeight: 780,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              marginTop: 15,
              whiteSpace: "nowrap",
            }}
          >
            {item.to !== undefined
              ? fmt(
                  Number.isInteger(item.to)
                    ? Math.round(
                        (item.from ?? 0) + (item.to - (item.from ?? 0)) * p,
                      )
                    : (item.from ?? 0) + (item.to - (item.from ?? 0)) * p,
                ) + (item.suffix ?? "")
              : nb(item.value!)}
          </div>
        )}
        {item.formula && (
          <div
            style={{
              marginTop: 12,
              fontSize: 20,
              fontWeight: 600,
              color: C.muted,
            }}
          >
            {nb(item.formula)}
          </div>
        )}
        {item.rows?.map((s, i) => (
          <div
            key={s}
            style={{
              display: "flex",
              gap: 13,
              marginTop: 15,
              opacity: stagger(i),
              transform: `translateY(${(1 - stagger(i)) * 10}px)`,
              fontSize: textSize,
              lineHeight: 1.22,
            }}
          >
            <span
              style={{
                color: C.blue,
                fontFamily: "Menlo",
                fontSize: 14,
                paddingTop: 5,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{nb(s)}</span>
          </div>
        ))}
        {item.sub && (
          <div
            style={{
              fontSize: 18,
              color: C.muted,
              lineHeight: 1.32,
              marginTop: 14,
            }}
          >
            {nb(item.sub)}
          </div>
        )}
        {item.source && (
          <div
            style={{
              fontFamily: "Menlo",
              fontSize: 11,
              color: C.muted,
              lineHeight: 1.3,
              marginTop: 15,
            }}
          >
            {item.source}
          </div>
        )}
      </>
    );
  };
  return (
    <AbsoluteFill style={{ fontFamily: "Inter", color: C.ink }}>
      {item.kind === "track" ? (
        <svg
          width="1920"
          height="1080"
          style={{ position: "absolute", inset: 0, opacity: visible }}
        >
          <rect
            x={x - 7}
            y={y - 7}
            width={w + 14}
            height={h + 14}
            rx="9"
            fill="none"
            stroke="white"
            strokeWidth="7"
          />
          <rect
            x={x - 7}
            y={y - 7}
            width={w + 14}
            height={h + 14}
            rx="9"
            fill="none"
            stroke={C.blue}
            strokeWidth="3.5"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - enter}
          />
          <path
            d={`M${x + w + 77} ${y + h / 2}h-55m12 -8 -12 8 12 8`}
            fill="none"
            stroke={C.blue}
            strokeWidth="4"
            strokeLinecap="round"
            transform={`translate(${(1 - enter) * 16},0)`}
          />
        </svg>
      ) : (
        <div
          data-pack-card={item.id}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: w,
            height: h,
            boxSizing: "border-box",
            padding: footer ? "12px 25px" : "24px",
            borderRadius: 14,
            background: C.white,
            boxShadow: "0 12px 25px rgba(20,20,20,.15)",
            opacity: visible,
            transform: `translateY(${(1 - enter) * 20 - exit * 12}px)`,
            clipPath: `inset(0 0 ${(1 - enter) * 100}% 0 round 14px)`,
            overflow: "hidden",
          }}
        >
          {renderBody()}
        </div>
      )}
      {[
        {
          s:
            item.sound ??
            (item.kind === "track" ? "click" : item.logo ? "pop" : "whoosh2"),
          at: 0,
        },
        ...(item.to !== undefined || item.value
          ? [
              {
                s: /zł/.test((item.suffix ?? "") + (item.value ?? ""))
                  ? "cash"
                  : "ding",
                at: item.hit ?? 1.45,
              },
            ]
          : []),
      ].map((s, i) => (
        <Sequence
          key={i}
          from={Math.round((s.at - (s.s === "cash" ? 0.5425 : 0)) * fps)}
          layout="none"
        >
          <Audio
            src={staticFile(`subskrypcje/sfx/${s.s}.wav`)}
            volume={item.audioGain ?? 1}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
const Root: React.FC = () => (
  <>
    {(plan.items as SkyItem[]).map((item) => (
      <Composition
        key={item.id}
        id={item.id}
        component={SkyclassItem}
        defaultProps={{ item }}
        fps={25}
        width={1920}
        height={1080}
        durationInFrames={Math.round(item.dur * 25)}
      />
    ))}
  </>
);
registerRoot(Root);
