import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFonts } from "../fonts";
import { BisanzSculpture } from "./BisanzSculpture";
import { BisanzTravelWindow } from "./BisanzTravelWindow";

export type FusionProps = { variant: "orbit" | "ribbon" | "travel" };
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const p = (t: number, start: number, duration: number) =>
  clamp((t - start) / duration);
const settle = Easing.bezier(0.16, 1, 0.3, 1);
const sweep = Easing.bezier(0.66, 0, 0.22, 1);
const departure = Easing.bezier(0.22, 0.66, 0.32, 1);

export const BisanzFusion: React.FC<FusionProps> = ({ variant }) => {
  const frame = useCurrentFrame();
  const t = frame / 50;
  const [handle] = useState(() => delayRender("Bisanz Inter 700"));
  useEffect(() => {
    loadFonts([{ family: "Inter", file: "fonts/Inter.ttf", weight: "100 900" }])
      .then(() => continueRender(handle))
      .catch((e) => cancelRender(e));
  }, [handle]);
  if (frame === 0 || frame === 124) return null;
  const isOrbit = variant === "orbit";
  const entrance = sweep(p(t, 0.015, 0.68));
  const leaving = t >= 1.62;
  const exit = departure(p(t, 1.62, 0.86));
  const edge = leaving ? -650 + 3400 * exit : 2320 - 2900 * entrance;
  // Rounded, moving leading edge, rather than a triangle or a white slab.
  const shape = `M ${edge + 90} -150 C ${edge - 330} 180 ${edge - 260} 710 ${edge + 35} 1230 L 3100 1230 L 3100 -150 Z`;
  const titleIn = settle(p(t, 0.31, 0.55));
  const lowerIn = settle(p(t, 0.4, 0.55));
  const ambient = p(t, 0.8, 1.3);
  const planeIn = sweep(p(t, 0.015, 0.93));
  const plane = leaving
    ? { x: -650 + 3400 * exit, y: 742 - 390 * exit }
    : { x: 2530 - 3440 * planeIn, y: 490 - 70 * Math.sin(Math.PI * planeIn) };
  const showPlane = leaving ? t < 2.48 : t < 0.96;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <clipPath id="fusion-mask">
            <path d={shape} />
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill
        style={{
          clipPath: "url(#fusion-mask)",
          background: isOrbit
            ? "radial-gradient(ellipse at 84% 28%,#1387FF 0%,#066FED 37%,#064EBC 76%,#073A8C 100%)"
            : "radial-gradient(ellipse at 75% 65%,#0879F8 0%,#066FED 45%,#053F9F 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate(${32 * (1 - titleIn) - ambient * 9}px,${25 * (1 - titleIn)}px)`,
          }}
        >
          {variant === "travel" ? (
            <BisanzTravelWindow t={t} />
          ) : (
            <BisanzSculpture variant={variant} t={t} />
          )}
        </div>
        <div
          style={{
            position: "absolute",
            left: isOrbit ? 152 : 164,
            top: isOrbit ? 164 : 174,
            color: "#FFFFFF",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: isOrbit ? 248 : 258,
            lineHeight: 0.96,
            letterSpacing: "-.045em",
          }}
        >
          <div style={{ clipPath: "inset(-30px -80px -12px -20px)" }}>
            <div
              style={{
                transform: `translateY(${(1 - titleIn) * 240 - ambient * 4}px)`,
              }}
            >
              Kacper
            </div>
          </div>
          <div style={{ clipPath: "inset(-10px -80px -12px -20px)" }}>
            <div
              style={{
                transform: `translateY(${(1 - lowerIn) * 240 - ambient * 4}px)`,
              }}
            >
              Bisanz
            </div>
          </div>
        </div>
        <svg
          width="850"
          height="65"
          viewBox="0 0 850 65"
          style={{
            position: "absolute",
            left: 164,
            top: isOrbit ? 674 : 704,
            overflow: "visible",
            transform: `translateY(${-4 * ambient}px)`,
          }}
        >
          <defs>
            <linearGradient id="underline" x1="0" x2="1">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#8CC9FF" />
            </linearGradient>
          </defs>
          <path
            d={
              isOrbit
                ? "M 8 32 C 226 4 524 9 801 25"
                : "M 8 24 C 235 40 562 36 802 12"
            }
            fill="none"
            stroke="url(#underline)"
            strokeWidth="10"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - settle(p(t, 0.59, 0.49))}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 174,
            top: isOrbit ? 786 : 816,
            color: "#FFFFFF",
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 36,
            letterSpacing: "-.02em",
            opacity: settle(p(t, 0.66, 0.35)),
            transform: `translateY(${18 * (1 - settle(p(t, 0.66, 0.35))) - ambient * 3}px)`,
          }}
        >
          {isOrbit ? "Więcej możliwości." : "Działaj po swojemu."}
        </div>
      </AbsoluteFill>
      {showPlane ? (
        <Img
          src={staticFile(
            `happy-plane-transition/${leaving ? "happy-plane-right.png" : "happy-plane.png"}`,
          )}
          style={{
            position: "absolute",
            left: plane.x,
            top: plane.y,
            width: leaving ? 1040 : 1180,
            height: "auto",
            transform: `translate(-50%,-50%) perspective(1800px) rotate(${leaving ? -6.55 : 3 - 7 * planeIn}deg) rotateY(${leaving ? 0 : -7 + 10 * planeIn}deg) scale(${leaving ? 1 : 0.78 + 0.25 * planeIn})`,
            filter: "drop-shadow(0px 20px 18px rgba(0,24,80,.22))",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
