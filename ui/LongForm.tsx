/// <reference types="vite/client" />
// LongForm w panelu: lista projektów, „Nowy film” → Przetwarzaj, ekran „Cięcia” (docs/longform/gui.md §2),
// a Plan / Montaż / Wynik w ./LongFormPlan.tsx (§3–5).
import { Player, type PlayerRef } from "@remotion/player";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Reel, type ReelData } from "../src/Reel";
import { censorWord, reelFrames, toOut } from "../src/reel-timing";
import { applyDecisions } from "../src/longform/cuts.mjs";
import {
  KIND_LABEL,
  confidenceLabel,
  cutStats,
  parseLfHash,
  removeMute,
  steps,
  restoreKind,
  toggleCut,
  transcriptItems,
  usageSummary,
  userCut,
} from "./longform-view.mjs";
import "./longform.css";
// An incomplete optional LongForm screen must not block QuickContent at import time.

const planScreens = import.meta.glob<{
  PlanScreen: React.ComponentType<{
    project: Project;
    onProject: (p: Project) => void;
    reload: () => void;
  }>;
  ResultScreen: React.ComponentType<{ project: Project }>;
}>("./LongFormPlan.tsx");
const MissingPlan = () => (
  <p className="lf-notice">
    Ekrany planu i wyniku LongForm są niedostępne. Możesz nadal korzystać z cięć
    oraz <a href="#qc">QuickContent</a>.
  </p>
);
const PlanScreen = lazy<
  React.ComponentType<{
    project: Project;
    onProject: (p: Project) => void;
    reload: () => void;
  }>
>(async () => ({
  default: planScreens["./LongFormPlan.tsx"]
    ? (await planScreens["./LongFormPlan.tsx"]()).PlanScreen
    : MissingPlan,
}));
const ResultScreen = lazy<React.ComponentType<{ project: Project }>>(
  async () => ({
    default: planScreens["./LongFormPlan.tsx"]
      ? (await planScreens["./LongFormPlan.tsx"]()).ResultScreen
      : MissingPlan,
  }),
);

type Cut = {
  id: string;
  start: number;
  end: number;
  wordIds: string[];
  kind: keyof typeof KIND_LABEL;
  reason: string;
  confidence: number;
  auto: boolean;
  decision: "cut" | "keep" | "undecided";
};
type Mute = {
  wordId: string;
  start: number;
  end: number;
  ramp: number;
  sfx: string | null;
  level?: number | null;
};
type Doc = { version: 1; sourceDuration: number; cuts: Cut[]; mutes: Mute[] };
type Word = { id: string; text: string; start: number; end: number };
export type Project = {
  id: string;
  origin: string;
  client: string | null;
  duration: number;
  state:
    | "created"
    | "processing"
    | "awaiting-cut-review"
    | "cuts-approved"
    | "planning"
    | "plan-review"
    | "montage"
    | "done"
    | "failed";
  failedFrom?: string;
  roughcutRevision: number;
  editRevision: number;
  planRevision?: number;
  planStale: boolean;
  renderStale: boolean;
  renders?: { file: string; version: number; key: string; createdAt: string }[];
  job: {
    stage: string;
    progress: number | null;
    detail: string;
    startedAt: string;
    error?: string;
  } | null;
  warnings: string[];
  aiProvider?: string;
  usage?: Record<string, unknown>[];
};
type RoughcutView = {
  revision: number;
  roughcut: Doc;
  words: Word[];
  reel: ReelData;
  project: Project;
};

