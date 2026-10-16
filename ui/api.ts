// Klient API panelu w przeglądarce (strona serwera: ui/server.mjs).
import type { ReelData } from "../src/Reel";
import type { QCCandidate, QCProvider } from "./quickcontent-api";

export type QuickContentReelInfo = {
  projectId: string;
  candidateId: string;
  candidate: QCCandidate;
  projectTitle?: string;
  aiProvider?: QCProvider;
};
export type PublicationDescriptionData = {
  status: "ready" | "failed" | "stale" | "missing" | "generating";
  instructions?: string;
  canGenerate?: boolean;
  hook?: string;
  body?: string;
  hashtags?: string[];
  text?: string;
  model?: string;
  provider?: "openai" | "codex" | "claude";
  usage?: {
    costMicroUsd?: number | null;
    inputTokens?: number;
    outputTokens?: number;
  }[];
  error?: string;
  isCurrent?: boolean;
};
export type SaveResult = { ok: true; editRevision?: number };
export class PanelError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type UpdateInfo = {
  status: string;
  checkedAt: number | null;
  current: { version: string; revision: number } | null;
  available: { version: string; revision: number } | null;
  pending: {
    version: string;
    changes: number;
    preserved: string[];
    conflicts: string[];
  } | null;
  error: string | null;
};
export type RenderFile = { file: string; size: number; mtime: number };
export type JobKind = "render" | "montage" | "chat";
export type JobStatus = "running" | "done" | "error" | "stopped";
export type Library = {
  reels: {
    name: string;
    client: string | null;
    style: string;
    seconds: number;
    out: string;
  }[];
  clients: { id: string; label: string; renders: RenderFile[] }[];
  loose: RenderFile[];
  jobs: Record<
    string,
    { kind: JobKind; status: JobStatus; client: string | null }
  >;
};
export type JobPoll =
  | { status: "idle" }
  | {
      kind: JobKind;
      status: JobStatus;
      lines: string[];
      next: number;
      pct: number | null;
      result: string | null;
    };
export type Settings = {
  accountOnly?: boolean;
  operator: "claude-account" | "claude-api-key";
  apiKey: string;
  model: "" | "opus" | "sonnet";
  renderAfter: boolean;
};
export type OperatorStatus = {
  installed: boolean;
  version?: string;
  loggedIn?: boolean;
  authMethod?: string | null;
  hint?: string | null;
};

async function call<T>(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    // własny nagłówek przy zmianach = ochrona przed CSRF (sprawdza go serwer)
    headers:
      method === "GET"
        ? {}
        : { "X-Panel": "1", "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new PanelError(
      data.error ?? `Błąd serwera (${res.status})`,
      res.status,
    );
  return data as T;
}

export const api = {
  updates: () => call<UpdateInfo>("GET", "/updates"),
  updateAction: (action: "check" | "download" | "install") =>
    call<UpdateInfo>("POST", `/updates/${action}`),

  description: (name: string) =>
    call<PublicationDescriptionData>(
      "GET",
      `/description/${encodeURIComponent(name)}`,
    ),
  saveDescription: (
    name: string,
    body: { instructions: string } | { text: string },
  ) =>
    call<PublicationDescriptionData>(
      "PUT",
      `/description/${encodeURIComponent(name)}`,
      body,
    ),
  generateDescription: (name: string) =>
    call<PublicationDescriptionData>(
      "POST",
      `/description/${encodeURIComponent(name)}`,
      {},
    ),
  library: () => call<Library>("GET", "/library"),
  reel: (name: string) => call<ReelData>("GET", `/reel/${name}`),
  reelState: async (
    name: string,
  ): Promise<{ data: ReelData; editRevision?: number }> => {
    const response = await fetch(`/api/reel/${encodeURIComponent(name)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new PanelError(
        data.error ?? `Błąd serwera (${response.status})`,
        response.status,
      );
    const value = response.headers.get("X-Edit-Revision");
    return {
      data,
      ...(value !== null && /^\d+$/.test(value)
        ? { editRevision: Number(value) }
        : {}),
    };
  },
  quickContentReel: (name: string) =>
    call<QuickContentReelInfo | null>(
      "GET",
      `/quickcontent/reels/${encodeURIComponent(name)}`,
    ),
  save: (name: string, data: ReelData, expectedEditRevision?: number) =>
    call<SaveResult>(
      "PUT",
      `/reel/${encodeURIComponent(name)}`,
      data,
      expectedEditRevision === undefined
        ? undefined
        : { "X-Edit-Revision": String(expectedEditRevision) },
    ),
  start: (
    name: string,
    body: { kind: JobKind; input?: string; message?: string; render?: boolean },
  ) => call<{ ok: true }>("POST", `/job/${name}`, body),
  job: (name: string, since: number) =>
    call<JobPoll>("GET", `/job/${name}?since=${since}`),
  stop: (name: string) => call<{ ok: true }>("DELETE", `/job/${name}`),
  newClient: (name: string) =>
    call<{ id: string }>("POST", "/client", { name }),
  settings: () => call<Settings>("GET", "/settings"),
  saveSettings: (s: Settings) => call<Settings>("PUT", "/settings", s),
  operator: () => call<OperatorStatus>("GET", "/operator"),
  reveal: (path: string) => call<{ ok: true }>("POST", "/reveal", { path }),
  fileUrl: (path: string) => `/api/file?path=${encodeURIComponent(path)}`,
};

// Upload z postępem (fetch nie raportuje wysyłania, XHR tak).
export function upload(
  client: string,
  kind: "surowe" | "przebitki",
  file: File,
  onProgress: (pct: number) => void,
) {
  return new Promise<{ path: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/upload?client=${encodeURIComponent(client)}&kind=${kind}&file=${encodeURIComponent(file.name)}`,
    );
    xhr.setRequestHeader("X-Panel", "1");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((100 * e.loaded) / e.total));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status < 300) resolve(data);
      else reject(new Error(data.error ?? `Błąd wysyłania (${xhr.status})`));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Przerwane połączenie z panelem — czy `npm run ui` nadal działa?",
        ),
      );
    xhr.send(file);
  });
}

// Nazwa rolki z nazwy pliku — to samo co slug() w scripts/prep.mjs (tamten moduł jest tylko dla Node).
export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// 75.4 -> "1:15.4"
export const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
};

export const megabytes = (bytes: number) =>
  `${(bytes / 1048576).toFixed(bytes > 104857600 ? 0 : 1)} MB`;
