// Panel MontageFrames: biblioteka | podgląd + oś czasu | edycja. Źródłem prawdy są pliki (reel.json), panel tylko je czyta i zapisuje.
import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reel, reelFrames, type ReelData } from "../src/Reel";
import {
  api,
  fmt,
  type Library,
  type OperatorStatus,
  type Settings,
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
const hashName = () => decodeURIComponent(location.hash.slice(1)) || null;

export function App() {
  const [lib, setLib] = useState<Library | null>(null);
  const [sel, setSel] = useState<string | null>(hashName);
  const [data, setData] = useState<ReelData | null>(null);
  const [missing, setMissing] = useState(false);
  const [undo, setUndo] = useState<ReelData[]>([]);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
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
  const chain = useRef<Promise<unknown>>(Promise.resolve());

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
    const onHash = () => setSel(hashName());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [loadLib, checkOperator]);

  // Wybór rolki: adres w #, reel.json i stan zadania tej rolki.
  useEffect(() => {
    if (sel !== hashName()) location.hash = sel ? encodeURIComponent(sel) : "";
    setData(null);
    setMissing(false);
    setUndo([]);
    setSaving("idle");
    setFocus(null);
    setJob(IDLE);
    since.current = 0;
    if (!sel) return;
    let live = true;
    api.reel(sel).then(
      (d) => live && setData(d),
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
  }, [sel]);

  // Trwające zadanie: co sekundę dopisz log; operator zmienia reel.json, więc podgląd też się odświeża.
  useEffect(() => {
    if (!sel || job.status !== "running") return;
    const t = setInterval(async () => {
      const j = await api.job(sel, since.current).catch(() => null);
      if (!j || j.status === "idle") return;
      since.current = j.next;
      setJob((prev) => ({
        kind: j.kind,
        status: j.status,
        pct: j.pct,
        result: j.result,
        lines: [...prev.lines, ...j.lines],
      }));
      if (j.kind !== "render" || j.status !== "running")
        api.reel(sel).then(
          (d) => {
            setMissing(false);
            setData((cur) =>
              JSON.stringify(cur) === JSON.stringify(d) ? cur : d,
            );
          },
          () => {},
        );
      if (j.status !== "running") loadLib();
    }, 1000);
    return () => clearInterval(t);
  }, [sel, job.status, loadLib]);

  // Gdy coś trwa przy innych rolkach, lista po lewej też ma aktualne kropki.
  useEffect(() => {
    if (!lib || !Object.values(lib.jobs).some((j) => j.status === "running"))
      return;
    const t = setInterval(loadLib, 4000);
    return () => clearInterval(t);
  }, [lib, loadLib]);

  const readOnly = job.status === "running" && job.kind !== "render";
  const persist = (name: string, next: ReelData) => {
    setSaving("saving");
    chain.current = chain.current
      .then(() => api.save(name, next))
      .then(
        () => setSaving("saved"),
        (e: Error) => {
          setSaving("error");
          setError(e.message);
        },
      );
  };
  const edit = (fn: (d: ReelData) => ReelData) => {
    if (!sel || !data || readOnly) return;
    const next = fn(data);
    setUndo((u) => [...u.slice(-49), data]);
    setData(next);
    persist(sel, next);
  };
  const undoLast = () => {
    if (!sel || !undo.length || readOnly) return;
    const prev = undo[undo.length - 1];
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
      await api.start(sel, body);
      since.current = 0;
      setJob({
        kind: body.kind,
        status: "running",
        lines: [],
        pct: body.kind === "render" ? 0 : null,
        result: null,
      });
      loadLib();
    } catch (e) {
      setError((e as Error).message);
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

  return (
    <div className="app">
      <Sidebar
        lib={lib}
        sel={sel}
        onSelect={setSel}
        onNew={() => setDialog("new")}
        onSettings={() => setDialog("settings")}
        operatorOk={operatorOk}
      />

      <main className="center">
        {sel ? (
          <>
            <header className="bar">
              <div className="title">
                <h1>{sel}</h1>
                <p className="meta">
                  <span>{clientLabel ?? "Bez klienta"}</span>
                  {data && <span>{fmt(reelFrames(data) / fps)}</span>}
                  {data && <span>styl {data.style}</span>}
                </p>
              </div>
              <span className="spacer" />
              <span className={`save ${saving}`} role="status">
                {readOnly
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

      {sel && lib && (
        <Inspector
          tab={tab}
          setTab={setTab}
          name={sel}
          data={data}
          lanes={lanes}
          out={out}
          files={files}
          job={job}
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
            setSel(name);
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
  lib,
  sel,
  onSelect,
  onNew,
  onSettings,
  operatorOk,
}: {
  lib: Library | null;
  sel: string | null;
  onSelect: (name: string) => void;
  onNew: () => void;
  onSettings: () => void;
  operatorOk: boolean | undefined;
}) {
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
    <nav className="sidebar" aria-label="Klienci i rolki">
      <div className="brand">
        <i aria-hidden="true" />
        MontageFrames
      </div>
      <div className="side-actions">
        <button type="button" className="btn primary wide" onClick={onNew}>
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
                        onClick={() => onSelect(r.name)}
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
      <button type="button" className="side-foot" onClick={onSettings}>
        <i className={`dot ${operatorOk ? "ok" : "err"}`} />
        <span>
          Ustawienia
          <small>
            {operatorOk ? "Operator AI gotowy" : "Operator AI wymaga uwagi"}
          </small>
        </span>
      </button>
    </nav>
  );
}
