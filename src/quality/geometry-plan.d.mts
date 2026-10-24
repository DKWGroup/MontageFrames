import type { ReelData } from "../Reel";
import type { captionClips, toOut } from "../reel-timing";
export type GeometryItem = { id: string; role: "caption" | "hook" | "emoji" };
export type GeometryInterval = GeometryItem & {
  from: number;
  durationInFrames: number;
};
export function geometryInventory(
  data: ReelData,
  clips: ReturnType<typeof captionClips>,
  map: typeof toOut,
): GeometryInterval[];
