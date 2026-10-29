export function isCaptionJoiner(text: string): boolean;
export function captionUnits<W extends { text: string }>(words: W[]): W[][];
export function repairCaptionGroups<W extends { text: string }>(
  groups: W[][],
): W[][];
export function balanceCaptionLines<W>(
  units: W[][],
  widths: number[],
  maxWidth: number,
  gap: number,
): W[][];
export function walczakFullRuns(
  overlays: {
    start: number;
    end: number;
    type: string;
    side?: string;
    kind?: string;
  }[],
): { start: number; end: number }[];
