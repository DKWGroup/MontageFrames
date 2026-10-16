// Prawa kolumna: Napisy / Grafiki / Operator AI / Render.
import { useEffect, useRef, useState } from "react";
import type { CaptionGroup, ReelData } from "../src/Reel";
import {
  api,
  fmt,
  megabytes,
  type JobKind,
  type JobStatus,
  type OperatorStatus,
  type RenderFile,
  type Settings,
  type QuickContentReelInfo,
} from "./api";
import { PublicationDescription } from "./PublicationDescription";
import { publicationRefreshKey } from "./quickcontent-api";
import { currentCandidate, reelRenderFiles } from "./quickcontent-view.mjs";
import { overlayLabel, type Lane, type Lanes } from "./Timeline";

export type Tab = "napisy" | "kadr" | "grafiki" | "ai" | "render";
export type JobView = {
  kind: JobKind | null;
  status: JobStatus | "idle";
  lines: string[];
  pct: number | null;
  result: string | null;
};
export type StartBody = { kind: JobKind; message?: string };
type Focus = { lane: Lane; index: number } | null;
type Edit = (fn: (d: ReelData) => ReelData) => void;

const cls = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");
const round = (n: number) => Math.round(n * 100) / 100;

type Props = {
  tab: Tab;
  setTab: (t: Tab) => void;
  name: string;
  data: ReelData | null;
  lanes: Lanes | null;
  out: string;
  files: RenderFile[];
  job: JobView;
  quickContent?: QuickContentReelInfo | null;
  quickContentLoading?: boolean;
  isQuickContent?: boolean;
  pendingSave?: boolean;
  readOnly: boolean;
  operator: OperatorStatus | null;
  settings: Settings | null;
  focus: Focus;
  edit: Edit;
  seek: (sec: number) => void;
  onStart: (b: StartBody) => void;
  onStop: () => void;
  onRecheck: () => void;
  onSettings: () => void;
  onError: (message: string) => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "napisy", label: "Napisy" },
  { id: "kadr", label: "Kadr" },
  { id: "grafiki", label: "Grafiki" },
  { id: "ai", label: "Operator AI" },
  { id: "render", label: "Render" },
];

export function Inspector(p: Props) {
  const busy =
    p.job.status === "running"
      ? p.job.kind === "render"
        ? "render"
        : "ai"
      : null;
  return (
    <aside className="inspector">
      <div className="tabs" role="tablist" aria-label="Edycja rolki">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={p.tab === t.id}
            onClick={() => p.setTab(t.id)}
          >
            {t.label}
            {busy === t.id && <i className="dot run" aria-label="trwa" />}
          </button>
        ))}
      </div>
      <div className="pane" role="tabpanel">
        {p.tab === "napisy" &&
          (p.data ? (
            <Captions
              data={p.data}
              lanes={p.lanes}
              edit={p.edit}
              seek={p.seek}
              focus={p.focus}
              readOnly={p.readOnly}
            />
          ) : (
            <Waiting />
          ))}
        {p.tab === "grafiki" &&
          (p.data ? (
            <Overlays
              data={p.data}
              lanes={p.lanes}
              edit={p.edit}
              seek={p.seek}
              focus={p.focus}
              readOnly={p.readOnly}
            />
          ) : (
            <Waiting />
          ))}
        {p.tab === "kadr" &&
          (p.data ? (
            <Framing data={p.data} edit={p.edit} readOnly={p.readOnly} />
          ) : (
            <Waiting />
          ))}
        {p.tab === "ai" && <Assistant {...p} hasReel={Boolean(p.data)} />}
        {p.tab === "render" && <RenderTab {...p} hasReel={Boolean(p.data)} />}
      </div>
    </aside>
  );
}

const Waiting = () => (
  <p className="note">
    Czekam na szkic montażu. Transkrypcja trwa zwykle kilkanaście sekund, postęp
    widać w zakładce Operator AI.
  </p>
);

