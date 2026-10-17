export type QCProvider = "codex" | "claude" | "openai";
export type QCOperators = {
  codex: { installed: boolean; loggedIn: boolean };
  claude: { installed: boolean; loggedIn: boolean };
  openai: { configured: boolean };
};
export type QCFocus = { mode: "auto" | "prompt"; prompt?: string };
export type QCDuration = { min: number; max: number };
export type QCTemplate = {
  brandingRevision?: number;
  id: string;
  label?: string;
  name?: string;
  styleId: string;
  clientIds?: string[];
  clientId?: string | null;
  ready: boolean;
  reason?: string;
  missing?: string[];
};
export type QCRender = {
  filePath?: string;
  file?: string;
  path?: string;
  url?: string;
  renderRevision?: number;
  verified?: boolean;
  createdAt?: string;
};
export type QCCandidate = {
  costs?: QCCosts;
  id: string;
  analysisRunId?: string;
  sourceStart: number;
  sourceEnd: number;
  title: string;
  summary: string;
  topic?: string;
  kind?: string;
  score?: number;
  scoreBreakdown?: Record<string, unknown>;
  completeness?: string | number | Record<string, unknown>;
  confidence?: string | number;
  reason?: string;
  contextRisk?: string | boolean | Record<string, unknown>;
  status: string;
  reelName?: string;
  editRevision?: number;
  renderRevision?: number;
  renders?: QCRender[];
  currentRender?: QCRender | null;
  publication?: {
    status: string;
    updatedAt?: string;
    contentHash?: string;
  } | null;
  isCurrent?: boolean;
};
export type QCJob = {
  id: string;
  createdAt?: string;
  projectId: string;
  candidateId?: string;
  batchId?: string;
  kind: string;
  stage: string;
  status: string;
  progress: number | null;
  completedUnits?: number;
  totalUnits?: number;
  progressUnit?: "audioFrames";
  progressDetail?: string;
  runtimeLabel?: string;
  stageStartedAt?: string;
  progressUpdatedAt?: string;
  etaSeconds?: number | null;
  error?: string | { message?: string; action?: string };
  events?: { message?: string; stage?: string; at?: string }[];
};
export type QCBatch = {
  id: string;
  candidateIds: string[];
  jobIds?: string[];
  total?: number;
};
export type QCAnalysisRun = {
  id: string;
  focus: QCFocus;
  duration: QCDuration;
  exhausted?: boolean;
  status?: string;
  candidateIds?: string[];
  rejections?: unknown[];
};
export type QCCostRow = {
  costMicroUsd: number;
  requests: number;
  missing: number;
  inputTokens: number;
  outputTokens: number;
  subscriptionRequests?: number;
  missingTokenMeasurements?: number;
};
export type QCCosts = Record<"analysis" | "montage" | "chat", QCCostRow> & {
  description?: QCCostRow;
};
export type QCProject = {
  id: string;
  revision: number;
  title: string;
  sourceKind: "youtube" | "upload";
  aiProvider?: QCProvider;
  clientId: string | null;
  templateId: string;
  focus: QCFocus;
  duration: QCDuration;
  resolution: 1080 | 2160;
  outputResolution?: 720 | 1080 | 2160;
  descriptionInstructions?: string;
  costs?: QCCosts;
  source?: {
    duration?: number;
    width?: number;
    height?: number;
    title?: string;
    actualResolution?: number;
    warnings?: string[];
    thumbnail?: string;
    proxyPath?: string;
  } | null;
  analysisRuns: QCAnalysisRun[];
  candidates: QCCandidate[];
  selectedCandidateIds: string[];
  batchIds?: string[];
  batches?: QCBatch[];
  jobs?: QCJob[];
  jobIds?: string[];
  warnings?: string[];
  status?: string;
};
export type QCProjectInput = Pick<
  QCProject,
  "sourceKind" | "clientId" | "templateId" | "focus" | "duration" | "resolution"
> & {
  url?: string;
  uploadId?: string;
  outputResolution?: 720 | 1080 | 2160;
  aiProvider?: QCProvider;
  descriptionInstructions?: string;
};

