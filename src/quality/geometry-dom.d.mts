import type { GeometryItem } from "./geometry-plan.mjs";
export type GeometryFrame = {
  frame: number;
  expected: GeometryItem[];
  hidden: GeometryItem[];
  issues: string[];
  boxes: (GeometryItem & {
    extent?: "layout";
    x: number;
    y: number;
    width: number;
    height: number;
  })[];
};
export function collectGeometryFrame(input: {
  frame: number;
  expected: GeometryItem[];
}): GeometryFrame;
