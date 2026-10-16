export function applyDecisions(
  sourceDuration: number,
  cuts: { start: number; end: number; decision: string }[],
): { start: number; end: number; zoom: number }[];
export function outTime(t: number, segments: { start: number; end: number }[]): number;
export function sourceTime(out: number, segments: { start: number; end: number }[]): number;