function Framing({
  data,
  edit,
  readOnly,
}: {
  data: ReelData;
  edit: Edit;
  readOnly: boolean;
}) {
  const framing = data.framing ?? {
    mode: "crop" as const,
    centerX: 0.5,
    centerY: 0.5,
  };
  const update = (patch: Partial<NonNullable<ReelData["framing"]>>) =>
    edit((d) => ({
      ...d,
      framing: {
        mode: "crop",
        centerX: 0.5,
        centerY: 0.5,
        ...d.framing,
        ...patch,
      },
    }));
  return (
    <div className="stack qc-framing">
      {data.framingNote && <p className="note">{data.framingNote}</p>}
      <p className="note">
        Dopasuj źródło do pionowego kadru. Zmiana zapisuje się i jest widoczna w
        podglądzie.
      </p>
      <fieldset className="choices" disabled={readOnly}>
        <legend>Dopasowanie obrazu</legend>
        <label className="choice">
          <input
            type="radio"
            name="framing-mode"
            checked={framing.mode === "fit"}
            onChange={() => update({ mode: "fit" })}
          />
          <span>
            Pokaż cały obraz<small>Zachowaj pełną zawartość źródła.</small>
          </span>
        </label>
        <label className="choice">
          <input
            type="radio"
            name="framing-mode"
            checked={framing.mode === "crop"}
            onChange={() => update({ mode: "crop" })}
          />
          <span>
            Wypełnij pionowy kadr<small>Dopasuj wycinek ręcznie.</small>
          </span>
        </label>
      </fieldset>
      {framing.tracking?.length ? (
        <label className="choice">
          <input
            type="checkbox"
            checked={framing.trackingEnabled !== false}
            disabled={readOnly || framing.mode === "fit"}
            onChange={(event) =>
              update({ trackingEnabled: event.target.checked })
            }
          />
          <span>
            Podążaj za twarzą
            <small>
              Płynny ruch kadru. Wyłącz, żeby przesunąć obraz ręcznie.
            </small>
          </span>
        </label>
      ) : null}
      <label className="field">
        <span>
          Pozycja obrazu w poziomie: {Math.round(framing.centerX * 100)}%
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={framing.centerX}
          disabled={readOnly || framing.mode === "fit"}
          onChange={(event) =>
            update({
              centerX: event.target.valueAsNumber,
              trackingEnabled: false,
            })
          }
          aria-label="Pozycja obrazu w poziomie"
        />
      </label>
      <label className="field">
        <span>
          Pozycja obrazu w pionie: {Math.round(framing.centerY * 100)}%
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={framing.centerY}
          disabled={readOnly || framing.mode === "fit"}
          onChange={(event) =>
            update({
              centerY: event.target.valueAsNumber,
              trackingEnabled: false,
            })
          }
          aria-label="Pozycja obrazu w pionie"
        />
      </label>
      {framing.mode === "fit" && (
        <p className="note">
          Cały obraz mieści się w kadrze. Przesuwanie wycinka jest dostępne po
          wybraniu „Wypełnij pionowy kadr”.
        </p>
      )}
      <button
        type="button"
        className="btn"
        disabled={readOnly}
        onClick={() =>
          update({ centerX: 0.5, centerY: 0.5, trackingEnabled: false })
        }
      >
        Wyśrodkuj obraz
      </button>
      <p className="note">Po zmianie kadru wyrenderuj aktualną wersję filmu.</p>
    </div>
  );
}

