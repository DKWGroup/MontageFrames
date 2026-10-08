// Klient API panelu w przeglądarce (strona serwera: ui/server.mjs).
import type { ReelData } from "../src/Reel";

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
): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    // własny nagłówek przy zmianach = ochrona przed CSRF (sprawdza go serwer)
    headers:
      method === "GET"
        ? {}
        : { "X-Panel": "1", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Błąd serwera (${res.status})`);
  return data as T;
}

export const api = {
  library: () => call<Library>("GET", "/library"),
  reel: (name: string) => call<ReelData>("GET", `/reel/${name}`),
  save: (name: string, data: ReelData) =>
    call<{ ok: true }>("PUT", `/reel/${name}`, data),
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
