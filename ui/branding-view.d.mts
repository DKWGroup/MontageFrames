import type { BrandingProfile } from "../src/branding/types";
export function parseBrandingHash(
  hash: string,
): { clientId: string | null } | null;
export function brandingHash(clientId?: string | null): string;
export function applyBrandSuggestions(
  profile: BrandingProfile,
  suggestions: Record<string, { value: unknown }>,
  fields: string[],
): BrandingProfile;
export function brandingSaveFailure<T>(
  draft: T,
  revision: number,
  status: number,
): { draft: T; revision: number; conflict: boolean };
