export function parseCrHash(hash: string): { id: string | null } | null;
export function playbackJump(t: number, segments: { start: number; end: number }[], eps?: number): number | null;
export function mutedAt(t: number, mutes: { start: number; end: number; ramp?: number }[]): boolean;
export function clock(s: number): string;
export function formatOffset(s: number): string;
export function frameLength(fps: string): number;
export function syncLabel(
  source: { id: string; sync?: { manual?: boolean; confident?: boolean } | null },
  reference: string,
): string;
export function costLabel(usage?: { costMicroUsd?: number | null }[]): string | null;
export function waveColumns(levels: number[] | null | undefined, width: number): Float32Array;
export function plural(n: number, one: string, few: string, many: string): string;
export const ROLE_LABEL: Record<"camera" | "mic", string>;
export const PACE_LABEL: Record<string, string>;
export const AI_LABEL: Record<string, string>;
export const STAGE_LABEL: Record<string, string>;
