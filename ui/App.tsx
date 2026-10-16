// Panel MontageFrames: biblioteka | podgląd + oś czasu | edycja. Źródłem prawdy są pliki (reel.json), panel tylko je czyta i zapisuje.
import { MotionStudio } from "./MotionStudio";
import { LongForm } from "./LongForm";
import { parseLfHash } from "./longform-view.mjs";
import { QuickContent } from "./QuickContent";
import {
  currentCandidate,
  createReelSaveQueue,
  parseQuickContentHash,
  quickContentHash,
  reelNameFromHash,
} from "./quickcontent-view.mjs";
import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reel, reelFrames, type ReelData } from "../src/Reel";
import {
  api,
  fmt,
  type Library,
  type OperatorStatus,
  type Settings,
  type QuickContentReelInfo,
  PanelError,
} from "./api";
import { NewReelDialog, SettingsDialog } from "./Dialogs";
import { Inspector, type JobView, type StartBody, type Tab } from "./Inspector";
import { lanesOf, Timeline, type Lane } from "./Timeline";

const IDLE: JobView = {
  kind: null,
  status: "idle",
  lines: [],
  pct: null,
  result: null,
};
const hashName = () => reelNameFromHash(location.hash);
const hashIsQuickContent = () =>
  location.hash === "#qc" || location.hash.startsWith("#qc/");

