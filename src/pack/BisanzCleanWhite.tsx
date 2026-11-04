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

const BLUE = "#066FED";
const INK = "#141414";
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 125;
const ease = Easing.bezier(0.18, 0.72, 0.24, 1);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const progress = (time: number, start: number, end: number) =>
  clamp((time - start) / (end - start));

export type BisanzCleanWhiteProps = {
  planeSrc?: string;
  /** Natural width/height ratio; no distortion or reflected logos. */
  planeAspect?: number;
};

/** Clean white reveal. Each plane is physically tied to its wipe boundary. */
export const BisanzCleanWhite: React.FC<BisanzCleanWhiteProps> = ({
  planeSrc = "happy-plane-transition/happy-plane-right.png",
  planeAspect = 1979 / 794,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const [fontHandle] = useState(() => delayRender("Inter 700 — clean white"));
  useEffect(() => {
    loadFonts([{ family: "Inter", file: "fonts/Inter.ttf", weight: "100 900" }])
      .then(() => continueRender(fontHandle))
      .catch((error: unknown) => {
        cancelRender(error instanceof Error ? error : new Error(String(error)));
      });
  }, [fontHandle]);

  // First and last frames are genuinely empty alpha, including the aircraft.
  if (frame === 0 || frame >= DURATION - 1) return null;

  const exiting = time >= 1.65;
  const flightProgress = exiting
    ? progress(time, 1.65, 2.48)
    : progress(time, 0, 0.88);
  // Fast launch, long soft finish, with travel kept monotonic.
  const flight = 0.78 * ease(flightProgress) + 0.22 * flightProgress;
  const noseX = -160 + flight * 3400;
  const boundary = noseX - 230;
  const edgeTop = boundary + 92;
  const edgeBottom = boundary - 92;
  const mask = exiting
    ? `polygon(${edgeTop}px 0, ${WIDTH}px 0, ${WIDTH}px ${HEIGHT}px, ${edgeBottom}px ${HEIGHT}px)`
    : `polygon(0 0, ${edgeTop}px 0, ${edgeBottom}px ${HEIGHT}px, 0 ${HEIGHT}px)`;
  const textProgress = ease(progress(time, 0.18, 0.88));
  const drift = progress(time, 0.88, 1.8);
  const titleX = 48 * (1 - textProgress) - 8 * drift;
  const titleY = 16 * (1 - textProgress) - 6 * drift;
  const lineProgress = ease(progress(time, 0.36, 0.96));
  const planeWidth = 1100;
  const planeHeight = planeWidth / planeAspect;
  const planeVisible = exiting || time < 0.9;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ clipPath: mask }}>
        <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }} />
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: `translate(${titleX}px, ${titleY}px)`,
          }}
        >
          <div
            style={{
              position: "relative",
              color: INK,
              fontFamily: "Inter",
              fontSize: 150,
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
              paddingBottom: 34,
            }}
          >
            Kacper Bisanz
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 4,
                width: `${lineProgress * 100}%`,
                maxWidth: "calc(100% - 8px)",
                height: 5,
                backgroundColor: BLUE,
              }}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      {/* A single blue seam travels with the nose; no decorative geometry. */}
      {boundary > -110 && boundary < WIDTH + 110 ? (
        <div
          style={{
            position: "absolute",
            left: boundary - 3,
            top: -20,
            width: 6,
            height: HEIGHT + 40,
            backgroundColor: BLUE,
            transform: "skewX(-9.67deg)",
          }}
        />
      ) : null}
      {planeVisible ? (
        <Img
          src={staticFile(planeSrc)}
          style={{
            position: "absolute",
            left: noseX - planeWidth * 0.96,
            top:
              HEIGHT * 0.5 -
              planeHeight * 0.5 -
              24 * Math.sin(Math.PI * flightProgress),
            width: planeWidth,
            height: planeHeight,
            objectFit: "contain",
            transform: `rotate(${-2 + 2 * flightProgress}deg)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const BisanzCleanWhiteRoot: React.FC = () => (
  <Composition
    id="HappyPlaneTransition"
    component={BisanzCleanWhite}
    width={WIDTH}
    height={HEIGHT}
    fps={50}
    durationInFrames={DURATION}
    defaultProps={{ planeAspect: 1979 / 794 }}
  />
);

registerRoot(BisanzCleanWhiteRoot);
