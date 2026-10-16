// LongForm kroki 3 i 5 (docs/longform/gui.md §3, §5): plan do akceptacji i wynik.
// Krok 4 „Montaż” to job — postęp pokazuje Processing w LongForm.tsx.
import { useCallback, useEffect, useState } from "react";
import { LfError, lf, time, type Project } from "./LongForm";
import { EFFECT_TRACK } from "./longform-view.mjs";

type Chapter = {
  startWordId: string;
  title: string;
  role?: string;
  outStart: number;
  confidence?: number;
};
type Hook = { text: string; type: string; why: string };
type Effect = {
  id: string;
  type: string;
  start: number;
  end: number;
  why: string;
  params: Record<string, unknown>;
  removed?: boolean;
};
type Plan = {
  intensity: string;
  chapters: Chapter[];
  hooks: Hook[];
  hook: number;
  customHook: string;
  coldOpen: {
    start: number;
    end: number;
    why: string;
    accepted: boolean;
  } | null;
  effects: Effect[];
  rejected: { type?: string; why: string }[];
  warnings: string[];
  youtube: { text: string | null; why: string | null };
};
type Edit = {
  hook: number;
  customHook: string;
  coldOpenAccepted?: boolean;
  chapterTitles: Record<string, string>;
  removed: string[];
};

const INTENSITY = [
  ["spokojna", "Spokojna"],
  ["standard", "Standard"],
  ["dynamiczna", "Dynamiczna"],
] as const;

