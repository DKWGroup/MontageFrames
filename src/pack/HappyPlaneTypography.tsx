import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  continueRender,
  delayRender,
  cancelRender,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { gsap } from "gsap";
import { loadFonts } from "../fonts";

// Szybki start i długa, miękka końcówka: rzeczywista krzywa cubic-bezier.
const bezier =
  (x1: number, y1: number, x2: number, y2: number) => (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const val = (t: number, a: number, b: number) =>
      3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      if (val(m, x1, x2) < p) lo = m;
      else hi = m;
    }
    return val((lo + hi) / 2, y1, y2);
  };
const arrive = bezier(0.16, 1, 0.3, 1),
  depart = bezier(0.7, 0, 0.84, 0.3);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const extrusion = Array.from(
  { length: 18 },
  (_, i) =>
    `${(i + 1) * 0.65}px ${(i + 1) * 0.95}px 0 rgb(2,${66 + i},${156 + i * 2})`,
).join(",");

const Lettering: React.FC<{
  word: string;
  x: number;
  y: number;
  roll: number;
  depth: number;
  scale: number;
}> = ({ word, x, y, roll, depth, scale }) => (
  <div
    style={{
      position: "absolute",
      left: 105,
      top: y,
      width: 1710,
      height: 395,
      perspective: 1500,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        transform: `translateX(${x}px) perspective(1500px) rotateX(${depth}deg) rotateZ(${roll}deg) scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <svg
        width="1710"
        height="395"
        viewBox="0 0 1710 395"
        style={{
          overflow: "visible",
          filter: "drop-shadow(5px 18px 15px rgba(0,35,100,.24))",
        }}
      >
        <text
          x="12"
          y="335"
          fill="#FFFFFF"
          textLength="1630"
          lengthAdjust="spacingAndGlyphs"
          style={{
            fontFamily: "Inter",
            fontWeight: 900,
            fontSize: 344,
            letterSpacing: -13,
            textShadow: extrusion,
          }}
        >
          {word}
        </text>
      </svg>
    </div>
  </div>
);

const Ribbon: React.FC<{
  x: number;
  y: number;
  angle: number;
  width: number;
  flip?: boolean;
}> = ({ x, y, angle, width, flip }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height: 125,
      perspective: 1200,
      transform: `rotate(${angle}deg)`,
      transformOrigin: "center",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `rotateX(${flip ? -24 : 24}deg) rotateY(-12deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "13px -7px -19px 12px",
          borderRadius: 46,
          background: "#03469F",
          boxShadow: "0 18px 24px rgba(1,38,99,.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 46,
          background:
            "linear-gradient(172deg,#FFFFFF 10%,#F8FBFF 55%,#C6D9F5 100%)",
          boxShadow:
            "inset 0 3px 1px rgba(255,255,255,.95),inset 0 -3px 3px rgba(34,93,170,.18)",
        }}
      />
    </div>
  </div>
);

const Transition: React.FC = () => {
  const f = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = f / fps;
  const [fontHandle] = useState(() =>
    delayRender("Inter Black — Kacper Bisanz"),
  );
  useEffect(() => {
    loadFonts([{ family: "Inter", file: "fonts/Inter.ttf", weight: "100 900" }])
      .then(() => continueRender(fontHandle))
      .catch(cancelRender);
  }, [fontHandle]);
  const rig = useMemo(() => {
    const s = {
      top: -1550,
      bottom: 1550,
      firstX: -1950,
      secondX: 1950,
      firstRoll: -9,
      secondRoll: -9,
      firstDepth: 58,
      secondDepth: -58,
      planeX: 2700,
      planeY: 600,
      planeScale: 0.62,
      planeBank: 13,
      railA: -1550,
      railB: 2350,
      cubeX: 2450,
    };
    const tl = gsap.timeline({ paused: true });
    tl.to(s, { top: 0, duration: 0.44, ease: arrive }, 0.035)
      .to(s, { bottom: 0, duration: 0.44, ease: arrive }, 0.075)
      .to(
        s,
        {
          firstX: 0,
          firstRoll: 0,
          firstDepth: 0,
          duration: 0.56,
          ease: arrive,
        },
        0.145,
      )
      .to(
        s,
        {
          secondX: 0,
          secondRoll: 0,
          secondDepth: 0,
          duration: 0.56,
          ease: arrive,
        },
        0.215,
      )
      .to(s, { railA: -260, duration: 0.64, ease: arrive }, 0.1)
      .to(s, { railB: 1530, duration: 0.72, ease: arrive }, 0.16)
      .to(s, { cubeX: 1820, duration: 0.75, ease: arrive }, 0.28)
      .to(
        s,
        {
          planeX: 1260,
          planeY: 590,
          planeScale: 0.88,
          planeBank: -4,
          duration: 0.38,
          ease: arrive,
        },
        0.025,
      )
      .to(
        s,
        {
          planeX: -1400,
          planeY: 255,
          planeScale: 1.35,
          planeBank: -16,
          duration: 0.48,
          ease: "power2.in",
        },
        0.405,
      )
      .to(
        s,
        {
          firstX: -2350,
          firstRoll: -8,
          firstDepth: -28,
          duration: 0.65,
          ease: depart,
        },
        1.69,
      )
      .to(
        s,
        {
          secondX: 2350,
          secondRoll: -8,
          secondDepth: 28,
          duration: 0.63,
          ease: depart,
        },
        1.75,
      )
      .to(s, { railA: -1800, duration: 0.62, ease: depart }, 1.67)
      .to(s, { railB: 2500, cubeX: 2500, duration: 0.66, ease: depart }, 1.7)
      .to(s, { top: -1550, duration: 0.68, ease: depart }, 1.72)
      .to(s, { bottom: 1550, duration: 0.67, ease: depart }, 1.77);
    return { s, tl };
  }, []);
  rig.tl.time(t, true);
  const s = rig.s;
  // Spokojny ruch kamery podtrzymuje przepływ pomiędzy wejściem a wyjściem.
  const drift = bezier(0.33, 0, 0.67, 1)(clamp((t - 0.56) / 1.32)),
    camera = 1 + 0.036 * drift;
  const opacity = clamp(t / 0.045) * clamp((2.48 - t) / 0.1);
  const planeOpacity = clamp((t - 0.02) / 0.045) * clamp((0.91 - t) / 0.07);
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <div
        style={{
          position: "absolute",
          left: -550,
          top: -180 + s.top,
          width: 3020,
          height: 835,
          background: "#066FED",
          transform: "rotate(-7deg)",
          boxShadow: "0 28px 35px rgba(0,27,80,.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -550,
          top: 425 + s.bottom,
          width: 3020,
          height: 835,
          background: "#066FED",
          transform: "rotate(-7deg)",
          boxShadow: "0 -9px 22px rgba(0,27,80,.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${camera}) translate(${(drift - 0.5) * -15}px,${(drift - 0.5) * -9}px)`,
        }}
      >
        <Ribbon
          x={s.railB + drift * 18}
          y={-48 + drift * 16}
          angle={-18 - drift * 3}
          width={640}
        />
        <Ribbon
          x={s.railA - drift * 24}
          y={984 - drift * 14}
          angle={-13 + drift * 2}
          width={1110}
          flip
        />
        <div
          style={{
            position: "absolute",
            left: s.cubeX - drift * 22,
            top: 470 + drift * 35,
            width: 225,
            height: 225,
            transform: `perspective(900px) rotateY(${-32 + drift * 12}deg) rotateX(${20 + drift * 8}deg) rotateZ(${-24 + drift * 8}deg)`,
            borderRadius: 42,
            background: "linear-gradient(145deg,#FFFFFF,#D5E3F9)",
            boxShadow: "18px 24px 0 #06479F,28px 44px 30px rgba(0,30,90,.26)",
          }}
        />
        <Lettering
          word="KACPER"
          x={s.firstX - 26 * drift}
          y={92 - 9 * drift}
          roll={s.firstRoll}
          depth={s.firstDepth}
          scale={1 + 0.015 * drift}
        />
        <Lettering
          word="BISANZ"
          x={s.secondX + 26 * drift}
          y={450 + 9 * drift}
          roll={s.secondRoll}
          depth={s.secondDepth}
          scale={1 + 0.015 * drift}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: s.planeX,
          top: s.planeY,
          width: 1260,
          opacity: planeOpacity,
          transform: `translate(-50%,-50%) perspective(1600px) rotateY(-8deg) rotateZ(${s.planeBank}deg) scale(${s.planeScale})`,
          filter: "drop-shadow(18px 25px 17px rgba(0,28,70,.25))",
        }}
      >
        <Img
          src={staticFile("happy-plane-transition/happy-plane.png")}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>
    </AbsoluteFill>
  );
};
const Root: React.FC = () => (
  <Composition
    id="HappyPlaneTransition"
    component={Transition}
    width={1920}
    height={1080}
    fps={50}
    durationInFrames={125}
  />
);
registerRoot(Root);
