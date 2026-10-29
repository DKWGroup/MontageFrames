import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Overlay } from "../overlays";

// Kreacje „herod paz” (2026-10-27). Starsze montaże używają HerodOverlay.
// Dwie rodziny: karty pod napisami (dolna krawędź 0,79, napis nad nimi pod twarzą)
// i sceny pełnoekranowe (twarz zasłonięta jak przy przebitce, treść 0,14–0,64, napis na 0,73).
const C = {
  cream: "#FAF4EF",
  ink: "#271338",
  plum: "#55255F",
  gold: "#D7A160",
  blush: "#F2E9E7",
  deep: "#1E0E2C",
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const serif = '"Libre Baskerville"';
const sans = "Montserrat";
const ease = Easing.out(Easing.cubic);
type Props = {
  o: Overlay;
  dur: number;
  src: (file: string) => string;
  at: (time: number) => number;
};
type Pt = { text: string; at: number };
type Raw = NonNullable<Overlay["items"]>[number];
const pts = (list: Raw[] | undefined, start: number): Pt[] =>
  (list ?? []).map((it, i) =>
    typeof it === "string"
      ? { text: it, at: start + i * 0.35 }
      : { text: it.text, at: it.at ?? start + i * 0.35 },
  );

const Arrow: React.FC<{ p: number }> = ({ p }) => (
  <svg
    width="44"
    height="28"
    viewBox="0 0 54 32"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M3 16h44m-11-10 11 10-11 10"
      stroke={C.gold}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - p}
    />
  </svg>
);
const Check: React.FC<{ p: number }> = ({ p }) => (
  <svg
    width="34"
    height="34"
    viewBox="0 0 32 32"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <circle cx="16" cy="16" r="13" stroke={C.gold} strokeWidth="2" />
    <path
      d="m10 16 4 4 8-9"
      stroke={C.plum}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - p}
    />
  </svg>
);
const Loop: React.FC<{ p: number }> = ({ p }) => (
  <svg
    width="34"
    height="34"
    viewBox="0 0 32 32"
    fill="none"
    style={{ flexShrink: 0, transform: `rotate(${-200 * (1 - p)}deg)` }}
  >
    <path
      d="M25 12a10 10 0 1 0 1 8"
      stroke={C.gold}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M26 5v7h-7"
      stroke={C.gold}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HerodOrganicOverlay: React.FC<Props> = ({ o, dur, src, at }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const enter = interpolate(f, [0, Math.min(16, dur / 4)], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const exit = interpolate(f, [dur - Math.min(9, dur / 4), dur], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const alpha = Math.min(enter, exit);
  const kind = o.label?.replace("herod-paz-", "");
  const items = pts(o.items, o.start);
  // postęp elementu od chwili, gdy pada jego słowo
  const p = (time: number | undefined, delay = 0, len = 14) =>
    interpolate(f - at(time ?? o.start) * fps - delay, [0, len], [0, 1], {
      ...clamp,
      easing: ease,
    });
  const pop = (time: number | undefined) =>
    spring({
      frame: f - at(time ?? o.start) * fps,
      fps,
      config: { damping: 14, mass: 0.7 },
    });
  const life = interpolate(f, [0, dur], [0, 1], clamp);

  // ---------- karty pod napisami ----------
  const card: React.CSSProperties = {
    position: "absolute",
    left: 100,
    width: 820,
    top: height * 0.79,
    transform: `translateY(calc(-100% + ${16 * (1 - enter)}px))`,
    opacity: alpha,
    boxSizing: "border-box",
    color: C.ink,
    fontFamily: sans,
    fontWeight: 400,
  };
  const surface: React.CSSProperties = {
    background: C.cream,
    borderRadius: 26,
    boxShadow: "0 14px 40px rgba(39,19,56,.25)",
    padding: "22px 30px",
  };

  if (kind === "hook")
    return (
      <div
        style={{
          ...card,
          ...surface,
          background: C.plum,
          color: C.cream,
          fontFamily: serif,
          fontSize: o.size ?? 44,
          lineHeight: 1.22,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {o.text}
        <div
          style={{
            margin: "14px auto 0",
            width: 84,
            height: 3,
            background: C.gold,
            transform: `scaleX(${enter})`,
            transformOrigin: "left",
          }}
        />
      </div>
    );

  if (kind === "process")
    return (
      <div
        style={{
          ...card,
          ...surface,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {items.map((it, i) => {
          const q = p(it.at);
          return (
            <React.Fragment key={i}>
              {i > 0 && <Arrow p={q} />}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  opacity: 0.35 + 0.65 * q,
                  transform: `translateY(${10 * (1 - q)}px)`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    margin: "0 auto 10px",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: i === items.length - 1 ? C.plum : C.blush,
                    display: "grid",
                    placeItems: "center",
                    color: i === items.length - 1 ? C.cream : C.plum,
                    fontSize: 20,
                    transform: `scale(${0.6 + 0.4 * pop(it.at)})`,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: items.length > 3 ? 30 : 36,
                    lineHeight: 1.2,
                  }}
                >
                  {it.text}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );

  if (kind === "compare")
    return (
      <div style={{ ...card, display: "flex", gap: 16 }}>
        {[o.left, o.right].map((col, i) => {
          const q = i === 0 ? 1 : p(o.start, 0.4 * fps);
          return (
            <div
              key={i}
              style={{
                ...surface,
                flex: 1,
                background: i === 0 ? C.cream : C.plum,
                color: i === 0 ? C.ink : C.cream,
                opacity: q,
                transform: `translateY(${14 * (1 - q)}px)`,
              }}
            >
              <div
                style={{ fontFamily: serif, fontSize: 42, marginBottom: 10 }}
              >
                {col?.title}
              </div>
              <div
                style={{
                  width: 44,
                  height: 3,
                  background: C.gold,
                  marginBottom: 12,
                  transform: `scaleX(${p(o.start, i * 0.4 * fps + 6)})`,
                  transformOrigin: "left",
                }}
              />
              {pts(col?.items, o.start).map((it, j) => (
                <div key={j} style={{ fontSize: 32, lineHeight: 1.25 }}>
                  {it.text}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );

  if (kind === "loop") {
    const t = interpolate(f, [0, Math.min(fps * 2.2, dur * 0.7)], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
    const x = t < 0.5 ? 45 + 636 * t * 2 : 681 - 636 * (t - 0.5) * 2;
    const y =
      t < 0.5
        ? 46 - 34 * Math.sin(Math.PI * t * 2)
        : 46 + 9 * Math.sin(Math.PI * (t - 0.5) * 2);
    return (
      <div style={{ ...card, ...surface }}>
        <svg width="100%" height="64" viewBox="0 0 736 64" fill="none">
          <path
            d="M45 46C165-3 560-3 681 46"
            stroke={C.gold}
            strokeWidth="3"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - enter}
          />
          <path
            d="M681 46C560 64 165 64 45 46"
            stroke={C.gold}
            strokeOpacity=".4"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
          <circle cx={x} cy={y} r="9" fill={C.plum} />
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: serif,
            fontSize: 38,
          }}
        >
          <span>{items[0]?.text}</span>
          <span>{items[1]?.text}</span>
        </div>
      </div>
    );
  }

  if (kind === "chips")
    return (
      <div
        style={{
          ...card,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {items.map((it, i) => {
          const s = pop(it.at);
          return (
            <div
              key={i}
              style={{
                ...surface,
                padding: "16px 26px",
                borderRadius: 999,
                fontFamily: serif,
                fontSize: 36,
                background: i % 2 ? C.plum : C.cream,
                color: i % 2 ? C.cream : C.plum,
                opacity: Math.min(1, s * 1.4),
                transform: `scale(${0.7 + 0.3 * s}) rotate(${(i % 2 ? 2 : -2) * (1 - s)}deg)`,
              }}
            >
              {it.text}
            </div>
          );
        })}
      </div>
    );

  // ---------- przebitka z Pexels ----------
  if (kind === "broll" && o.src)
    return (
      <AbsoluteFill
        style={{
          opacity: exit,
          clipPath: `inset(${(1 - enter) * 50}% 0 ${(1 - enter) * 50}% 0)`,
        }}
      >
        <OffthreadVideo
          src={src(o.src)}
          trimBefore={Math.round((o.trim ?? 0) * fps)}
          volume={0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${1.04 + 0.05 * life}) translateY(${-12 * life}px)`,
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, transparent 48%, rgba(30,14,44,.72) 84%)",
          }}
        />
      </AbsoluteFill>
    );

  // ---------- sceny pełnoekranowe ----------
  const iris = kind === "orbit" || kind === "iceberg" || kind === "equation";
  const shell = (children: React.ReactNode) => (
    <AbsoluteFill
      style={{
        opacity: exit,
        clipPath: iris
          ? `circle(${enter * 120}% at 50% 40%)`
          : `inset(${(1 - enter) * 100}% 0 0 0)`,
        background: `radial-gradient(120% 70% at 50% 32%, ${C.plum} 0%, ${C.deep} 78%)`,
      }}
    >
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.12 }}
      >
        <circle
          cx={width * 0.85}
          cy={height * 0.12}
          r={260 + 30 * life}
          stroke={C.gold}
          fill="none"
        />
        <circle
          cx={width * 0.1}
          cy={height * 0.62}
          r={180 + 20 * life}
          stroke={C.gold}
          fill="none"
        />
      </svg>
      {children}
    </AbsoluteFill>
  );
  const eyebrow = (text?: string) =>
    text ? (
      <div
        style={{
          position: "absolute",
          top: 330,
          width: "100%",
          textAlign: "center",
          fontFamily: sans,
          fontSize: 30,
          letterSpacing: 7,
          textTransform: "uppercase",
          color: C.gold,
          opacity: p(o.start, 4),
        }}
      >
        {text}
      </div>
    ) : null;

  // waga: „chcę” po lewej, „ale…” po prawej przeważa z każdym kolejnym punktem
  if (kind === "balance") {
    const L = pts(o.left?.items, o.start),
      R = pts(o.right?.items, o.start);
    const weight =
      L.reduce((s, it) => s - p(it.at, 0, 20), 0) +
      R.reduce((s, it) => s + 2 * p(it.at, 0, 20), 0);
    const tilt = Math.max(-12, Math.min(12, weight * 4.5));
    const cx = 540,
      cy = 600,
      arm = 300;
    const pan = (side: -1 | 1, list: Pt[], title?: string) => {
      const dy = side * arm * Math.sin((tilt * Math.PI) / 180);
      return (
        <div
          style={{
            position: "absolute",
            left: cx + side * arm - 190,
            width: 380,
            top: cy + dy + 50,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: serif,
              fontSize: 54,
              color: side < 0 ? C.cream : C.gold,
              marginBottom: 18,
            }}
          >
            {title}
          </div>
          {list.map((it, i) => {
            const q = pop(it.at);
            return (
              <div
                key={i}
                style={{
                  margin: "0 auto 10px",
                  width: "fit-content",
                  padding: "12px 24px",
                  borderRadius: 16,
                  background: side < 0 ? C.cream : C.gold,
                  color: C.ink,
                  fontFamily: sans,
                  fontSize: 35,
                  opacity: Math.min(1, q * 1.5),
                  transform: `translateY(${-30 * (1 - q)}px)`,
                }}
              >
                {it.text}
              </div>
            );
          })}
        </div>
      );
    };
    return shell(
      <>
        {eyebrow(o.text)}
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d={`M${cx} ${cy}L${cx - 70} ${cy + 620}h140z`}
            fill={C.gold}
            opacity=".22"
          />
          <g transform={`rotate(${tilt} ${cx} ${cy})`}>
            <line
              x1={cx - arm}
              y1={cy}
              x2={cx + arm}
              y2={cy}
              stroke={C.gold}
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <circle cx={cx} cy={cy} r="14" fill={C.gold} />
        </svg>
        {pan(-1, L, o.left?.title)}
        {pan(1, R, o.right?.title)}
      </>,
    );
  }

  // góra lodowa: nad wodą to, co świadome; pod wodą to, co działa z ukrycia
  if (kind === "iceberg") {
    const water = 780,
      wave = Math.sin(f / 9) * 6;
    return shell(
      <>
        {eyebrow(o.text)}
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0 }}
        >
          <rect
            x="0"
            y={water + wave}
            width={width}
            height={height}
            fill="#2E1640"
            opacity=".9"
          />
          <path
            d={`M400 ${water}L540 ${water - 230}L680 ${water}Z`}
            fill={C.cream}
            opacity={p(o.start, 2)}
          />
          <path
            d={`M400 ${water}L680 ${water}L860 ${water + 380}L540 ${water + 540}L220 ${water + 380}Z`}
            fill={C.cream}
            opacity={0.16 * p(items[1]?.at, 0, 24)}
          />
          <path
            d={`M0 ${water + wave} Q270 ${water - 14 + wave} 540 ${water + wave} T1080 ${water + wave}`}
            stroke={C.gold}
            strokeWidth="3"
            fill="none"
          />
        </svg>
        {items.map((it, i) => {
          const q = p(it.at, 0, 18);
          const above = i === 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "100%",
                textAlign: "center",
                top: above ? water - 360 : water + 90 + (i - 1) * 90,
                fontFamily: above ? serif : sans,
                fontSize: above ? 60 : 46,
                color: above ? C.cream : C.gold,
                opacity: q,
                transform: `translateY(${(above ? -14 : 18) * (1 - q)}px)`,
                filter: `blur(${(1 - q) * 6}px)`,
              }}
            >
              {it.text}
            </div>
          );
        })}
      </>,
    );
  }

  // pauza między bodźcem a odpowiedzią rozsuwa się, w środku pojawia się zauważenie
  if (kind === "pause") {
    const open = p(items[1]?.at, 0, 26);
    const gap = 60 + 90 * open;
    const node = (label: string, x: number, q: number, fill: string) => (
      <div
        style={{
          position: "absolute",
          left: x - 140,
          top: 560,
          width: 280,
          textAlign: "center",
          opacity: q,
          transform: `scale(${0.8 + 0.2 * q})`,
        }}
      >
        <div
          style={{
            margin: "0 auto 18px",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: fill,
            boxShadow: "0 10px 30px rgba(0,0,0,.25)",
          }}
        />
        <div style={{ fontFamily: serif, fontSize: 46, color: fill }}>
          {label}
        </div>
      </div>
    );
    return shell(
      <>
        {eyebrow(o.text)}
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0 }}
        >
          <line
            x1={540 - gap - 110}
            y1="635"
            x2={540 - gap}
            y2="635"
            stroke={C.gold}
            strokeWidth="3"
          />
          <line
            x1={540 + gap}
            y1="635"
            x2={540 + gap + 110}
            y2="635"
            stroke={C.gold}
            strokeWidth="3"
          />
          <circle
            cx="540"
            cy="635"
            r={80 * open}
            fill="none"
            stroke={C.gold}
            strokeWidth="3"
            strokeDasharray="6 8"
            transform={`rotate(${f * 2} 540 635)`}
          />
        </svg>
        {node(items[0]?.text ?? "", 540 - gap - 200, p(items[0]?.at), C.cream)}
        <div
          style={{
            position: "absolute",
            width: "100%",
            textAlign: "center",
            top: 860,
            fontFamily: serif,
            fontStyle: "italic",
            fontSize: 58,
            color: C.gold,
            opacity: open,
          }}
        >
          {items[1]?.text}
        </div>
        {node(items[2]?.text ?? "", 540 + gap + 200, p(items[2]?.at), C.gold)}
      </>,
    );
  }

  // orbita: słowa krążą wokół środka i pojawiają się, gdy padają
  if (kind === "orbit") {
    const n = Math.max(items.length, 1);
    return shell(
      <>
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx="540"
            cy="740"
            r="310"
            fill="none"
            stroke={C.gold}
            strokeOpacity=".35"
            strokeWidth="2"
            strokeDasharray="4 10"
          />
          <circle
            cx="540"
            cy="740"
            r={150 + 6 * Math.sin(f / 10)}
            fill={C.cream}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 380,
            width: 320,
            top: 740,
            transform: "translateY(-50%)",
            textAlign: "center",
            fontFamily: serif,
            lineHeight: 1.2,
            color: C.plum,
            fontSize: 46,
          }}
        >
          {o.text}
        </div>
        {items.map((it, i) => {
          const q = pop(it.at);
          const a = (i / n) * Math.PI * 2 - Math.PI / 2 + f / 160;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 540 + Math.cos(a) * 310,
                top: 740 + Math.sin(a) * 310,
                transform: `translate(-50%,-50%) scale(${q})`,
                padding: "12px 24px",
                borderRadius: 999,
                background: i % 2 ? C.gold : C.plum,
                border: `2px solid ${C.gold}`,
                color: i % 2 ? C.ink : C.cream,
                fontFamily: sans,
                fontSize: 38,
                whiteSpace: "nowrap",
              }}
            >
              {it.text}
            </div>
          );
        })}
      </>,
    );
  }

  // ścieżka: punkty drogi zapalają się po kolei, jasna kropka idzie za słowami
  if (kind === "journey") {
    const xs = items.map(
      (_, i) => 260 + (520 * i) / Math.max(items.length - 1, 1),
    );
    const ys = items.map((_, i) => 620 + (i % 2 ? 230 : 0));
    const reached = items.reduce(
      (s, it, i) => s + (i ? p(it.at, 0, 20) : 0),
      0,
    );
    const seg = Math.max(0, Math.min(Math.floor(reached), items.length - 2)),
      fr = reached - seg;
    const dot =
      items.length > 1
        ? {
            x: xs[seg] + (xs[seg + 1] - xs[seg]) * fr,
            y: ys[seg] + (ys[seg + 1] - ys[seg]) * fr,
          }
        : { x: xs[0], y: ys[0] };
    return shell(
      <>
        {eyebrow(o.text)}
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0 }}
        >
          <polyline
            points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")}
            fill="none"
            stroke={C.gold}
            strokeOpacity=".35"
            strokeWidth="4"
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          {xs.map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={ys[i]}
              r={22}
              fill={p(items[i].at) > 0.5 ? C.gold : C.deep}
              stroke={C.gold}
              strokeWidth="3"
            />
          ))}
          <circle cx={dot.x} cy={dot.y} r="14" fill={C.cream} />
        </svg>
        {items.map((it, i) => {
          const q = p(it.at);
          const last = i === items.length - 1;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: xs[i] - 160,
                width: 320,
                top: ys[i] + (i % 2 ? 44 : -130),
                lineHeight: 1.15,
                textAlign: "center",
                fontFamily: last ? serif : sans,
                fontSize: last ? 46 : 38,
                color: last ? C.gold : C.cream,
                opacity: 0.2 + 0.8 * q,
                transform: `translateY(${10 * (1 - q)}px)`,
              }}
            >
              {it.text}
            </div>
          );
        })}
      </>,
    );
  }

  // notes: kartka w linie, punkty dopisują się jak odręcznie i dostają podkreślenie
  if (kind === "notebook")
    return shell(
      <div
        style={{
          position: "absolute",
          left: 110,
          width: 860,
          top: 270,
          height: 930,
          borderRadius: 18,
          background: C.cream,
          boxShadow: "0 30px 70px rgba(0,0,0,.35)",
          transform: `rotate(${-1.5 * (1 - enter)}deg) translateY(${40 * (1 - enter)}px)`,
          padding: "56px 50px 0 110px",
          boxSizing: "border-box",
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 89px, rgba(85,37,95,.14) 89px 91px)",
          backgroundPosition: "0 48px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 0,
            bottom: 0,
            width: 2,
            background: "rgba(215,161,96,.6)",
          }}
        />
        {o.text && (
          <div
            style={{
              fontFamily: sans,
              fontSize: 24,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.gold,
              height: 90,
            }}
          >
            {o.text}
          </div>
        )}
        {items.map((it, i) => {
          const q = p(it.at, 0, 22);
          const chars = Math.round(it.text.length * q);
          return (
            <div
              key={i}
              style={{
                height: 90,
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontFamily: serif,
                fontStyle: "italic",
                fontSize: 46,
                color: C.plum,
              }}
            >
              {o.hl === "check" && <Check p={p(it.at, 10)} />}
              <span style={{ position: "relative" }}>
                {it.text.slice(0, chars)}
                <span style={{ opacity: 0 }}>{it.text.slice(chars)}</span>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: -6,
                    height: 3,
                    width: `${100 * p(it.at, 18)}%`,
                    background: C.gold,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>,
    );

  // równanie: kafelki składają się w wynik
  if (kind === "equation") {
    const [a, b, c] = items;
    const tile = (it: Pt | undefined, x: number) => {
      const q = pop(it?.at);
      return (
        <div
          style={{
            position: "absolute",
            left: x,
            top: 470,
            width: 380,
            height: 200,
            borderRadius: 26,
            background: C.cream,
            color: C.plum,
            display: "grid",
            placeItems: "center",
            fontFamily: serif,
            fontSize: 50,
            boxShadow: "0 18px 40px rgba(0,0,0,.3)",
            opacity: Math.min(1, q * 1.4),
            transform: `translateY(${60 * (1 - q)}px) scale(${0.85 + 0.15 * q})`,
          }}
        >
          {it?.text}
        </div>
      );
    };
    const res = pop(c?.at);
    return shell(
      <>
        {eyebrow(o.text)}
        {tile(a, 50)}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            top: 515,
            textAlign: "center",
            fontFamily: sans,
            fontSize: 80,
            color: C.gold,
            opacity: p(b?.at),
          }}
        >
          +
        </div>
        {tile(b, 650)}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            top: 690,
            textAlign: "center",
            fontFamily: sans,
            fontSize: 80,
            color: C.gold,
            opacity: p(c?.at),
          }}
        >
          =
        </div>
        <div
          style={{
            position: "absolute",
            left: 220,
            width: 640,
            top: 820,
            height: 220,
            borderRadius: 30,
            background: C.gold,
            color: C.ink,
            display: "grid",
            placeItems: "center",
            fontFamily: serif,
            fontSize: 66,
            opacity: Math.min(1, res * 1.4),
            transform: `scale(${0.7 + 0.3 * res})`,
            boxShadow: `0 0 ${60 * res}px rgba(215,161,96,.5)`,
          }}
        >
          {c?.text}
        </div>
      </>,
    );
  }

  // wiedza a praktyka: wiersz po wierszu „wiem” ✓ i „a jednak” ↻
  if (kind === "knowdo") {
    const L = pts(o.left?.items, o.start),
      R = pts(o.right?.items, o.start);
    return shell(
      <>
        {eyebrow(o.text)}
        <div
          style={{
            position: "absolute",
            left: 70,
            width: 940,
            top: 430,
            display: "flex",
            fontFamily: sans,
            fontSize: 30,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: C.gold,
            opacity: p(o.start, 6),
          }}
        >
          <div style={{ flex: 1, paddingLeft: 20 }}>{o.left?.title}</div>
          <div style={{ flex: 1, paddingLeft: 20 }}>{o.right?.title}</div>
        </div>
        {L.map((l, i) => {
          const r = R[i];
          const q1 = p(l.at),
            q2 = p(r?.at ?? l.at + 1);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 70,
                width: 940,
                top: 490 + i * 215,
                display: "flex",
                gap: 20,
              }}
            >
              <div
                style={{
                  ...surface,
                  flex: 1,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  fontSize: 35,
                  lineHeight: 1.2,
                  minHeight: 150,
                  boxSizing: "border-box",
                  opacity: q1,
                  transform: `translateX(${-30 * (1 - q1)}px)`,
                }}
              >
                <Check p={p(l.at, 8)} />
                {l.text}
              </div>
              <div
                style={{
                  ...surface,
                  flex: 1,
                  background: C.plum,
                  color: C.cream,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  fontSize: 35,
                  lineHeight: 1.2,
                  minHeight: 150,
                  boxSizing: "border-box",
                  opacity: q2,
                  transform: `translateX(${30 * (1 - q2)}px)`,
                  boxShadow: `0 0 0 2px ${C.gold}`,
                }}
              >
                <Loop p={p(r?.at, 4, 24)} />
                {r?.text}
              </div>
            </div>
          );
        })}
      </>,
    );
  }

  // hasło na pełnym kadrze (napisy tego zdania zdjęte z rolki)
  if (kind === "quote") {
    const words = (o.text ?? "").split(" ");
    const gold = new Set((o.hl ?? "").split(" "));
    return shell(
      <div
        style={{
          position: "absolute",
          left: 90,
          width: 900,
          top: 560,
          textAlign: "center",
          fontFamily: serif,
          fontSize: o.size ?? 72,
          lineHeight: 1.3,
          color: C.cream,
          textWrap: "balance",
        }}
      >
        {words.map((w, i) => {
          const q = p(o.start, i * 4);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: q,
                transform: `translateY(${16 * (1 - q)}px)`,
                color: gold.has(w) ? C.gold : C.cream,
                fontStyle: gold.has(w) ? "italic" : "normal",
              }}
            >
              {w}
            </span>
          );
        })}
        <div
          style={{
            margin: "40px auto 0",
            width: 120,
            height: 3,
            background: C.gold,
            transform: `scaleX(${p(o.start, words.length * 4)})`,
          }}
        />
      </div>,
    );
  }

  // ebook na pełnym kadrze: gotowy mockup 3D (bez tła) unosi się, pod nim pigułka
  if (kind === "book" && o.src) {
    const s = spring({ frame: f - 4, fps, config: { damping: 16, mass: 0.9 } });
    return shell(
      <>
        <div
          style={{
            position: "absolute",
            left: 540 - 260,
            top: 250,
            width: 519,
            height: 799,
            opacity: Math.min(1, s * 1.5),
            transform: `translateY(${60 * (1 - s) + 8 * Math.sin(f / 28)}px) scale(${0.9 + 0.1 * s + 0.02 * life}) rotate(${1.2 * Math.sin(f / 40)}deg)`,
            filter: "drop-shadow(0 40px 50px rgba(0,0,0,.5))",
          }}
        >
          <Img src={src(o.src)} style={{ width: "100%", height: "100%" }} />
        </div>
        <div
          style={{
            position: "absolute",
            width: "100%",
            top: 1100,
            textAlign: "center",
            opacity: p(o.start, 10),
            transform: `translateY(${14 * (1 - p(o.start, 10))}px)`,
          }}
        >
          <div
            style={{
              margin: "16px auto 0",
              width: "fit-content",
              padding: "12px 26px",
              borderRadius: 999,
              background: C.gold,
              color: C.ink,
              fontFamily: sans,
              fontSize: 32,
            }}
          >
            {o.text ?? "ebook · link w bio"}
          </div>
        </div>
      </>,
    );
  }

  return null;
};
