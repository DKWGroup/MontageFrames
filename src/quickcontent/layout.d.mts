export type Rect = { x: number; y: number; width: number; height: number };
export type NewsLayout = {
  start: number;
  end: number;
  kind: "speaker" | "duo" | "duo-media" | "speaker-media";
  people: Rect[];
  media?: Rect;
  mediaSrc?: string;
  cut?: boolean;
};
export function layoutAt(
  framing: import("./framing.mjs").Framing | undefined,
  time: number,
): NewsLayout | null;
export function cropForFace(
  face: Rect,
  targetAspect: number,
  sourceAspect: number,
  anchorY?: number,
): Rect;
export function validLayouts(framing: unknown, duration: number): boolean;
export function happyCaptionY(
  kind?: NewsLayout["kind"],
  storedY?: number,
): number;
export function happyHookY(kind?: NewsLayout["kind"], storedY?: number): number;
export function speakerWindowAt(
  framing: import("./framing.mjs").Framing,
  time: number,
): null | {
  left: number;
  top: number;
  width: number;
  height: number;
  videoWidth: number;
  videoHeight: number;
  videoLeft: number;
  videoTop: number;
  shotStart: number;
};
export function steadyFaceRect(
  framing: import("./framing.mjs").Framing,
  layout: NewsLayout,
  person: number,
): Rect;
