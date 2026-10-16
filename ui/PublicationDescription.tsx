import { useEffect, useRef, useState } from "react";
import { api, type PublicationDescriptionData } from "./api";
import "./publication-description.css";

type ViewProps = {
  data: PublicationDescriptionData | null;
  busy: boolean;
  error: string;
  copied: boolean;
  onCopy: () => void;
  onGenerate: () => void;
  onRefresh: () => void;
  canGenerate?: boolean;
  text?: string;
  onTextChange?: (text: string) => void;
  onSaveText?: () => void;
  savingText?: boolean;
  textSaved?: boolean;
};

function descriptionCost(usage: PublicationDescriptionData["usage"]) {
  if (!usage?.length) return "Koszt jeszcze niezmierzony";
  const receipts = new Map<string | number, { costMicroUsd?: number | null }>();
  usage.forEach((receipt, index) => {
    const identity = receipt as typeof receipt & {
      responseId?: string;
      provider?: string;
      at?: string;
    };
    const key = identity.responseId
      ? `response:${identity.responseId}`
      : identity.at
        ? `request:${identity.provider ?? "openai"}:${identity.at}`
        : index;
    if (!receipts.has(key) || receipts.get(key)?.costMicroUsd == null)
      receipts.set(key, receipt);
  });
  let cost = 0;
  let missing = false;
  for (const receipt of receipts.values()) {
    if (
      typeof receipt.costMicroUsd === "number" &&
      Number.isFinite(receipt.costMicroUsd) &&
      receipt.costMicroUsd >= 0
    )
      cost += receipt.costMicroUsd;
    else missing = true;
  }
  const amount = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(cost / 1_000_000);
  return missing
    ? cost > 0
      ? `Zapisano ${amount} · brak pełnego pomiaru`
      : "Brak pełnego pomiaru"
    : amount;
}

export function PublicationDescriptionView(p: ViewProps) {
  const ready =
    p.data?.status === "ready" &&
    p.data.isCurrent !== false &&
    Boolean(p.data.text);
  const failed = p.data?.status === "failed";
  return (
    <section
      className="publication-description"
      aria-label="Opis do publikacji"
      aria-busy={p.busy}
    >
      <h3>Opis do publikacji</h3>
      <p className="publication-description-meta">
        {p.data?.provider === "codex" || p.data?.provider === "claude"
          ? `${p.data.provider === "codex" ? "Codex" : "Claude Code"} · opis w ramach własnego konta`
          : "GPT-6 Luna API · osobny, płatny opis"}
      </p>
      <p className="publication-description-meta">
        Koszt opisu API (łącznie z ponowieniami):{" "}
        {descriptionCost(p.data?.usage)}
      </p>
      {p.busy && (
        <p role="status">
          {p.data
            ? "Przygotowuję opis… Film możesz już pobrać."
            : "Sprawdzam opis…"}
        </p>
      )}
      {ready && (
        <label className="publication-description-field">
          Treść opisu do publikacji
          <textarea
            rows={7}
            maxLength={5000}
            value={p.text ?? p.data?.text ?? ""}
            onChange={(event) => p.onTextChange?.(event.target.value)}
          />
          {p.onSaveText && (
            <button
              type="button"
              className="btn"
              disabled={
                p.busy ||
                p.savingText ||
                !(p.text ?? "").trim() ||
                p.text === p.data?.text
              }
              onClick={p.onSaveText}
            >
              {p.savingText ? "Zapisuję…" : "Zapisz opis bez AI"}
            </button>
          )}
          <span className="publication-description-meta" role="status">
            {p.textSaved
              ? "Zapisano opis."
              : "Ręczna edycja jest bezpłatna i nie uruchamia renderu ani AI."}
          </span>
        </label>
      )}
      {failed && (
        <p role="alert">
          Nie udało się przygotować opisu. Gotowy MP4 pozostaje dostępny.{" "}
          {p.data?.error}
        </p>
      )}
      {p.data?.status === "stale" && (
        <p>Treść lub wskazówki się zmieniły. Przygotuj aktualny opis.</p>
      )}
      {p.error && <p role="alert">{p.error}</p>}
      {p.canGenerate === false && (
        <p className="publication-description-meta">
          Wskazówki możesz zapisać teraz. Opis AI będzie dostępny po ukończeniu
          filmu.
        </p>
      )}
      <div className="publication-description-actions">
        {ready ? (
          <button type="button" className="btn" onClick={p.onCopy}>
            {p.copied ? "Skopiowano opis" : "Kopiuj opis"}
          </button>
        ) : p.data?.status === "generating" ? (
          <button
            type="button"
            className="btn"
            disabled={p.busy}
            onClick={p.onRefresh}
          >
            Sprawdź ponownie
          </button>
        ) : p.data ? (
          <button
            type="button"
            className="btn"
            disabled={p.busy || p.canGenerate === false}
            onClick={p.onGenerate}
          >
            {failed ? "Ponów tylko opis" : "Przygotuj opis"}
          </button>
        ) : (
          !p.busy && (
            <button type="button" className="btn" onClick={p.onRefresh}>
              Sprawdź ponownie
            </button>
          )
        )}
      </div>
      <span className="publication-description-meta" role="status">
        {p.copied
          ? "Opis jest w schowku."
          : "Hook, krótka puenta i 5 hashtagów. Koszt API jest niezależny od montażu."}
      </span>
    </section>
  );
}

