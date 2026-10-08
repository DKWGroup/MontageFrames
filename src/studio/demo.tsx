// Każdy blok ma własny plik: edycja nie przesuwa lokalizacji innych bloków.
import { Reel, type ReelProps } from "../Reel";
import s0 from "./demo/s0";
import s1 from "./demo/s1";
import s2 from "./demo/s2";
import c0 from "./demo/c0";
import c1 from "./demo/c1";
import c2 from "./demo/c2";
import c3 from "./demo/c3";
import c4 from "./demo/c4";
import c5 from "./demo/c5";
import c6 from "./demo/c6";
import c7 from "./demo/c7";
import c8 from "./demo/c8";
const timeline = { s0, s1, s2, c0, c1, c2, c3, c4, c5, c6, c7, c8 };
export const StudioReel: React.FC<ReelProps> = (props) => <Reel {...props} timeline={props.reel === "demo" ? timeline : undefined} />;
