import React from "react";
import { Img, staticFile } from "remotion";

/** A gently floating aircraft window, photographed landscape from bisanz.pl. */
export const BisanzTravelWindow: React.FC<{ t: number }> = ({ t }) => {
  const drift = Math.sin(t * 0.7) * 9;
  return (
    <div
      style={{
        position: "absolute",
        left: 1150,
        top: 58 + drift,
        width: 660,
        height: 946,
        transform: `perspective(1800px) rotateY(${-12 + Math.sin(t * 0.5) * 2}deg) rotateZ(8deg)`,
        borderRadius: "46% 46% 45% 45% / 30% 30% 31% 31%",
        padding: 24,
        background:
          "linear-gradient(128deg,#BDDFFF 0%,#4BA2FA 15%,#0A64CA 29%,#023A8E 56%,#002962 75%,#63ADFA 97%)",
        boxShadow:
          "26px 39px 54px rgba(0,24,72,.36),inset 3px 3px 5px rgba(255,255,255,.6),inset -7px -6px 12px rgba(0,15,57,.6)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 20,
          borderRadius: "inherit",
          overflow: "hidden",
          border: "7px solid #072B59",
          boxShadow:
            "0 0 0 2px rgba(188,220,255,.46),inset 0 0 18px rgba(0,0,0,.7)",
          background: "#073D7D",
        }}
      >
        <Img
          src={staticFile("happy-plane-transition/bisanz-dolomites.jpeg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "49% center",
            transform: `scale(${1.07 + t * 0.009}) translateX(${-t * 3}px)`,
            filter: "saturate(.88) contrast(1.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(130deg,rgba(209,232,255,.17),transparent 32%,transparent 78%,rgba(0,25,70,.14))",
            boxShadow: "inset 8px 4px 22px rgba(0,18,53,.28)",
          }}
        />
      </div>
    </div>
  );
};