export class LfError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function lf<T>(
  url: string,
  method = "GET",
  data?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const r = await fetch("/api/lf" + url, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "X-Panel": "1", "Content-Type": "application/json", ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new LfError(d.error ?? `Błąd serwera (${r.status})`, r.status);
  return d as T;
}

export const time = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const STAGE: Record<string, string> = {
  transcribe: "Transkrypcja (Whisper)",
  measure: "Cisza i poziom głosu",
  edit: "Redakcja AI",
  validate: "Walidator cięć",
  plan: "Plan: rozdziały, hook i efekty (AI na koncie)",
  assets: "Przebitki i logotypy",
  segment: "Segmentacja osoby (Apple Vision)",
  render: "Render filmu",
  done: "Gotowe",
};
const STATE_LABEL: Record<Project["state"], string> = {
  created: "Nowy",
  processing: "Przetwarzanie",
  "awaiting-cut-review": "Cięcia do przeglądu",
  "cuts-approved": "Cięcia zatwierdzone",
  planning: "Planowanie",
  "plan-review": "Plan do akceptacji",
  montage: "Montaż",
  done: "Gotowy film",
  failed: "Błąd",
};
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

export function LongForm({ onClose }: { onClose: () => void }) {
  const [route, setRoute] = useState(
    () => parseLfHash(location.hash) ?? { id: null, step: null },
  );
  useEffect(() => {
    const on = () => {
      const r = parseLfHash(location.hash);
      if (r) setRoute(r);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return (
    <div className="lf">
      <header className="lf-top">
        <button type="button" className="btn ghost" onClick={onClose}>
          ← Panel
        </button>
        <h1>Film poziomy</h1>
        {route.id && (
          <a className="btn ghost" href="#lf">
            Wszystkie projekty
          </a>
        )}
      </header>
      {route.id ? (
        <ProjectView key={route.id} id={route.id} step={route.step} />
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
  const [list, setList] = useState<Project[] | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [name, setName] = useState("");
  const [aiProvider, setAiProvider] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    lf<Project[]>("/projects").then(setList, (e: Error) => setError(e.message));
    lf<string[]>("/sources").then(setSources, () => {});
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await lf("/projects", "POST", { name, source });
      await lf(`/${name}/process`, "POST", aiProvider ? { aiProvider } : {});
      location.hash = `lf/${name}/ciecia`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <main className="lf-list">
      <form className="lf-card lf-new" onSubmit={submit}>
        <h2>Nowy film</h2>
        <label>
          Nagranie
          <select
            required
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              if (!name) setName(slugOf(e.target.value));
            }}
          >
            <option value="">Wybierz plik z inbox/ lub folderu klienta…</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {!sources.length && (
          <p className="lf-hint">
            Wrzuć nagranie do folderu inbox/ i odśwież stronę.
          </p>
        )}
        <label>
          Nazwa projektu
          <input
            required
            pattern="[a-z0-9][a-z0-9\-]{0,79}"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Operator AI (redakcja dubli i falstartów)
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
          >
            <option value="">Domyślny — konto z ustawień</option>
            <option value="claude">Claude Code — konto</option>
            <option value="codex">Codex — konto</option>
          </select>
        </label>
        <p className="lf-hint">
          AI LongForm działa tylko na zalogowanym koncie CLI — bez płatnego API.
        </p>
        <p className="lf-hint">
          Klienta i styl rozpoznajemy po folderze nagrania. Najpierw dostaniesz
          pocięty materiał do przejrzenia. Montaż ruszy po Twoim zatwierdzeniu.
        </p>
        {error && (
          <p className="lf-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy || !source || !name}>
          {busy ? "Uruchamiam…" : "Przetwarzaj"}
        </button>
      </form>
      <section className="lf-card">
        <h2>Projekty</h2>
        {list === null ? (
          <p className="lf-hint">Wczytuję…</p>
        ) : !list.length ? (
          <p className="lf-hint">
            Jeszcze nie ma projektów. Zacznij od nagrania obok.
          </p>
        ) : (
          <ul className="lf-projects">
            {list.map((p) => (
              <li key={p.id}>
                <a href={`#lf/${p.id}/ciecia`}>
                  <strong>{p.id}</strong>
                  <span>
                    {STATE_LABEL[p.state]} · {time(p.duration)}
                    {p.client ? ` · ${p.client}` : ""}
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

const STEP_LABEL: [string, string][] = [
  ["material", "Materiał"],
  ["ciecia", "Cięcia"],
  ["plan", "Plan"],
  ["montaz", "Montaż"],
  ["wynik", "Wynik"],
];
function Stepper({ project, active }: { project: Project; active: string }) {
  const st = steps(project);
  return (
    <ol className="lf-stepper" aria-label="Etapy projektu">
      {STEP_LABEL.map(([id, label], i) => {
        const open = st.open.includes(id) && id !== "material";
        const done =
          (st.open.includes(id) &&
            st.open.indexOf(id) < st.open.indexOf(st.current)) ||
          id === "material";
        const body = (
          <>
            <span className="n">{done && id !== active ? "✓" : i + 1}</span>{" "}
            {label}
          </>
        );
        return (
          <li
            key={id}
            className={
              id === active ? "current" : open || done ? "done" : "locked"
            }
            aria-current={id === active ? "step" : undefined}
            title={!open && !done ? st.why[id] : undefined}
          >
            {open && id !== active ? (
              <a href={`#lf/${project.id}/${id}`}>{body}</a>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ProjectView({ id, step }: { id: string; step: string | null }) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      lf<Project>(`/projects/${id}`).then(setProject, (e: Error) =>
        setError(e.message),
      ),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const busy =
    project && ["processing", "planning", "montage"].includes(project.state);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, [busy, load]);
  if (error) return <p className="lf-error lf-pad">{error}</p>;
  if (!project) return <p className="lf-hint lf-pad">Wczytuję projekt…</p>;
  const st = steps(project);
  const active =
    step && st.open.includes(step) && step !== "material" ? step : st.current;
  const failedHere = project.state === "failed" && st.current === active;
  return (
    <main className="lf-project">
      <div className="lf-head">
        <h2>{project.id}</h2>
        <Stepper project={project} active={active} />
      </div>
      {busy || failedHere || project.state === "created" ? (
        <Processing project={project} onStart={load} />
      ) : active === "ciecia" ? (
        <Cuts id={id} onProject={setProject} />
      ) : active === "wynik" ? (
        <Suspense fallback={<p>Wczytuję wynik…</p>}>
          <ResultScreen project={project} />
        </Suspense>
      ) : (
        <Suspense fallback={<p>Wczytuję plan…</p>}>
          <PlanScreen project={project} onProject={setProject} reload={load} />
        </Suspense>
      )}
    </main>
  );
}

function Processing({
  project,
  onStart,
}: {
  project: Project;
  onStart: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!["processing", "planning", "montage"].includes(project.state)) {
    const retryPlan =
      project.state === "failed" &&
      project.failedFrom &&
      project.failedFrom !== "processing";
    // Nieudany montaż ponawia sam montaż (plan już zaakceptowany) — bez ponownego zapytania AI.
    const retryMontage =
      !!retryPlan && ["assets", "segment", "render"].includes(project.job?.stage ?? "");
    return (
      <div className="lf-card lf-pad">
        {project.state === "failed" && (
          <p className="lf-error" role="alert">
            {project.job?.error ?? "Zadanie nie powiodło się."}
          </p>
        )}
        {error && <p className="lf-error">{error}</p>}
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            (retryMontage
              ? lf(
                  `/${project.id}/plan/approve`,
                  "POST",
                  {},
                  {
                    "X-Edit-Revision": String(project.planRevision ?? 0),
                  },
                )
              : lf(
                  `/${project.id}/${retryPlan ? "plan" : "process"}`,
                  "POST",
                  {},
                )
            ).then(onStart, (e: Error) => setError(e.message))
          }
        >
          {retryMontage
            ? "Ponów montaż"
            : retryPlan
              ? "Ponów plan"
              : project.state === "failed"
                ? "Ponów przetwarzanie"
                : "Przetwarzaj"}
        </button>
      </div>
    );
  }
  const job = project.job!;
  const elapsed = Math.max(
    0,
    Math.round((now - Date.parse(job.startedAt)) / 1000),
  );
  return (
    <div className="lf-card lf-pad lf-progress" aria-live="polite">
      <h3>{STAGE[job.stage] ?? job.stage}</h3>
      <p>{job.detail}</p>
      {job.progress != null ? (
        <>
          <progress max={1} value={job.progress} />
          <p>
            {Math.round(job.progress * 100)}% · {time(elapsed)}
          </p>
        </>
      ) : (
        <p>Czas pracy: {time(elapsed)} (ten etap nie podaje procentu)</p>
      )}
    </div>
  );
}

function Cuts({
  id,
  onProject,
}: {
  id: string;
  onProject: (p: Project) => void;
}) {
  const [view, setView] = useState<RoughcutView | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [past, setPast] = useState<Doc[]>([]);
  const [future, setFuture] = useState<Doc[]>([]);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "conflict" | "error"
  >("saved");
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState<"cut" | "orig">("cut");
  const [focusCut, setFocusCut] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const player = useRef<PlayerRef>(null);

  useEffect(() => {
    lf<RoughcutView>(`/${id}/roughcut`).then(
      (v) => {
        setView(v);
        setDoc(v.roughcut);
        setRevision(v.revision);
        onProject(v.project);
      },
      (e: Error) => setNotice(e.message),
    );
  }, [id, onProject]);

  const change = (next: Doc) => {
    if (!doc || next === doc) return;
    setPast((p) => [...p.slice(-49), doc]);
    setFuture([]);
    setDoc(next);
    setDirty(true);
  };
  const undo = () => {
    if (!past.length || !doc) return;
    setFuture((f) => [doc, ...f]);
    setDoc(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setDirty(true);
  };
  const redo = () => {
    if (!future.length || !doc) return;
    setPast((p) => [...p, doc]);
    setDoc(future[0]);
    setFuture((f) => f.slice(1));
    setDirty(true);
  };

  // Autozapis z rewizją; 409 = szkic zostaje, komunikat.
  const approved = view?.project.state === "cuts-approved";
  useEffect(() => {
    if (!dirty || !doc || saveState === "conflict") return;
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        const r = await lf<{ revision: number }>(
          `/${id}/roughcut`,
          "PUT",
          doc,
          { "X-Edit-Revision": String(revision) },
        );
        setRevision(r.revision);
        setDirty(false);
        setSaveState("saved");
        if (approved) {
          setNotice(
            "Cięcia zmienione po zatwierdzeniu — plan i render trzeba przygotować ponownie. Zatwierdź cięcia jeszcze raz.",
          );
          const p = await lf<Project>(`/projects/${id}`);
          onProject(p);
          setView((v) => (v ? { ...v, project: p } : v));
        }
      } catch (e) {
        setSaveState((e as LfError).status === 409 ? "conflict" : "error");
        setNotice((e as Error).message);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [dirty, doc, id, revision, saveState, approved, onProject]);

  const segments = useMemo(
    () => (doc ? applyDecisions(doc.sourceDuration, doc.cuts) : []),
    [doc],
  );
  const data = useMemo<ReelData | null>(() => {
    if (!view || !doc) return null;
    return {
      ...view.reel,
      segments:
        mode === "cut" ? segments : [{ start: 0, end: doc.sourceDuration }],
      mutes: doc.mutes,
    };
  }, [view, doc, segments, mode]);
  const items = useMemo(
    () => (view && doc ? transcriptItems(view.words, doc) : []),
    [view, doc],
  );
  const visibleCuts = useMemo(
    () =>
      doc ? doc.cuts.filter(FILTERS.find((f) => f.id === filter)!.test) : [],
    [doc, filter],
  );

  const seek = (t: number) => {
    const fps = data?.fps ?? 30;
    player.current?.seekTo(
      Math.round((mode === "cut" ? toOut(t, segments) : t) * fps),
    );
  };
  const focus = (c: Cut) => {
    setFocusCut(c.id);
    seek(c.start);
  };
  const step = (dir: 1 | -1) => {
    if (!visibleCuts.length) return;
    const i = visibleCuts.findIndex((c) => c.id === focusCut);
    const next =
      visibleCuts[(i + dir + visibleCuts.length) % visibleCuts.length];
    focus(next);
    document
      .getElementById(`cut-${next.id}`)
      ?.scrollIntoView({ block: "center" });
  };
  const cutSelection = () => {
    if (!doc || !view) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed)
      return setNotice("Zaznacz słowa w transkrypcie, które chcesz wyciąć.");
    const ids = view.words.filter((w) => {
      const el = document.getElementById(`w-${w.id}`);
      return el && sel.containsNode(el, true);
    });
    if (ids.length)
      change(
        userCut(
          doc,
          view.words,
          ids.map((w) => w.id),
        ),
      );
    sel.removeAllRanges();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input,select,textarea,button,a"))
      return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "x" && focusCut && doc) change(toggleCut(doc, focusCut));
    else if (k === "n") step(1);
    else if (k === "p") step(-1);
    else if (k === "f")
      setFilter((f) => (f === "undecided" ? "all" : "undecided"));
    else if (k === " ") {
      e.preventDefault();
      player.current?.toggle();
    }
  };

  const approve = async () => {
    setApproving(true);
    try {
      const p = await lf<Project>(
        `/${id}/roughcut/approve`,
        "POST",
        undefined,
        { "X-Edit-Revision": String(revision) },
      );
      onProject(p);
      setView((v) => (v ? { ...v, project: p } : v));
      setNotice(
        "Cięcia zatwierdzone i zapisane w reel.json. Przejdź do kroku 3: Plan.",
      );
      location.hash = `lf/${id}/plan`;
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  if (!view || !doc || !data)
    return <p className="lf-hint lf-pad">{notice ?? "Wczytuję cięcia…"}</p>;
  const stats = cutStats(doc);
  const fps = data.fps ?? 30;
  const dims = data.format ?? { width: 1920, height: 1080 };
  const shown = new Set(visibleCuts.map((c) => c.id));
  const chip = (c: Cut, label: string) => (
    <CutChip
      key={`chip-${c.id}`}
      c={c}
      label={label}
      focused={focusCut === c.id}
      onToggle={() => change(toggleCut(doc, c.id))}
      onFocus={() => focus(c)}
    />
  );

  return (
    <div className="lf-cuts" onKeyDown={onKey}>
      <section className="lf-preview" aria-label="Podgląd">
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
        <div
          className="lf-player"
          style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
        >
          <Player
            ref={player}
            component={Reel}
            inputProps={{ reel: id, data }}
            durationInFrames={reelFrames(data)}
            fps={fps}
            compositionWidth={dims.width}
            compositionHeight={dims.height}
            style={{ width: "100%", height: "100%" }}
            controls
            clickToPlay
          />
        </div>
        <div className="lf-timeline" aria-hidden="true">
          {doc.cuts
            .filter((c) => c.decision !== "keep")
            .map((c) => (
              <span
                key={c.id}
                className={c.decision === "cut" ? "cut" : "undecided"}
                style={{
                  left: `${(c.start / doc.sourceDuration) * 100}%`,
                  width: `${Math.max(0.3, ((c.end - c.start) / doc.sourceDuration) * 100)}%`,
                }}
              />
            ))}
        </div>
        <p className="lf-stats">
          <strong>
            Wycięto{" "}
            {stats.removed < 60
              ? `${String(stats.removed).replace(".", ",")} s`
              : time(stats.removed)}{" "}
            z {time(stats.total)} ({stats.pct}%)
          </strong>
          <br />
          {stats.count} cięć · {stats.undecided} do decyzji (zostają w filmie,
          dopóki ich nie wytniesz) · {doc.mutes.length} wyciszeń
        </p>
        {view.project.warnings.map((w) => (
          <p key={w} className="lf-warn">
            ⚠ {w}
          </p>
        ))}
        <div className="lf-actions">
          <a className="btn" href={`/api/lf/${id}/export/otio`} download>
            Eksport do Premiere (.otio)
          </a>
          <button
            type="button"
            className="btn primary"
            disabled={approving || saveState !== "saved" || dirty}
            onClick={approve}
          >
            {approved ? "Cięcia zatwierdzone ✓" : "Zatwierdź cięcia"}
          </button>
        </div>
        <p className="lf-save" aria-live="polite">
          {saveState === "saving"
            ? "Zapisuję…"
            : saveState === "conflict"
              ? "Konflikt wersji — szkic zachowany w tym oknie. Odśwież stronę."
              : saveState === "error"
                ? "Nie zapisano — spróbuj ponownie."
                : dirty
                  ? "Zmiany czekają na zapis"
                  : "Wszystko zapisane"}
        </p>
        {notice && (
          <p className="lf-notice" role="status">
            {notice}
          </p>
        )}
        <details className="lf-help">
          <summary>Zużycie AI</summary>
          {view.project.usage?.length ? (
            <table className="lf-usage">
              <tbody>
                {usageSummary(view.project.usage).map((u, i) => (
                  <tr key={i}>
                    <td>{u.stage}</td>
                    <td>{u.label}</td>
                    <td>{u.tokens}</td>
                    <td>{u.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Brak danych o zużyciu.</p>
          )}
        </details>
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
                {f.id === "undecided" ? "⚠ " : ""}
                {f.label} ({n})
              </button>
            );
          })}
        </div>
        <div className="lf-bulk">
          <button type="button" className="btn sm" onClick={cutSelection}>
            ✂ Wytnij zaznaczone
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
        <div className="lf-words" tabIndex={0}>
          {items.map((it) => {
            if (it.type === "gap") {
              const c = it.cut as Cut;
              return shown.has(c.id)
                ? chip(
                    c,
                    `${KIND_LABEL[c.kind]} ${(c.end - c.start).toFixed(1).replace(".", ",")} s`,
                  )
                : null;
            }
            const c = it.cut as Cut | null;
            const w = it.word as Word;
            return (
              <span key={w.id}>
                {c &&
                  c.wordIds[0] === w.id &&
                  shown.has(c.id) &&
                  chip(c, KIND_LABEL[c.kind])}
                <span
                  id={`w-${w.id}`}
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

function CutChip({
  c,
  label,
  focused,
  onToggle,
  onFocus,
}: {
  c: Cut;
  label: string;
  focused: boolean;
  onToggle: () => void;
  onFocus: () => void;
}) {
  return (
    <span
      id={`cut-${c.id}`}
      className={`lf-chip ${c.decision}${focused ? " focused" : ""}`}
    >
      <button
        type="button"
        className="lf-chip-main"
        onClick={onFocus}
        title={c.reason || label}
      >
        <span aria-hidden="true">
          {c.decision === "cut" ? "✂" : c.decision === "undecided" ? "?" : "↺"}
        </span>{" "}
        {label} · {confidenceLabel(c)}
        {c.decision === "keep" ? " · zostaje" : ""}
      </button>
      <button type="button" className="lf-chip-act" onClick={onToggle}>
        {c.decision === "cut" ? "Przywróć" : "Wytnij"}
      </button>
    </span>
  );
}
