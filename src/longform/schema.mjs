import { z } from "zod";

// Kontrakt roughcut.json (LongForm, zalozenia-funkcji-LongForm.md). Czasy w sekundach pliku source.
// ponytail: Chapter/Plan/Effect dochodzą w L3, razem z ich walidatorami.
const range = (o) => o.refine((x) => x.start < x.end, { message: "start musi być < end" });

export const Cut = range(
  z.object({
    id: z.string().min(1),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    wordIds: z.array(z.string()),
    kind: z.enum(["silence", "filler", "false-start", "retake", "repetition", "offtopic", "manual"]), // manual = własne cięcie z panelu
    reason: z.string(),
    confidence: z.number().min(0).max(1),
    auto: z.boolean(),
    decision: z.enum(["cut", "keep", "undecided"]),
  }),
);

export const Mute = range(
  z.object({
    wordId: z.string().min(1),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    ramp: z.number().nonnegative(),
    sfx: z.string().nullable(),
    level: z.number().nullable().optional(), // dB RMS wypowiedzi wokół wyciszenia — SFX gra 10 dB ciszej
  }),
);

export const RoughCut = z.object({
  version: z.literal(1),
  sourceDuration: z.number().positive(),
  cuts: z.array(Cut),
  mutes: z.array(Mute),
});
