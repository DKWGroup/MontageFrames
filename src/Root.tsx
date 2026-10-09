// Rejestr synchronizowany automatycznie; defaultProps zapisuje także Studio.
import "./index.css";
import { Composition } from "remotion";
import { calculateReelMetadata } from "./Reel";
import { StudioReel as Reel0 } from "./studio/alicante";
import { StudioReel as Reel1 } from "./studio/bisanz-ksiazulo";
import { StudioReel as Reel2 } from "./studio/demo";
import { StudioReel as Reel3 } from "./studio/glowup-4";
import { StudioReel as Reel4 } from "./studio/jeep-grand";
import { StudioReel as Reel5 } from "./studio/lot-na-cypr";
import { StudioReel as Reel6 } from "./studio/magdalena-herod-1";
import { StudioReel as Reel7 } from "./studio/magdalena-herod-2";
import { StudioReel as Reel8 } from "./studio/magdalena-herod-3";
import { StudioReel as Reel9 } from "./studio/magdalena-herod-4";
import { StudioReel as Reel10 } from "./studio/magdalena-herod-5";
import { StudioReel as Reel11 } from "./studio/magdalena-herod-6";
import { StudioReel as Reel12 } from "./studio/magdalena-herod-7";
import { StudioReel as Reel13 } from "./studio/magdalena-herod-8";
import { StudioReel as Reel14 } from "./studio/pokazowka";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="alicante" component={Reel0} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"alicante"}} />
    <Composition id="bisanz-ksiazulo" component={Reel1} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"bisanz-ksiazulo"}} />
    <Composition id="demo" component={Reel2} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"demo"}} />
    <Composition id="glowup-4" component={Reel3} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"glowup-4"}} />
    <Composition id="jeep-grand" component={Reel4} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"jeep-grand"}} />
    <Composition id="lot-na-cypr" component={Reel5} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"lot-na-cypr"}} />
    <Composition id="magdalena-herod-1" component={Reel6} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-1"}} />
    <Composition id="magdalena-herod-2" component={Reel7} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-2"}} />
    <Composition id="magdalena-herod-3" component={Reel8} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-3"}} />
    <Composition id="magdalena-herod-4" component={Reel9} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-4"}} />
    <Composition id="magdalena-herod-5" component={Reel10} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-5"}} />
    <Composition id="magdalena-herod-6" component={Reel11} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-6"}} />
    <Composition id="magdalena-herod-7" component={Reel12} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-7"}} />
    <Composition id="magdalena-herod-8" component={Reel13} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"magdalena-herod-8"}} />
    <Composition id="pokazowka" component={Reel14} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{"reel":"pokazowka"}} />
  </>
);
