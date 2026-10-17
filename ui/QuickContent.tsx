import {FilmCosts,CostCard} from "./QuickContentCosts";
export {FilmCosts,CostCard} from "./QuickContentCosts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, SyntheticEvent } from "react";
import {
  quickContentApi as qc,
  QuickContentError,
  uploadQuickContent,
  createAndProcessProject,
  publicationRefreshKey,
} from "./quickcontent-api";
import type {
  QCProject,
  QCCandidate,
  QCJob,
  QCBatch,
  QCTemplate,
  QCFocus,
  QCDuration,
  QCProvider,
  QCOperators,
} from "./quickcontent-api";
import {
  batchProgress,
  jobActivity,
  boundedPreviewTime,
  currentCandidate,
  parseQuickContentHash,
  quickContentHash,
  sortCandidates,
  sourceResolution,
  validateAnalysis,
} from "./quickcontent-view.mjs";
import type { QCRoute } from "./quickcontent-view.mjs";
import "./quickcontent.css";
import {
  PublicationDescription,
  DescriptionInstructions,
} from "./PublicationDescription";

type Client = { id: string; label: string };
export type QuickContentProps = {
  clients: Client[];
  active?: boolean;
  onOpenReel: (
    reelName: string,
    projectId: string,
    candidateId: string,
  ) => void;
  onClose: () => void;
};
type FieldErrors = {
  source?: string;
  template?: string;
  focus?: string;
  duration?: string;
};
// Chwilowy stan widoku przetrwa przejście do istniejącego edytora i ponowne zamontowanie modułu.
const projectViews: Record<
  string,
  { scroll: number; order: "score" | "time"; filter: string; tab: ProjectTab }
> = {};
const activeJob = (job: QCJob) => ["queued", "running"].includes(job.status);
const failedJob = (job: QCJob) =>
  ["failed", "interrupted"].includes(job.status);
export function obsoleteJobFailure(job: QCJob, jobs: QCJob[]) {
  if (!failedJob(job) || !job.candidateId) return false;
  return jobs.some((next) => {
    if (
      next.status !== "completed" ||
      next.candidateId !== job.candidateId ||
      next.kind !== job.kind
    )
      return false;
    const before = Date.parse(job.createdAt ?? "");
    const after = Date.parse(next.createdAt ?? "");
    return Number.isFinite(before) && Number.isFinite(after)
      ? after > before
      : jobs.indexOf(next) > jobs.indexOf(job);
  });
}
const time = (seconds: number) => {
  const sec = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};
const range = (candidate: QCCandidate) =>
  `${time(candidate.sourceStart)}–${time(candidate.sourceEnd)} · ${Math.round(candidate.sourceEnd - candidate.sourceStart)} s`;
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Nie udało się wykonać działania. Spróbuj ponownie.";
const templateLabel = (template: QCTemplate) =>
  template.label ?? template.name ?? template.id;
const templateReason = (template?: QCTemplate) =>
  template?.reason ??
  (template?.missing?.length
    ? "Profil wymaga uzupełnienia preferencji, stylu lub materiałów."
    : undefined);
const evidenceLabels: Record<string, string> = {
  hook: "Początek przyciągający uwagę",
  value: "Wartość wypowiedzi",
  emotion: "Emocja",
  novelty: "Oryginalność",
  focusMatch: "Dopasowanie do tematu",
  opening: "Początek",
  context: "Kontekst",
  development: "Rozwinięcie",
  closing: "Domknięcie",
};
const evidenceValue = (value: unknown) =>
  typeof value === "number"
    ? `${value}/5`
    : typeof value === "boolean"
      ? value
        ? "tak"
        : "nie"
      : typeof value === "string"
        ? value
        : "Brak szczegółów";
const stageLabels: Record<string, string> = {
  queued: "Oczekiwanie na wykonanie",
  metadata: "Rozpoznawanie źródła",
  video: "Pobieranie obrazu",
  audio: "Pobieranie audio",
  mux: "Łączenie i kontrola źródła",
  proxy: "Przygotowanie podglądu",
  transcribe: "Transkrypcja Whisper",
  analyze: "Analiza fragmentów",
  proposals: "Sprawdzanie propozycji",
  materialize: "Przygotowanie krótkiego źródła",
  framing: "Kadrowanie do pionu 9:16",
  montage: "Redakcja, branding i grafiki",
  review: "Kontrola klatek",
  render: "Renderowanie",
  description: "Opis do publikacji · GPT‑6 Luna API",
  verify: "Sprawdzanie pliku",
};
const candidateStatus = (candidate: QCCandidate) =>
  currentCandidate(candidate)
    ? "Zmontowane"
    : ({
        proposed: "Propozycja",
        queued: "W kolejce",
        materializing: "Przygotowanie",
        montaging: "Montaż",
        reviewing: "Kontrola",
        rendering: "Render",
        completed: "Wymaga aktualnego renderu",
        failed: "Błąd",
        cancelled: "Anulowano",
      }[candidate.status] ?? candidate.status);
const presets = [
  { value: "15-30", label: "15–30 s", min: 15, max: 30 },
  { value: "30-60", label: "30–60 s", min: 30, max: 60 },
  { value: "60-90", label: "60–90 s", min: 60, max: 90 },
  { value: "90-180", label: "90–180 s", min: 90, max: 180 },
  { value: "auto", label: "Auto — 15–180 s", min: 15, max: 180 },
];