function useScrollTo(focus: Focus, lane: Lane, prefix: string) {
  useEffect(() => {
    if (focus?.lane === lane)
      document
        .getElementById(`${prefix}${focus.index}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focus, lane, prefix]);
}

type ListProps = {
  data: ReelData;
  lanes: Lanes | null;
  edit: Edit;
  seek: (sec: number) => void;
  focus: Focus;
  readOnly: boolean;
};

function Captions({ data, lanes, edit, seek, focus, readOnly }: ListProps) {
  const [editing, setEditing] = useState<{ g: number; w: number } | null>(null);
  useScrollTo(focus, "captions", "cap-");
  const starts = new Map(
    (lanes?.captions ?? []).map((c) => [c.index, c.start]),
  );
  if (!data.captions.length)
    return <p className="note">Ta rolka nie ma napisów.</p>;
  return (
    <>
      <p className="note">
        Kliknij słowo, żeby poprawić tekst albo ustawić słowo-klucz i akcent.
        Zmiany zapisują się od razu.
      </p>
      <ol className="groups">
        {data.captions.map((g, gi) => {
          const start = starts.get(gi);
          return (
            <li
              key={gi}
              id={`cap-${gi}`}
              className={cls(
                "group",
                start == null && "cut",
                focus?.lane === "captions" && focus.index === gi && "focus",
              )}
            >
              <button
                type="button"
                className="time"
                disabled={start == null}
                onClick={() => start != null && seek(start)}
              >
                {start == null ? "wycięte" : fmt(start)}
              </button>
              <div className="words">
                {g.words.map((w, wi) => (
                  <button
                    key={wi}
                    type="button"
                    disabled={readOnly}
                    className={cls(
                      "word",
                      (g.key ?? 0) === wi && "key",
                      g.hl?.includes(wi) && "hl",
                      editing?.g === gi && editing.w === wi && "editing",
                    )}
                    onClick={() => setEditing({ g: gi, w: wi })}
                  >
                    {w.text}
                  </button>
                ))}
              </div>
              {editing?.g === gi && (
                <WordEditor
                  key={editing.w}
                  group={g}
                  index={editing.w}
                  onCancel={() => setEditing(null)}
                  onSave={(text, key, hl) => {
                    edit((d) => updateWord(d, gi, editing.w, text, key, hl));
                    setEditing(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

// Zmienia tylko tekst, słowo-klucz i akcent — czasów słów nie ruszamy (CLAUDE.md).
function updateWord(
  d: ReelData,
  gi: number,
  wi: number,
  text: string,
  key: boolean,
  hl: boolean,
): ReelData {
  return {
    ...d,
    captions: d.captions.map((g, i) => {
      if (i !== gi) return g;
      const rest = (g.hl ?? []).filter((x) => x !== wi);
      const hls = hl ? [...rest, wi].sort((a, b) => a - b) : rest;
      return {
        ...g,
        words: g.words.map((w, j) => (j === wi ? { ...w, text } : w)),
        key: key ? wi : (g.key ?? 0) === wi ? -1 : g.key,
        hl: hls.length ? hls : undefined,
      };
    }),
  };
}

function WordEditor({
  group,
  index,
  onSave,
  onCancel,
}: {
  group: CaptionGroup;
  index: number;
  onSave: (text: string, key: boolean, hl: boolean) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(group.words[index].text);
  const [key, setKey] = useState((group.key ?? 0) === index);
  const [hl, setHl] = useState(group.hl?.includes(index) ?? false);
  return (
    <form
      className="word-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave(text.trim(), key, hl);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <input
        autoFocus
        aria-label="Tekst słowa"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={key}
          onChange={(e) => setKey(e.target.checked)}
        />{" "}
        Słowo-klucz
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={hl}
          onChange={(e) => setHl(e.target.checked)}
        />{" "}
        Akcent
      </label>
      <span className="spacer" />
      <button type="button" className="btn sm" onClick={onCancel}>
        Anuluj
      </button>
      <button type="submit" className="btn sm primary">
        Zapisz
      </button>
    </form>
  );
}

function Overlays({ data, lanes, edit, seek, focus, readOnly }: ListProps) {
  useScrollTo(focus, "overlays", "ov-");
  const list = data.overlays ?? [];
  if (!list.length)
    return (
      <p className="note">
        Ta rolka nie ma grafik. Możesz poprosić o nie operatora AI, np. „przy
        kwocie dodaj licznik”.
      </p>
    );
  const shift = (i: number, by: number) =>
    edit((d) => ({
      ...d,
      overlays: (d.overlays ?? []).map((o, j) =>
        j === i
          ? {
              ...o,
              start: round(Math.max(0, o.start + by)),
              end: round(Math.max(0.1, o.end + by)),
            }
          : o,
      ),
    }));
  const remove = (i: number) =>
    edit((d) => ({
      ...d,
      overlays: (d.overlays ?? []).filter((_, j) => j !== i),
    }));
  return (
    <>
      <p className="note">
        Przesuwaj grafiki o 0,25 s albo usuń zbędne. Cofasz przyciskiem „Cofnij”
        albo ⌘Z.
      </p>
      <ul className="ovs">
        {list.map((o, i) => {
          const label = overlayLabel(o);
          const clip = lanes?.overlays[i];
          return (
            <li
              key={i}
              id={`ov-${i}`}
              className={cls(
                "ov",
                focus?.lane === "overlays" && focus.index === i && "focus",
              )}
            >
              <button
                type="button"
                className="ov-main"
                onClick={() => clip && seek(clip.start)}
              >
                <strong>{label.kind}</strong>
                <span>{label.detail}</span>
                <small>
                  {clip ? `${fmt(clip.start)}–${fmt(clip.end)}` : ""}
                </small>
              </button>
              <div className="acts">
                <button
                  type="button"
                  className="btn sm"
                  disabled={readOnly}
                  onClick={() => shift(i, -0.25)}
                  aria-label="Wcześniej o 0,25 sekundy"
                >
                  −0,25 s
                </button>
                <button
                  type="button"
                  className="btn sm"
                  disabled={readOnly}
                  onClick={() => shift(i, 0.25)}
                  aria-label="Później o 0,25 sekundy"
                >
                  +0,25 s
                </button>
                <button
                  type="button"
                  className="btn sm danger"
                  disabled={readOnly}
                  onClick={() => remove(i)}
                >
                  Usuń
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function OperatorNote({
  operator,
  settings,
  onRecheck,
  onSettings,
}: {
  operator: OperatorStatus | null;
  settings: Settings | null;
  onRecheck: () => void;
  onSettings: () => void;
}) {
  if (!operator) return <p className="note">Sprawdzam operatora…</p>;
  if (!operator.installed)
    return (
      <div className="note warn">
        <p>Na tym komputerze nie ma Claude Code, który wykonuje montaż.</p>
        <p>{operator.hint}</p>
      </div>
    );
  const model = settings?.model || "domyślny";
  if (settings?.operator === "claude-api-key")
    return settings.apiKey ? (
      <p className="note">
        Operator: Claude z kluczem API ({settings.apiKey}), model {model}.
      </p>
    ) : (
      <div className="note warn">
        <p>Wybrany jest klucz API, ale klucza jeszcze nie ma.</p>
        <button type="button" className="btn sm" onClick={onSettings}>
          Dodaj klucz
        </button>
      </div>
    );
  if (!operator.loggedIn)
    return (
      <div className="note warn">
        <p>Operator nie jest zalogowany, więc montaż się nie uruchomi.</p>
        <p>
          W Terminalu wpisz <code>claude auth login</code>, zaloguj się w
          przeglądarce i wróć tutaj. Możesz też podać klucz API w Ustawieniach.
        </p>
        <div className="row">
          <button type="button" className="btn sm" onClick={onRecheck}>
            Sprawdź ponownie
          </button>
          <button type="button" className="btn sm" onClick={onSettings}>
            Ustawienia
          </button>
        </div>
      </div>
    );
  return (
    <p className="note">
      Operator: Claude Code {operator.version?.replace(" (Claude Code)", "")},
      zalogowany, model {model}.
    </p>
  );
}

function Assistant(p: Props & { hasReel: boolean }) {
  const [msg, setMsg] = useState("");
  const running = p.job.status === "running";
  const send = () => {
    if (!msg.trim()) return;
    p.onStart({ kind: "chat", message: msg.trim() });
    setMsg("");
  };
  return (
    <div className="stack">
      {p.isQuickContent || p.quickContent ? (
        <p className="note">
          Operator QuickContent:{" "}
          {p.quickContent?.aiProvider === "openai"
            ? "OpenAI API"
            : p.quickContent?.aiProvider === "claude"
              ? "Claude Code — konto CLI"
              : "Codex — konto ChatGPT"}
          . Używa ustawień tego projektu; zmienisz je po powrocie do propozycji.
        </p>
      ) : (
        <OperatorNote
          operator={p.operator}
          settings={p.settings}
          onRecheck={p.onRecheck}
          onSettings={p.onSettings}
        />
      )}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="field">
          <span>Poprawka dla operatora</span>
          <textarea
            rows={3}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder="Np. „napisy o 10% niżej”, „przy 0:12 dodaj logo Żabki”, „wytnij powtórzone zdanie na początku”."
          />
        </label>
        <div className="row">
          <button
            type="submit"
            className="btn primary"
            disabled={
              running ||
              !msg.trim() ||
              !p.hasReel ||
              Boolean(p.isQuickContent && p.pendingSave)
            }
          >
            Wyślij poprawkę
          </button>
          <button
            type="button"
            className="btn"
            disabled={
              running ||
              !p.hasReel ||
              Boolean(p.isQuickContent && p.pendingSave)
            }
            onClick={() => {
              if (
                confirm(
                  "Operator przejrzy całą rolkę według zasad klienta i poprawi to, co uzna za potrzebne. Obecny stan trafi do historii. Zacząć?",
                )
              )
                p.onStart({ kind: "montage" });
            }}
          >
            Pełny montaż
          </button>
        </div>
      </form>
      {p.job.kind === "montage" || p.job.kind === "chat" ? (
        <JobPanel job={p.job} onStop={p.onStop} />
      ) : (
        <p className="note">
          Operator pamięta rozmowę o tej rolce, więc kolejne poprawki możesz
          pisać krótko.
        </p>
      )}
    </div>
  );
}

function RenderTab(p: Props & { hasReel: boolean }) {
  const running = p.job.status === "running";
  const qcMode = Boolean(p.isQuickContent || p.quickContent);
  const candidate = p.quickContent?.candidate;
  const current =
    candidate && currentCandidate(candidate) && !p.pendingSave
      ? candidate.currentRender?.filePath
      : null;
  const files = reelRenderFiles(
    [...p.files].sort((a, b) => b.mtime - a.mtime),
    p.name,
    qcMode,
  );
  return (
    <div className="stack">
      {qcMode ? (
        <div className="note warn">
          <p role="status">
            {p.quickContentLoading
              ? "Sprawdzam aktualność renderu…"
              : current
                ? `Zmontowane — aktualny render rewizji ${candidate?.editRevision ?? 0}`
                : p.pendingSave
                  ? "Najpierw zapisz zmiany, aby wyrenderować poprawki."
                  : "Zmiany do wyrenderowania — brak aktualnego MP4"}
          </p>
          <p>Rendery są wersjonowane. Poprzednie pliki pozostają w folderze.</p>
          {current && (
            <a className="btn primary" href={api.fileUrl(current)} download>
              Pobierz aktualny film
            </a>
          )}
        </div>
      ) : (
        <p className="note">
          Plik trafi do <code>{p.out}</code>.
        </p>
      )}
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={
            running ||
            !p.hasReel ||
            Boolean(qcMode && (p.pendingSave || p.quickContentLoading))
          }
          onClick={() => p.onStart({ kind: "render" })}
        >
          {running && p.job.kind === "render"
            ? "Renderuję…"
            : qcMode
              ? current
                ? "Renderuj nową wersję"
                : "Renderuj poprawki"
              : "Renderuj"}
        </button>
      </div>
      {p.job.kind === "render" && <JobPanel job={p.job} onStop={p.onStop} />}
      {p.hasReel && (
        <PublicationDescription
          key={p.name}
          reelName={p.name}
          canGenerate={files.some((file) => {
            const base = file.file.split("/").pop() ?? "";
            return (
              base === `${p.name}.mp4` ||
              (base.startsWith(`${p.name}-v`) && /-v\d+\.mp4$/.test(base))
            );
          })}
          refreshKey={`${p.job.status}:${publicationRefreshKey(candidate)}:${p.pendingSave}:${files
            .filter((file) =>
              (file.file.split("/").pop() ?? "").startsWith(p.name),
            )
            .map((file) => file.mtime)
            .join(",")}`}
        />
      )}
      <h3 className="sub">
        {qcMode ? "Wersje tej rolki" : "Gotowe pliki w tym folderze"}
      </h3>
      {p.quickContentLoading ? (
        <p className="note">Odczytuję informacje o aktualnej wersji…</p>
      ) : files.length ? (
        <ul className="files">
          {files.map((f) => {
            const base = f.file.split("/").pop() ?? f.file;
            return (
              <li
                key={f.file}
                className={cls("file", base.startsWith(p.name) && "mine")}
              >
                <span>
                  <strong>{base}</strong>
                  {qcMode && (
                    <small>
                      {f.file === current
                        ? "Aktualna wersja"
                        : "Wersja wcześniejsza"}
                    </small>
                  )}
                  <small>
                    {megabytes(f.size)},{" "}
                    {new Date(f.mtime).toLocaleString("pl-PL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                </span>
                <span className="acts">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() =>
                      api
                        .reveal(f.file)
                        .catch((e: Error) => p.onError(e.message))
                    }
                  >
                    Pokaż w Finderze
                  </button>
                  <a className="btn sm" href={api.fileUrl(f.file)} download>
                    {qcMode
                      ? f.file === current
                        ? "Pobierz aktualną wersję"
                        : "Pobierz wersję wcześniejszą"
                      : "Pobierz"}
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="note">Jeszcze nic tu nie ma.</p>
      )}
    </div>
  );
}

const STATUS: Record<JobStatus, string> = {
  running: "pracuje…",
  done: "gotowe",
  error: "błąd",
  stopped: "zatrzymano",
};
const KIND: Record<JobKind, string> = {
  render: "Render",
  montage: "Montaż",
  chat: "Poprawka",
};
const lineClass = (l: string) =>
  l.startsWith("›")
    ? "me"
    : l.startsWith("⚠")
      ? "warn"
      : l.startsWith("Błąd")
        ? "err"
        : undefined;

export function JobPanel({
  job,
  onStop,
}: {
  job: JobView;
  onStop: () => void;
}) {
  const log = useRef<HTMLOListElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [job.lines.length]);
  if (job.status === "idle" || !job.kind) return null;
  return (
    <section className="job" aria-live="polite">
      <div className="job-head">
        <i
          className={cls(
            "dot",
            job.status === "running" && "run",
            job.status === "error" && "err",
            job.status === "done" && "ok",
          )}
        />
        <strong>
          {KIND[job.kind]}: {STATUS[job.status]}
        </strong>
        {job.pct != null && job.status === "running" && <span>{job.pct}%</span>}
        <span className="spacer" />
        {job.status === "running" && (
          <button type="button" className="btn sm" onClick={onStop}>
            Zatrzymaj
          </button>
        )}
      </div>
      {job.pct != null && (
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={job.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${job.pct}%` }} />
        </div>
      )}
      {job.lines.length > 0 && (
        <details open={job.status === "error"}>
          <summary>Szczegóły techniczne zadania</summary>
          <ol className="log" ref={log}>
            {job.lines.map((l, i) => (
              <li key={i} className={lineClass(l)}>
                {l}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