function NewPlan({
  project,
  reload,
}: {
  project: Project;
  reload: () => void;
}) {
  const [intensity, setIntensity] = useState("standard");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="lf-card lf-pad">
      <h3>Plan montażu</h3>
      <p className="lf-hint">
        AI na Twoim koncie (Claude Code / Codex) zaproponuje rozdziały, 3 hooki
        i efekty. Nic nie trafi do filmu bez Twojej akceptacji.
      </p>
      <fieldset className="lf-filters">
        <legend>Intensywność efektów</legend>
        {INTENSITY.map(([v, label]) => (
          <label key={v}>
            <input
              type="radio"
              name="intensity"
              checked={intensity === v}
              onChange={() => setIntensity(v)}
            />{" "}
            {label}
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="lf-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn primary"
        onClick={() =>
          lf(`/${project.id}/plan`, "POST", { intensity }).then(
            reload,
            (e: Error) => setError(e.message),
          )
        }
      >
        Przygotuj plan
      </button>
    </div>
  );
}

export function PlanScreen({
  project,
  reload,
}: {
  project: Project;
  onProject: (p: Project) => void;
  reload: () => void;
}) {
  const [data, setData] = useState<{ revision: number; plan: Plan } | null>(
    null,
  );
  const [missing, setMissing] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      lf<{ revision: number; plan: Plan }>(`/${project.id}/plan`).then(
        (d) => {
          setData(d);
          setMissing(false);
          setEdit({
            hook: d.plan.hook,
            customHook: d.plan.customHook,
            coldOpenAccepted: d.plan.coldOpen?.accepted,
            chapterTitles: Object.fromEntries(
              d.plan.chapters.map((c) => [c.startWordId, c.title]),
            ),
            removed: d.plan.effects.filter((e) => e.removed).map((e) => e.id),
          });
        },
        (e: LfError) =>
          e.status === 404 ? setMissing(true) : setError(e.message),
      ),
    [project.id],
  );
  useEffect(() => {
    load();
  }, [load, project.planRevision]);

  if (missing || project.planStale)
    return <NewPlan project={project} reload={reload} />;
  if (error && !data) return <p className="lf-error lf-pad">{error}</p>;
  if (!data || !edit) return <p className="lf-hint lf-pad">Wczytuję plan…</p>;
  const { plan } = data;

  // Zapis z rewizją; przy 409 przeładuj plan, żeby nie nadpisać zmian z innego okna.
  const save = async () => {
    const r = await lf<{ revision: number }>(
      `/${project.id}/plan`,
      "PUT",
      edit,
      { "X-Edit-Revision": String(data.revision) },
    );
    setData({ ...data, revision: r.revision });
    return r.revision;
  };
  const act = (fn: () => Promise<unknown>) => async () => {
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      if ((e as LfError).status === 409) load();
    } finally {
      setSaving(false);
    }
  };
  const approve = act(async () => {
    const revision = await save();
    await lf(
      `/${project.id}/plan/approve`,
      "POST",
      {},
      { "X-Edit-Revision": String(revision) },
    );
    reload();
  });

  const tracks = new Map<string, Effect[]>();
  for (const e of plan.effects) {
    const t = EFFECT_TRACK[e.type] ?? "Inne";
    tracks.set(t, [...(tracks.get(t) ?? []), e]);
  }
  const removed = new Set(edit.removed);
  const toggle = (id: string) =>
    setEdit({
      ...edit,
      removed: removed.has(id)
        ? edit.removed.filter((x) => x !== id)
        : [...edit.removed, id],
    });

  return (
    <div className="lf-plan">
      <section className="lf-card lf-pad">
        <h3>Rozdziały</h3>
        <ol className="lf-list">
          {plan.chapters.map((c) => (
            <li key={c.startWordId}>
              <span className="lf-chip">{time(c.outStart)}</span>{" "}
              {c.role === "intro" && <span className="lf-chip">Wstęp</span>}{" "}
              <input
                aria-label={`Tytuł rozdziału od ${time(c.outStart)}`}
                value={edit.chapterTitles[c.startWordId] ?? ""}
                maxLength={80}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    chapterTitles: {
                      ...edit.chapterTitles,
                      [c.startWordId]: e.target.value,
                    },
                  })
                }
              />
              {(c.confidence ?? 1) < 0.7 && (
                <span className="lf-warn"> niepewna granica</span>
              )}
            </li>
          ))}
        </ol>
        <p className="lf-hint">
          {plan.youtube.text
            ? "Rozdziały YouTube gotowe do opisu."
            : `Rozdziały YouTube: ${plan.youtube.why}`}
        </p>
      </section>

      <section className="lf-card lf-pad">
        <h3>Hook (pierwsze sekundy)</h3>
        {plan.hooks.map((h, i) => (
          <label key={h.text} className="lf-hook">
            <input
              type="radio"
              name="hook"
              checked={edit.hook === i && !edit.customHook}
              onChange={() => setEdit({ ...edit, hook: i, customHook: "" })}
            />{" "}
            <strong>{h.text}</strong> <span className="lf-chip">{h.type}</span>
            <br />
            <span className="lf-hint">{h.why}</span>
          </label>
        ))}
        <label>
          Własny tekst{" "}
          <input
            value={edit.customHook}
            maxLength={120}
            placeholder="np. 3 błędy, które…"
            onChange={(e) => setEdit({ ...edit, customHook: e.target.value })}
          />
        </label>
      </section>

      {plan.coldOpen && (
        <section className="lf-card lf-pad">
          <h3>Cold open</h3>
          <p>
            Fragment {time(plan.coldOpen.start)}–{time(plan.coldOpen.end)} na
            sam początek. <span className="lf-hint">{plan.coldOpen.why}</span>
          </p>
          <label>
            <input
              type="checkbox"
              checked={!!edit.coldOpenAccepted}
              onChange={(e) =>
                setEdit({ ...edit, coldOpenAccepted: e.target.checked })
              }
            />{" "}
            Dodaj
          </label>
        </section>
      )}

      <section className="lf-card lf-pad">
        <h3>
          Efekty ({plan.effects.length - removed.size} z {plan.effects.length})
          · intensywność: {plan.intensity}
        </h3>
        {[...tracks].map(([track, list]) => (
          <div key={track}>
            <h4>{track}</h4>
            <ul className="lf-list">
              {list.map((e) => (
                <li
                  key={e.id}
                  className={removed.has(e.id) ? "lf-removed" : undefined}
                >
                  <span className="lf-chip">{time(e.start)}</span>{" "}
                  <strong>{e.type}</strong> — {e.why}
                  {typeof e.params.source === "string" && (
                    <span className="lf-hint">
                      {" "}
                      · źródło: {e.params.source}
                    </span>
                  )}{" "}
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => toggle(e.id)}
                  >
                    {removed.has(e.id) ? "Przywróć" : "Usuń"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {plan.rejected.length > 0 && (
          <details>
            <summary>
              Odrzucone przez walidator ({plan.rejected.length})
            </summary>
            <ul>
              {plan.rejected.map((r, i) => (
                <li key={i}>
                  {r.type ?? "?"}: {r.why}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {(plan.warnings.length > 0 || project.warnings?.length > 0) && (
        <details className="lf-card lf-pad">
          <summary>
            Ostrzeżenia (
            {plan.warnings.length + (project.warnings?.length ?? 0)})
          </summary>
          <ul>
            {[...plan.warnings, ...(project.warnings ?? [])].map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <p className="lf-error" role="alert">
          {error}
        </p>
      )}
      <div className="lf-actions">
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={act(save)}
        >
          Zapisz zmiany
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={saving}
          onClick={act(() =>
            lf(`/${project.id}/plan`, "POST", {
              intensity: plan.intensity,
            }).then(reload),
          )}
        >
          Wygeneruj plan ponownie
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={saving}
          onClick={approve}
        >
          Akceptuj plan i montuj
        </button>
      </div>
    </div>
  );
}

type Render = { file: string; version: number; key: string; createdAt: string };
const fileUrl = (f: string) => `/api/file?path=${encodeURIComponent(f)}`;

export function ResultScreen({ project }: { project: Project }) {
  const [data, setData] = useState<{
    renders: Render[];
    current: string | null;
  } | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    lf<{ renders: Render[]; current: string | null }>(
      `/${project.id}/renders`,
    ).then(
      (d) => {
        setData(d);
        setPick(d.current ?? d.renders[d.renders.length - 1]?.file ?? null);
      },
      (e: Error) => setError(e.message),
    );
  }, [project.id, project.renders?.length]);
  if (error) return <p className="lf-error lf-pad">{error}</p>;
  if (!data) return <p className="lf-hint lf-pad">Wczytuję wynik…</p>;
  if (!data.renders.length)
    return (
      <p className="lf-notice lf-pad">
        Brak renderu — zaakceptuj plan, żeby zmontować film.
      </p>
    );
  return (
    <div className="lf-card lf-pad lf-result">
      {pick && (
        <video
          key={pick}
          controls
          src={fileUrl(pick)}
          style={{ width: "100%", aspectRatio: "16 / 9", background: "#111" }}
        />
      )}
      {!data.current && (
        <p className="lf-warn">
          Plan lub cięcia zmieniły się po ostatnim renderze — ta wersja nie jest
          aktualna.
        </p>
      )}
      <h3>Wersje</h3>
      <ul className="lf-list">
        {[...data.renders].reverse().map((r) => (
          <li key={r.file}>
            <label>
              <input
                type="radio"
                name="render"
                checked={pick === r.file}
                onChange={() => setPick(r.file)}
              />{" "}
              v{String(r.version).padStart(3, "0")} ·{" "}
              {new Date(r.createdAt).toLocaleString("pl-PL")}
            </label>{" "}
            {r.file === data.current && (
              <span className="lf-chip">Aktualny</span>
            )}{" "}
            <a className="btn ghost" href={fileUrl(r.file)} download>
              Pobierz MP4
            </a>
          </li>
        ))}
      </ul>
      <a className="btn" href={`/api/lf/${project.id}/export/otio`} download>
        Eksport do Premiere (.otio)
      </a>
    </div>
  );
}