function AnalysisFields({
  focus,
  duration,
  onFocus,
  onDuration,
  errors = {},
  disabled = false,
}: {
  focus: QCFocus;
  duration: QCDuration;
  onFocus: (value: QCFocus) => void;
  onDuration: (value: QCDuration) => void;
  errors?: FieldErrors;
  disabled?: boolean;
}) {
  const [preset, setPreset] = useState(
    () =>
      presets.find(
        (item) => item.min === duration.min && item.max === duration.max,
      )?.value ?? "custom",
  );
  return (
    <>
      <fieldset className="qc-choices" disabled={disabled}>
        <legend>Na czym mamy się skupić?</legend>
        <div className="qc-radio-row">
          <label className="qc-radio">
            <input
              type="radio"
              name="qc-focus"
              checked={focus.mode === "auto"}
              onChange={() => onFocus({ mode: "auto" })}
            />
            Auto
          </label>
          <label className="qc-radio">
            <input
              type="radio"
              name="qc-focus"
              checked={focus.mode === "prompt"}
              onChange={() =>
                onFocus({ mode: "prompt", prompt: focus.prompt ?? "" })
              }
            />
            Własne wskazówki
          </label>
        </div>
        {focus.mode === "auto" ? (
          <p className="qc-muted">
            Szukamy pełnych, interesujących myśli w całym materiale.
          </p>
        ) : (
          <label className="qc-field">
            <span>Na czym mamy się skupić?</span>
            <textarea
              rows={3}
              value={focus.prompt ?? ""}
              onChange={(event) =>
                onFocus({ mode: "prompt", prompt: event.target.value })
              }
              placeholder="Mocne opinie o prowadzeniu firmy, błędy początkujących, historie z konkretną puentą"
              aria-invalid={Boolean(errors.focus)}
              aria-describedby={errors.focus ? "qc-focus-error" : undefined}
            />
            {errors.focus && (
              <span className="qc-error-text" id="qc-focus-error">
                {errors.focus}
              </span>
            )}
          </label>
        )}
      </fieldset>
      <div className="qc-stack">
        <label className="qc-field">
          <span>Preferowana długość</span>
          <select
            value={preset}
            disabled={disabled}
            onChange={(event) => {
              setPreset(event.target.value);
              const item = presets.find(
                (item) => item.value === event.target.value,
              );
              if (item) onDuration({ min: item.min, max: item.max });
            }}
          >
            {presets.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value="custom">Własny zakres — 10–300 s</option>
          </select>
        </label>
        {preset === "custom" && (
          <div className="qc-fields-two">
            <label className="qc-field">
              <span>Minimum (s)</span>
              <input
                type="number"
                min={10}
                max={300}
                step={1}
                value={Number.isFinite(duration.min) ? duration.min : ""}
                disabled={disabled}
                onChange={(event) =>
                  onDuration({ ...duration, min: event.target.valueAsNumber })
                }
                aria-invalid={Boolean(errors.duration)}
                aria-describedby="qc-duration-help qc-duration-error"
              />
            </label>
            <label className="qc-field">
              <span>Maksimum (s)</span>
              <input
                type="number"
                min={10}
                max={300}
                step={1}
                value={Number.isFinite(duration.max) ? duration.max : ""}
                disabled={disabled}
                onChange={(event) =>
                  onDuration({ ...duration, max: event.target.valueAsNumber })
                }
                aria-invalid={Boolean(errors.duration)}
                aria-describedby="qc-duration-help qc-duration-error"
              />
            </label>
          </div>
        )}
        {errors.duration && (
          <p className="qc-error-text" id="qc-duration-error">
            {errors.duration}
          </p>
        )}
        <p className="qc-muted" id="qc-duration-help">
          Fragment musi mieć zrozumiały początek i koniec. Jeśli nie mieści się
          w tym zakresie, nie dodamy go na siłę.
        </p>
      </div>
    </>
  );
}

function ImportForm({
  clients,
  templates,
  onCreated,
  onBack,
}: {
  clients: Client[];
  templates: QCTemplate[];
  onCreated: (project: QCProject, jobId?: string, startError?: string) => void;
  onBack: () => void;
}) {
  const [sourceKind, setSourceKind] = useState<"youtube" | "upload">("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState("");
  const compatible = templates.filter((template) =>
    template.clientId !== undefined
      ? template.clientId === (clientId || null)
      : !template.clientIds?.length || template.clientIds.includes(clientId),
  );
  const [templateId, setTemplateId] = useState("");
  const selectedTemplate =
    compatible.find((template) => template.id === templateId) ??
    compatible.find((template) => template.ready);
  const [focus, setFocus] = useState<QCFocus>({ mode: "auto" });
  const [duration, setDuration] = useState<QCDuration>({ min: 30, max: 60 });
  const [aiProvider, setAiProvider] = useState<QCProvider>("codex");
  const [resolution, setResolution] = useState<1080 | 2160>(1080);
  const [outputResolution, setOutputResolution] = useState<720 | 1080 | 2160>(
    1080,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const working = useRef(false);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working.current) return;
    const next = validateAnalysis(focus, duration) as FieldErrors;
    if (sourceKind === "upload" && !file)
      next.source = "Wybierz film z komputera.";
    if (sourceKind === "youtube") {
      try {
        const parsed = new URL(url);
        if (
          !["https:", "http:"].includes(parsed.protocol) ||
          !/^(www\.|m\.)?(youtube\.com|youtu\.be)$/.test(parsed.hostname)
        )
          throw new Error();
      } catch {
        next.source = "Wklej pełny link YouTube (youtube.com lub youtu.be).";
      }
    }
    if (!selectedTemplate?.ready)
      next.template =
        templateReason(selectedTemplate) ??
        "Wybierz gotowy szablon. Profil klienta może wymagać uzupełnienia.";
    setErrors(next);
    if (Object.keys(next).length) return;
    working.current = true;
    setError("");
    controller.current = new AbortController();
    try {
      let uploadId: string | undefined;
      if (sourceKind === "upload" && file) {
        if (uploaded.current?.file === file) uploadId = uploaded.current.id;
        else {
          setBusy("Wysyłanie filmu");
          setProgress(0);
          const result = await uploadQuickContent(
            file,
            setProgress,
            controller.current.signal,
          );
          uploadId = result.uploadId;
          uploaded.current = { file, id: uploadId };
        }
      }
      setProgress(null);
      setBusy("Zapisywanie projektu");
      const created = await createAndProcessProject(
        {
          sourceKind,
          ...(sourceKind === "youtube" ? { url: url.trim() } : { uploadId }),
          clientId: clientId || null,
          templateId: selectedTemplate!.id,
          focus,
          duration,
          resolution,
          outputResolution,
          aiProvider,
        },
        () => setBusy("Uruchamianie analizy"),
      );
      onCreated(created.project, created.jobId, created.startError);
    } catch (failure) {
      setError(message(failure));
    } finally {
      working.current = false;
      setBusy("");
      setProgress(null);
    }
  }
  return (
    <section className="qc-import qc-card">
      <header className="qc-stack">
        <p className="qc-eyebrow">Nowy projekt</p>
        <h2>Z długiego filmu wybierz pomysły na rolki</h2>
        <p className="qc-muted">
          Najpierw otrzymasz propozycje. Montaż uruchomisz po ich wybraniu.
        </p>
      </header>
      <form className="qc-stack" onSubmit={submit} noValidate>
        <fieldset className="qc-choices" disabled={Boolean(busy)}>
          <legend>Źródło filmu</legend>
          <div className="qc-radio-row">
            <label className="qc-radio">
              <input
                type="radio"
                name="qc-source"
                checked={sourceKind === "youtube"}
                onChange={() => setSourceKind("youtube")}
              />
              Link YouTube
            </label>
            <label className="qc-radio">
              <input
                type="radio"
                name="qc-source"
                checked={sourceKind === "upload"}
                onChange={() => setSourceKind("upload")}
              />
              Plik z komputera
            </label>
          </div>
        </fieldset>
        {sourceKind === "youtube" ? (
          <label className="qc-field">
            <span>Link do filmu</span>
            <input
              type="url"
              autoComplete="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={Boolean(busy)}
              aria-invalid={Boolean(errors.source)}
              aria-describedby={errors.source ? "qc-source-error" : undefined}
            />
          </label>
        ) : (
          <label className="qc-field qc-upload">
            <span>Film z komputera</span>
            <input
              type="file"
              accept="video/*,.mkv,.mov,.mp4,.webm,.m4v"
              disabled={Boolean(busy)}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                uploaded.current = null;
              }}
              aria-describedby={errors.source ? "qc-source-error" : undefined}
            />
            {file && (
              <span className="qc-muted">
                {file.name} · {(file.size / 1048576).toFixed(1)} MB
              </span>
            )}
          </label>
        )}
        {errors.source && (
          <p className="qc-error-text" id="qc-source-error">
            {errors.source}
          </p>
        )}
        <div className="qc-fields-two">
          <label className="qc-field">
            <span>Klient</span>
            <select
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setTemplateId("");
              }}
              disabled={Boolean(busy)}
            >
              <option value="">Bez klienta — przestrzeń robocza</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
          </label>
          <label className="qc-field">
            <span>Branding / szablon</span>
            <select
              value={selectedTemplate?.id ?? ""}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={Boolean(busy)}
              aria-invalid={Boolean(errors.template)}
              aria-describedby="qc-template-help"
            >
              <option value="" disabled>
                Wybierz szablon
              </option>
              {compatible.map((template) => (
                <option key={template.id} value={template.id}>
                  {templateLabel(template)}
                  {template.ready ? "" : " — profil wymaga uzupełnienia"}
                </option>
              ))}
            </select>
            <span
              className={errors.template ? "qc-error-text" : "qc-muted"}
              id="qc-template-help"
            >
              {errors.template ??
                templateReason(selectedTemplate) ??
                (selectedTemplate
                  ? `Styl: ${selectedTemplate.styleId}. Branding zostanie zastosowany po wyborze propozycji.`
                  : "Brak gotowego szablonu dla tego klienta.")}
            </span>
          </label>
        </div>
        <AnalysisFields
          focus={focus}
          duration={duration}
          onFocus={setFocus}
          onDuration={setDuration}
          errors={errors}
          disabled={Boolean(busy)}
        />
        <details className="qc-settings">
          <summary>
            Więcej ustawień{" "}
            <small>
              {aiProvider === "openai"
                ? "Płatne API"
                : aiProvider === "claude"
                  ? "Claude Code"
                  : "Codex"}{" "}
              ·{" "}
              {outputResolution === 2160
                ? "2160 × 3840"
                : outputResolution === 720
                  ? "720 × 1280"
                  : "1080 × 1920"}
            </small>
          </summary>
          <div className="qc-stack">
            <OperatorOptions
              value={aiProvider}
              onChange={setAiProvider}
              disabled={Boolean(busy)}
            />
            <PortraitOptions
              value={outputResolution}
              onChange={setOutputResolution}
              disabled={Boolean(busy)}
            />
            {sourceKind === "youtube" && (
              <fieldset className="qc-choices" disabled={Boolean(busy)}>
                <legend>Jakość pobrania z YouTube</legend>
                <div className="qc-radio-row">
                  <label className="qc-radio">
                    <input
                      type="radio"
                      name="qc-resolution"
                      checked={resolution === 1080}
                      onChange={() => setResolution(1080)}
                    />
                    1080p
                  </label>
                  <label className="qc-radio">
                    <input
                      type="radio"
                      name="qc-resolution"
                      checked={resolution === 2160}
                      onChange={() => setResolution(2160)}
                    />
                    4K, jeśli dostępne
                  </label>
                </div>
                <p className="qc-muted">
                  Obraz i najlepsze dostępne oryginalne audio pobieramy osobno,
                  a następnie łączymy. Faktyczna jakość będzie widoczna w
                  projekcie.
                </p>
              </fieldset>
            )}
          </div>
        </details>
        {aiProvider === "openai" && (
          <p className="qc-notice" role="status">
            Wybrano płatne API OpenAI. Analiza i montaż są rozliczane osobno.
          </p>
        )}
        {error && (
          <p className="qc-notice qc-error" role="alert">
            {error}
          </p>
        )}
        {progress !== null && (
          <MeasuredProgress
            label={`Wysyłanie: ${file?.name ?? "film"}`}
            percent={progress}
          />
        )}
        <div className="qc-actions">
          <button
            type="button"
            className="btn"
            onClick={onBack}
            disabled={Boolean(busy)}
          >
            Wróć do projektów
          </button>
          {busy && sourceKind === "upload" && progress !== null && (
            <button
              type="button"
              className="btn danger"
              onClick={() => controller.current?.abort()}
            >
              Anuluj wysyłanie
            </button>
          )}
          <button
            className="btn primary"
            type="submit"
            disabled={Boolean(busy) || !templates.length}
          >
            {busy || "Przetwarzaj"}
          </button>
        </div>
        {busy && (
          <p role="status" className="qc-muted">
            {busy}…
          </p>
        )}
      </form>
    </section>
  );
}

