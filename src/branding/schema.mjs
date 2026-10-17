import { z } from "zod";
export const clientIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const file = z
  .string()
  .max(400)
  .refine(
    (v) =>
      !v.startsWith("/") &&
      !v.includes("..") &&
      !v.includes("\\") &&
      !Array.from(v).some((c) => c.charCodeAt(0) < 32),
    "Nieprawidłowa ścieżka zasobu",
  );
export const fontRefSchema = z
  .object({
    id,
    family: z
      .string()
      .min(1)
      .max(160)
      .refine(
        (v) => !/times new roman/i.test(v),
        "Times New Roman nie jest dostępny",
      ),
    file,
    weight: z.string().regex(/^\d{2,4}( \d{2,4})?$/),
    style: z.enum(["normal", "italic"]),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    source: z.enum(["local", "upload", "google", "bundled"]),
    licenseFile: file.optional(),
  })
  .strict();
export const assetRefSchema = z
  .object({
    id,
    kind: z.enum(["logo", "image", "video"]),
    file,
    originalName: z.string().min(1).max(255),
    description: z.string().max(2000),
    mime: z.enum([
      "image/png",
      "image/jpeg",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ]),
    bytes: z
      .number()
      .int()
      .positive()
      .max(2 * 1024 ** 3),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const brandingProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    clientId: clientIdSchema,
    revision: z.number().int().nonnegative(),
    name: z.string().min(1).max(120),
    websiteUrl: z.union([
      z.literal(""),
      z.url().refine((v) => /^https?:\/\//.test(v)),
    ]),
    businessDescription: z.string().max(12000),
    audience: z.string().max(4000),
    tone: z.string().max(2000),
    notes: z.string().max(12000),
    palette: z
      .object({
        maxColors: z.union([z.literal(4), z.literal(5), z.literal(6)]),
        colors: z
          .array(
            z
              .object({
                id,
                hex: z.string().regex(/^#[a-fA-F0-9]{6}$/),
                role: z.enum([
                  "accent",
                  "text",
                  "background",
                  "highlight",
                  "secondary",
                  "muted",
                ]),
              })
              .strict(),
          )
          .max(6),
      })
      .strict()
      .refine(
        (v) => v.colors.length <= v.maxColors,
        "Przekroczony limit kolorów",
      )
      .refine(
        (v) => new Set(v.colors.map((c) => c.id)).size === v.colors.length,
        "Powtórzony kolor",
      ),
    fonts: z
      .object({
        primary: fontRefSchema.nullable(),
        emphasis: fontRefSchema.nullable().optional(),
      })
      .strict(),
    captions: z
      .object({
        presetId: z.enum(["plain", "kinetic", "pop"]),
        emphasis: z.enum(["none", "color", "underline"]),
        emojiEnabled: z.boolean(),
        size: z.number().min(32).max(140),
        position: z.number().min(0.35).max(0.75),
      })
      .strict(),
    logo: z
      .object({
        assetId: id.optional(),
        enabled: z.boolean(),
        position: z.enum(["top-left", "top-right"]),
        size: z.number().min(0.05).max(0.3),
      })
      .strict(),
    assets: z.array(assetRefSchema).max(200),
    updatedAt: z.string().optional(),
    websiteResearch: z
      .object({
        lastScanId: z.string().max(120).optional(),
        acceptedFields: z.array(z.string().max(80)).max(50).optional(),
        sourceRefs: z.array(z.string().max(2000)).max(50).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const defaultBranding = (clientId, name) => ({
  schemaVersion: 1,
  clientId,
  revision: 0,
  name,
  websiteUrl: "",
  businessDescription: "",
  audience: "",
  tone: "",
  notes: "",
  palette: {
    maxColors: 6,
    colors: [
      { id: "text", hex: "#FFFFFF", role: "text" },
      { id: "accent", hex: "#2563EB", role: "accent" },
      { id: "background", hex: "#111827", role: "background" },
    ],
  },
  fonts: { primary: null },
  captions: {
    presetId: "kinetic",
    emphasis: "color",
    emojiEnabled: false,
    size: 74,
    position: 0.68,
  },
  logo: { enabled: false, position: "top-left", size: 0.15 },
  assets: [],
});
export const profileSchema = brandingProfileSchema;
