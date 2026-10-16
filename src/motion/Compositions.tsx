import { Composition, Folder } from "remotion";
import { Motion, type MotionProps } from "./Motion";
import { buildMotion, dimensions, validateMotion } from "./schema.mjs";
const sample = buildMotion({
  name: "motion-demo",
  brand: "MontageFrames",
  duration: 9,
});
export const MotionCompositions: React.FC = () => (
  <Folder name="Motion-Studio">
    {(["9:16", "1:1", "16:9"] as const).map((format) => {
      const [width, height] = dimensions(format);
      return (
        <Composition
          key={format}
          id={`Motion-${format.replace(":", "x")}`}
          component={Motion}
          defaultProps={{ data: sample, draft: true }}
          fps={30}
          durationInFrames={270}
          width={width}
          height={height}
          calculateMetadata={({ props }: { props: MotionProps }) => {
            const data = validateMotion(props.data);
            return {
              durationInFrames: Math.round(data.duration * data.fps),
              fps: data.fps,
              width,
              height,
              props: { ...props, data },
            };
          }}
        />
      );
    })}
  </Folder>
);
