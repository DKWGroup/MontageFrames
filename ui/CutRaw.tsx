/// <reference types="vite/client" />
// CutRaw w panelu (plan-wdrozenia-CutRaw.md, C2): lista i nowy projekt → ekran projektu z przetwarzaniem,
// podglądem po cięciach, osią źródeł, przeglądem cięć w transkrypcie, synchronizacją i eksportem do Premiere.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyDecisions } from "../src/longform/cuts.mjs";
import { censorWord } from "../src/reel-timing";
import { revealInvalidField } from "./form-disclosure.mjs";
import {
  KIND_LABEL,
  confidenceLabel,
  cutStats,
  removeMute,
  restoreKind,
  toggleCut,
  transcriptItems,
  userCut,
} from "./longform-view.mjs";
import {
  AI_LABEL,
  PACE_LABEL,
  ROLE_LABEL,
  STAGE_LABEL,
  clock,
  costLabel,
  formatOffset,
  frameLength,
  mutedAt,
  parseCrHash,
  playbackJump,
  plural,
  syncLabel,
  waveColumns,
} from "./cutraw-view.mjs";
import "./longform.css";
import "./cutraw.css";

type Kind = keyof typeof KIND_LABEL;
type Cut = {
  id: string;
  start: number;
  end: number;
  wordIds: string[];
  kind: Kind;
  reason: string;
  confidence: number;
  auto: boolean;
  decision: "cut" | "keep" | "undecided";
  luna?: { verdict: "cut" | "keep" | "undecided"; reason: string };
};
type Mute = {
  wordId: string;
  start: number;
  end: number;
  ramp: number;
  sfx: string | null;
};
type Word = {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string | null;
};
type Source = {
  id: string;
  role: "camera" | "mic";
  label: string;
  path: string;
  duration: number;
  offset?: number;
  sync?: {
    confident?: boolean;
    manual?: boolean;
    score?: number;
    r?: number;
    k?: number;
  } | null;
  // Kamera: kogo pokazuje przy auto-przełączaniu — "wide", id mikrofonu albo null.
  shows?: string | null;
};
type Export = {
  version: number;
  tag?: string;
  dir: string;
  at: string;
  segments: number;
  shots?: number;
  markers?: number;
  duration: number;
  revision?: number;
};
type Project = {
  name: string;
  client: string | null;
  reference: string;
  fps: string;
  width: number;
  height: number;
  duration: number;
  sources: Source[];
  settings: {
    pace: string;
    ai: string;
    censor: { keepHead: number; keepTail: number };
  };
  cuts: Cut[];
  mutes: Mute[];
  revision: number;
  warnings: string[];
  usage: { costMicroUsd?: number | null }[];
  exports?: Export[];
  processedAt?: string;
  stale?: string;
};
type Job = {
  kind: "process" | "export";
  state: "running" | "done" | "failed";
  stage: string | null;
  detail: string;
  progress: number | null;
  startedAt: string;
  error?: string;
};
type Review = {
  project: Project;
  job: Job | null;
  words: Word[];
  levels: { rate: number; sources: Record<string, number[]> } | null;
  proxy: boolean;
};
type Summary = {
  name: string;
  client: string | null;
  sources: number;
  duration: number;
  processedAt: string | null;
  exports: number;
  job: Job | null;
};
type Doc = { sourceDuration: number; cuts: Cut[]; mutes: Mute[] };
type Settings = {
  pace: string;
  ai: string;
  keepHead: number;
  keepTail: number;
};

type SourceFile = { path: string; kind: "video" | "audio"; size: number };
type Upload = {
  key: string;
  name: string;
  loaded: number;
  total: number;
  error?: string;
};

