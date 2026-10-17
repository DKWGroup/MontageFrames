import type { BrandingSnapshot } from "./types";
export function brandAppearance(branding: BrandingSnapshot): {
  animated: boolean;
  pop: boolean;
  accent: string;
  text: string;
  background: string;
  emphasis: string;
  size: number;
  position: number;
};
export function brandingRenderFiles(branding?: BrandingSnapshot): string[];
export function brandingEmoji(
  word: string,
  branding?: BrandingSnapshot,
): string | null;
