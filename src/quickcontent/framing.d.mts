export type TrackingPoint = {
  time: number;
  centerX: number;
  centerY: number;
  scale?: number;
  fit?: boolean; // ujęcie bez mówiącej twarzy (np. materiał z newsa): cały kadr z rozmytym tłem
  cut?: boolean; // cięcie kamery / zmiana mówcy: skok bez przejazdu
};
export type Framing = {
  cameraCuts?: number[]; // exact source cuts, independent of speaker switches
  sourceAspect?: number;
  layouts?: import("./layout.mjs").NewsLayout[];
  mode: "fit" | "crop";
  centerX: number;
  centerY: number;
  scale?: number;
  tracking?: TrackingPoint[];
  trackingEnabled?: boolean;
};
export function trackingPosition(
  framing: Framing | undefined,
  sourceTime: number,
): { centerX: number; centerY: number; scale?: number; fit?: boolean };
export function validTracking(
  framing: Framing | undefined,
  duration: number,
): boolean;

export function cameraScale(
  styleId: string | undefined,
  segment: { zoom?: number; zoomTo?: number },
  trackedScale?: number,
  progress?: number,
): number;
