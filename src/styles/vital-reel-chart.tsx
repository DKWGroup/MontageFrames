import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { OverlayProps } from "./bisanz";

// Kompaktowe wykresy rolek Vital: podpis badania jest częścią karty, poniżej danych.
export const VitalReelChart: React.FC<OverlayProps> = ({ o, dur, at }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const enter = interpolate(f, [0, 12], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const exit = interpolate(f, [dur - 7, dur], [1, 0], clamp);
  const number = (n: number, decimals = 0) =>
    n.toLocaleString("pl-PL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  const p = interpolate(f, [6, 36], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const max = o.max ?? Math.max(1, ...(o.data ?? []).map((d) => d.value));
  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.47,
        bottom: height * 0.25,
        width: width * 0.78,
        padding: "28px 34px",
        boxSizing: "border-box",
        borderRadius: 24,
        background: "#230C4A",
        border: "1px solid rgba(217,249,157,.25)",
        color: "#F8F9FA",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        opacity: enter * exit,
        transform: `translateX(-50%) translateY(${(1 - enter) * 45}px)`,
        boxShadow: "0 20px 55px rgba(26,28,29,.38)",
      }}
    >
      {o.title && (
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: ".07em",
            marginBottom: 18,
          }}
        >
          {o.title}
        </div>
      )}
      {o.type === "counter" ? (
        <>
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: 104,
              lineHeight: 1.04,
              fontWeight: 800,
              color: "#D9F99D",
              letterSpacing: "-.03em",
            }}
          >
            {o.prefix}
            {number((o.to ?? 0) * p, o.decimals ?? 0)}
            {o.suffix}
          </div>
          {o.label && (
            <div style={{ fontSize: 30, lineHeight: 1.3, marginTop: 10 }}>
              {o.label}
            </div>
          )}
        </>
      ) : (
        <>
          {(o.data ?? []).map((d, i) => {
            const t = d.at != null ? at(d.at) : 0.2 + i * 0.45;
            const grow = interpolate(f / fps, [t, t + 0.85], [0, 1], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div key={i} style={{ marginTop: i ? 20 : 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 20,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{d.label}</span>
                  <span
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 800,
                      fontSize: 48,
                      color: "#D9F99D",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {number(d.value * grow, o.decimals ?? 0)}
                    {o.suffix}
                  </span>
                </div>
                <div
                  style={{
                    height: 17,
                    borderRadius: 12,
                    background: "rgba(248,249,250,.15)",
                  }}
                >
                  <div
                    style={{
                      width: `${((100 * d.value) / max) * grow}%`,
                      height: "100%",
                      background:
                        i === (o.highlight ?? 0) ? "#D9F99D" : "#B9B3C9",
                      borderRadius: 12,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {o.label && (
            <div style={{ fontSize: 25, lineHeight: 1.3, marginTop: 20 }}>
              {o.label}
            </div>
          )}
        </>
      )}
      <div
        style={{
          color: "#B9B3C9",
          fontSize: 22,
          lineHeight: 1.35,
          marginTop: 18,
        }}
      >
        Źródło: {o.source}
      </div>
    </div>
  );
};
