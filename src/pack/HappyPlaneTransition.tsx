import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { gsap } from "gsap";

// Samolot dostarczony przez klientkę, bez lustrzanego odbicia znaków.
const BLUE = [6, 111, 237];
type V3 = [number, number, number];
type Face = { points: string; color: string; depth: number };
const turn = (p: V3, ax: number, ay: number, az: number): V3 => {
  const [x, y, z] = p;
  const y1 = y * Math.cos(ax) - z * Math.sin(ax),
    z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x2 = x * Math.cos(ay) + z1 * Math.sin(ay),
    z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  return [
    x2 * Math.cos(az) - y1 * Math.sin(az),
    x2 * Math.sin(az) + y1 * Math.cos(az),
    z2,
  ];
};

// Prawdziwa geometria torusa, projekcja perspektywiczna i światło na normalnych.
const ringFaces = (
  t: number,
  radius: number,
  tube: number,
  white: boolean,
): Face[] => {
  const ax = 0.98 + 0.07 * Math.sin(t * 1.4),
    ay = -0.3 + 0.09 * Math.sin(t),
    az = -0.23 - 0.05 * t;
  const N = 160,
    M = 32;
  const vertex = (u: number, v: number) => {
    const c = Math.cos(v),
      s = Math.sin(v);
    const p = turn(
      [
        (radius + tube * c) * Math.cos(u),
        (radius + tube * c) * Math.sin(u),
        tube * s,
      ],
      ax,
      ay,
      az,
    );
    const n = turn([c * Math.cos(u), c * Math.sin(u), s], ax, ay, az);
    const f = 1500 / (1500 - p[2]);
    return { xy: [p[0] * f, p[1] * f], p, n };
  };
  const faces: Face[] = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M; j++) {
      const a = vertex((i / N) * Math.PI * 2, (j / M) * Math.PI * 2),
        b = vertex(((i + 1) / N) * Math.PI * 2, (j / M) * Math.PI * 2),
        c = vertex(((i + 1) / N) * Math.PI * 2, ((j + 1) / M) * Math.PI * 2),
        d = vertex((i / N) * Math.PI * 2, ((j + 1) / M) * Math.PI * 2);
      const n = turn(
        [
          Math.cos(((j + 0.5) / M) * Math.PI * 2) *
            Math.cos(((i + 0.5) / N) * Math.PI * 2),
          Math.cos(((j + 0.5) / M) * Math.PI * 2) *
            Math.sin(((i + 0.5) / N) * Math.PI * 2),
          Math.sin(((j + 0.5) / M) * Math.PI * 2),
        ],
        ax,
        ay,
        az,
      );
      const diffuse = Math.max(0, -0.35 * n[0] - 0.65 * n[1] + 0.67 * n[2]);
      const shine =
        Math.pow(Math.max(0, -0.2 * n[0] - 0.42 * n[1] + 0.88 * n[2]), 20) *
        0.55;
      const base = white ? [235, 242, 252] : BLUE;
      const rgb = base.map((v, k) =>
        Math.min(
          255,
          Math.round(
            v * (0.58 + diffuse * 0.55) +
              (255 - v) * shine +
              (white ? 0 : [0, 6, 15][k]),
          ),
        ),
      );
      faces.push({
        points: [a, b, c, d]
          .map((v) => v.xy.map((n) => n.toFixed(2)).join(","))
          .join(" "),
        color: `rgb(${rgb.join(",")})`,
        depth: (a.p[2] + b.p[2] + c.p[2] + d.p[2]) / 4,
      });
    }
  return faces.sort((a, b) => a.depth - b.depth);
};

