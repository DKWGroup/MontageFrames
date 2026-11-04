import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFonts } from "../fonts";

const W = 1920;
const H = 1080;
const BLUE = "#066FED";
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const flightEase = Easing.bezier(0.22, 0.66, 0.32, 1);
const textEase = Easing.bezier(0.16, 0.78, 0.3, 1);

// A single ascending route drives both flights and their diagonal wipe edges.
// The right-facing bitmap is kept in its natural proportions without mirroring.
const flight = (progress: number) => {
  const p = flightEase(clamp(progress));
  return { x: -650 + 3400 * p, y: 742 - 390 * p };
};

const Transition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const [fontHandle] = useState(() => delayRender("Inter 700 — Bisanz blue"));

  useEffect(() => {
    loadFonts([{ family: "Inter", file: "fonts/Inter.ttf", weight: "100 900" }])
      .then(() => continueRender(fontHandle))
      .catch((error: unknown) =>
        cancelRender(error instanceof Error ? error : new Error(String(error))),
      );
  }, [fontHandle]);

  const first = flight(t / 0.84);
  const second = flight((t - 1.6) / 0.88);
  // At the top the edge leads the bottom by 280 px: lower-left to upper-right.
  const edge = (x: number) => ({ top: x + 140, bottom: x - 140 });
  const reveal = edge(first.x);
  const erase = edge(second.x);
  const leftTop = t < 1.6 ? -1000 : erase.top;
  const leftBottom = t < 1.6 ? -1000 : erase.bottom;
  const rightTop = t >= 0.84 ? W + 1000 : reveal.top;
  const rightBottom = t >= 0.84 ? W + 1000 : reveal.bottom;
  const boardClip = `polygon(${leftTop}px 0, ${rightTop}px 0, ${rightBottom}px ${H}px, ${leftBottom}px ${H}px)`;
  const textIn = textEase(clamp((t - 0.12) / 0.58));
  // This tiny continuing drift makes the reading interval feel alive, not held.
  const drift = textEase(clamp((t - 0.64) / 1.4));
  const plane = t < 1.2 ? first : second;
  const showPlane = t < 0.84 || (t >= 1.6 && t < 2.48);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        opacity: frame === 0 || frame === durationInFrames - 1 ? 0 : 1,
      }}
    >
      <AbsoluteFill style={{ clipPath: boardClip, backgroundColor: BLUE }}>
        <div
          style={{
            position: "absolute",
            left: 174,
            top: 288,
            color: "#FFFFFF",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 208,
            lineHeight: 0.99,
            letterSpacing: "-0.03em",
            transform: `translate(${(1 - textIn) * 65 + drift * 8}px, ${(1 - textIn) * 26 - drift * 10}px)`,
          }}
        >
          <div>Kacper</div>
          <div>Bisanz</div>
        </div>
        {/* One simple wing-like cut; no decorative pseudo-3D objects. */}
        <div
          style={{
            position: "absolute",
            right: -135 - drift * 10,
            top: 120 - drift * 12,
            width: 550,
            height: 840,
            backgroundColor: "rgba(255,255,255,0.12)",
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          }}
        />
      </AbsoluteFill>
      {showPlane ? (
        <Img
          src={staticFile("happy-plane-transition/happy-plane-right.png")}
          style={{
            position: "absolute",
            left: plane.x,
            top: plane.y,
            width: 1040,
            height: "auto",
            transform: "translate(-50%, -50%) rotate(-6.55deg)",
            filter: "drop-shadow(0px 14px 12px rgba(0,31,91,0.16))",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="HappyPlaneTransition"
    component={Transition}
    width={W}
    height={H}
    fps={50}
    durationInFrames={125}
  />
);

registerRoot(Root);
