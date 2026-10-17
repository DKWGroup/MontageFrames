import type { z } from "zod";
import type { BrandingProfile, FontRef, AssetRef } from "./types";
export const clientIdSchema: z.ZodType<string>;
export const brandingProfileSchema: z.ZodType<BrandingProfile>;
export const profileSchema: typeof brandingProfileSchema;
export const fontRefSchema: z.ZodType<FontRef>;
export const assetRefSchema: z.ZodType<AssetRef>;
export function defaultBranding(
  clientId: string,
  name: string,
): BrandingProfile;
