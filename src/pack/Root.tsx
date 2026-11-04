// Paczki animacji long form: jedna kompozycja na animację (osobny plik MOV). Render: scripts/longform-pack.mjs.
import { Composition, Folder } from "remotion";
import plan from "../../public/longform-pack/subskrypcje/pack.resolved.json";
import { PackItem, type Item } from "./Pack";

const base = plan.name; // publicDir bundla = public/longform-pack
export const PackRoot: React.FC = () => (
  <Folder name={plan.name}>
    {(plan.items as Item[]).map((item, i) => (
      <Composition
        key={item.slug}
        id={`sub-${item.file ?? `${String(i + 1).padStart(2, "0")}-${item.slug}`}`}
        component={PackItem}
        defaultProps={{ item, base }}
        fps={plan.fps}
        width={1920}
        height={1080}
        durationInFrames={Math.round(item.dur * plan.fps)}
      />
    ))}
  </Folder>
);
