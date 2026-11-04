import React from "react";
import { Composition, registerRoot } from "remotion";
import { BisanzFusion } from "./BisanzFusion";
const Root: React.FC = () => (
  <Composition
    id="HappyPlaneTransition"
    component={BisanzFusion}
    width={1920}
    height={1080}
    fps={50}
    durationInFrames={125}
    defaultProps={{ variant: "travel" as const }}
  />
);
registerRoot(Root);