export class QuickContentError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/quickcontent${path}`, {
    method,
    signal,
    headers:
      method === "GET"
        ? {}
        : { "X-Panel": "1", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new QuickContentError(
      typeof data.error === "string"
        ? data.error
        : (data.error?.message ?? `Błąd serwera (${response.status})`),
      response.status,
    );
  return data as T;
}
const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;
export const quickContentApi = {
  projects: (signal?: AbortSignal) =>
    request<QCProject[]>("GET", "/projects", undefined, signal),
  templates: (signal?: AbortSignal) =>
    request<QCTemplate[]>("GET", "/templates", undefined, signal),
  project: (id: string, signal?: AbortSignal) =>
    request<QCProject>("GET", projectPath(id), undefined, signal),
  create: (input: QCProjectInput) =>
    request<QCProject>("POST", "/projects", input),
  process: (id: string) =>
    request<{ jobId: string }>("POST", `${projectPath(id)}/process`, {}),
  findMore: (
    id: string,
    expectedRevision: number,
    settings?: { focus: QCFocus; duration: QCDuration },
  ) =>
    request<{ jobId: string; analysisRunId: string }>(
      "POST",
      `${projectPath(id)}/find-more`,
      { expectedRevision, ...settings },
    ),
  select: (id: string, candidateIds: string[], expectedRevision: number) =>
    request<{ revision: number; selectedCandidateIds?: string[] }>(
      "PUT",
      `${projectPath(id)}/selection`,
      { candidateIds, expectedRevision },
    ),
  montage: (
    id: string,
    candidateIds: string[],
    expectedRevision: number,
    idempotencyKey: string,
  ) =>
    request<{ batchId: string; jobIds: string[] }>(
      "POST",
      `${projectPath(id)}/montage`,
      { candidateIds, expectedRevision, idempotencyKey },
    ),
  operators: () => request<QCOperators>("GET", "/operators"),
  operator: (id: string, aiProvider: QCProvider, expectedRevision: number) =>
    request<QCProject>("PUT", `${projectPath(id)}/operator`, {
      aiProvider,
      expectedRevision,
    }),
  descriptionInstructions: (
    id: string,
    descriptionInstructions: string,
    expectedRevision: number,
  ) =>
    request<QCProject>("PUT", `${projectPath(id)}/description`, {
      descriptionInstructions,
      expectedRevision,
    }),
  output: (
    id: string,
    outputResolution: 720 | 1080 | 2160,
    expectedRevision: number,
  ) =>
    request<QCProject>("PUT", `${projectPath(id)}/output`, {
      outputResolution,
      expectedRevision,
    }),
  job: (id: string, signal?: AbortSignal) =>
    request<QCJob>("GET", `/jobs/${encodeURIComponent(id)}`, undefined, signal),
  cancel: (id: string) =>
    request<unknown>("POST", `/jobs/${encodeURIComponent(id)}/cancel`, {}),
  retry: (id: string) =>
    request<{ jobId?: string }>(
      "POST",
      `/jobs/${encodeURIComponent(id)}/retry`,
      {},
    ),
  proxy: (projectId: string) =>
    `/api/quickcontent${projectPath(projectId)}/media/proxy`,
  thumbnail: (projectId: string, candidateId: string) =>
    `/api/quickcontent${projectPath(projectId)}/media/thumbnails/${encodeURIComponent(candidateId)}`,
};

export async function createAndProcessProject(
  input: QCProjectInput,
  onProcessing?: () => void,
): Promise<{ project: QCProject; jobId?: string; startError?: string }> {
  const project = await quickContentApi.create(input);
  onProcessing?.();
  try {
    const result = await quickContentApi.process(project.id);
    return { project, jobId: result.jobId };
  } catch (error) {
    return {
      project,
      startError:
        error instanceof Error
          ? error.message
          : "Nie udało się uruchomić analizy. Ponów w zapisanym projekcie.",
    };
  }
}

export function uploadQuickContent(
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<{ uploadId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/quickcontent/uploads?file=${encodeURIComponent(file.name)}`,
    );
    xhr.setRequestHeader("X-Panel", "1");
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener("abort", abort);
    xhr.onload = () => {
      let data: { uploadId?: string; error?: string };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Nieprawidłowa odpowiedź przy wysyłaniu pliku."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.uploadId)
        resolve({ uploadId: data.uploadId });
      else
        reject(
          new QuickContentError(
            data.error ?? `Błąd wysyłania (${xhr.status})`,
            xhr.status,
          ),
        );
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Przerwane połączenie podczas wysyłania pliku. Ponów wysyłanie.",
        ),
      );
    xhr.onabort = () => reject(new Error("Anulowano wysyłanie pliku."));
    if (signal?.aborted) {
      reject(new Error("Anulowano wysyłanie pliku."));
      return;
    }
    xhr.send(file);
  });
}

export function publicationRefreshKey(candidate?: QCCandidate) {
  return `${candidate?.editRevision}:${candidate?.renderRevision}:${candidate?.publication?.status ?? ""}:${candidate?.publication?.updatedAt ?? ""}:${candidate?.publication?.contentHash ?? ""}`;
}
