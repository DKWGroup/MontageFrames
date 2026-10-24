import { z } from "zod";
import { createHash } from "node:crypto";
import { canonicalJson } from "./contracts.mjs";

export const safeAssetPath = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.startsWith("/") &&
  !value.includes("\\") &&
  !value.split("/").includes("..") &&
  !/^[a-z]+:/i.test(value) &&
  !Array.from(value).some((c) => c.charCodeAt(0) < 32);
const asset = z
  .object({
    id: z.string().min(1).max(500),
    path: z.string().refine(safeAssetPath, "Nieprawidłowa ścieżka zasobu"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    byteLength: z.number().int().nonnegative(),
    mime: z.string().min(1),
    kind: z.enum(["font", "emoji", "media", "code", "config"]),
  })
  .strict();
const bodySchema = z
  .object({
    manifestVersion: z.literal(1),
    orgId: z.string().min(1),
    clientId: z.string().nullable(),
    reelRevision: z.number().int().nonnegative(),
    inputs: z.json(),
    contract: z.json(),
    assets: z.array(asset),
    runtime: z.record(z.string(), z.json()),
    output: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        fps: z.number().positive(),
      })
      .strict(),
    seed: z.number().int(),
  })
  .strict();
const hash = (body) =>
  createHash("sha256").update(canonicalJson(body)).digest("hex");
export function createRenderManifest(input) {
  const body = bodySchema.parse({
    ...input,
    manifestVersion: 1,
    clientId: input.clientId ?? null,
  });
  if (
    new Set(body.assets.map((a) => a.id)).size !== body.assets.length ||
    new Set(body.assets.map((a) => a.path)).size !== body.assets.length
  )
    throw new Error("Powtórzony identyfikator lub ścieżka zasobu");
  body.assets.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { ...body, signature: hash(body) };
}
export function verifyRenderManifest(manifest) {
  const { signature, ...body } = manifest;
  const parsed = createRenderManifest(body);
  if (signature !== parsed.signature)
    throw new Error("Zmieniono manifest renderu");
  return parsed;
}
