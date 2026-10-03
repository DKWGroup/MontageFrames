import "./index.css";
import { Composition, getStaticFiles } from "remotion";
import { calculateReelMetadata, Reel } from "./Reel";

// Każdy folder public/reels/<nazwa>/ z reel.json = osobna kompozycja w panelu bocznym Studio.
export const RemotionRoot: React.FC = () => (
  <>
    {getStaticFiles()
      .map((f) => f.name.match(/^reels\/([a-z0-9-]+)\/reel\.json$/)?.[1])
      .filter((name): name is string => Boolean(name))
      .map((name) => (
        <Composition
          key={name}
          id={name}
          component={Reel}
          calculateMetadata={calculateReelMetadata}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={1}
          defaultProps={{ reel: name }}
        />
      ))}
  </>
);