function MeasuredProgress({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className="qc-stack qc-progress-wrap">
      <span>
        {label}: {value}%
      </span>
      <div
        className="qc-progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function JobCard({
  job,
  busy,
  sourceKind,
  onCancel,
  onRetry,
}: {
  job: QCJob;
  busy: boolean;
  sourceKind: "youtube" | "upload";
  onCancel: () => void;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const running = activeJob(job);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const activity = jobActivity(job, now);
  const error = typeof job.error === "string" ? job.error : job.error?.message;
  const state =
    (
      {
        queued: "Oczekuje",
        running: "W trakcie",
        completed: "Gotowe",
        succeeded: "Gotowe",
        failed: "Błąd",
        cancelled: "Anulowano",
        interrupted: "Przerwano po restarcie",
        blocked: "Wymaga działania",
      } as Record<string, string>
    )[job.status] ?? job.status;
  const steps =
    job.kind === "process"
      ? [
          ...(sourceKind === "youtube"
            ? ["metadata", "video", "audio", "mux"]
            : []),
          "proxy",
          "transcribe",
          "analyze",
          "proposals",
        ]
      : job.kind === "find-more"
        ? ["analyze", "proposals"]
        : [];
  const currentStep = steps.indexOf(job.stage);
  const finished = ["completed", "succeeded"].includes(job.status);
  return (
    <section className="qc-card qc-job">
      <div className="qc-row">
        <h3>{stageLabels[job.stage] ?? job.stage ?? "Zadanie"}</h3>
        <span className="qc-badge">{state}</span>
      </div>
      {job.progressDetail && <p role="status">{job.progressDetail}</p>}
      {job.runtimeLabel && <p className="qc-muted">{job.runtimeLabel}</p>}
      {activeJob(job) &&
      job.progress !== null &&
      job.progress !== undefined &&
      Number.isFinite(job.progress) &&
      (!["analyze", "montage"].includes(job.stage) ||
        Boolean(job.totalUnits)) ? (
        <MeasuredProgress
          label={
            job.stage === "analyze"
              ? `Przeanalizowane części (${job.completedUnits ?? 0}/${job.totalUnits})`
              : (stageLabels[job.stage] ?? "Postęp zadania")
          }
          percent={job.progress * 100}
        />
      ) : (
        activeJob(job) && (
          <p className="qc-muted">
            {job.stage === "analyze" ? "Analiza trwa" : "Praca trwa"}
            {job.totalUnits && job.progressUnit !== "audioFrames"
              ? ` · ${job.completedUnits ?? 0}/${job.totalUnits} części`
              : ""}
          </p>
        )
      )}
      {activeJob(job) && (
        <div className="qc-stack qc-muted">
          {activity.processedSeconds !== null &&
            activity.totalSeconds !== null && (
              <p>
                Rozpoznano {time(activity.processedSeconds)} /{" "}
                {time(activity.totalSeconds)} nagrania
              </p>
            )}
          {activity.elapsedSeconds !== null && (
            <p>
              Ten etap trwa: {time(activity.elapsedSeconds)}
              {activity.etaSeconds !== null
                ? ` · Szacunkowo pozostało ${time(activity.etaSeconds)}`
                : ""}
            </p>
          )}
          {activity.sinceProgressSeconds !== null &&
            activity.sinceProgressSeconds > 0 &&
            job.stage === "transcribe" && (
              <p>
                Ostatni pomiar postępu: {time(activity.sinceProgressSeconds)}{" "}
                temu. Wynik aktualizuje się po ukończeniu fragmentu.
              </p>
            )}
          {job.stage === "transcribe" && job.progress === null && (
            <p>
              Przygotowanie modelu nie ma pomiaru procentowego. Procent pojawi
              się podczas rozpoznawania audio.
            </p>
          )}
        </div>
      )}
      {error && <p className="qc-error-text">{error}</p>}
      {typeof job.error === "object" && job.error.action && (
        <p className="qc-muted">{job.error.action}</p>
      )}
      {steps.length > 0 && (
        <ol className="qc-steps">
          {steps.map((step, index) => (
            <li key={step}>
              <span>{stageLabels[step]}</span>
              <span className="qc-muted">
                {finished || index < currentStep
                  ? "Gotowe"
                  : index === currentStep
                    ? state
                    : "Oczekuje"}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="qc-actions">
        {activeJob(job) && (
          <button className="btn" disabled={busy} onClick={onCancel}>
            Anuluj zadanie
          </button>
        )}
        {(failedJob(job) || job.status === "cancelled") && (
          <button className="btn" disabled={busy} onClick={onRetry}>
            Wznów od ostatniego etapu
          </button>
        )}
      </div>
      <details>
        <summary>Szczegóły zadania</summary>
        <p className="qc-muted">
          Etap: {stageLabels[job.stage] ?? job.stage} · {state}
        </p>
        {job.events?.length ? (
          <ol className="qc-events">
            {job.events.map((event, index) => (
              <li key={index}>
                {event.message ?? stageLabels[event.stage ?? ""] ?? event.stage}
              </li>
            ))}
          </ol>
        ) : (
          <p className="qc-muted">Brak dodatkowych zdarzeń.</p>
        )}
      </details>
    </section>
  );
}

function Score({ candidate }: { candidate: QCCandidate }) {
  return (
    <div className="qc-stack qc-score">
      <p>
        <strong>
          Ocena redakcyjna:{" "}
          {Number.isFinite(candidate.score)
            ? `${candidate.score}/100`
            : "brak oceny"}
        </strong>
      </p>
      <details>
        <summary>Dlaczego?</summary>
        <p>{candidate.reason || "Brak uzasadnienia w wyniku analizy."}</p>
        <p className="qc-muted">Ocena nie przewiduje zasięgu.</p>
        {candidate.scoreBreakdown && (
          <dl className="qc-score-details">
            {Object.entries(candidate.scoreBreakdown).map(([key, value]) => (
              <div key={key}>
                <dt>{evidenceLabels[key] ?? key}</dt>
                <dd>{evidenceValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {candidate.completeness !== undefined &&
          (typeof candidate.completeness === "object" ? (
            <>
              <p className="qc-muted">Kompletność wypowiedzi</p>
              <dl className="qc-score-details">
                {Object.entries(candidate.completeness).map(([key, value]) => (
                  <div key={key}>
                    <dt>{evidenceLabels[key] ?? key}</dt>
                    <dd>{evidenceValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="qc-muted">Kompletność: {candidate.completeness}</p>
          ))}
        {candidate.confidence !== undefined && (
          <p className="qc-muted">
            Pewność analizy:{" "}
            {(
              { high: "wysoka", medium: "średnia", low: "niska" } as Record<
                string,
                string
              >
            )[candidate.confidence] ?? candidate.confidence}
          </p>
        )}
        {candidate.contextRisk && candidate.contextRisk !== "none" && (
          <p className="qc-notice">
            Kontekst:{" "}
            {typeof candidate.contextRisk === "string"
              ? candidate.contextRisk
              : "Wymaga sprawdzenia kontekstu wypowiedzi."}
          </p>
        )}
      </details>
    </div>
  );
}

function RawPreview({
  projectId,
  candidate,
}: {
  projectId: string;
  candidate: QCCandidate;
}) {
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  function clamp(event: SyntheticEvent<HTMLVideoElement>) {
    const element = event.currentTarget;
    const next = boundedPreviewTime(
      element.currentTime,
      candidate.sourceStart,
      candidate.sourceEnd,
    );
    if (Math.abs(next - element.currentTime) > 0.02) element.currentTime = next;
    if (element.currentTime >= candidate.sourceEnd) element.pause();
  }
  useEffect(() => () => video.current?.pause(), []);
  return (
    <div className="qc-stack">
      <video
        ref={video}
        className="qc-preview"
        controls
        playsInline
        preload="metadata"
        src={qc.proxy(projectId)}
        aria-label={`Surowy fragment: ${candidate.title}`}
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = candidate.sourceStart;
        }}
        onSeeking={clamp}
        onTimeUpdate={clamp}
        onPlay={(event) => {
          if (event.currentTarget.currentTime >= candidate.sourceEnd)
            event.currentTarget.currentTime = candidate.sourceStart;
        }}
        onError={() =>
          setError(
            "Nie udało się otworzyć surowego podglądu. Źródło może być jeszcze przygotowywane.",
          )
        }
      />
      <p className="qc-muted">
        Podgląd źródła — kadr 9:16 powstanie po kliknięciu montażu. W filmie
        źródłowym: {range(candidate)}.
      </p>
      {error && (
        <p role="alert" className="qc-error-text">
          {error}
        </p>
      )}
    </div>
  );
}

type ProjectTab = "proposals" | "finished" | "settings";
const projectTabs = [
  { id: "proposals", label: "Propozycje" },
  { id: "finished", label: "Zmontowane" },
  { id: "settings", label: "Ustawienia" },
] as const;
export function ProjectTabs({
  value,
  count,
  onChange,
}: {
  value: ProjectTab;
  count: number;
  onChange: (tab: ProjectTab) => void;
}) {
  return (
    <div className="qc-project-tabs" role="tablist" aria-label="Widok projektu">
      {projectTabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`qc-tab-${tab.id}`}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          aria-controls="qc-project-panel"
          tabIndex={value === tab.id ? 0 : -1}
          className="btn"
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 2
                  : event.key === "ArrowRight"
                    ? (index + 1) % 3
                    : event.key === "ArrowLeft"
                      ? (index + 2) % 3
                      : null;
            if (next === null) return;
            event.preventDefault();
            onChange(projectTabs[next].id);
            const buttons =
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              );
            buttons?.[next]?.focus();
          }}
        >
          {tab.label}
          {tab.id === "finished" ? ` (${count})` : ""}
        </button>
      ))}
    </div>
  );
}

export const availableFilmRender = (candidate: QCCandidate) =>
  (currentCandidate(candidate) ? candidate.currentRender : null) ??
  [...(candidate.renders ?? [])]
    .reverse()
    .find((render) => render.verified === true && render.filePath);

export function FinishedCard({
  candidate,
  onEditor,
}: {
  candidate: QCCandidate;
  onEditor: () => void;
}) {
  const file = availableFilmRender(candidate)?.filePath;
  const current = currentCandidate(candidate);
  const url = file ? `/api/file?path=${encodeURIComponent(file)}` : null;
  return (
    <article className="qc-card qc-candidate qc-finished">
      <h3>{candidate.title}</h3>
      {url ? (
        <video
          className="qc-finished-preview"
          controls
          playsInline
          preload="metadata"
          src={url}
          aria-label={`${current ? "Zmontowana rolka" : "Wcześniejsza wersja rolki"}: ${candidate.title}`}
        />
      ) : (
        <p className="qc-muted">
          Podgląd pliku jest niedostępny. Otwórz edytor, aby sprawdzić wynik.
        </p>
      )}
      <p className="qc-muted">
        {range(candidate)} ·{" "}
        {current
          ? "Zmontowane"
          : "Wersja wcześniejsza · są poprawki do wyrenderowania"}
      </p>
      <div className="qc-actions">
        {candidate.reelName && (
          <button className="btn primary" onClick={onEditor}>
            Obejrzyj i popraw
          </button>
        )}
        {url && (
          <a className="btn" href={url} download>
            {current ? "Pobierz" : "Pobierz wcześniejszą wersję"}
          </a>
        )}
      </div>
      <FilmCosts costs={candidate.costs} />
      {candidate.reelName && (
        <PublicationDescription
          reelName={candidate.reelName}
          canGenerate={Boolean(url)}
          refreshKey={publicationRefreshKey(candidate)}
        />
      )}
    </article>
  );
}

function CandidateCard({
  projectId,
  candidate,
  selected,
  disabled,
  onSelect,
  onPreview,
  onEditor,
}: {
  projectId: string;
  candidate: QCCandidate;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onEditor: () => void;
}) {
  return (
    <article
      className={`qc-card qc-candidate${selected ? " qc-selected" : ""}`}
    >
      <div className="qc-row">
        <label className="qc-select">
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            onChange={onSelect}
          />
          <span>
            Wybierz do montażu
            <span className="qc-sr-only">: {candidate.title}</span>
          </span>
        </label>
        <span
          className={`qc-badge${currentCandidate(candidate) ? " qc-complete" : ""}`}
        >
          {candidateStatus(candidate)}
        </span>
      </div>
      <button
        className="qc-thumbnail"
        onClick={onPreview}
        aria-label={`Obejrzyj surowy fragment: ${candidate.title}`}
      >
        <img
          loading="lazy"
          src={qc.thumbnail(projectId, candidate.id)}
          alt=""
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
        <span>Obejrzyj fragment</span>
      </button>
      <h3>{candidate.title}</h3>
      <p className="qc-muted">
        {range(candidate)}
        {candidate.kind ? ` · ${candidate.kind}` : ""}
      </p>
      <p className="qc-candidate-summary">{candidate.summary}</p>
      <details>
        <summary>Szczegóły i ocena fragmentu</summary>
        <Score candidate={candidate} />
      </details>
      {candidate.reelName && (
        <div className="qc-actions">
          <button className="btn" onClick={onEditor}>
            Otwórz edytor
          </button>
          {currentCandidate(candidate) && (
            <span className="qc-muted">
              Aktualny render · rewizja {candidate.editRevision ?? 0}
            </span>
          )}
        </div>
      )}
      <FilmCosts costs={candidate.costs} />
      {candidate.reelName && (
        <PublicationDescription
          key={candidate.reelName}
          compact
          reelName={candidate.reelName}
          canGenerate={Boolean(availableFilmRender(candidate))}
          refreshKey={publicationRefreshKey(candidate)}
        />
      )}
    </article>
  );
}

function BatchCard({
  batch,
  candidates,
  jobs,
  busy,
  onCancel,
  onRetry,
}: {
  batch: QCBatch;
  candidates: QCCandidate[];
  jobs: QCJob[];
  busy: boolean;
  onCancel: (ids: string[]) => void;
  onRetry: (ids: string[]) => void;
}) {
  const progress = batchProgress(batch, candidates);
  const batchJobs = jobs.filter(
    (job) => job.batchId === batch.id || batch.jobIds?.includes(job.id),
  );
  return (
    <section className="qc-card qc-batch">
      <h3>Montaż wybranych propozycji</h3>
      <p role="status">
        Zmontowane {progress.completed}/{progress.total} — {progress.percent}% ·
        W kolejce {progress.queued} · W trakcie {progress.active} · Błędy{" "}
        {progress.failed}
      </p>
      <MeasuredProgress
        label="Gotowe aktualne rendery"
        percent={progress.percent}
      />
      {progress.outdated > 0 && (
        <p className="qc-notice">
          {progress.outdated}{" "}
          {progress.outdated === 1 ? "rolka wymaga" : "rolek wymaga"} aktualnego
          renderu.
        </p>
      )}
      <ol className="qc-batch-items">
        {batch.candidateIds.map((id) => {
          const candidate = candidates.find((item) => item.id === id);
          const job = batchJobs.find(
            (item) => item.candidateId === id && activeJob(item),
          );
          return (
            <li key={id}>
              <span>{candidate?.title ?? "Propozycja niedostępna"}</span>
              <span className="qc-muted">
                {candidate ? candidateStatus(candidate) : "Oczekuje"}
              </span>
              {job?.stage === "render" && job.progress !== null && (
                <MeasuredProgress
                  label="Bieżący render"
                  percent={job.progress * 100}
                />
              )}
            </li>
          );
        })}
      </ol>
      <div className="qc-actions">
        {batchJobs.some(activeJob) && (
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              onCancel(batchJobs.filter(activeJob).map((job) => job.id))
            }
          >
            Anuluj pozostałe
          </button>
        )}
        {batchJobs.some(failedJob) && (
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              onRetry(batchJobs.filter(failedJob).map((job) => job.id))
            }
          >
            Ponów nieudane
          </button>
        )}
      </div>
    </section>
  );
}

export function OperatorOptions({
  value,
  onChange,
  disabled,
}: {
  value: QCProvider;
  onChange: (value: QCProvider) => void;
  disabled: boolean;
}) {
  const [status, setStatus] = useState<QCOperators | null>(null);
  const [error, setError] = useState("");
  const refresh = () => {
    setError("");
    void qc
      .operators()
      .then(setStatus)
      .catch(() => setError("Nie udało się sprawdzić logowania."));
  };
  useEffect(() => {
    let alive = true;
    void qc
      .operators()
      .then((s) => {
        if (alive) setStatus(s);
      })
      .catch(() => {
        if (alive) setError("Nie udało się sprawdzić logowania.");
      });
    return () => {
      alive = false;
    };
  }, []);
  const ready =
    status &&
    (value === "openai" ? status.openai.configured : status[value].loggedIn);
  return (
    <div className="qc-stack">
      <label className="qc-field">
        <span>Operator QuickContent</span>
        <select
          aria-label="Operator QuickContent"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as QCProvider)}
        >
          <option value="codex">Codex · konto ChatGPT przez terminal</option>
          <option value="claude">Claude Code · konto przez terminal</option>
          <option value="openai">OpenAI API · płatne tokeny</option>
        </select>
      </label>
      <p className="qc-muted">
        {value === "openai"
          ? "Osobne opłaty za API według zużycia tokenów."
          : "Montaż i analiza bez osobnej opłaty API. Opisy publikacyjne są płatne przez GPT-6 Luna API. Wykorzystuje subskrypcję i limity zalogowanego konta; nie przełącza się automatycznie na klucz API."}
      </p>
      <p role="status" className="qc-muted">
        {error ||
          (!status
            ? "Sprawdzanie operatora…"
            : ready
              ? "Operator gotowy"
              : value === "claude"
                ? "Zaloguj w swoim Terminalu: claude auth login"
                : value === "codex"
                  ? "Zaloguj w swoim Terminalu: codex login"
                  : "Skonfiguruj OPENAI_API_KEY w lokalnym .env")}
      </p>
      <button
        type="button"
        className="btn"
        disabled={disabled}
        onClick={refresh}
      >
        Sprawdź logowanie operatora
      </button>
    </div>
  );
}

type OutputResolution = 720 | 1080 | 2160;
export function PortraitOptions({
  value,
  onChange,
  disabled,
}: {
  value: OutputResolution;
  onChange: (value: OutputResolution) => void;
  disabled: boolean;
}) {
  return (
    <label className="qc-field">
      <span>Rozdzielczość rolki · pion 9:16</span>
      <select
        aria-label="Rozdzielczość rolki 9:16"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(Number(event.target.value) as OutputResolution)
        }
      >
        <option value={720}>720 × 1280 · szybszy eksport</option>
        <option value={1080}>1080 × 1920 · zalecane</option>
        <option value={2160}>2160 × 3840 · 4K</option>
      </select>
      <span className="qc-muted">
        4K zwiększa czas renderu. Powiększenie słabszego źródła nie dodaje
        szczegółów. Zmiana dotyczy kolejnego montażu; zachowuje poprzednie
        wersje.
      </span>
    </label>
  );
}
function AnalysisSettings({
  project,
  busy,
  onRun,
}: {
  project: QCProject;
  busy: boolean;
  onRun: (settings: { focus: QCFocus; duration: QCDuration }) => void;
}) {
  const latest = project.analysisRuns?.[project.analysisRuns.length - 1];
  const [focus, setFocus] = useState(latest?.focus ?? project.focus);
  const [duration, setDuration] = useState(
    latest?.duration ?? project.duration,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  return (
    <details className="qc-card qc-settings">
      <summary>Źródło i ustawienia analizy</summary>
      <div className="qc-stack">
        <p className="qc-muted">
          Nowy przebieg zachowuje istniejące propozycje, wybór i montaż.
        </p>
        <AnalysisFields
          focus={focus}
          duration={duration}
          onFocus={setFocus}
          onDuration={setDuration}
          errors={errors}
          disabled={busy}
        />
        <button
          className="btn"
          disabled={busy}
          onClick={() => {
            const next = validateAnalysis(focus, duration);
            setErrors(next);
            if (!Object.keys(next).length) onRun({ focus, duration });
          }}
        >
          Szukaj z tymi ustawieniami
        </button>
        {project.analysisRuns?.map((run, index) => (
          <p className="qc-muted" key={run.id}>
            Przebieg {index + 1}:{" "}
            {run.focus?.mode === "prompt" ? run.focus.prompt : "Auto"},{" "}
            {run.duration?.min}–{run.duration?.max} s
            {run.exhausted ? " · wyczerpano wyniki" : ""}
          </p>
        ))}
      </div>
    </details>
  );
}

export function QuickContent({
  clients,
  active = true,
  onOpenReel,
  onClose,
}: QuickContentProps) {
  const [route, setRoute] = useState<QCRoute>(() =>
    typeof window === "undefined"
      ? {}
      : (parseQuickContentHash(window.location.hash) ?? {}),
  );
  const [projects, setProjects] = useState<QCProject[]>([]);
  const [templates, setTemplates] = useState<QCTemplate[]>([]);
  const [project, setProject] = useState<QCProject | null>(null);
  const [jobs, setJobs] = useState<QCJob[]>([]);
  const [extraJobs, setExtraJobs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [selection, setSelection] = useState<string[] | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [order, setOrder] = useState<"score" | "time">("score");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<ProjectTab>("proposals");
  const [wake, setWake] = useState(0);
  const [notice, setNotice] = useState("");
  const [newCandidateIds, setNewCandidateIds] = useState<string[]>([]);
  const [selectionHeight, setSelectionHeight] = useState(0);
  const working = useRef(false);
  const selectionSaving = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  const selectionBar = useRef<HTMLElement>(null);
  const pendingSearch = useRef<{
    projectId: string;
    jobId: string;
    existingIds: Set<string>;
  } | null>(null);
  const createdError = useRef<{ projectId: string; message: string } | null>(
    null,
  );
  const savedView = useRef(projectViews);
  const montageKey = useRef<{ ids: string; key: string } | null>(null);
  const projectId = route.projectId;
  const hasLoadedProject = project !== null;
  const editorCandidate = project?.candidates?.find(
    (item) => item.id === route.candidateId,
  );
  const editorReelName = editorCandidate?.reelName;
  const editorCandidateId = editorCandidate?.id;
  const navigate = useCallback((next: string) => {
    window.location.hash = next;
  }, []);
  const applyProject = useCallback(
    (next: QCProject) =>
      setProject((previous) =>
        previous?.id === next.id && previous.revision > next.revision
          ? previous
          : next,
      ),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    qc.templates(controller.signal)
      .then(setTemplates)
      .catch((failure) => {
        if (!controller.signal.aborted) setError(message(failure));
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const change = () => {
      const next = parseQuickContentHash(window.location.hash);
      if (next) setRoute(next);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    setProject(null);
    setJobs([]);
    setExtraJobs([]);
    setSelection(null);
    setSelectionError("");
    setError("");
    setActionError(
      createdError.current && createdError.current.projectId === projectId
        ? createdError.current.message
        : "",
    );
    createdError.current = null;
    setNotice("");
    setNewCandidateIds([]);
    pendingSearch.current = null;
    montageKey.current = null;
    setLoading(!route.newProject);
    if (projectId && savedView.current[projectId]) {
      setOrder(savedView.current[projectId].order);
      setFilter(savedView.current[projectId].filter);
      setTab(savedView.current[projectId].tab ?? "proposals");
    } else {
      setOrder("score");
      setFilter("all");
      setTab("proposals");
    }
  }, [projectId, route.newProject]);
  useEffect(() => {
    if (route.newProject) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let backoff = 1500;
    async function poll() {
      try {
        if (!projectId) {
          const next = await qc.projects(controller.signal);
          if (!controller.signal.aborted) {
            setProjects(next);
            setError("");
            setLoading(false);
            timer = setTimeout(poll, 10000);
          }
          return;
        }
        const next = await qc.project(projectId, controller.signal);
        const ids = [
          ...new Set([
            ...(next.jobIds ?? []),
            ...(next.jobs ?? []).map((job) => job.id),
            ...extraJobs,
          ]),
        ];
        const results = await Promise.all(
          ids.map((id) => qc.job(id, controller.signal)),
        );
        if (controller.signal.aborted) return;
        applyProject(next);
        setJobs(results.length ? results : (next.jobs ?? []));
        setLoading(false);
        setError("");
        backoff = 1500;
        timer = setTimeout(
          poll,
          results.some(activeJob) || next.jobs?.some(activeJob)
            ? backoff
            : 5000,
        );
      } catch (failure) {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(message(failure));
        if (!(failure instanceof QuickContentError && failure.status === 404)) {
          backoff = Math.min(15000, backoff * 2);
          timer = setTimeout(poll, backoff);
        }
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [projectId, route.newProject, wake, extraJobs, applyProject]);
  useEffect(() => {
    if (
      !projectId ||
      route.candidateId ||
      !hasLoadedProject ||
      !content.current
    )
      return;
    content.current.scrollTop = savedView.current[projectId]?.scroll ?? 0;
  }, [projectId, route.candidateId, hasLoadedProject]);
  useEffect(() => {
    if (active && editorReelName && projectId && editorCandidateId)
      onOpenReel(editorReelName, projectId, editorCandidateId);
  }, [active, editorReelName, projectId, editorCandidateId, onOpenReel]);
  useEffect(() => {
    if (!selectionBar.current) return;
    const element = selectionBar.current;
    const observer = new ResizeObserver(() =>
      setSelectionHeight(element.getBoundingClientRect().height),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasLoadedProject, route.candidateId, tab]);
  useEffect(() => {
    const pending = pendingSearch.current;
    if (!pending || project?.id !== pending.projectId) return;
    const job = jobs.find((item) => item.id === pending.jobId);
    if (!job || activeJob(job)) return;
    if (["completed", "succeeded"].includes(job.status)) {
      const ids = project.candidates
        .filter((item) => !pending.existingIds.has(item.id))
        .map((item) => item.id);
      setNewCandidateIds(ids);
      setNotice(
        ids.length
          ? `Dodano ${ids.length} nowych propozycji. Twój wybór pozostał zapisany.`
          : "Nie znaleziono kolejnych pełnych fragmentów dla tych ustawień.",
      );
    } else
      setNotice(
        "Wyszukiwanie nie zostało ukończone. Istniejące propozycje i wybór pozostają zapisane.",
      );
    pendingSearch.current = null;
  }, [jobs, project]);
  async function refresh() {
    setWake((value) => value + 1);
  }
  async function runAction(name: string, action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(name);
    setActionError("");
    try {
      await action();
    } catch (failure) {
      setActionError(message(failure));
    } finally {
      working.current = false;
      setBusy("");
      void refresh();
    }
  }
  async function saveSelection(ids: string[]) {
    if (!project || selectionSaving.current || working.current) return;
    selectionSaving.current = true;
    setSelection(ids);
    setSelectionError("");
    setBusy("Zapisywanie wyboru");
    try {
      const result = await qc.select(project.id, ids, project.revision);
      applyProject({
        ...project,
        revision: result.revision,
        selectedCandidateIds: result.selectedCandidateIds ?? ids,
      });
      setSelection(null);
      montageKey.current = null;
    } catch (failure) {
      setSelectionError(
        failure instanceof QuickContentError && failure.status === 409
          ? "Nie zapisano wyboru — projekt zmienił się. Odczytaj aktualny wybór lub ponów zapis."
          : `Nie zapisano wyboru — ${message(failure)}`,
      );
    } finally {
      selectionSaving.current = false;
      setBusy("");
      void refresh();
    }
  }
  const selected = selection ?? project?.selectedCandidateIds ?? [];
  const candidates = project?.candidates ?? [];
  const visible = sortCandidates(
    candidates.filter(
      (candidate) =>
        filter === "all" ||
        (filter === "done"
          ? currentCandidate(candidate)
          : ["failed", "cancelled"].includes(candidate.status) ||
            (candidate.status === "completed" && !currentCandidate(candidate))),
    ),
    order,
  );
  const hiddenSelected = selected.filter(
    (id) => !visible.some((candidate) => candidate.id === id),
  ).length;
  const hasActive = jobs.some(activeJob);
  const candidate = candidates.find((item) => item.id === route.candidateId);
  const lastRun = project?.analysisRuns?.[project.analysisRuns.length - 1];
  const actualResolution = sourceResolution(project?.source);
  const remember = () => {
    if (projectId)
      savedView.current[projectId] = {
        scroll: content.current?.scrollTop ?? 0,
        order,
        filter,
        tab,
      };
  };
  function showCandidate(item: QCCandidate) {
    remember();
    if (item.reelName && project) {
      navigate(quickContentHash(project.id, item.id));
      onOpenReel(item.reelName, project.id, item.id);
    } else if (project) navigate(quickContentHash(project.id, item.id));
  }
  function findMore(settings?: { focus: QCFocus; duration: QCDuration }) {
    if (!project) return;
    void runAction("Wyszukiwanie kolejnych fragmentów", async () => {
      const result = await qc.findMore(
        project.id,
        project.revision,
        settings ??
          (lastRun
            ? { focus: lastRun.focus, duration: lastRun.duration }
            : undefined),
      );
      pendingSearch.current = {
        projectId: project.id,
        jobId: result.jobId,
        existingIds: new Set(project.candidates.map((item) => item.id)),
      };
      setExtraJobs((ids) => [...ids, result.jobId]);
      setNewCandidateIds([]);
      setNotice(
        "Szukamy kolejnych pełnych fragmentów. Istniejący wybór pozostaje zapisany.",
      );
    });
  }
  function batchAction(ids: string[], kind: "cancel" | "retry") {
    void runAction(
      kind === "cancel" ? "Anulowanie zadań" : "Wznawianie zadań",
      async () => {
        const results = await Promise.allSettled(
          ids.map((id) => (kind === "cancel" ? qc.cancel(id) : qc.retry(id))),
        );
        const failures = results.filter(
          (result) => result.status === "rejected",
        );
        if (failures.length)
          throw new Error(
            `Nie udało się ${kind === "cancel" ? "anulować" : "wznowić"} ${failures.length} zadań. Odświeżono stan pozostałych.`,
          );
      },
    );
  }
  return (
    <main
      className="qc-module"
      aria-label="QuickContent"
      style={
        {
          "--qc-selection-height": `${tab === "proposals" && !route.candidateId ? selectionHeight + 32 : 32}px`,
        } as CSSProperties
      }
    >
      <header className="qc-header">
        <div>
          <p className="qc-eyebrow">MontageFrames</p>
          <h1>QuickContent</h1>
        </div>
        <div className="qc-actions">
          {projectId || route.newProject ? (
            <button className="btn" onClick={() => navigate("#qc")}>
              Projekty
            </button>
          ) : (
            <button className="btn primary" onClick={() => navigate("#qc/new")}>
              Nowy projekt
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Wróć do rolek
          </button>
        </div>
      </header>
      <div
        className="qc-content"
        ref={content}
        onScroll={() => {
          if (!route.candidateId) remember();
        }}
      >
        <div className="qc-container">
          {error && (
            <div className="qc-notice qc-error" role="alert">
              <p>{error}</p>
              <div className="qc-actions">
                <button className="btn" onClick={() => void refresh()}>
                  Odczytaj ponownie
                </button>
                {!project && projectId && (
                  <button className="btn" onClick={() => navigate("#qc")}>
                    Wróć do projektów
                  </button>
                )}
              </div>
            </div>
          )}
          {actionError && (
            <div className="qc-notice qc-error" role="alert">
              <p>{actionError}</p>
              <p>
                Projekt pozostaje zapisany. Po rozwiązaniu problemu ponów
                wybrane działanie.
              </p>
            </div>
          )}
          {route.newProject ? (
            <ImportForm
              clients={clients}
              templates={templates}
              onBack={() => navigate("#qc")}
              onCreated={(created, jobId, startError) => {
                createdError.current = startError
                  ? { projectId: created.id, message: startError }
                  : null;
                applyProject(created);
                navigate(quickContentHash(created.id));
                if (jobId) setExtraJobs([jobId]);
              }}
            />
          ) : loading && !project ? (
            <p className="qc-empty" role="status">
              Odczytywanie zapisanych projektów…
            </p>
          ) : !projectId ? (
            <>
              <div className="qc-title">
                <h2>Zapisane projekty</h2>
                <p className="qc-muted">
                  Wróć do źródła, propozycji i gotowych rolek.
                </p>
              </div>
              {!projects.length && !error ? (
                <section className="qc-empty qc-card">
                  <h3>Pierwszy film, wiele pomysłów</h3>
                  <p className="qc-muted">
                    Dodaj film YouTube lub plik z komputera. Otrzymasz
                    propozycje pełnych wypowiedzi, a następnie wybierzesz te do
                    montażu.
                  </p>
                  <button
                    className="btn primary"
                    onClick={() => navigate("#qc/new")}
                  >
                    Nowy projekt
                  </button>
                </section>
              ) : (
                <div className="qc-project-grid">
                  {projects.map((item) => (
                    <button
                      key={item.id}
                      className="qc-card qc-project-link"
                      onClick={() => navigate(quickContentHash(item.id))}
                    >
                      <h3>{item.title || "Nowy projekt"}</h3>
                      <p className="qc-muted">
                        {clients.find((client) => client.id === item.clientId)
                          ?.label ?? "Bez klienta"}{" "}
                        ·{" "}
                        {item.sourceKind === "youtube"
                          ? "YouTube"
                          : "Plik lokalny"}
                      </p>
                      <p>
                        {item.candidates?.length ?? 0} propozycji ·{" "}
                        {item.selectedCandidateIds?.length ?? 0} wybranych
                      </p>
                      <span className="qc-muted">Otwórz projekt →</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : project ? (
            <>
              <div className="qc-title">
                <p className="qc-eyebrow">
                  {clients.find((client) => client.id === project.clientId)
                    ?.label ?? "Bez klienta — przestrzeń robocza"}{" "}
                  ·{" "}
                  {templates.find(
                    (template) => template.id === project.templateId,
                  )
                    ? templateLabel(
                        templates.find(
                          (template) => template.id === project.templateId,
                        )!,
                      )
                    : project.templateId}
                </p>
                <h2>
                  {project.source?.title ?? project.title ?? "Źródło filmu"}
                </h2>
                <p className="qc-muted">
                  {(lastRun?.focus ?? project.focus)?.mode === "prompt"
                    ? (lastRun?.focus ?? project.focus).prompt
                    : "Auto"}{" "}
                  · {(lastRun?.duration ?? project.duration)?.min}–
                  {(lastRun?.duration ?? project.duration)?.max} s
                  {project.source?.duration
                    ? ` · Źródło ${time(project.source.duration)}`
                    : ""}
                  {actualResolution
                    ? ` · ${project.sourceKind === "youtube" ? "Pobrano" : "Jakość źródła"} ${actualResolution}p`
                    : ""}
                </p>
              </div>
              {!route.candidateId && (
                <ProjectTabs
                  value={tab}
                  count={
                    candidates.filter(
                      (item) => availableFilmRender(item)?.filePath,
                    ).length
                  }
                  onChange={(next) => {
                    setTab(next);
                    if (projectId)
                      savedView.current[projectId] = {
                        scroll: 0,
                        order,
                        filter,
                        tab: next,
                      };
                  }}
                />
              )}
              <section
                id="qc-project-panel"
                role={!route.candidateId ? "tabpanel" : undefined}
                aria-labelledby={
                  !route.candidateId ? `qc-tab-${tab}` : undefined
                }
                className="qc-stack"
              >
                {[
                  ...(project.warnings ?? []),
                  ...(project.source?.warnings ?? []),
                ].map((warning, index) => (
                  <p key={index} className="qc-notice">
                    {warning}
                  </p>
                ))}
                {project.sourceKind === "youtube" &&
                  project.resolution === 2160 &&
                  actualResolution &&
                  actualResolution < 2160 && (
                    <p className="qc-notice">
                      4K niedostępne — pobrano {actualResolution}p.
                    </p>
                  )}
                {!route.candidateId && tab === "settings" && (
                  <section className="qc-card qc-stack">
                    <OperatorOptions
                      value={project.aiProvider ?? "codex"}
                      disabled={Boolean(busy) || hasActive}
                      onChange={(value) =>
                        void runAction("Zapisywanie operatora", async () => {
                          applyProject(
                            await qc.operator(
                              project.id,
                              value,
                              project.revision,
                            ),
                          );
                        })
                      }
                    />
                    <DescriptionInstructions
                      key={project.id}
                      value={project.descriptionInstructions ?? ""}
                      disabled={
                        Boolean(busy) ||
                        jobs.some(
                          (job) => activeJob(job) && job.kind === "montage",
                        )
                      }
                      onSave={async (value) => {
                        applyProject(
                          await qc.descriptionInstructions(
                            project.id,
                            value,
                            project.revision,
                          ),
                        );
                      }}
                    />
                    <PortraitOptions
                      value={project.outputResolution ?? 1080}
                      disabled={
                        Boolean(busy) ||
                        jobs.some((j) => activeJob(j) && j.kind === "montage")
                      }
                      onChange={(value) =>
                        void runAction(
                          "Zapisywanie rozdzielczości",
                          async () => {
                            applyProject(
                              await qc.output(
                                project.id,
                                value,
                                project.revision,
                              ),
                            );
                          },
                        )
                      }
                    />
                    <p className="qc-muted">
                      Wycinanie, kadrowanie 9:16 i montaż uruchomią się dopiero
                      po kliknięciu „Zmontuj zaznaczone”. Sam wybór propozycji
                      nie uruchamia obróbki ani AI.
                    </p>
                  </section>
                )}
                {!route.candidateId && tab === "settings" && (
                  <CostCard
                    costs={project.costs}
                    aiProvider={project.aiProvider ?? "codex"}
                  />
                )}
                {route.candidateId ? (
                  candidate ? (
                    <section className="qc-card qc-detail">
                      <div className="qc-actions">
                        <button
                          className="btn"
                          onClick={() => navigate(quickContentHash(project.id))}
                        >
                          Wróć do propozycji
                        </button>
                      </div>
                      <h3>{candidate.title}</h3>
                      <RawPreview
                        key={candidate.id}
                        projectId={project.id}
                        candidate={candidate}
                      />
                      <p>{candidate.summary}</p>
                      <Score candidate={candidate} />
                      <label className="qc-select">
                        <input
                          type="checkbox"
                          checked={selected.includes(candidate.id)}
                          disabled={Boolean(busy)}
                          onChange={() =>
                            void saveSelection(
                              selected.includes(candidate.id)
                                ? selected.filter((id) => id !== candidate.id)
                                : [...selected, candidate.id],
                            )
                          }
                        />
                        Wybierz do montażu: {candidate.title}
                      </label>
                      {selectionError && (
                        <p className="qc-error-text" role="alert">
                          {selectionError}
                        </p>
                      )}
                    </section>
                  ) : (
                    <section className="qc-empty qc-card">
                      <h3>Nie znaleziono propozycji</h3>
                      <p className="qc-muted">
                        Ten fragment nie jest zapisany w projekcie.
                      </p>
                      <button
                        className="btn"
                        onClick={() => navigate(quickContentHash(project.id))}
                      >
                        Wróć do propozycji
                      </button>
                    </section>
                  )
                ) : (
                  <>
                    {tab === "settings" && (
                      <AnalysisSettings
                        key={project.id}
                        project={project}
                        busy={Boolean(busy) || hasActive}
                        onRun={findMore}
                      />
                    )}
                    {jobs
                      .filter(
                        (job) =>
                          tab === "settings" || !obsoleteJobFailure(job, jobs),
                      )
                      .filter(
                        (job) =>
                          !job.batchId &&
                          (tab === "settings" ||
                            activeJob(job) ||
                            failedJob(job) ||
                            job.status === "blocked"),
                      )
                      .map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          sourceKind={project.sourceKind}
                          busy={Boolean(busy)}
                          onCancel={() => batchAction([job.id], "cancel")}
                          onRetry={() => batchAction([job.id], "retry")}
                        />
                      ))}
                    {tab === "proposals" &&
                      !jobs.length &&
                      !candidates.length && (
                        <section className="qc-card qc-stack">
                          <h3>Projekt jest zapisany</h3>
                          <p className="qc-muted">
                            Uruchom przygotowanie źródła i analizę, aby znaleźć
                            propozycje.
                          </p>
                          <button
                            className="btn primary"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void runAction(
                                "Uruchamianie analizy",
                                async () => {
                                  const result = await qc.process(project.id);
                                  setExtraJobs((ids) => [...ids, result.jobId]);
                                },
                              )
                            }
                          >
                            Przetwarzaj
                          </button>
                        </section>
                      )}
                    {(project.batches ?? [])
                      .filter(
                        (batch) =>
                          tab === "settings" ||
                          jobs.some(
                            (job) =>
                              job.batchId === batch.id &&
                              (activeJob(job) ||
                                (failedJob(job) &&
                                  !obsoleteJobFailure(job, jobs))),
                          ),
                      )
                      .map((batch) => (
                        <BatchCard
                          key={batch.id}
                          batch={batch}
                          candidates={candidates}
                          jobs={
                            tab === "settings"
                              ? jobs
                              : jobs.filter(
                                  (job) => !obsoleteJobFailure(job, jobs),
                                )
                          }
                          busy={Boolean(busy)}
                          onCancel={(ids) => batchAction(ids, "cancel")}
                          onRetry={(ids) => batchAction(ids, "retry")}
                        />
                      ))}
                    {tab === "finished" && (
                      <>
                        <div className="qc-title">
                          <h3>Gotowe filmy</h3>
                          <p className="qc-muted">
                            Obejrzyj rolkę, popraw ją lub pobierz plik.
                            Wcześniejsze wersje są wyraźnie oznaczone.
                          </p>
                        </div>
                        {candidates.some(
                          (item) => availableFilmRender(item)?.filePath,
                        ) ? (
                          <div className="qc-candidate-grid">
                            {candidates
                              .filter(
                                (item) => availableFilmRender(item)?.filePath,
                              )
                              .map((item) => (
                                <FinishedCard
                                  key={item.id}
                                  candidate={item}
                                  onEditor={() => showCandidate(item)}
                                />
                              ))}
                          </div>
                        ) : (
                          <div className="qc-card qc-empty">
                            <h3>Nie ma jeszcze gotowych filmów</h3>
                            <p className="qc-muted">
                              Wybierz propozycje i uruchom montaż. Gotowe filmy
                              pojawią się tutaj.
                            </p>
                            <button
                              className="btn"
                              onClick={() => setTab("proposals")}
                            >
                              Przejdź do propozycji
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {tab === "proposals" && (
                      <>
                        {notice && (
                          <div className="qc-notice">
                            <p role="status">{notice}</p>
                            {newCandidateIds.length > 0 && (
                              <button
                                className="btn"
                                onClick={() => {
                                  const item = candidates.find(
                                    (candidate) =>
                                      candidate.id === newCandidateIds[0],
                                  );
                                  if (item) {
                                    setFilter("all");
                                    showCandidate(item);
                                  }
                                }}
                              >
                                Obejrzyj pierwszą nową propozycję
                              </button>
                            )}
                          </div>
                        )}
                        <div className="qc-results-header">
                          <div>
                            <h3>
                              Znaleziono {candidates.length}{" "}
                              {candidates.length === 1
                                ? "propozycję"
                                : "propozycji"}
                            </h3>
                            <p className="qc-muted">
                              Ocena redakcyjna opisuje wypowiedź; nie przewiduje
                              zasięgu.
                            </p>
                          </div>
                          <label className="qc-field">
                            <span>Sortuj propozycje</span>
                            <select
                              value={order}
                              onChange={(event) =>
                                setOrder(event.target.value as "score" | "time")
                              }
                            >
                              <option value="score">Ocena redakcyjna</option>
                              <option value="time">Czas w źródle</option>
                            </select>
                          </label>
                        </div>
                        <div
                          className="qc-filters"
                          aria-label="Filtr propozycji"
                        >
                          {[
                            { id: "all", label: "Wszystkie" },
                            { id: "attention", label: "Wymagają uwagi" },
                          ].map((item) => (
                            <button
                              className="btn"
                              key={item.id}
                              aria-pressed={filter === item.id}
                              onClick={() => setFilter(item.id)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        {!visible.length && (
                          <section className="qc-card qc-empty">
                            <h3>
                              {candidates.length
                                ? "Brak propozycji w tym widoku"
                                : hasActive
                                  ? "Czekamy na pierwsze propozycje"
                                  : project.status === "no-speech"
                                    ? "Nie wykryto mowy w nagraniu"
                                    : "Brak pełnych fragmentów dla tych ustawień"}
                            </h3>
                            <p className="qc-muted">
                              {candidates.length
                                ? "Zmień filtr. Zaznaczenia pozostały zapisane."
                                : hasActive
                                  ? "Możesz wrócić do projektu później. Postęp zapisuje się na tym komputerze."
                                  : project.status === "no-speech"
                                    ? "Źródło zostało zachowane. Sprawdź, czy nagranie zawiera czytelną wypowiedź."
                                    : "Możesz zmienić wskazówki lub zakres długości w ustawieniach analizy."}
                            </p>
                          </section>
                        )}
                        <div className="qc-candidate-grid">
                          {visible.map((item) => (
                            <CandidateCard
                              key={item.id}
                              projectId={project.id}
                              candidate={item}
                              selected={selected.includes(item.id)}
                              disabled={Boolean(busy)}
                              onSelect={() =>
                                void saveSelection(
                                  selected.includes(item.id)
                                    ? selected.filter((id) => id !== item.id)
                                    : [...selected, item.id],
                                )
                              }
                              onPreview={() => showCandidate(item)}
                              onEditor={() => showCandidate(item)}
                            />
                          ))}
                        </div>
                        {lastRun?.exhausted ? (
                          <p className="qc-notice">
                            Nie znaleziono kolejnych pełnych fragmentów dla tych
                            ustawień. Możesz uruchomić nowy przebieg w
                            ustawieniach analizy.
                          </p>
                        ) : (
                          <div className="qc-actions">
                            <button
                              className="btn"
                              disabled={
                                Boolean(busy) || hasActive || !project.source
                              }
                              onClick={() => findMore()}
                            >
                              Znajdź więcej
                            </button>
                            <p className="qc-muted">
                              Nowe wyniki zachowają obecne propozycje i wybór.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
      {project && !route.candidateId && tab === "proposals" && (
        <footer ref={selectionBar} className="qc-selection-bar">
          <div className="qc-stack">
            <strong>
              Zaznaczono {selected.length}{" "}
              {selected.length === 1 ? "propozycję" : "propozycji"}
              {hiddenSelected
                ? `, w tym ${hiddenSelected} poza tym widokiem`
                : ""}
            </strong>
            {selectionError ? (
              <p className="qc-error-text" role="alert">
                {selectionError}
              </p>
            ) : (
              <p className="qc-muted" role="status">
                {busy === "Zapisywanie wyboru"
                  ? "Zapisywanie wyboru…"
                  : selected.length
                    ? "Wybór zapisany w projekcie"
                    : "Zaznacz propozycje do montażu"}
              </p>
            )}
          </div>
          <div className="qc-actions">
            {selectionError && (
              <>
                <button
                  className="btn"
                  disabled={Boolean(busy)}
                  onClick={() => void saveSelection(selected)}
                >
                  Ponów zapis wyboru
                </button>
                <button
                  className="btn"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setSelection(null);
                    setSelectionError("");
                  }}
                >
                  Odczytaj aktualny wybór
                </button>
              </>
            )}
            <button
              className="btn"
              disabled={Boolean(busy) || !selected.length}
              onClick={() => void saveSelection([])}
            >
              Wyczyść zaznaczenie
            </button>
            <button
              className="btn primary"
              disabled={
                !selected.length ||
                Boolean(busy) ||
                Boolean(selectionError) ||
                selection !== null ||
                hasActive ||
                selected.every((id) =>
                  currentCandidate(
                    candidates.find((item) => item.id === id) ?? {},
                  ),
                )
              }
              onClick={() =>
                void runAction("Uruchamianie montażu", async () => {
                  const ids = [...project.selectedCandidateIds];
                  const signature = `${project.id}:${project.outputResolution ?? 1080}:${ids.slice().sort().join(",")}`;
                  if (montageKey.current?.ids !== signature)
                    montageKey.current = {
                      ids: signature,
                      key: crypto.randomUUID(),
                    };
                  const result = await qc.montage(
                    project.id,
                    ids,
                    project.revision,
                    montageKey.current.key,
                  );
                  setExtraJobs((jobIds) => [...jobIds, ...result.jobIds]);
                  setNotice(
                    `Zlecono montaż ${ids.length} wybranych propozycji. Postęp znajdziesz nad listą.`,
                  );
                })
              }
            >
              {busy === "Uruchamianie montażu"
                ? "Uruchamianie montażu…"
                : `Zmontuj zaznaczone (${selected.length})`}
            </button>
          </div>
        </footer>
      )}
    </main>
  );
}
