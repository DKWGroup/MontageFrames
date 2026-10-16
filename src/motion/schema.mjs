import { z } from "zod";
const name = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const text = z.string().max(500);
const asset = z
  .string()
  .regex(
    /^motion-assets\/[a-z0-9-]+\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|mp3|wav|m4a|ttf|woff2)$/,
  );
export const motionSchema = z
  .object({
    version: z.literal(1),
    name,
    client: name.nullable().default(null),
    brand: text.min(1),
    product: text.default(""),
    url: z
      .string()
      .max(1000)
      .refine((v) => !v || /^https?:\/\//.test(v))
      .default(""),
    reference: text.default(""),
    fps: z.union([z.literal(30), z.literal(60)]).default(30),
    duration: z.number().min(6).max(60),
    formats: z
      .array(z.enum(["9:16", "1:1", "16:9"]))
      .min(1)
      .max(3),
    accent: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default("#FF6B1A"),
    logo: asset.optional(),
    font: asset.optional(),
    music: asset.optional(),
    beatGrid: z.object({
      kind: z.literal("estimated"),
      bpm: z.number().min(40).max(240),
      offset: z.number().min(0).max(4),
    }),
    shots: z
      .array(
        z.object({
          start: z.number().min(0),
          end: z.number().positive(),
          title: z.string().min(1).max(100),
          body: z.string().max(220),
          asset: asset.optional(),
          state: z.enum(["hook", "product", "detail", "cta"]),
        }),
      )
      .min(2)
      .max(30),
    reviews: z
      .array(
        z.object({
          round: z.number().int().min(1).max(6),
          score: z.number().min(0).max(10),
          notes: text.min(10),
          phone: z.boolean(),
          assets: z.boolean(),
          timing: z.boolean(),
          hash: z.string().regex(/^(?:[a-f0-9]{64})?$/).default(''),
        }),
      )
      .max(6)
      .default([]),
  })
  .strict()
  .superRefine((d, ctx) => {
    let end = 0;
    for (const s of d.shots) {
      if (
        Math.abs(s.start - end) > 0.001 ||
        s.end - s.start < 2 ||
        s.end - s.start > 4
      )
        ctx.addIssue({
          code: "custom",
          message: "Ujęcia muszą być ciągłe i trwać 2–4 s",
        });
      end = s.end;
    }
    if (Math.abs(end - d.duration) > 0.001)
      ctx.addIssue({
        code: "custom",
        message: "Oś nie odpowiada długości filmu",
      });
  });
export const validateMotion = (d) => motionSchema.parse(d);
export function buildMotion(b) {
  const duration = z.number().finite().min(6).max(60).parse(Number(b.duration ?? 15)),
    bpm = z.number().finite().min(20).max(300).parse(Number(b.bpm ?? 120)),
    step = 60 / bpm;
  let count = Math.ceil(duration / 3);
  let times = Array.from({ length: count + 1 }, (_, i) =>
    i === count ? duration : Math.round((i * duration) / count / step) * step,
  );
  if (times.some((t, i) => i && (t - times[i - 1] < 2 || t - times[i - 1] > 4)))
    times = Array.from({ length: count + 1 }, (_, i) => (i * duration) / count);
  return validateMotion({
    version: 1,
    name: b.name,
    client: b.client || null,
    brand: b.brand || "MontageFrames",
    product: b.product || "",
    url: b.url || "",
    reference: b.reference || "",
    duration,
    fps: 30,
    formats: ["9:16", "1:1", "16:9"],
    beatGrid: { kind: "estimated", bpm, offset: 0 },
    shots: times
      .slice(0, -1)
      .map((start, i) => ({
        start,
        end: times[i + 1],
        state: i === 0 ? "hook" : i === count - 1 ? "cta" : "product",
        title:
          i === 0
            ? "Nadaj treści ruch"
            : i === count - 1
              ? "Sprawdź. Popraw. Eksportuj."
              : b.product || "Twój storyboard",
        body:
          i === 0
            ? b.brand || "MontageFrames"
            : i === count - 1
              ? "Jedna oś czasu. Trzy formaty."
              : "Dodaj prawdziwe materiały marki.",
      })),
    reviews: [],
  });
}
export const dimensions = (f) =>
  f === "1:1" ? [1080, 1080] : f === "16:9" ? [1920, 1080] : [1080, 1920];
export function productionReady(d) {
  return (
    d.reviews.length >= 3 &&
    d.reviews.every((r, i) => r.round === i + 1) &&
    d.reviews
      .slice(-3)
      .every((r) => r.score >= 8 && r.phone && r.assets && r.timing)
  );
}
