import type { BrandingProfile, AssetRef, FontRef } from "../src/branding/types";
export class BrandingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export type ProfileResponse = {
  profile: BrandingProfile;
  revision: number;
  ready: boolean;
  issues: unknown[];
  established: {
    profile: BrandingProfile;
    description: string;
    fonts: string[];
    colors: string[];
  } | null;
  preferences: { content: string; path: string } | null;
  materials: Array<{ file: string; label: string; available: boolean }>;
};
export type FontChoice = {
  id: string;
  family: string;
  variants?: Array<
    string | { id?: string; name?: string; weight?: string; style?: string }
  >;
  weight?: string;
  style?: string;
  importable?: boolean;
  reason?: string;
};
export type ScanJob = {
  warnings?: string[];
  id?: string;
  scanId?: string;
  status: string;
  stage?: string;
  error?: string;
  suggestions?: Record<string, { value: unknown; sourceRefs?: string[] }>;
  sources?: Array<{ url: string; title?: string }>;
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/branding${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(init?.method && init.method !== "GET" ? { "X-Panel": "1" } : {}),
    },
  });
  const body = await response
    .json()
    .catch(() => ({ error: "Serwer nie zwrócił prawidłowej odpowiedzi." }));
  if (!response.ok)
    throw new BrandingError(
      typeof body.error === "string"
        ? body.error
        : body.error?.message ||
            body.message ||
            "Nie udało się wykonać operacji.",
      response.status,
    );
  return body;
}
const clientPath = (id: string) => `/clients/${encodeURIComponent(id)}`;
export const brandingApi = {
  materialUrl: (id: string, file: string) =>
    `/api/branding${clientPath(id)}/materials?file=${encodeURIComponent(file)}`,
  get: (id: string) => request<ProfileResponse>(clientPath(id)),
  save: (id: string, profile: BrandingProfile, revision: number) =>
    request<ProfileResponse>(clientPath(id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(revision),
      },
      body: JSON.stringify(profile),
    }),
  fonts: (source: string, q: string) =>
    request<{ fonts: FontChoice[]; message?: string; warning?: string }>(
      `/fonts?source=${source}&q=${encodeURIComponent(q)}`,
    ),
  importFont: (id: string, source: string, fontId: string, variant?: string) =>
    request<FontRef>(`${clientPath(id)}/fonts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, id: fontId, variant }),
    }),
  scan: (id: string, url: string) =>
    request<ScanJob>(`${clientPath(id)}/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, aiProvider: "codex" }),
    }),
  scanStatus: (id: string, scanId: string) =>
    request<ScanJob>(`${clientPath(id)}/scans/${encodeURIComponent(scanId)}`),
  cancelScan: (id: string, scanId: string) =>
    request<ScanJob>(`${clientPath(id)}/scans/${encodeURIComponent(scanId)}`, {
      method: "DELETE",
    }),
};
export function uploadBrandFile<T extends AssetRef | FontRef>(
  clientId: string,
  file: File,
  kind: "logo" | "image" | "video" | "font",
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const path = kind === "font" ? "fonts/upload" : `assets?kind=${kind}`;
    xhr.open(
      "POST",
      `/api/branding${clientPath(clientId)}/${path}${kind === "font" ? "?" : "&"}file=${encodeURIComponent(file.name)}`,
    );
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.setRequestHeader("X-Panel", "1");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Nie udało się przesłać pliku. Spróbuj ponownie."));
    xhr.onabort = () => reject(new Error("Przesyłanie zostało przerwane."));
    xhr.onload = () => {
      let result;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Nieprawidłowa odpowiedź podczas przesyłania."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(result);
      else
        reject(
          new BrandingError(
            result.error?.message ||
              result.error ||
              "Nie udało się przesłać pliku.",
            xhr.status,
          ),
        );
    };
    xhr.send(file);
  });
}