export function DescriptionInstructions({
  value,
  disabled = false,
  onSave,
  onDraftChange,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => Promise<unknown>;
  onDraftChange?: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);
  return (
    <div className="publication-description-field">
      <label>
        Wskazówki do opisu (opcjonalnie)
        <textarea
          rows={3}
          maxLength={4000}
          value={draft}
          disabled={disabled || saving}
          onChange={(event) => {
            dirty.current = true;
            onDraftChange?.(event.target.value);
            setDraft(event.target.value);
            setMessage("");
          }}
          placeholder="Np. krótko, w moim imieniu, zakończ pytaniem…"
        />
      </label>
      <span className="publication-description-meta">
        Opis w pierwszej osobie. Zapis wskazówek jest bezpłatny i nie uruchamia
        AI.
      </span>
      <button
        type="button"
        className="btn"
        disabled={disabled || saving || draft === value}
        onClick={async () => {
          setSaving(true);
          setMessage("");
          try {
            await onSave(draft);
            setMessage("Zapisano wskazówki.");
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Nie udało się zapisać wskazówek.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Zapisuję…" : "Zapisz wskazówki"}
      </button>
      <span role="status" className="publication-description-meta">
        {message}
      </span>
    </div>
  );
}

export function PublicationDescription({
  reelName,
  refreshKey = "",
  canGenerate = true,
  compact = false,
}: {
  reelName: string;
  refreshKey?: string;
  canGenerate?: boolean;
  compact?: boolean;
}) {
  const [data, setData] = useState<PublicationDescriptionData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reload, setReload] = useState(0);
  const [text, setText] = useState("");
  const [savingText, setSavingText] = useState(false);
  const [textSaved, setTextSaved] = useState(false);
  const textDirty = useRef(false);
  const instructionsDraft = useRef<string | null>(null);
  useEffect(() => {
    textDirty.current = false;
    instructionsDraft.current = null;
    setText("");
    setTextSaved(false);
    setCopied(false);
  }, [reelName]);
  useEffect(() => {
    if (data?.text !== undefined && !textDirty.current) setText(data.text);
  }, [data?.text]);
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    setData(null);
    setCopied(false);
    setError("");
    setBusy(true);
    async function read() {
      try {
        const next = await api.description(reelName);
        if (!active || generation.current !== request) return;
        setData(next);
        setBusy(next.status === "generating");
        // Background completion may follow the MP4; old library reads never start paid work.
        if (
          (next.status === "missing" || next.status === "generating") &&
          ++polls < 20
        )
          timer = setTimeout(read, 3000);
        else if (next.status === "generating") {
          setBusy(false);
          setError("Opis nadal się przygotowuje. Sprawdź ponownie za chwilę.");
        }
      } catch (e) {
        if (!active || generation.current !== request) return;
        setBusy(false);
        setError(
          e instanceof Error ? e.message : "Nie udało się odczytać opisu.",
        );
      }
    }
    void read();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reelName, refreshKey, reload]);

  async function generate() {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    try {
      if (instructionsDraft.current !== null) {
        await api.saveDescription(reelName, {
          instructions: instructionsDraft.current,
        });
        instructionsDraft.current = null;
      }
      const next = await api.generateDescription(reelName);
      if (generation.current !== request) return;
      if (next.status === "ready" || next.status === "generating") {
        textDirty.current = false;
        setText(next.text ?? "");
        setTextSaved(false);
        setCopied(false);
      }
      setData(next);
      if (next.status === "generating") setReload((value) => value + 1);
    } catch (e) {
      if (generation.current === request)
        setError(
          e instanceof Error
            ? e.message
            : "Nie udało się przygotować opisu. Film pozostaje dostępny.",
        );
    } finally {
      if (generation.current === request) setBusy(false);
    }
  }
  async function saveText() {
    setSavingText(true);
    setError("");
    try {
      const next = await api.saveDescription(reelName, { text });
      textDirty.current = false;
      setData(next);
      setText(next.text ?? text);
      setTextSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać opisu.");
    } finally {
      setSavingText(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        textDirty.current ? text : (data?.text ?? ""),
      );
      setCopied(true);
      setError("");
    } catch {
      setError(
        "Nie udało się skopiować. Zaznacz i skopiuj tekst opisu ręcznie.",
      );
    }
  }
  const content = (
    <>
      <details className="panel-details">
        <summary>Więcej ustawień opisu</summary>
        <DescriptionInstructions
          key={reelName}
          value={data?.instructions ?? ""}
          disabled={busy || data === null}
          onDraftChange={(value) => {
            instructionsDraft.current = value;
          }}
          onSave={async (instructions) => {
            const next = await api.saveDescription(reelName, { instructions });
            instructionsDraft.current = null;
            setData(next);
          }}
        />
      </details>
      <PublicationDescriptionView
        data={data}
        busy={busy}
        error={error}
        copied={copied}
        canGenerate={canGenerate && data?.canGenerate !== false}
        text={text}
        onTextChange={(value) => {
          setText(value);
          textDirty.current = true;
          setTextSaved(false);
          setCopied(false);
        }}
        onSaveText={saveText}
        savingText={savingText}
        textSaved={textSaved}
        onCopy={copy}
        onGenerate={generate}
        onRefresh={() => setReload((value) => value + 1)}
      />
    </>
  );
  return compact ? (
    <details
      className="panel-details"
      open={Boolean(error) || data?.status === "failed"}
    >
      <summary>Opis do publikacji</summary>
      {content}
    </details>
  ) : (
    content
  );
}
