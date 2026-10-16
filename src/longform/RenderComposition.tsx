import { Composition, type CalculateMetadataFunction } from "remotion";
import { loadSfx, Reel, reelFrames, type ReelProps } from "../Reel";
import { reelDimensions } from "../reel-timing";

// Render LongForm z zamrożonych danych (snapshot reel.json): wymiary z `format`, SFX z rejestru.
const metadata: CalculateMetadataFunction<ReelProps> = async ({ props }) => ({
  fps: props.data?.fps ?? 30,
  durationInFrames: props.data ? reelFrames(props.data) : 1,
  ...(props.data ? reelDimensions(props.data) : {}),
  props: { ...props, sfx: props.data ? await loadSfx(props.data) : [] },
});
export const LongFormRenderCompositions: React.FC = () => (
  <Composition id="LongFormRender" component={Reel} calculateMetadata={metadata} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{ reel: "" }} />
);
