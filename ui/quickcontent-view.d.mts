import type {
  QCCandidate,
  QCBatch,
  QCFocus,
  QCDuration,
  QCProject,
  QCJob,
} from "./quickcontent-api";
import type { ReelData } from "../src/Reel";
import type { SaveResult } from "./api";
export type QCRoute = {
  projectId?: string;
  candidateId?: string;
  newProject?: boolean;
};
export function parseQuickContentHash(hash: string): QCRoute | null;
export function quickContentHash(
  projectId?: string,
  candidateId?: string,
): string;
export function reelNameFromHash(hash: string): string | null;
export function reelRenderFiles<T extends { file: string }>(
  files: T[],
  name: string,
  quickContent: boolean,
): T[];
export function createReelSaveQueue(
  save: (
    name: string,
    data: ReelData,
    expectedEditRevision?: number,
  ) => Promise<SaveResult>,
): {
  reset(name: string, revision?: number): void;
  blocked(name: string): boolean;
  retry(name: string): void;
  idle(): Promise<void>;
  enqueue(
    name: string,
    data: ReelData,
    quickContent: boolean,
  ): Promise<SaveResult>;
};
export function currentCandidate(candidate: Partial<QCCandidate>): boolean;
export function jobActivity(
  job: QCJob,
  now?: number,
): {
  elapsedSeconds: number | null;
  processedSeconds: number | null;
  totalSeconds: number | null;
  etaSeconds: number | null;
  sinceProgressSeconds: number | null;
};
export function batchProgress(
  batch: QCBatch,
  candidates: QCCandidate[],
): {
  completed: number;
  total: number;
  percent: number;
  failed: number;
  active: number;
  queued: number;
  outdated: number;
};
export function validateAnalysis(
  focus: QCFocus,
  duration: QCDuration,
): { focus?: string; duration?: string };
export function boundedPreviewTime(
  time: number,
  start: number,
  end: number,
): number;
export function sourceResolution(source: QCProject["source"]): number | null;
export function sortCandidates(
  candidates: QCCandidate[],
  order: "score" | "time",
): QCCandidate[];
