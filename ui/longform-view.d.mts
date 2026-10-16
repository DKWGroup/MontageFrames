type Cut = {
  id: string;
  start: number;
  end: number;
  wordIds: string[];
  kind: string;
  reason: string;
  confidence: number;
  auto: boolean;
  decision: "cut" | "keep" | "undecided";
};
type Word = { id: string; text: string; start: number; end: number };
type Doc<C extends Cut = Cut> = { sourceDuration: number; cuts: C[]; mutes: { wordId: string }[] };
export type TranscriptItem =
  | { type: "word"; at: number; word: Word; cut: Cut | null; mute: boolean }
  | { type: "gap"; at: number; cut: Cut };
export function parseLfHash(hash: string): { id: string | null; step: string | null } | null;
export function cutStats(doc: Doc): { removed: number; total: number; pct: number; count: number; undecided: number };
export function transcriptItems(words: Word[], doc: Doc): TranscriptItem[];
export function toggleCut<D extends Doc>(doc: D, id: string): D;
export function restoreKind<D extends Doc>(doc: D, kind: string): D;
export function userCut<D extends Doc>(doc: D, words: Word[], ids: string[]): D;
export function removeMute<D extends Doc>(doc: D, wordId: string): D;
export function confidenceLabel(c: Cut): string;
export const KIND_LABEL: {
  silence: string;
  filler: string;
  "false-start": string;
  retake: string;
  repetition: string;
  offtopic: string;
  manual: string;
};
export function usageSummary(usage?: Record<string, unknown>[]): { label: string; stage: string; tokens: string; cost: string }[];
export function steps(p: { state: string; failedFrom?: string; renders?: unknown[] }): { current: string; open: string[]; why: Record<string, string> };
export const EFFECT_TRACK: Record<string, string>;
