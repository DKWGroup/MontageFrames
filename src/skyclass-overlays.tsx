import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Overlay } from "./overlays";

const C = {
  navy: "#124F81",
  pink: "#FF395C",
  money: "#3DFF8F",
  white: "#FFFFFF",
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
type Props = {
  o: Overlay;
  dur: number;
  src: (file: string) => string;
  at: (t: number) => number;
};
const Plane: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 48 48"
    width="48"
    height="48"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d="m6 26 15-5 9-15 5 1-5 15 11 6-1 4-13-3-9 11-4-1 4-12-12-1Z" />
  </svg>
);
const Logo = () => (
  <Img
    src={staticFile("Brandings/SkyClass/skyclass-logo-2.png")}
    style={{ width: 245 }}
  />
);

// Początek każdego banknotu znajduje się w środku rzeczywistego bloku kwoty.
const MoneyBurst: React.FC<{ progress: number; active: boolean }> = ({
  progress: b,
  active,
}) => (
  <>
    {Array.from({ length: 8 }, (_, i) => {
      const angle = -Math.PI + (i / 7) * Math.PI;
      const x = Math.cos(angle) * b * 310;
      const y = Math.sin(angle) * b * 250 - b * 80;
      return (
        <svg
          key={i}
          viewBox="0 0 140 76"
          width={140}
          height={76}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            pointerEvents: "none",
            zIndex: 2,
            opacity: active
              ? interpolate(b, [0, 0.08, 0.7, 1], [0, 1, 0.95, 0], clamp)
              : 0,
            transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotate(${(i - 3.5) * b * 16}deg) scale(${0.6 + b * 0.5})`,
            filter: "drop-shadow(0 6px 7px rgba(0,0,0,.25))",
          }}
        >
          <rect
            x="3"
            y="3"
            width="134"
            height="70"
            rx="7"
            fill="#99FFBD"
            stroke="#124F81"
            strokeWidth="5"
          />
          <rect
            x="13"
            y="13"
            width="114"
            height="50"
            rx="6"
            fill="none"
            stroke="#179759"
            strokeWidth="3"
          />
          <ellipse cx="70" cy="38" rx="24" ry="26" fill="#179759" />
          <text
            x="70"
            y="48"
            textAnchor="middle"
            fill="white"
            fontFamily="Poppins"
            fontWeight="900"
            fontSize="26"
          >
            zł
          </text>
          <circle cx="26" cy="38" r="5" fill="#179759" />
          <circle cx="114" cy="38" r="5" fill="#179759" />
        </svg>
      );
    })}
  </>
);

export const SkyClassOverlay: React.FC<Props> = ({ o, dur, src, at }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const p = spring({
    frame: f,
    fps,
    config: { damping: 16, stiffness: 160, mass: 0.7 },
  });
  const exit = interpolate(f, [dur - 7, dur], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const t = (start: number, len: number) =>
    interpolate(f, [start * fps, (start + len) * fps], [0, 1], clamp);
  const itemText = (i: NonNullable<Overlay["items"]>[number]) =>
    typeof i === "string" ? i : i.text;
  const itemStart = (i: NonNullable<Overlay["items"]>[number], n: number) =>
    typeof i === "string" ? n * 0.3 : i.at == null ? n * 0.3 : at(i.at);
  if (o.type === "travel" && o.src) {
    const open = o.transitionFrom ? t(0, 0.4) : 1;
    const style: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: `scale(${1.04 + t(0, dur / fps) * 0.08})`,
    };
    const media = (file: string, trim = 0, foreground = false) =>
      /\.(mp4|mov|webm)$/i.test(file) ? (
        <OffthreadVideo
          src={src(file)}
          trimBefore={Math.round(trim * fps)}
          volume={0}
          style={
            foreground && o.fit === "card"
              ? {
                  ...style,
                  height: 900,
                  position: "absolute",
                  top: 150,
                  objectFit: "contain",
                  transform: "none",
                }
              : style
          }
        />
      ) : (
        <Img src={src(file)} style={style} />
      );
    return (
      <AbsoluteFill style={{ background: C.navy }}>
        {/* Pełnoekranowy krajobraz pozostaje pod maską; prowadzący nie przebłyskuje. */}
        <AbsoluteFill
          style={
            o.fit === "card"
              ? { filter: "blur(25px)", transform: "scale(1.08)" }
              : undefined
          }
        >
          {media(
            o.fit === "card" && open >= 1 ? o.src : (o.transitionFrom ?? o.src),
            o.fit === "card" && open >= 1 ? o.trim : o.transitionTrim,
          )}
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            clipPath: `inset(${(1 - open) * 28}% ${(1 - open) * 25}% round ${(1 - open) * 320}px)`,
          }}
        >
          {media(o.src, o.trim, true)}
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg,rgba(12,58,96,.18),transparent 40%,rgba(12,58,96,.5))",
          }}
        />
        {(o.text || o.country) && (
          <div
            style={{
              position: "absolute",
              top: 548,
              left: 80,
              background: C.white,
              color: C.navy,
              borderRadius: 100,
              padding: "18px 28px",
              fontFamily: "Poppins",
              fontSize: 34,
              fontWeight: 900,
              transform: `rotateX(${(1 - p) * 80}deg)`,
            }}
          >
            {o.text}
            <span style={{ fontWeight: 500, color: "#505050" }}>
              {" "}
              {o.country ? ` · ${o.country}` : ""}
            </span>
          </div>
        )}
      </AbsoluteFill>
    );
  }
  const card: React.CSSProperties = {
    position: "absolute",
    left: 80,
    width: 800,
    bottom: height * 0.06,
    fontFamily: "Poppins",
    color: C.white,
    borderRadius: 24,
    background: `linear-gradient(155deg,${C.navy},#0C3A60)`,
    boxShadow: "0 24px 60px rgba(12,58,96,.35)",
    transform: `translateY(${(1 - p) * 130 - exit * 60}px) rotate(${(1 - p) * 3}deg)`,
    opacity: Math.min(t(0, 0.1), 1 - exit),
  };
  if (o.type === "ticket") {
    const priceStart = o.priceAt == null ? 0.25 : at(o.priceAt);
    const n = interpolate(
      f,
      [priceStart * fps, (priceStart + 0.8) * fps],
      [0, o.to ?? 0],
      { ...clamp, easing: Easing.out(Easing.cubic) },
    );
    const burst = t(priceStart, 0.95);
    return (
      <div style={card}>
        <div
          style={{
            background: C.white,
            color: C.navy,
            padding: "28px 36px",
            borderRadius: "24px 24px 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Logo />
            <span style={{ fontWeight: 500, fontSize: 26 }}>
              Lot w obie strony
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 22,
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 66, lineHeight: 1.2 }}>
                {o.text}
              </div>
              <div style={{ fontSize: 28, color: "#505050", fontWeight: 500 }}>
                {o.country}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Plane
                style={{
                  color: C.pink,
                  transform: `translateX(${t(0, 0.65) * 20 - 10}px)`,
                }}
              />
              <div style={{ fontWeight: 900, fontSize: 30 }}>{o.code}</div>
            </div>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            borderTop: "3px dashed rgba(255,255,255,.5)",
            padding: "22px 36px 30px",
            minHeight: 145,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -14,
              top: -15,
              width: 28,
              height: 28,
              borderRadius: 50,
              background: "#0C3A60",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -14,
              top: -15,
              width: 28,
              height: 28,
              borderRadius: 50,
              background: "#0C3A60",
            }}
          />
          <div
            style={{
              fontWeight: 900,
              fontSize: 112,
              letterSpacing: "-.04em",
              lineHeight: 1.2,
              color: C.money,
              textShadow: "0 0 10px #00E676,0 0 34px rgba(0,230,118,.6)",
              opacity: t(priceStart, 0.12),
            }}
          >
            <span style={{ position: "relative", display: "inline-block" }}>
              {Math.round(n).toLocaleString("pl-PL")}
              <MoneyBurst progress={burst} active={f >= priceStart * fps} />
            </span>
            <span style={{ fontSize: 62 }}> zł</span>
          </div>
        </div>
      </div>
    );
  }
  if (o.type === "money") {
    const start = o.priceAt == null ? 0 : at(o.priceAt);
    const burst = t(start, 1.05);
    const show = f >= Math.round(start * fps);
    const count = Easing.out(Easing.cubic)(t(start, 0.6));
    const amount = `${Math.round((o.to ?? 0) * count).toLocaleString("pl-PL")}${o.upper ? `–${Math.round(o.upper * count).toLocaleString("pl-PL")}` : ""}`;
    const pop = spring({
      frame: Math.max(0, f - Math.round(start * fps)),
      fps,
      config: { damping: 13, stiffness: 190 },
    });
    return (
      <div
        style={{
          ...card,
          padding: "28px 36px",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 500, marginBottom: 8 }}>
          {o.label}
        </div>
        {o.oldPrice && (
          <div
            style={{
              fontSize: 38,
              color: C.pink,
              fontWeight: 900,
              textDecoration: "line-through",
            }}
          >
            {o.oldPrice} zł
          </div>
        )}
        <div
          style={{
            fontSize: o.upper ? 84 : 110,
            fontWeight: 900,
            color: C.money,
            textShadow:
              "0 0 12px rgba(0,230,118,.6),0 0 30px rgba(0,230,118,.3)",
            lineHeight: 1.3,
            opacity: show ? 1 : 0,
            transform: `scale(${0.9 + 0.1 * pop})`,
          }}
        >
          {o.prefix && <span style={{ fontSize: 38 }}>{o.prefix} </span>}
          <span style={{ position: "relative", display: "inline-block" }}>
            {amount}
            <MoneyBurst progress={burst} active={show} />
          </span>
          <span style={{ fontSize: 48 }}> zł</span>
        </div>
      </div>
    );
  }
  if (o.type === "list")
    return (
      <div style={{ ...card, padding: 32, boxSizing: "border-box" }}>
        {o.items?.map((it, i) => {
          const a = t(itemStart(it, i), 0.25);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "18px 0",
                borderBottom:
                  i === (o.items?.length ?? 0) - 1
                    ? undefined
                    : "2px solid rgba(255,255,255,.2)",
                opacity: a,
                transform: `perspective(600px) rotateX(${(1 - a) * 75}deg)`,
              }}
            >
              <Plane style={{ color: C.pink }} />
              <span style={{ fontSize: 44, fontWeight: 900 }}>
                {itemText(it)}
              </span>
            </div>
          );
        })}
      </div>
    );
  if (o.type === "cta")
    return (
      <div
        style={{
          ...card,
          background: C.white,
          textAlign: "center",
          padding: "30px 32px",
          boxSizing: "border-box",
        }}
      >
        <Logo />
        <div
          style={{
            marginTop: 22,
            background: C.pink,
            borderRadius: 100,
            padding: "22px 28px",
            fontWeight: 900,
            fontSize: 48,
          }}
        >
          {o.text}
        </div>
        <div
          style={{
            fontWeight: 500,
            fontSize: 32,
            color: C.navy,
            marginTop: 12,
          }}
        >
          Link poniżej
        </div>
      </div>
    );
  if (o.type === "counter")
    return (
      <div
        style={{
          ...card,
          padding: 32,
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 900 }}>
          {Math.round((o.to ?? 0) * Easing.out(Easing.cubic)(t(0, 0.8)))}
          {o.suffix}
        </div>
        {o.label && (
          <div style={{ fontSize: 32, fontWeight: 500 }}>{o.label}</div>
        )}
      </div>
    );
  return null;
};
