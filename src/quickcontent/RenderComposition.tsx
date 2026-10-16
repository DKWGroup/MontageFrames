import { Composition, type CalculateMetadataFunction } from "remotion";
import { Reel, reelFrames, type ReelProps } from "../Reel";

const metadata: CalculateMetadataFunction<ReelProps> = ({ props }) => ({
  fps: props.data?.fps ?? 30,
  durationInFrames: props.data ? reelFrames(props.data) : 1,
  props,
});
// The render worker supplies frozen data; generated Studio templates never enter this composition.
export const QuickContentRenderCompositions: React.FC = () => (
  <Composition
    id="QuickContentRender"
    component={Reel}
    calculateMetadata={metadata}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={1}
    defaultProps={{ reel: "" }}
  />
);
