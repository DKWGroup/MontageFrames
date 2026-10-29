import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { OverlayProps } from "./bisanz";

const V = "#230C4A",
  V2 = "#2C1651",
  P = "#F8F9FA",
  L = "#D9F99D",
  M = "#B9B3C9";
const DISCLAIMER =
  "Efekty są indywidualne i zależą m.in. od diety, treningu i stylu życia.";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const font = "'Plus Jakarta Sans', sans-serif";
const headline = "Montserrat, sans-serif";

// Prywatność jest efektem wideo: oryginalne piksele sylwetek pozostają nietknięte.
// Maski obejmują obie całe twarze na zdjęciu 520×319; poruszają się razem ze zdjęciem.
const PrivatePhoto: React.FC<{ src: string }> = ({ src }) => (
  <div
    style={{
      position: "relative",
      aspectRatio: "520 / 319",
      overflow: "hidden",
      background: "#1A1C1D",
      borderRadius: 24,
    }}
  >
    <Img
      src={src}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
    {["28% 12%", "70% 12%"].map((center) => (
      <Img
        key={center}
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "blur(30px)",
          maskImage: `radial-gradient(ellipse 10.5% 24% at ${center}, #000 76%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(ellipse 10.5% 24% at ${center}, #000 76%, transparent 100%)`,
        }}
      />
    ))}
  </div>
);

