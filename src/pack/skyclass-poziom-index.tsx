// Rolki z long formu „skyclass poziom” (2026-11-04): standardowy Reel w stylu bisanz, dane z dysku zewnętrznego (publicDir).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { Reel, calculateReelMetadata } from "../Reel";

const Root: React.FC = () => (
  <Composition
    id="SkyPoziomReel"
    component={Reel}
    calculateMetadata={calculateReelMetadata}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={1}
    defaultProps={{ reel: "" }}
  />
);
registerRoot(Root);