const Transition: React.FC = () => {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = frame / fps;
  const rig = useMemo(() => {
    const s = {
      panelX: 3600,
      planeX: 2700,
      planeY: 680,
      scale: 0.5,
      yaw: -14,
      bank: 11,
      opacity: 0,
    };
    const tl = gsap.timeline({ paused: true });
    tl.to(s, { panelX: 0, duration: 0.86, ease: "power3.inOut" }, 0.02)
      .to(s, { panelX: -3600, duration: 0.94, ease: "power3.inOut" }, 1.56)
      .to(s, { opacity: 1, duration: 0.1, ease: "power1.out" }, 0.05)
      .to(
        s,
        {
          planeX: 1070,
          planeY: 556,
          scale: 0.96,
          yaw: -3,
          bank: -3,
          duration: 0.94,
          ease: "power3.out",
        },
        0.03,
      )
      .to(
        s,
        {
          planeX: 880,
          planeY: 532,
          scale: 1.035,
          yaw: 2,
          bank: -5,
          duration: 0.61,
          ease: "sine.inOut",
        },
        0.97,
      )
      .to(
        s,
        {
          planeX: -1350,
          planeY: 250,
          scale: 1.22,
          yaw: 8,
          bank: -12,
          duration: 0.86,
          ease: "power3.in",
        },
        1.58,
      );
    return { s, tl };
  }, []);
  rig.tl.time(t, true);
  const s = rig.s;
  const blueRing = ringFaces(t, 405, 13, false),
    whiteRing = ringFaces(t + 0.1, 472, 7, true);
  const planeWidth = 1180;
  const active = Math.max(0, Math.min(1, (t - 0.02) / 0.12));
  const speed =
    t < 0.97
      ? Math.pow(Math.max(0, 1 - (t - 0.03) / 0.94), 3) * 6300
      : t > 1.58
        ? Math.pow(Math.min(1, (t - 1.58) / 0.86), 2) * 7000
        : 200;
  const blur = Math.min(5, speed / 1800);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 960 + s.panelX,
          top: 540,
          width: 3460,
          height: 2360,
          transform: "translate(-50%,-50%) rotate(-13deg)",
          borderRadius: 650,
          background: "#066FED",
          boxShadow: "inset 0 0 0 3px rgba(255,255,255,.32)",
          opacity: active,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1070 + s.panelX,
          top: 540,
          width: 3460,
          height: 2360,
          transform: "translate(-50%,-50%) rotate(-13deg)",
          borderRadius: 650,
          background:
            "radial-gradient(ellipse at 55% 28%,#FFFFFF 20%,#F7FAFF 65%,#E9F0FC 100%)",
          boxShadow:
            "-13px 0 34px rgba(0,44,113,.18),inset 0 0 0 2px rgba(255,255,255,.9)",
          opacity: active,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1000 + s.panelX * 0.77,
          top: 570,
          width: 0,
          height: 0,
          opacity: active,
          transform: `rotate(${(t - 1.25) * 2}deg)`,
        }}
      >
        <svg
          width="1500"
          height="1100"
          viewBox="-750 -550 1500 1100"
          style={{
            position: "absolute",
            left: -750,
            top: -550,
            overflow: "visible",
            filter: "drop-shadow(14px 32px 18px rgba(4,54,131,.16))",
          }}
        >
          <g opacity=".82">
            {whiteRing.map((f, i) => (
              <polygon
                key={i}
                points={f.points}
                fill={f.color}
                stroke={f.color}
                strokeWidth=".45"
              />
            ))}
          </g>
          <g>
            {blueRing.map((f, i) => (
              <polygon
                key={i}
                points={f.points}
                fill={f.color}
                stroke={f.color}
                strokeWidth=".4"
              />
            ))}
          </g>
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          left: s.planeX + 25,
          top: s.planeY + 220,
          width: 950 * s.scale,
          height: 54,
          transform: "translate(-50%,-50%) rotate(-4deg)",
          background:
            "radial-gradient(ellipse,rgba(10,38,73,.17),rgba(10,38,73,0) 70%)",
          filter: "blur(16px)",
          opacity: s.opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: s.planeX,
          top: s.planeY,
          width: planeWidth,
          opacity: s.opacity,
          transform: `translate(-50%,-50%) perspective(1800px) rotateZ(${s.bank}deg) rotateY(${s.yaw}deg) rotateX(3deg) scale(${s.scale})`,
          transformStyle: "preserve-3d",
          filter: `drop-shadow(20px 34px 22px rgba(1,33,80,.22)) blur(${blur.toFixed(3)}px)`,
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