class CrError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
async function cr<T>(
  url: string,
  method = "GET",
  data?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const r = await fetch("/api/cutraw" + url, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "X-Panel": "1", "Content-Type": "application/json", ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new CrError(d.error ?? `Błąd serwera (${r.status})`, r.status);
  return d as T;
}

const FILTERS: { id: string; label: string; test: (c: Cut) => boolean }[] = [
  { id: "all", label: "Wszystkie", test: () => true },
  {
    id: "undecided",
    label: "Do decyzji",
    test: (c) => c.decision === "undecided",
  },
  { id: "silence", label: "Cisza", test: (c) => c.kind === "silence" },
  { id: "filler", label: "Wtrącenia", test: (c) => c.kind === "filler" },
  {
    id: "false-start",
    label: "Falstarty",
    test: (c) => c.kind === "false-start",
  },
  { id: "retake", label: "Dubli", test: (c) => c.kind === "retake" },
  {
    id: "repetition",
    label: "Powtórzenia",
    test: (c) => c.kind === "repetition",
  },
  {
    id: "offtopic",
    label: "Do realizatora",
    test: (c) => c.kind === "offtopic",
  },
  { id: "manual", label: "Własne", test: (c) => c.kind === "manual" },
];
const VERDICT = { cut: "wyciąć", keep: "zostawić", undecided: "nie wiadomo" };
const EDITOR = {
  openai: "GPT‑6 Luna",
  claude: "Claude Code",
  codex: "Codex",
  none: "AI",
} as Record<string, string>;
const DECISION = {
  cut: "wycięte",
  keep: "zostaje",
  undecided: "do decyzji — zostaje w filmie",
};
const seconds = (s: number) =>
  `${(Math.round(s * 10) / 10).toString().replace(".", ",")} s`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

export function CutRaw({ onClose }: { onClose: () => void }) {
  const [route, setRoute] = useState(
    () => parseCrHash(location.hash) ?? { id: null },
  );
  useEffect(() => {
    const on = () => {
      const r = parseCrHash(location.hash);
      if (r) setRoute(r);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return (
    <div className="lf cr">
      <header className="lf-top">
        <button type="button" className="btn ghost" onClick={onClose}>
          ← Panel
        </button>
        <h1>CutRaw</h1>
        {route.id && (
          <a className="btn ghost" href="#cr">
            Wszystkie projekty
          </a>
        )}
      </header>
      {route.id ? (
        <ProjectView key={route.id} id={route.id} />
      ) : (
        <ProjectList />
      )}
    </div>
  );
}

const slugOf = (file: string) =>
  file
    .split("/")
    .pop()!
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

function ProjectList() {
  const [list, setList] = useState<Summary[] | null>(null);
  const [sources, setSources] = useState<SourceFile[] | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    cr<Summary[]>("/projects").then(setList, (e: Error) => setError(e.message));
    cr<SourceFile[]>("/sources").then(setSources, () => setSources([]));
  }, []);
  const videos = picked.filter(
    (f) => sources?.find((s) => s.path === f)?.kind === "video",
  );
  const refPath = videos.includes(ref) ? ref : (videos[0] ?? "");
  const toggle = (f: string) => {
    const next = picked.includes(f)
      ? picked.filter((x) => x !== f)
      : [...picked, f];
    setPicked(next);
    if (!name && next.length) setName(slugOf(next[0]));
  };
  const pick = (f: string) => {
    setPicked((now) => (now.includes(f) ? now : [...now, f]));
    setName((n) => n || slugOf(f));
  };
  // Pliki z dysku → inbox/cutraw/ (przeglądarka nie zna ścieżki na dysku, więc plik trzeba przesłać).
  // Ten sam plik (nazwa + rozmiar) już w inbox/cutraw/ = bez ponownego wysyłania.
  const addFiles = (files: File[]) => {
    for (const file of files) {
      const same = sources?.find(
        (s) => s.path === `inbox/cutraw/${file.name}` && s.size === file.size,
      );
      if (same) {
        pick(same.path);
        continue;
      }
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      const set = (patch: Partial<Upload>) =>
        setUploads((list) =>
          list.map((u) => (u.key === key ? { ...u, ...patch } : u)),
        );
      setUploads((list) => [
        ...list.filter((u) => u.key !== key),
        { key, name: file.name, loaded: 0, total: file.size },
      ]);
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `/api/cutraw/upload?file=${encodeURIComponent(file.name)}`,
      );
      xhr.setRequestHeader("X-Panel", "1");
      xhr.upload.onprogress = (e) => set({ loaded: e.loaded });
      xhr.onerror = () => set({ error: "Przerwane połączenie z panelem." });
      xhr.onload = () => {
        let d: SourceFile & { error?: string };
        try {
          d = JSON.parse(xhr.responseText);
        } catch {
          d = { error: `Błąd serwera (${xhr.status})` } as typeof d;
        }
        if (xhr.status !== 201)
          return set({ error: d.error ?? "Nie udało się." });
        setUploads((list) => list.filter((u) => u.key !== key));
        setSources((list) => [
          d,
          ...(list ?? []).filter((s) => s.path !== d.path),
        ]);
        pick(d.path);
      };
      xhr.send(file);
    }
  };
  const sending = uploads.some((u) => !u.error);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await cr("/projects", "POST", { name, files: picked, ref: refPath });
      location.hash = `cr/${name}`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <main className="lf-list">
      <form
        onInvalidCapture={revealInvalidField}
        className="lf-card lf-new"
        onSubmit={submit}
      >
        <h2>Nowy projekt</h2>
        <div
          className={`cr-drop${over ? " over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            addFiles([...e.dataTransfer.files]);
          }}
        >
          <p>
            <strong>Przeciągnij tu nagrania z dysku</strong>
            <span>kamery (wideo) i mikrofony (WAV, MP3)</span>
          </p>
          <label className="btn">
            Wybierz z dysku
            <input
              type="file"
              multiple
              accept="video/*,audio/*,.mxf,.wav,.mp3,.m4a,.flac,.aif,.aiff"
              onChange={(e) => {
                addFiles([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </label>
          {uploads.length > 0 && (
            <ul className="cr-uploads">
              {uploads.map((u) => (
                <li key={u.key}>
                  <span className="cr-file-name">{u.name}</span>
                  {u.error ? (
                    <span className="lf-error">{u.error}</span>
                  ) : (
                    <>
                      <progress value={u.loaded} max={u.total || 1} />
                      <span className="cr-upload-pct">
                        {Math.floor((u.loaded / (u.total || 1)) * 100)}%
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <fieldset className="cr-files">
          <legend>Nagrania kamer i mikrofonów</legend>
          {sources === null ? (
            <p className="lf-hint">Szukam nagrań…</p>
          ) : sources.length ? (
            sources.map((s) => (
              <label key={s.path} className="cr-file">
                <input
                  type="checkbox"
                  checked={picked.includes(s.path)}
                  onChange={() => toggle(s.path)}
                />
                <span className="cr-file-kind">
                  {s.kind === "video" ? "Wideo" : "Audio"}
                </span>
                <span className="cr-file-text">
                  <span className="cr-file-name">
                    {s.path.split("/").pop()}
                  </span>
                  <span className="cr-file-dir">
                    {s.path.split("/").slice(0, -1).join("/")}
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="lf-hint">
              Przeciągnij nagrania wyżej albo wrzuć je do folderu inbox/ lub
              folderu klienta i odśwież stronę.
            </p>
          )}
        </fieldset>
        <label>
          Kamera główna — wyznacza czas
          <select
            required
            value={refPath}
            onChange={(e) => setRef(e.target.value)}
            disabled={!videos.length}
          >
            {!videos.length && (
              <option value="">Zaznacz co najmniej jedno wideo</option>
            )}
            {videos.map((v) => (
              <option key={v} value={v}>
                {v.split("/").pop()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nazwa projektu
          <input
            required
            pattern="[a-z0-9][a-z0-9\-]*"
            title="Małe litery, cyfry i myślniki"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="lf-hint">
          Pliki z listy zostają na miejscu. Przeciągnięte trafiają do
          inbox/cutraw/. CutRaw nie zmienia oryginałów.
        </p>
        {error && (
          <p className="lf-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn primary"
          disabled={busy || sending || !picked.length || !refPath}
        >
          {busy ? "Tworzę…" : sending ? "Czekam na pliki…" : "Utwórz projekt"}
        </button>
      </form>
      <section className="lf-card">
        <h2>Projekty</h2>
        {list === null ? (
          <p className="lf-hint">Wczytuję…</p>
        ) : !list.length ? (
          <p className="lf-hint">
            Nie ma jeszcze projektów. Zaznacz nagrania obok i utwórz pierwszy.
          </p>
        ) : (
          <ul className="lf-projects">
            {list.map((p) => (
              <li key={p.name}>
                <a href={`#cr/${p.name}`}>
                  <strong>{p.name}</strong>
                  <span>
                    {plural(p.sources, "źródło", "źródła", "źródeł")} ·{" "}
                    {clock(p.duration)}
                    {p.client ? ` · ${p.client}` : ""} ·{" "}
                    {p.job?.state === "running"
                      ? "pracuje"
                      : p.exports
                        ? `wyeksportowany (${p.exports})`
                        : p.processedAt
                          ? "do przeglądu"
                          : "nowy"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ProjectView({ id }: { id: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const load = useCallback(
    () =>
      cr<Review>(`/${id}/review`).then(setReview, (e: Error) =>
        setError(e.message),
      ),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const running = review?.job?.state === "running";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const v = await cr<{ project: Project; job: Job | null }>(`/${id}`).catch(
        () => null,
      );
      if (!v) return;
      if (v.job?.state === "running")
        setReview((r) => (r ? { ...r, job: v.job } : r));
      else load();
    }, 1000);
    return () => clearInterval(t);
  }, [running, id, load]);

  const start = async (path: string, body?: unknown) => {
    setError(null);
    try {
      const { job } = await cr<{ job: Job }>(
        `/${id}/${path}`,
        "POST",
        body ?? {},
      );
      setReview((r) => (r ? { ...r, job } : r));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const nudge = async (source: string, delta: number) => {
    if (!review) return;
    try {
      const v = await cr<{ project: Project }>(
        `/${id}/sync`,
        "POST",
        { source, delta },
        { "X-Edit-Revision": String(review.project.revision) },
      );
      setReview({ ...review, project: v.project });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const angle = async (camera: string, shows: string | null) => {
    if (!review) return;
    try {
      const v = await cr<{ project: Project }>(
        `/${id}/angle`,
        "POST",
        { camera, shows },
        { "X-Edit-Revision": String(review.project.revision) },
      );
      setReview({ ...review, project: v.project });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!review)
    return <p className="lf-hint lf-pad">{error ?? "Wczytuję projekt…"}</p>;
  const p = review.project;
  const job = review.job;
  const processed = Boolean(p.processedAt && review.words.length);
  const blocked = running
    ? "Trwa zadanie"
    : dirty
      ? "Zapisuję zmiany cięć"
      : p.stale
        ? "Najpierw przetwórz ponownie"
        : !processed
          ? "Najpierw przetwórz nagranie"
          : null;
  return (
    <main className="cr-project">
      <header className="cr-head">
        <div>
          <h2>{p.name}</h2>
          <p className="lf-hint">
            {plural(p.sources.length, "źródło", "źródła", "źródeł")} ·{" "}
            {clock(p.duration)}
            {p.client ? ` · klient: ${p.client}` : ""} ·{" "}
            {p.processedAt
              ? `przetworzone ${when(p.processedAt)}`
              : "jeszcze nieprzetworzone"}
          </p>
        </div>
        <div className="cr-run">
          <ProcessControls
            project={p}
            disabled={running}
            primary={!processed}
            onRun={(s) => start("process", s)}
          />
          {processed && (
            <button
              type="button"
              className="btn primary"
              disabled={Boolean(blocked)}
              title={blocked ?? undefined}
              onClick={() => start("export")}
            >
              Eksportuj do Premiere
            </button>
          )}
        </div>
      </header>
      {job && job.state !== "done" && (
        <JobStatus job={job} onRetry={() => start(job.kind)} />
      )}
      {job?.state === "done" && job.kind === "export" && (
        <p className="cr-note">
          Paczka gotowa — znajdziesz ją niżej w „Eksport do Premiere”.
        </p>
      )}
      {error && (
        <p className="cr-note error" role="alert">
          {error}
        </p>
      )}
      {p.stale && <p className="cr-note">{p.stale}</p>}
      {p.warnings.map((w) => (
        <p key={w} className="cr-note">
          {w}
        </p>
      ))}
      {processed ? (
        <ReviewScreen
          key={`${p.processedAt}-${p.revision}`}
          review={review}
          disabled={running}
          onDirty={setDirty}
          onNudge={nudge}
          onAngle={angle}
          onReveal={(version) =>
            cr(`/${id}/reveal`, "POST", { version }).catch((e: Error) =>
              setError(e.message),
            )
          }
        />
      ) : (
        <>
          <SyncTable project={p} disabled={running} onAngle={angle} />
          {!running && (
            <p className="lf-hint">
              Kliknij „Przetwarzaj”: CutRaw zsynchronizuje źródła, rozpozna mowę
              i zaproponuje cięcia do przeglądu.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function ProcessControls({
  project,
  disabled,
  primary,
  onRun,
}: {
  project: Project;
  disabled: boolean;
  primary: boolean;
  onRun: (s: Settings) => void;
}) {
  const s = project.settings;
  const [pace, setPace] = useState(s.pace);
  const [ai, setAi] = useState(s.ai);
  const [keepHead, setKeepHead] = useState(s.censor.keepHead);
  const [keepTail, setKeepTail] = useState(s.censor.keepTail);
  const panel = useRef<HTMLDetailsElement>(null);
  return (
    <>
      <details className="cr-settings" ref={panel}>
        <summary className="btn">Ustawienia cięć</summary>
        <div className="cr-settings-body">
          <label>
            Tempo cięć
            <select value={pace} onChange={(e) => setPace(e.target.value)}>
              {Object.entries(PACE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Redaktor sprawdzający cięcia
            <select value={ai} onChange={(e) => setAi(e.target.value)}>
              {Object.entries(AI_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cenzura przekleństw — słychać
            <select
              value={keepHead}
              onChange={(e) => setKeepHead(Number(e.target.value))}
            >
              <option value={1}>pierwszą literę</option>
              <option value={2}>2 pierwsze litery</option>
              <option value={3}>3 pierwsze litery</option>
            </select>
          </label>
          <label className="cr-check">
            <input
              type="checkbox"
              checked={keepTail === 1}
              onChange={(e) => setKeepTail(e.target.checked ? 1 : 0)}
            />
            i ostatnią literę
          </label>
          <p className="lf-hint">
            Ponowne przetwarzanie zachowuje Twoje ręczne decyzje. Do AI idzie
            tylko tekst transkrypcji.
          </p>
        </div>
      </details>
      <button
        type="button"
        className={`btn${primary ? " primary" : ""}`}
        disabled={disabled}
        onClick={() => {
          if (panel.current) panel.current.open = false;
          onRun({ pace, ai, keepHead, keepTail });
        }}
      >
        {project.processedAt ? "Przetwórz ponownie" : "Przetwarzaj"}
      </button>
    </>
  );
}

function JobStatus({ job, onRetry }: { job: Job; onRetry: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (job.state !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job.state]);
  if (job.state === "failed")
    return (
      <div className="cr-note error" role="alert">
        <p>
          {job.kind === "export" ? "Eksport" : "Przetwarzanie"} nie powiodło
          się: {job.error}
        </p>
        <button type="button" className="btn sm" onClick={onRetry}>
          Spróbuj ponownie
        </button>
      </div>
    );
  const stage =
    (job.stage && STAGE_LABEL[job.stage]) ??
    (job.kind === "export" ? "Eksport do Premiere" : "Przetwarzanie");
  return (
    <div className="cr-job" role="status" aria-live="polite">
      <p>
        <strong>{stage}</strong>
        {job.detail.startsWith(stage)
          ? job.detail.slice(stage.length)
          : ` — ${job.detail}`}
        {job.progress != null ? ` · ${Math.round(job.progress * 100)}%` : ""}
      </p>
      {job.progress != null && <progress value={job.progress} max={1} />}
      <p className="lf-hint">
        Czas pracy {clock((now - Date.parse(job.startedAt)) / 1000)}
      </p>
    </div>
  );
}

function SyncTable({
  project,
  disabled,
  onNudge,
  onAngle,
}: {
  project: Project;
  disabled?: boolean;
  onNudge?: (source: string, delta: number) => void;
  onAngle?: (camera: string, shows: string | null) => void;
}) {
  const mics = project.sources.filter((s) => s.role === "mic");
  // Auto-przełączanie (C3) ma sens przy ≥ 2 kamerach i osobnych mikrofonach (mówca = mikrofon).
  const angles =
    onAngle &&
    mics.length > 0 &&
    project.sources.filter((s) => s.role === "camera").length > 1;
  const ordered = [...project.sources].sort((a, b) =>
    a.id === project.reference
      ? -1
      : b.id === project.reference
        ? 1
        : a.role === b.role
          ? 0
          : a.role === "camera"
            ? -1
            : 1,
  );
  const step = frameLength(project.fps);
  return (
    <section className="cr-section" aria-labelledby="cr-sync">
      <h3 id="cr-sync">Materiały i synchronizacja</h3>
      <table className="cr-table">
        <thead>
          <tr>
            <th>Źródło</th>
            <th>Przesunięcie</th>
            <th>Synchronizacja</th>
            {onNudge && <th>Korekta (klatki)</th>}
          </tr>
        </thead>
        <tbody>
          {ordered.map((s) => {
            const ref = s.id === project.reference;
            const label = syncLabel(s, project.reference);
            return (
              <tr key={s.id}>
                <td title={s.path}>
                  {s.label}
                  <span className="cr-role">
                    {ref ? "Kamera główna" : ROLE_LABEL[s.role]}
                  </span>
                  {angles && s.role === "camera" && (
                    <label className="cr-angle">
                      Pokazuje
                      <select
                        value={s.shows ?? ""}
                        disabled={disabled}
                        onChange={(e) => onAngle(s.id, e.target.value || null)}
                      >
                        <option value="wide">Plan ogólny</option>
                        {mics.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                        <option value="">— nie przełączaj</option>
                      </select>
                    </label>
                  )}
                </td>
                <td className="num" data-label="Przesunięcie">
                  {ref ? "—" : formatOffset(s.offset ?? 0)}
                </td>
                <td
                  className={label === "do sprawdzenia" ? "cr-attn" : undefined}
                  data-label="Synchronizacja"
                >
                  {label}
                </td>
                {onNudge && (
                  <td
                    className="cr-nudge"
                    data-label={ref ? undefined : "Korekta (klatki)"}
                  >
                    {!ref && (
                      <>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={disabled}
                          aria-label={`${s.label}: o klatkę wcześniej`}
                          onClick={() => onNudge(s.id, -step)}
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={disabled}
                          aria-label={`${s.label}: o klatkę później`}
                          onClick={() => onNudge(s.id, step)}
                        >
                          +1
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// Fala jednego źródła na płótnie (kolor z CSS `color`), szerokość z kontenera.
function Wave({ levels, mic }: { levels: number[] | undefined; mic: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const draw = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = getComputedStyle(c).color;
      const cols = waveColumns(levels, Math.max(1, Math.floor(w)));
      cols.forEach((v, x) => {
        const bar = Math.max(1, v * (h - 4));
        ctx.fillRect(x, (h - bar) / 2, 1, bar);
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [levels]);
  return <canvas ref={canvas} className={`cr-wave${mic ? " mic" : ""}`} />;
}

// Oś źródeł: fala każdej kamery i mikrofonu wyrównana do czasu kamery głównej; cięcie przechodzi przez wszystkie naraz.
function SourceLanes({
  project,
  levels,
  cuts,
  duration,
  headRef,
  onSeek,
}: {
  project: Project;
  levels: Review["levels"];
  cuts: Cut[];
  duration: number;
  headRef: React.RefObject<HTMLDivElement | null>;
  onSeek: (t: number) => void;
}) {
  const ordered = [...project.sources].sort((a, b) =>
    a.id === project.reference
      ? -1
      : b.id === project.reference
        ? 1
        : a.role === b.role
          ? 0
          : a.role === "camera"
            ? -1
            : 1,
  );
  return (
    <div className="cr-lanes">
      <div className="cr-lane-labels" aria-hidden="true">
        {ordered.map((s) => (
          <span key={s.id} title={s.label}>
            {s.label}
          </span>
        ))}
      </div>
      <div
        className="cr-lane-area"
        role="presentation"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        {ordered.map((s) => (
          <Wave
            key={s.id}
            levels={levels?.sources[s.id]}
            mic={s.role === "mic"}
          />
        ))}
        <div className="cr-bands" aria-hidden="true">
          {cuts
            .filter((c) => c.decision !== "keep")
            .map((c) => (
              <span
                key={c.id}
                className={c.decision}
                style={{
                  left: `${(c.start / duration) * 100}%`,
                  width: `${Math.max(0.2, ((c.end - c.start) / duration) * 100)}%`,
                }}
              />
            ))}
        </div>
        <div className="cr-playhead" ref={headRef} aria-hidden="true" />
      </div>
    </div>
  );
}

function ReviewScreen({
  review,
  disabled,
  onDirty,
  onNudge,
  onAngle,
  onReveal,
}: {
  review: Review;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
  onNudge: (source: string, delta: number) => void;
  onAngle: (camera: string, shows: string | null) => void;
  onReveal: (version: number) => void;
}) {
  const p = review.project;
  const [doc, setDoc] = useState<Doc>({
    sourceDuration: p.duration,
    cuts: p.cuts,
    mutes: p.mutes,
  });
  const [past, setPast] = useState<Doc[]>([]);
  const [future, setFuture] = useState<Doc[]>([]);
  const [revision, setRevision] = useState(p.revision);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "conflict" | "error"
  >("saved");
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState<"cut" | "orig">("cut");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const head = useRef<HTMLDivElement>(null);
  useEffect(
    () => onDirty(dirty || saveState === "saving"),
    [dirty, saveState, onDirty],
  );

  const change = (next: Doc) => {
    if (next === doc) return;
    setPast((x) => [...x.slice(-49), doc]);
    setFuture([]);
    setDoc(next);
    setDirty(true);
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [doc, ...f]);
    setDoc(past[past.length - 1]);
    setPast((x) => x.slice(0, -1));
    setDirty(true);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((x) => [...x, doc]);
    setDoc(future[0]);
    setFuture((f) => f.slice(1));
    setDirty(true);
  };

  // Autozapis z rewizją; 409 = szkic zostaje w tym oknie.
  useEffect(() => {
    if (!dirty || saveState === "conflict") return;
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        const r = await cr<{ revision: number }>(
          `/${p.name}/cuts`,
          "PUT",
          { cuts: doc.cuts, mutes: doc.mutes },
          { "X-Edit-Revision": String(revision) },
        );
        setRevision(r.revision);
        setDirty(false);
        setSaveState("saved");
      } catch (e) {
        setSaveState((e as CrError).status === 409 ? "conflict" : "error");
        setNotice((e as Error).message);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [dirty, doc, revision, saveState, p.name]);

  const segments = useMemo(
    () => applyDecisions(doc.sourceDuration, doc.cuts),
    [doc],
  );
  const items = useMemo(
    () => transcriptItems(review.words, doc),
    [review.words, doc],
  );
  const visible = useMemo(
    () => doc.cuts.filter(FILTERS.find((f) => f.id === filter)!.test),
    [doc, filter],
  );
  const focused = doc.cuts.find((c) => c.id === focusId) ?? null;

  // Podgląd: przeskok przez wycięte fragmenty, wyciszenie cenzury na żywo, głowica osi źródeł.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    let censored = false;
    let volume = 1;
    const tick = () => {
      if (mode === "cut" && !v.paused) {
        const j = playbackJump(v.currentTime, segments);
        if (j === -1) v.pause();
        else if (j != null) v.currentTime = j;
      }
      const m = mutedAt(v.currentTime, doc.mutes);
      if (m !== censored) {
        if (m) volume = v.volume;
        v.volume = m ? 0 : volume;
        censored = m;
      }
      if (head.current)
        head.current.style.left = `${(v.currentTime / doc.sourceDuration) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (censored) v.volume = volume;
    };
  }, [mode, segments, doc.mutes, doc.sourceDuration]);

  const seek = (t: number) => {
    if (video.current)
      video.current.currentTime = Math.max(0, Math.min(t, doc.sourceDuration));
  };
  const focus = (c: Cut) => {
    setFocusId(c.id);
    seek(Math.max(0, c.start - 1));
  };
  const audition = (c: Cut, withCut: boolean) => {
    setMode(withCut ? "cut" : "orig");
    seek(Math.max(0, c.start - 2));
    void video.current?.play();
  };
  const step = (dir: 1 | -1) => {
    if (!visible.length) return;
    const i = visible.findIndex((c) => c.id === focusId);
    const next = visible[(i + dir + visible.length) % visible.length];
    focus(next);
    document
      .getElementById(`cr-cut-${next.id}`)
      ?.scrollIntoView({ block: "center" });
  };
  const cutSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed)
      return setNotice("Zaznacz słowa w transkrypcie, które chcesz wyciąć.");
    const ids = review.words.filter((w) => {
      const el = document.getElementById(`cr-w-${w.id}`);
      return el && sel.containsNode(el, true);
    });
    if (ids.length)
      change(
        userCut(
          doc,
          review.words,
          ids.map((w) => w.id),
        ),
      );
    sel.removeAllRanges();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (
      (e.target as HTMLElement).closest(
        "input,select,textarea,button,a,video,summary",
      )
    )
      return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "x" && focusId) change(toggleCut(doc, focusId));
    else if (k === "n") step(1);
    else if (k === "p") step(-1);
    else if (k === "f")
      setFilter((f) => (f === "undecided" ? "all" : "undecided"));
    else if (k === " ") {
      e.preventDefault();
      const v = video.current;
      if (v) void (v.paused ? v.play() : v.pause());
    }
  };

  const stats = cutStats(doc);
  const cost = costLabel(p.usage);
  const editor = EDITOR[p.settings.ai] ?? "AI";
  const shown = new Set(visible.map((c) => c.id));
  const chip = (c: Cut, label: string) => (
    <span
      key={`chip-${c.id}`}
      id={`cr-cut-${c.id}`}
      className={`lf-chip ${c.decision}${focusId === c.id ? " focused" : ""}`}
    >
      <button
        type="button"
        className="lf-chip-main"
        onClick={() => focus(c)}
        title={c.luna ? `${editor}: ${c.luna.reason}` : c.reason}
      >
        {label} ·{" "}
        {c.luna ? `${editor}: ${VERDICT[c.luna.verdict]}` : confidenceLabel(c)}
        {c.decision === "keep" && c.luna?.verdict !== "keep"
          ? " · zostaje"
          : c.decision === "undecided" && c.luna
            ? " · do decyzji"
            : ""}
      </button>
      <button
        type="button"
        className="lf-chip-act"
        onClick={() => change(toggleCut(doc, c.id))}
      >
        {c.decision === "cut" ? "Przywróć" : "Wytnij"}
      </button>
    </span>
  );
  let speaker: string | null | undefined;

  return (
    <div className="cr-review" onKeyDown={onKey}>
      <section className="cr-side" aria-label="Podgląd i synchronizacja">
        <div className="lf-seg" role="group" aria-label="Wersja podglądu">
          <button
            type="button"
            className="btn sm"
            aria-pressed={mode === "cut"}
            onClick={() => setMode("cut")}
          >
            Po cięciach
          </button>
          <button
            type="button"
            className="btn sm"
            aria-pressed={mode === "orig"}
            onClick={() => setMode("orig")}
          >
            Oryginał
          </button>
        </div>
        {review.proxy ? (
          <video
            ref={video}
            className="cr-video"
            style={{ aspectRatio: `${p.width} / ${p.height}` }}
            src={`/api/cutraw/${p.name}/proxy`}
            controls
            preload="metadata"
          />
        ) : (
          <p className="cr-note">
            Brak podglądu — przetwórz projekt w panelu, żeby zbudować podgląd
            720p.
          </p>
        )}
        <SourceLanes
          project={p}
          levels={review.levels}
          cuts={doc.cuts}
          duration={doc.sourceDuration}
          headRef={head}
          onSeek={seek}
        />
        <p className="lf-stats">
          <strong>
            Wycięto{" "}
            {stats.removed < 60 ? seconds(stats.removed) : clock(stats.removed)}{" "}
            z {clock(stats.total)} ({stats.pct}%)
          </strong>
          <br />
          {plural(stats.count, "cięcie", "cięcia", "cięć")} · {stats.undecided}{" "}
          do decyzji ·{" "}
          {plural(doc.mutes.length, "wyciszenie", "wyciszenia", "wyciszeń")}
          {cost ? ` · koszt AI wszystkich przebiegów: ${cost}` : ""}
        </p>
        {focused && (
          <div className="cr-focus" aria-live="polite">
            <p>
              <strong>{KIND_LABEL[focused.kind]}</strong> ·{" "}
              {clock(focused.start)}, {seconds(focused.end - focused.start)} ·{" "}
              {DECISION[focused.decision]}
            </p>
            {focused.luna && (
              <p>
                {editor}: {VERDICT[focused.luna.verdict]} —{" "}
                {focused.luna.reason}
              </p>
            )}
            {focused.reason && <p className="lf-hint">{focused.reason}</p>}
            <div className="cr-focus-actions">
              <button
                type="button"
                className="btn sm"
                onClick={() => audition(focused, false)}
              >
                Odsłuchaj oryginał
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={() => audition(focused, true)}
              >
                Odsłuchaj po cięciu
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={() => change(toggleCut(doc, focused.id))}
              >
                {focused.decision === "cut" ? "Przywróć" : "Wytnij"}
              </button>
            </div>
          </div>
        )}
        <p className="lf-save" aria-live="polite">
          {saveState === "saving"
            ? "Zapisuję…"
            : saveState === "conflict"
              ? "Projekt zmienił się w innym oknie — szkic został tutaj. Odśwież stronę."
              : saveState === "error"
                ? "Nie zapisano — spróbuj ponownie."
                : dirty
                  ? "Zmiany czekają na zapis"
                  : "Wszystko zapisane"}
        </p>
        {notice && (
          <p className="cr-note" role="status">
            {notice}
          </p>
        )}
        <SyncTable
          project={p}
          disabled={disabled || dirty}
          onNudge={onNudge}
          onAngle={onAngle}
        />
        <section className="cr-section" aria-labelledby="cr-export">
          <h3 id="cr-export">Eksport do Premiere</h3>
          <p className="lf-hint">
            W Premiere: Plik → Importuj → plik .xml z paczki. Klipy wskazują
            oryginalne nagrania, więc nie przenoś ich.
          </p>
          {(p.exports ?? [])
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.version} className="cr-export-row">
                <p>
                  <strong>
                    {e.tag ?? `v${String(e.version).padStart(3, "0")}`}
                  </strong>{" "}
                  · {plural(e.segments, "fragment", "fragmenty", "fragmentów")}{" "}
                  {e.shots
                    ? `· ${plural(e.shots, "ujęcie", "ujęcia", "ujęć")} kamer `
                    : ""}
                  · {clock(e.duration)} · {when(e.at)}
                  {e.revision != null && e.revision !== revision
                    ? " · starsza wersja cięć"
                    : ""}
                  <br />
                  <span className="lf-hint">{e.dir}</span>
                </p>
                {isMac && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => onReveal(e.version)}
                  >
                    Pokaż w Finderze
                  </button>
                )}
              </div>
            ))}
          {!p.exports?.length && (
            <p className="lf-hint">Jeszcze nic nie wyeksportowano.</p>
          )}
        </section>
        <details className="lf-help">
          <summary>Skróty klawiszowe</summary>
          <p>
            Spacja odtwórz · X przełącz wybrane cięcie · N/P następne/poprzednie
            · F „do decyzji” · ⌘Z cofnij · ⇧⌘Z ponów
          </p>
        </details>
      </section>

      <section className="lf-transcript" aria-label="Transkrypt z cięciami">
        <div className="lf-filters" role="group" aria-label="Filtr cięć">
          {FILTERS.map((f) => {
            const n = doc.cuts.filter(f.test).length;
            if (!n && f.id !== "all") return null;
            return (
              <button
                key={f.id}
                type="button"
                className="btn sm"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label} ({n})
              </button>
            );
          })}
        </div>
        <div className="lf-bulk">
          <button type="button" className="btn sm" onClick={cutSelection}>
            Wytnij zaznaczone
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={!past.length}
            onClick={undo}
          >
            Cofnij
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={!future.length}
            onClick={redo}
          >
            Ponów
          </button>
          {!["all", "undecided"].includes(filter) && (
            <button
              type="button"
              className="btn sm"
              onClick={() => change(restoreKind(doc, filter))}
            >
              Przywróć wszystkie: {FILTERS.find((f) => f.id === filter)!.label}
            </button>
          )}
        </div>
        <div className="lf-words cr-words" tabIndex={0}>
          {items.map((it) => {
            if (it.type === "gap") {
              const c = it.cut as Cut;
              return shown.has(c.id)
                ? chip(c, `${KIND_LABEL[c.kind]} ${seconds(c.end - c.start)}`)
                : null;
            }
            const c = it.cut as Cut | null;
            const w = it.word as Word;
            const who = w.speaker !== speaker && w.speaker ? w.speaker : null;
            speaker = w.speaker;
            return (
              <span key={w.id}>
                {who && <span className="cr-speaker">{who}</span>}
                {c &&
                  c.wordIds[0] === w.id &&
                  shown.has(c.id) &&
                  chip(c, KIND_LABEL[c.kind])}
                <span
                  id={`cr-w-${w.id}`}
                  className={`lf-w${c?.decision === "cut" ? " struck" : c?.decision === "undecided" ? " maybe" : ""}`}
                  onClick={() => seek(w.start)}
                >
                  {it.mute ? censorWord(w.text) : w.text}
                </span>
                {it.mute && (
                  <button
                    type="button"
                    className="lf-mute"
                    onClick={() => change(removeMute(doc, w.id))}
                  >
                    Cenzura · wyłącz
                  </button>
                )}{" "}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