export const VitalCase: React.FC<OverlayProps> = ({ o, dur, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = (t: number, len = 0.5) =>
    interpolate(f / fps, [t, t + len], [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    });
  const allItems = (o.items ?? []).map((it, i) =>
    typeof it === "string"
      ? { text: it, sub: undefined, time: 0.25 + i * 0.3 }
      : { ...it, time: it.at != null ? at(it.at) : 0.25 + i * 0.3 },
  );
  const label: React.CSSProperties = {
    color: M,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
  };
  const title: React.CSSProperties = {
    fontFamily: headline,
    fontSize: 68,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-.03em",
  };
  const foot = (
    <div
      style={{
        position: "absolute",
        left: 100,
        right: 150,
        top: 1360,
        fontSize: 25,
        lineHeight: 1.35,
        color: M,
      }}
    >
      {DISCLAIMER}
    </div>
  );

  if (o.kind === "reel-case-photo") {
    const scale = interpolate(f, [0, Math.max(1, dur)], [1, 1.035], clamp);
    return (
      <AbsoluteFill style={{ background: V, color: P, fontFamily: font }}>
        <div style={{ position: "absolute", top: 275, left: 90, right: 150 }}>
          <div style={label}>Historia Andrzeja</div>
          <div
            style={{
              ...title,
              fontSize: 60,
              marginTop: 24,
              opacity: progress(0.05),
              transform: `translateY(${(1 - progress(0.05)) * 20}px)`,
            }}
          >
            {o.title}
          </div>
        </div>
        <div style={{ position: "absolute", left: 90, top: 476, width: 840 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: 16,
              fontSize: 27,
              fontWeight: 700,
            }}
          >
            <span>Przed</span>
            <span style={{ color: L }}>Po</span>
          </div>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <PrivatePhoto src={src(o.src!)} />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 100,
            right: 150,
            top: 1078,
            fontSize: 23,
            lineHeight: 1.4,
            color: M,
          }}
        >
          {o.label}
        </div>
        {foot}
      </AbsoluteFill>
    );
  }

  if (o.kind === "reel-case-compare")
    return (
      <AbsoluteFill style={{ color: P, fontFamily: font }}>
        <div
          style={{
            position: "absolute",
            left: 86,
            right: 150,
            bottom: 480,
            background: V,
            borderRadius: 24,
            padding: 30,
            border: "1px solid rgba(217,249,157,.25)",
            opacity: progress(0),
          }}
        >
          <div style={{ ...label, fontSize: 23, marginBottom: 20 }}>
            Porównanie jakościowe · opis z nagrania
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}
          >
            {[o.left, o.right].map((col, i) => (
              <div
                key={i}
                style={{ background: V2, borderRadius: 18, padding: 22 }}
              >
                <div
                  style={{
                    fontFamily: headline,
                    fontSize: 36,
                    fontWeight: 800,
                    marginBottom: 18,
                    color: i ? L : P,
                  }}
                >
                  {col?.title}
                </div>
                {col?.items.map((it, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: 30,
                      lineHeight: 1.25,
                      marginTop: 16,
                      opacity: progress(0.15 + j * 0.3),
                      transform: `translateY(${(1 - progress(0.15 + j * 0.3)) * 14}px)`,
                    }}
                  >
                    {typeof it === "string" ? it : it.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{ fontSize: 23, lineHeight: 1.35, marginTop: 22, color: M }}
          >
            {DISCLAIMER}
          </div>
        </div>
      </AbsoluteFill>
    );

  if (o.kind === "reel-case-plan" || o.kind === "reel-case-outcomes")
    return (
      <AbsoluteFill style={{ background: V, color: P, fontFamily: font }}>
        <div style={{ position: "absolute", left: 90, right: 150, top: 275 }}>
          <div style={label}>
            {o.kind === "reel-case-plan"
              ? "Po badaniach i ocenie zdrowia"
              : "Historia jednej osoby · według nagrania"}
          </div>
          <div style={{ ...title, marginTop: 24 }}>{o.title}</div>
          <div style={{ marginTop: 54 }}>
            {allItems.map((it, i) => {
              const p = progress(it.time);
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 25,
                    padding: "26px 25px",
                    marginTop: 20,
                    background: V2,
                    borderRadius: 24,
                    opacity: p,
                    transform: `translateX(${(1 - p) * 35}px)`,
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      flexShrink: 0,
                      background: L,
                      color: V,
                      fontFamily: headline,
                      fontSize: 38,
                      fontWeight: 800,
                    }}
                  >
                    {o.kind === "reel-case-plan" ? i + 1 : i ? "↑" : "↓"}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: headline,
                        fontSize: 41,
                        fontWeight: 700,
                        lineHeight: 1.15,
                      }}
                    >
                      {it.text}
                    </div>
                    {it.sub && (
                      <div style={{ color: M, fontSize: 27, marginTop: 8 }}>
                        {it.sub}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {o.label && (
            <div
              style={{ fontSize: 27, lineHeight: 1.4, color: M, marginTop: 30 }}
            >
              {o.label}
            </div>
          )}
        </div>
        {foot}
      </AbsoluteFill>
    );

  if (o.kind === "reel-case-cta")
    return (
      <AbsoluteFill style={{ background: V, color: P, fontFamily: font }}>
        <div style={{ position: "absolute", left: 90, right: 150, top: 250 }}>
          <div style={label}>Zacznij od rozmowy</div>
          <div style={{ ...title, marginTop: 30, fontSize: 76 }}>
            Omów swoją
            <br />
            sytuację
          </div>
          <div
            style={{
              width: 100,
              height: 6,
              background: L,
              borderRadius: 3,
              marginTop: 42,
              transform: `scaleX(${progress(0.15)})`,
              transformOrigin: "left",
            }}
          />
          <div
            style={{
              marginTop: 45,
              background: V2,
              borderRadius: 28,
              padding: 30,
              display: "flex",
              alignItems: "baseline",
              gap: 24,
            }}
          >
            <span
              style={{
                fontFamily: headline,
                fontWeight: 800,
                fontSize: 118,
                color: L,
              }}
            >
              15
            </span>
            <span style={{ fontSize: 40, fontWeight: 700 }}>
              minut
              <br />
              <span style={{ fontSize: 28, fontWeight: 400, color: M }}>
                darmowa konsultacja
              </span>
            </span>
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 36,
              padding: "24px 38px",
              borderRadius: 80,
              background: L,
              color: V,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            Umów konsultację →
          </div>
          <div style={{ fontSize: 39, fontWeight: 700, marginTop: 24 }}>
            vital-hormone.pl/lp/
          </div>
        </div>
        {foot}
      </AbsoluteFill>
    );
  return null;
};