export function App() {
  const [motion, setMotion] = useState(false);
  const [longform, setLongform] = useState(() => parseLfHash(location.hash) !== null);
  const [quickContent, setQuickContent] = useState(hashIsQuickContent);
  const [qcInfo, setQcInfo] = useState<QuickContentReelInfo | null>(null);
  const [qcInfoLoading, setQcInfoLoading] = useState(false);
  const [qcRevisionKnown, setQcRevisionKnown] = useState(false);
  const [lib, setLib] = useState<Library | null>(null);
  const [sel, setSel] = useState<string | null>(() =>
    parseLfHash(location.hash) ? null : hashName(),
  );
  const [data, setData] = useState<ReelData | null>(null);
  const [missing, setMissing] = useState(false);
  const [undo, setUndo] = useState<ReelData[]>([]);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{
    message: string;
    conflict: boolean;
  } | null>(null);
  const [job, setJob] = useState<JobView>(IDLE);
  const [tab, setTab] = useState<Tab>("napisy");
  const [focus, setFocus] = useState<{ lane: Lane; index: number } | null>(
    null,
  );
  const [dialog, setDialog] = useState<"new" | "settings" | null>(null);
  const [operator, setOperator] = useState<OperatorStatus | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const player = useRef<PlayerRef>(null);
  const since = useRef(0);
  const saves = useMemo(() => createReelSaveQueue(api.save), []);
  const drafts = useRef(
    new Map<
      string,
      { data: ReelData; error: { message: string; conflict: boolean } }
    >(),
  );
  const activeReel = useRef(sel);
  activeReel.current = sel;
  const saveFailed = useRef(false);
  const pendingSaves = useRef(0);
  const editGeneration = useRef(0);
  const qcEditor = useRef<{
    projectId: string;
    candidateId: string;
    reelName: string;
  } | null>(null);

  const refreshQcInfo = useCallback(async (name: string) => {
    try {
      const info = await api.quickContentReel(name);
      if (activeReel.current === name) setQcInfo(info);
    } catch (failure) {
      if (activeReel.current === name) setError((failure as Error).message);
    } finally {
      if (activeReel.current === name) setQcInfoLoading(false);
    }
  }, []);
  const selectReel = useCallback((name: string) => {
    qcEditor.current = null;
    setQuickContent(false);
    setSel(name);
    location.hash = encodeURIComponent(name);
  }, []);
  const openQcReel = useCallback(
    (reelName: string, projectId: string, candidateId: string) => {
      qcEditor.current = { reelName, projectId, candidateId };
      setQuickContent(false);
      setSel(reelName);
      setTab("napisy");
      location.hash = quickContentHash(projectId, candidateId);
    },
    [],
  );
  const openQuickContent = useCallback((projectId?: string) => {
    qcEditor.current = null;
    setSel(null);
    setQuickContent(true);
    setMotion(false);
    location.hash = quickContentHash(projectId);
  }, []);

  const loadLib = useCallback(
    () => api.library().then(setLib, (e: Error) => setError(e.message)),
    [],
  );
  const checkOperator = useCallback(
    () => api.operator().then(setOperator, () => setOperator(null)),
    [],
  );
  useEffect(() => {
    loadLib();
    checkOperator();
    api.settings().then(setSettings, () => {});
    const onHash = () => {
      // #lf… = moduł LongForm (ma własną nawigację w ui/LongForm.tsx)
      const lf = parseLfHash(location.hash) !== null;
      setLongform(lf);
      if (lf) return;
      if (hashIsQuickContent()) {
        const route = parseQuickContentHash(location.hash);
        const context = qcEditor.current;
        if (
          context &&
          context.projectId === route?.projectId &&
          context.candidateId === route?.candidateId
        ) {
          setQuickContent(false);
          setSel(context.reelName);
        } else {
          qcEditor.current = null;
          setQuickContent(true);
          setSel(null);
        }
      } else {
        qcEditor.current = null;
        setQuickContent(false);
        setSel(hashName());
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [loadLib, checkOperator]);

  // Wybór rolki: adres w #, reel.json i stan zadania tej rolki.
  useEffect(() => {
    setData(null);
    setQcInfo(null);
    setQcRevisionKnown(false);
    setQcInfoLoading(Boolean(sel));
    saveFailed.current = false;
    setSaveError(null);
    setMissing(false);
    setUndo([]);
    setSaving("idle");
    setFocus(null);
    setJob(IDLE);
    since.current = 0;
    if (!sel) return;
    void refreshQcInfo(sel);
    let live = true;
    saves
      .idle()
      .then(() => api.reelState(sel))
      .then(
        (state) => {
          if (!live) return;
          setQcRevisionKnown(state.editRevision !== undefined);
          const draft = drafts.current.get(sel);
          if (draft) {
            setData(draft.data);
            saveFailed.current = true;
            setSaveError(draft.error);
            setSaving("error");
          } else {
            saves.reset(sel, state.editRevision);
            setData(state.data);
          }
        },
        () => live && setMissing(true),
      );
    api.job(sel, 0).then(
      (j) => {
        if (!live || j.status === "idle") return;
        since.current = j.next;
        setJob({
          kind: j.kind,
          status: j.status,
          lines: j.lines,
          pct: j.pct,
          result: j.result,
        });
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [sel, refreshQcInfo, saves]);

  // Trwające zadanie: co sekundę dopisz log; operator zmienia reel.json, więc podgląd też się odświeża.
  useEffect(() => {
    if (!sel || job.status !== "running") return;
    const name = sel;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const j = await api.job(name, since.current).catch(() => null);
      if (!live) return;
      if (!j || j.status === "idle") {
        timer = setTimeout(poll, 2000);
        return;
      }
      void refreshQcInfo(name);
      since.current = j.next;
      setJob((prev) => ({
        kind: j.kind,
        status: j.status,
        pct: j.pct,
        result: j.result,
        lines: [...prev.lines, ...j.lines],
      }));
      if (
        (j.kind !== "render" || j.status !== "running") &&
        !pendingSaves.current
      ) {
        const generation = editGeneration.current;
        api.reelState(name).then(
          (state) => {
            if (
              activeReel.current !== name ||
              pendingSaves.current ||
              generation !== editGeneration.current ||
              saveFailed.current
            )
              return;
            setMissing(false);
            saves.reset(name, state.editRevision);
            setData((cur) =>
              JSON.stringify(cur) === JSON.stringify(state.data)
                ? cur
                : state.data,
            );
          },
          () => {},
        );
      }
      if (j.status !== "running") loadLib();
      else timer = setTimeout(poll, 1000);
    }
    timer = setTimeout(poll, 1000);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [sel, job.status, loadLib, refreshQcInfo, saves]);

  // Gdy coś trwa przy innych rolkach, lista po lewej też ma aktualne kropki.
  useEffect(() => {
    if (!lib || !Object.values(lib.jobs).some((j) => j.status === "running"))
      return;
    const t = setInterval(loadLib, 4000);
    return () => clearInterval(t);
  }, [lib, loadLib]);

  const readOnly =
    qcInfoLoading || (job.status === "running" && job.kind !== "render");
  const persist = (name: string, next: ReelData) => {
    setSaving("saving");
    pendingSaves.current++;
    const isQC = Boolean(qcInfo || qcEditor.current || qcRevisionKnown);
    void saves
      .enqueue(name, next, isQC)
      .then(
        () => {
          drafts.current.delete(name);
          if (activeReel.current === name) {
            saveFailed.current = false;
            setSaveError(null);
            if (pendingSaves.current === 1) setSaving("saved");
          }
        },
        (e: Error) => {
          const problem = {
            message: e.message,
            conflict: e instanceof PanelError && e.status === 409,
          };
          if (isQC) drafts.current.set(name, { data: next, error: problem });
          if (activeReel.current === name) {
            saveFailed.current = true;
            setSaving("error");
            setSaveError(problem);
            setError(e.message);
          }
        },
      )
      .finally(() => {
        pendingSaves.current--;
        if (activeReel.current === name && !pendingSaves.current)
          void refreshQcInfo(name);
      });
  };
  const edit = (fn: (d: ReelData) => ReelData) => {
    if (!sel || !data || readOnly) return;
    const next = fn(data);
    editGeneration.current++;
    if (qcInfo)
      setQcInfo({
        ...qcInfo,
        candidate: { ...qcInfo.candidate, isCurrent: false },
      });
    setUndo((u) => [...u.slice(-49), data]);
    setData(next);
    persist(sel, next);
  };
  const undoLast = () => {
    if (!sel || !undo.length || readOnly) return;
    const prev = undo[undo.length - 1];
    editGeneration.current++;
    if (qcInfo)
      setQcInfo({
        ...qcInfo,
        candidate: { ...qcInfo.candidate, isCurrent: false },
      });
    setUndo((u) => u.slice(0, -1));
    setData(prev);
    persist(sel, prev);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey &&
        !typing
      ) {
        e.preventDefault();
        undoLast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const start = async (body: StartBody) => {
    if (!sel) return;
    try {
      await saves.idle();
      if ((qcInfo || qcEditor.current || qcRevisionKnown) && saveFailed.current)
        throw new Error(
          "Najpierw zapisz poprawki. Nie udało się zapisać ostatniej zmiany.",
        );
      await api.start(sel, body);
      if (activeReel.current !== sel) {
        loadLib();
        return;
      }
      since.current = 0;
      setJob({
        kind: body.kind,
        status: "running",
        lines: [],
        pct: body.kind === "render" ? 0 : null,
        result: null,
      });
      loadLib();
      void refreshQcInfo(sel);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const reloadSaved = async () => {
    if (!sel) return;
    const name = sel;
    try {
      await saves.idle();
      const state = await api.reelState(name);
      if (activeReel.current !== name) return;
      saves.reset(name, state.editRevision);
      drafts.current.delete(name);
      saveFailed.current = false;
      setSaveError(null);
      setSaving("saved");
      if (data) setUndo((previous) => [...previous.slice(-49), data]);
      editGeneration.current++;
      setData(state.data);
      await refreshQcInfo(name);
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 7000);
    return () => clearTimeout(t);
  }, [error]);

  const lanes = useMemo(() => (data ? lanesOf(data) : null), [data]);
  const fps = data?.fps ?? 30;
  const reel = lib?.reels.find((r) => r.name === sel);
  const clientId =
    data?.client ??
    reel?.client ??
    (sel ? lib?.jobs[sel]?.client : null) ??
    null;
  const clientLabel = lib?.clients.find((c) => c.id === clientId)?.label;
  const files =
    (clientId
      ? lib?.clients.find((c) => c.id === clientId)?.renders
      : lib?.loose) ?? [];
  const out =
    reel?.out ??
    (clientId ? `klienci/${clientId}/Render/${sel}.mp4` : `out/${sel}.mp4`);
  const operatorOk =
    operator?.installed &&
    (settings?.operator === "claude-api-key"
      ? Boolean(settings.apiKey)
      : operator.loggedIn);

  if (motion) return <MotionStudio onClose={() => setMotion(false)} />;
  if (longform)
    return (
      <LongForm
        onClose={() => {
          setLongform(false);
          location.hash = "";
        }}
      />
    );
  return (
    <div
      className={`app${quickContent ? " qc-app" : qcInfo ? " qc-editor" : ""}`}
    >
      <Sidebar
        onMotion={() => setMotion(true)}
        onLongForm={() => {
          location.hash = "lf";
        }}
        onQuickContent={() => openQuickContent()}
        quickContent={quickContent}
        compactNavigation={
          quickContent || Boolean(qcInfo || qcEditor.current) || qcRevisionKnown
        }
        lib={lib}
        sel={sel}
        onSelect={selectReel}
        onNew={() => setDialog("new")}
        onSettings={() => setDialog("settings")}
        operatorOk={operatorOk}
      />

      {quickContent ? (
        <QuickContent
          clients={lib?.clients ?? []}
          onOpenReel={openQcReel}
          onClose={() => {
            setQuickContent(false);
            qcEditor.current = null;
            setSel(null);
            location.hash = "";
          }}
        />
      ) : (
        <main className="center">
          {sel ? (
            <>
              <header className="bar">
                <div className="title">
                  <h1>{qcInfo?.candidate?.title ?? sel}</h1>
                  <p className="meta">
                    <span>{clientLabel ?? "Bez klienta"}</span>
                    {data && <span>{fmt(reelFrames(data) / fps)}</span>}
                    {data && <span>styl {data.style}</span>}
                  </p>
                  {qcInfo && (
                    <p className="meta">
                      <span>
                        QuickContent ·{" "}
                        {qcInfo.projectTitle ?? qcInfo.candidate.title}
                      </span>
                      <span>
                        W źródle: {fmt(qcInfo.candidate.sourceStart)}–
                        {fmt(qcInfo.candidate.sourceEnd)}
                      </span>
                      <span>
                        {currentCandidate(qcInfo.candidate) &&
                        saving !== "saving" &&
                        saving !== "error"
                          ? "Zmontowane · aktualny render"
                          : "Zmiany do wyrenderowania"}
                      </span>
                    </p>
                  )}
                </div>
                <span className="spacer" />
                {(qcInfo || qcEditor.current) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      openQuickContent(
                        qcInfo?.projectId ?? qcEditor.current?.projectId,
                      )
                    }
                  >
                    Wróć do propozycji
                  </button>
                )}
                <span className={`save ${saving}`} role="status">
                  {qcInfoLoading
                    ? "Sprawdzam stan rolki…"
                    : readOnly
                      ? "Operator pracuje — edycja wstrzymana"
                      : saving === "saving"
                        ? "Zapisuję…"
                        : saving === "saved"
                          ? "Zapisano"
                          : saving === "error"
                            ? "Nie zapisano"
                            : ""}
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={undoLast}
                  disabled={!undo.length || readOnly}
                  title="Cofnij (⌘Z)"
                >
                  Cofnij
                </button>
                {saveError && (
                  <div className="qc-editor-error" role="alert">
                    <p>{saveError.message}</p>
                    <p className="note">
                      Niezapisane poprawki pozostają w podglądzie. Po odczytaniu
                      aktualnej wersji możesz do nich wrócić przyciskiem
                      „Cofnij”.
                    </p>
                    <div className="row">
                      <button
                        className="btn"
                        disabled={readOnly}
                        onClick={() => void reloadSaved()}
                      >
                        Odczytaj aktualną wersję
                      </button>
                      {!saveError.conflict && (
                        <button
                          className="btn"
                          disabled={readOnly || pendingSaves.current > 0}
                          onClick={() => {
                            if (sel && data) {
                              saves.retry(sel);
                              persist(sel, data);
                            }
                          }}
                        >
                          Ponów zapis poprawek
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </header>
              <div className="stage">
                {data ? (
                  <div className="frame">
                    <Player
                      ref={player}
                      component={Reel}
                      inputProps={{ reel: sel, data }}
                      durationInFrames={reelFrames(data)}
                      fps={fps}
                      compositionWidth={1080}
                      compositionHeight={1920}
                      style={{ width: "100%", height: "100%" }}
                      controls
                      clickToPlay
                      doubleClickToFullscreen
                      spaceKeyToPlayOrPause
                    />
                  </div>
                ) : (
                  <div className="empty">
                    <p>
                      {missing
                        ? "Przygotowuję szkic montażu — transkrypcja trwa zwykle kilkanaście sekund."
                        : "Wczytuję rolkę…"}
                    </p>
                  </div>
                )}
              </div>
              {data && lanes && (
                <Timeline
                  key={sel}
                  lanes={lanes}
                  fps={fps}
                  player={player}
                  focus={focus}
                  onPick={(lane, index) => {
                    setFocus({ lane, index });
                    if (lane !== "shots")
                      setTab(lane === "captions" ? "napisy" : "grafiki");
                  }}
                />
              )}
            </>
          ) : (
            <div className="empty">
              <h1>Wybierz rolkę albo wrzuć nowe nagranie</h1>
              <p>
                Operator AI zmontuje je według zasad klienta, a Ty poprawisz
                szczegóły tutaj.
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={() => setDialog("new")}
              >
                Nowa rolka
              </button>
            </div>
          )}
        </main>
      )}

      {!quickContent && sel && lib && (
        <Inspector
          tab={tab}
          setTab={setTab}
          name={sel}
          data={data}
          lanes={lanes}
          out={out}
          files={files}
          job={job}
          quickContent={
            qcInfo
              ? {
                  ...qcInfo,
                  candidate: {
                    ...qcInfo.candidate,
                    isCurrent:
                      qcInfo.candidate.isCurrent &&
                      saving !== "saving" &&
                      saving !== "error",
                  },
                }
              : null
          }
          quickContentLoading={qcInfoLoading}
          isQuickContent={Boolean(
            qcInfo || qcEditor.current || qcRevisionKnown,
          )}
          pendingSave={saving === "saving" || saving === "error"}
          readOnly={readOnly}
          operator={operator}
          settings={settings}
          focus={focus}
          edit={edit}
          seek={(sec) => player.current?.seekTo(Math.round(sec * fps))}
          onStart={start}
          onStop={() =>
            sel && api.stop(sel).catch((e: Error) => setError(e.message))
          }
          onRecheck={checkOperator}
          onSettings={() => setDialog("settings")}
          onError={setError}
        />
      )}

      {dialog === "new" && lib && (
        <NewReelDialog
          lib={lib}
          settings={settings}
          onClose={() => setDialog(null)}
          onStarted={(name) => {
            setDialog(null);
            setTab("ai");
            selectReel(name);
            loadLib();
          }}
        />
      )}
      {dialog === "settings" && settings && (
        <SettingsDialog
          settings={settings}
          operator={operator}
          onClose={() => setDialog(null)}
          onRecheck={checkOperator}
          onSaved={(s) => {
            setSettings(s);
            setDialog(null);
          }}
        />
      )}
      {error && (
        <button type="button" className="toast" onClick={() => setError(null)}>
          {error}
        </button>
      )}
    </div>
  );
}

function Sidebar({
  onMotion,
  onLongForm,
  onQuickContent,
  quickContent,
  compactNavigation,
  lib,
  sel,
  onSelect,
  onNew,
  onSettings,
  operatorOk,
}: {
  onMotion: () => void;
  onLongForm: () => void;
  onQuickContent: () => void;
  quickContent: boolean;
  compactNavigation: boolean;
  lib: Library | null;
  sel: string | null;
  onSelect: (name: string) => void;
  onNew: () => void;
  onSettings: () => void;
  operatorOk: boolean | undefined;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = useMemo(() => {
    if (!lib) return [];
    // rolki w przygotowaniu (prep jeszcze nie zapisał reel.json) też widać na liście
    const pending = Object.entries(lib.jobs)
      .filter(
        ([name, j]) =>
          j.status === "running" && !lib.reels.some((r) => r.name === name),
      )
      .map(([name, j]) => ({ name, client: j.client, seconds: 0 }));
    const all = [...lib.reels, ...pending];
    const list = lib.clients.map((c) => ({
      id: c.id as string | null,
      label: c.label,
      reels: all.filter((r) => r.client === c.id),
    }));
    const loose = all.filter(
      (r) => !r.client || !lib.clients.some((c) => c.id === r.client),
    );
    return loose.length
      ? [...list, { id: null, label: "Bez klienta", reels: loose }]
      : list;
  }, [lib]);

  return (
    <nav
      className={`sidebar${compactNavigation ? " qc-sidebar" : ""}`}
      aria-label="Klienci i rolki"
    >
      <div className="brand">
        <i aria-hidden="true" />
        MontageFrames
        <button
          type="button"
          className="btn qc-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="panel-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Zamknij menu" : "Menu"}
        </button>
      </div>
      <div
        id="panel-navigation"
        className={`panel-navigation${menuOpen ? " is-open" : ""}`}
      >
        <div className="side-actions">
          <button
            type="button"
            className="btn wide"
            aria-pressed={quickContent}
            onClick={() => {
              setMenuOpen(false);
              onQuickContent();
            }}
          >
            QuickContent
          </button>
          <button
            type="button"
            className="btn wide"
            onClick={() => {
              setMenuOpen(false);
              onMotion();
            }}
          >
            Motion Studio
          </button>
          <button
            type="button"
            className="btn wide"
            onClick={() => {
              setMenuOpen(false);
              onLongForm();
            }}
          >
            Film poziomy
          </button>
          <button
            type="button"
            className="btn primary wide"
            onClick={() => {
              setMenuOpen(false);
              onNew();
            }}
          >
            Nowa rolka
          </button>
        </div>
        <div className="library">
          {!lib && <p className="note">Wczytuję…</p>}
          {groups.map((g) => (
            <section key={g.id ?? "_"} className="client">
              <h2>{g.label}</h2>
              {g.reels.length ? (
                <ul>
                  {g.reels.map((r) => {
                    const j = lib?.jobs[r.name];
                    return (
                      <li key={r.name}>
                        <button
                          type="button"
                          className="reel"
                          aria-current={sel === r.name}
                          onClick={() => {
                            setMenuOpen(false);
                            onSelect(r.name);
                          }}
                        >
                          <span>{r.name}</span>
                          {j?.status === "running" ? (
                            <i className="dot run" aria-label="trwa praca" />
                          ) : j?.status === "error" ? (
                            <i className="dot err" aria-label="błąd" />
                          ) : (
                            <small>{r.seconds ? fmt(r.seconds) : ""}</small>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="note small">Brak rolek</p>
              )}
            </section>
          ))}
        </div>
        <button
          type="button"
          className="side-foot"
          onClick={() => {
            setMenuOpen(false);
            onSettings();
          }}
        >
          <i className={`dot ${operatorOk ? "ok" : "err"}`} />
          <span>
            Ustawienia
            <small>
              {operatorOk
                ? "Claude do rolek gotowy"
                : "Claude do rolek wymaga uwagi"}
            </small>
          </span>
        </button>
      </div>
    </nav>
  );
}
