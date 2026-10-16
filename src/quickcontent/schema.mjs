import { z } from "zod";
export const SCHEMA_VERSION = 1;
export const IdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const FocusSchema = z
  .object({
    mode: z.enum(["auto", "prompt"]),
    prompt: z.string().max(10000).optional(),
  })
  .strict()
  .refine((v) => v.mode !== "prompt" || Boolean(v.prompt?.trim()), {
    message: "Wpisz wskazówki tematów.",
  });
export const DurationSchema = z
  .object({
    min: z.number().finite().min(10).max(300),
    max: z.number().finite().min(10).max(300),
  })
  .strict()
  .refine((v) => v.min <= v.max, {
    message: "Minimalna długość przekracza maksymalną.",
  });
export const OutputResolutionSchema = z
  .union([z.literal(720), z.literal(1080), z.literal(2160)])
  .default(1080);
export const DescriptionInstructionsSchema = z.string().trim().max(4000).default("");
export const ProjectInputSchema = z
  .object({
    sourceKind: z.enum(["youtube", "upload"]),
    aiProvider: z.enum(["codex", "claude", "openai"]).default("codex"),
    descriptionInstructions: DescriptionInstructionsSchema,
    url: z.string().max(4096).optional(),
    uploadId: IdSchema.optional(),
    clientId: IdSchema.nullable().default(null),
    templateId: IdSchema.default("persona"),
    focus: FocusSchema.default({ mode: "auto" }),
    duration: DurationSchema.default({ min: 30, max: 60 }),
    resolution: z.union([z.literal(1080), z.literal(2160)]).default(1080),
    outputResolution: OutputResolutionSchema,
  })
  .strict()
  .refine(
    (v) => (v.sourceKind === "youtube" ? Boolean(v.url) : Boolean(v.uploadId)),
    { message: "Wybierz źródło nagrania." },
  );
const fields = z.record(z.string(), z.unknown());
export const UsageSchema = z
  .object({
    provider: z.string().max(50),
    model: z.string().max(200),
    responseId: z.string().max(200).nullable(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    cachedTokens: z.number().int().nonnegative().nullable(),
    cacheWriteTokens: z.number().int().nonnegative().nullable(),
    costMicroUsd: z.number().finite().nonnegative().nullable(),
    billingKind: z.enum(["subscription", "api"]).optional(),
    purpose: z.literal("description").optional(),
    pricingDate: z.string(),
    priceSource: z.string(),
    at: z.string(),
  })
  .strict();
export const SourceSchema = z
  .object({
    id: IdSchema,
    masterPath: z.string(),
    proxyPath: z.string(),
    metadataPath: z.string().nullable().optional(),
    hash: z.string(),
    duration: z.number().finite().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    audioLanguage: z.string().nullable().optional(),
    transcriptHash: z.string().nullable().optional(),
  })
  .passthrough();
export const CandidateSchema = z
  .object({
    id: IdSchema,
    analysisRunId: IdSchema,
    firstWordId: IdSchema,
    lastWordId: IdSchema,
    sourceStart: z.number().finite().nonnegative(),
    sourceEnd: z.number().finite().positive(),
    title: z.string(),
    summary: z.string(),
    topic: z.string(),
    kind: z.string(),
    score: z.number().finite().min(0).max(100),
    scoreBreakdown: fields,
    completeness: fields,
    confidence: z.string(),
    reason: z.string(),
    contextRisk: z.union([z.string(), fields]),
    status: z.enum([
      "proposed",
      "queued",
      "materializing",
      "montaging",
      "reviewing",
      "rendering",
      "completed",
      "failed",
      "cancelled",
    ]),
    reelName: IdSchema.optional(),
    editRevision: z.number().int().nonnegative(),
    renders: z.array(fields),
  })
  .passthrough()
  .refine((v) => v.sourceEnd > v.sourceStart);
export const AnalysisRunSchema = z
  .object({
    id: IdSchema,
    focus: FocusSchema,
    duration: DurationSchema,
    settingsKey: z.string(),
    coverage: z.union([z.number().finite(), fields, z.array(fields)]),
    candidateIds: z.array(IdSchema),
    status: z.string(),
    exhausted: z.boolean(),
    rejections: z.array(z.unknown()),
  })
  .passthrough();
export const BatchSchema = z
  .object({
    id: IdSchema,
    candidateIds: z.array(IdSchema),
    jobIds: z.array(IdSchema),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export const ProjectSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: IdSchema,
    revision: z.number().int().nonnegative(),
    title: z.string(),
    sourceKind: z.enum(["youtube", "upload"]),
    aiProvider: z.enum(["codex", "claude", "openai"]).default("codex"),
    descriptionInstructions: DescriptionInstructionsSchema,
    clientId: IdSchema.nullable(),
    templateId: IdSchema,
    focus: FocusSchema,
    duration: DurationSchema,
    resolution: z.union([z.literal(1080), z.literal(2160)]),
    outputResolution: OutputResolutionSchema,
    source: SourceSchema.nullable(),
    analysisRuns: z.array(AnalysisRunSchema),
    candidates: z.array(CandidateSchema),
    selectedCandidateIds: z.array(IdSchema),
    batchIds: z.array(IdSchema),
    templateSnapshot: fields,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough()
  .refine(
    (p) =>
      new Set(p.selectedCandidateIds).size === p.selectedCandidateIds.length &&
      p.selectedCandidateIds.every((id) =>
        p.candidates.some((c) => c.id === id),
      ),
    { message: "Wybór zawiera obcą propozycję." },
  );
export const JobSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: IdSchema,
    projectId: IdSchema,
    candidateId: IdSchema.optional(),
    batchId: IdSchema.optional(),
    kind: IdSchema,
    status: z.enum([
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled",
      "interrupted",
      "blocked",
    ]),
    stage: z.string(),
    progress: z.number().finite().min(0).max(1).nullable(),
    completedUnits: z.number().int().nonnegative(),
    totalUnits: z.number().int().nonnegative(),
    progressUnit: z.literal("audioFrames").optional(),
    progressDetail: z.string().max(500).optional(),
    runtimeLabel: z.string().max(200).optional(),
    etaSeconds: z.number().finite().nonnegative().nullable().optional(),
    stageStartedAt: z.string().optional(),
    progressUpdatedAt: z.string().optional(),
    checkpoint: fields,
    usage: z.array(UsageSchema).default([]),
    attempt: z.number().int().positive(),
    heartbeat: z.string().nullable(),
    error: z.string().optional(),
    payload: fields,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
// Aliases keep the backend and external consumers on one contract.
export const Project = ProjectSchema,
  Source = SourceSchema,
  Candidate = CandidateSchema,
  AnalysisRun = AnalysisRunSchema,
  Batch = BatchSchema,
  Job = JobSchema;
