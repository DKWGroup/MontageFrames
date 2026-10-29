import { z } from "zod";

export const contractRuleSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
    scope: z.enum([
      "reel",
      "captions",
      "camera",
      "graphics",
      "audio",
      "publication",
    ]),
    value: z.json(),
    checkKind: z.enum(["data", "geometry", "semantic", "human"]),
    severity: z.enum(["critical", "advisory"]),
    source: z
      .object({
        path: z
          .string()
          .min(1)
          .max(400)
          .refine(
            (p) =>
              !p.startsWith("/") &&
              !p.includes("..") &&
              !p.includes("\\") &&
              !/^[a-z]+:/i.test(p),
          ),
        section: z.string().min(1).max(300),
        date: z.iso.date(),
        order: z.number().int().nonnegative(),
        level: z.enum(["default", "general", "branding", "client"]),
        clientId: z
          .string()
          .regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
          .optional(),
        sha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .strict(),
  })
  .strict();

export const clientContractSchema = z
  .object({
    version: z.literal(1),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    clientId: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
      .nullable(),
    brandingRevision: z.number().int().nonnegative(),
    styleId: z.enum([
      "brand",
      "persona",
      "skyclass",
      "herod",
      "bisanz",
      "ameryka",
      "glowup",
      "vital",
      "happynews",
      "fitnessiq",
    ]),
    coverage: z.literal("partial"),
    rules: z.array(contractRuleSchema).max(512),
  })
  .strict();
