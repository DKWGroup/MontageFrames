// Okna: „Nowa rolka” (wrzuć nagranie → operator montuje) i „Ustawienia” (operator AI).
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  api,
  slug,
  upload,
  type Library,
  type OperatorStatus,
  type Settings,
} from "./api";
import { OperatorNote } from "./Inspector";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="btn ghost"
          onClick={onClose}
          aria-label="Zamknij"
        >
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}

function Drop({
  label,
  hint,
  accept,
  multiple,
  files,
  onFiles,
}: {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFiles: (f: File[]) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={`drop${over ? " over" : ""}${files.length ? " filled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
      />
      <strong>
        {files.length ? files.map((f) => f.name).join(", ") : label}
      </strong>
      <span>{hint}</span>
    </label>
  );
}

const NEW = "__nowy";

export function NewReelDialog({
  lib,
  settings,
  onClose,
  onStarted,
}: {
  lib: Library;
  settings: Settings | null;
  onClose: () => void;
  onStarted: (name: string) => void;
}) {
  const [client, setClient] = useState(lib.clients[0]?.id ?? NEW);
  const [clientName, setClientName] = useState("");
  const [main, setMain] = useState<File[]>([]);
  const [broll, setBroll] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [render, setRender] = useState(settings?.renderAfter ?? true);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const taken =
    lib.reels.some((r) => r.name === name) || Boolean(lib.jobs[name]);
  const problem = !main.length
    ? "Dodaj nagranie."
    : client === NEW && !slug(clientName)
      ? "Podaj nazwę nowego klienta."
      : !/^[a-z0-9][a-z0-9-]{0,79}$/.test(name)
        ? "Nazwa rolki: małe litery, cyfry i myślniki."
        : taken
          ? "Rolka o tej nazwie już jest — zmień nazwę."
          : null;

  const submit = async () => {
    setError(null);
    try {
      let id = client;
      if (client === NEW) {
        setProgress("Zakładam klienta…");
        id = (await api.newClient(clientName)).id;
      }
      const { path } = await upload(id, "surowe", main[0], (pct) =>
        setProgress(`Wysyłam nagranie: ${pct}%`),
      );
      for (let i = 0; i < broll.length; i++) {
        setProgress(`Wysyłam przebitki: ${i + 1} z ${broll.length}`);
        await upload(id, "przebitki", broll[i], () => {});
      }
      setProgress("Uruchamiam montaż…");
      await api.start(name, { kind: "montage", input: path, render });
      onStarted(name);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    }
  };

  return (
    <Modal title="Nowa rolka" onClose={onClose}>
      <form
        className="body"
        onSubmit={(e) => {
          e.preventDefault();
          if (!problem && !progress) submit();
        }}
      >
        <label className="field">
          <span>Klient</span>
          <select value={client} onChange={(e) => setClient(e.target.value)}>
            {lib.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value={NEW}>Nowy klient…</option>
          </select>
        </label>
        {client === NEW && (
          <label className="field">
            <span>Nazwa nowego klienta</span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Np. Studio Pilates Kraków"
            />
          </label>
        )}
        <Drop
          label="Upuść nagranie rolki"
          hint="albo kliknij, żeby wybrać plik (MP4 lub MOV, 9:16)"
          accept="video/*"
          files={main}
          onFiles={(f) => {
            setMain(f.slice(0, 1));
            if (f[0] && !name) setName(slug(f[0].name.replace(/\.[^.]+$/, "")));
          }}
        />
        <Drop
          label="Przebitki (opcjonalnie)"
          hint="zdjęcia lub krótkie filmy, które operator może wstawić"
          accept="image/*,video/*"
          multiple
          files={broll}
          onFiles={setBroll}
        />
        <label className="field">
          <span>Nazwa rolki</span>
          <input
            value={name}
            onChange={(e) => setName(slug(e.target.value))}
            placeholder="np. lot-na-cypr"
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={render}
            onChange={(e) => setRender(e.target.checked)}
          />{" "}
          Po montażu od razu wyrenderuj do folderu klienta
        </label>
        {error && <p className="note warn">{error}</p>}
        <footer>
          <span className="note">
            {progress ??
              problem ??
              "Operator zmontuje rolkę według zasad klienta. Postęp zobaczysz w zakładce Operator AI."}
          </span>
          <button
            type="submit"
            className="btn primary"
            disabled={Boolean(problem || progress)}
          >
            Wgraj i zmontuj
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function SettingsDialog({
  settings,
  operator,
  onClose,
  onSaved,
  onRecheck,
}: {
  settings: Settings;
  operator: OperatorStatus | null;
  onClose: () => void;
  onSaved: (s: Settings) => void;
  onRecheck: () => void;
}) {
  const [s, setS] = useState<Settings>({ ...settings, apiKey: "" });
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      // puste pole klucza = zostaw zapisany (serwer dostaje zamaskowaną wartość)
      onSaved(
        await api.saveSettings({ ...s, apiKey: s.apiKey || settings.apiKey }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal title="Ustawienia" onClose={onClose}>
      <form
        className="body"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset className="choices">
          <legend>Operator AI, który montuje rolki</legend>
          <label className="choice">
            <input
              type="radio"
              name="operator"
              checked={s.operator === "claude-account"}
              onChange={() => setS({ ...s, operator: "claude-account" })}
            />
            <span>
              <strong>Claude Code na koncie</strong>
              <small>
                Korzysta z konta zalogowanego w Claude Code na tym komputerze
                (plan Pro lub Max). Do pracy na własnym Macu.
              </small>
            </span>
          </label>
          <label className="choice">
            <input
              type="radio"
              name="operator"
              checked={s.operator === "claude-api-key"}
              onChange={() => setS({ ...s, operator: "claude-api-key" })}
            />
            <span>
              <strong>Claude z kluczem API</strong>
              <small>
                Płatność za zużyte tokeny z konta na console.anthropic.com.
                Wybierz, gdy z panelu korzysta ktoś inny niż właściciel konta.
              </small>
            </span>
          </label>
        </fieldset>
        {s.operator === "claude-api-key" && (
          <label className="field">
            <span>Klucz API</span>
            <input
              type="password"
              name="anthropic-api-key"
              autoComplete="off"
              value={s.apiKey}
              onChange={(e) => setS({ ...s, apiKey: e.target.value })}
              placeholder={
                settings.apiKey
                  ? `Zapisany klucz ${settings.apiKey} — wpisz nowy, żeby zmienić`
                  : "sk-ant-…"
              }
            />
            <small className="note">
              Klucz zostaje w pliku .panel.json na tym komputerze (poza git) i
              nie wraca do przeglądarki.
            </small>
          </label>
        )}
        <label className="field">
          <span>Model</span>
          <select
            value={s.model}
            onChange={(e) =>
              setS({ ...s, model: e.target.value as Settings["model"] })
            }
          >
            <option value="opus">Opus: najstaranniejszy montaż</option>
            <option value="sonnet">Sonnet: szybciej i taniej</option>
            <option value="">Domyślny z Claude Code</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.renderAfter}
            onChange={(e) => setS({ ...s, renderAfter: e.target.checked })}
          />{" "}
          Po montażu od razu renderuj
        </label>
        <OperatorNote
          operator={operator}
          settings={{ ...s, apiKey: s.apiKey || settings.apiKey }}
          onRecheck={onRecheck}
          onSettings={() => {}}
        />
        <p className="note">
          Osoba z kopią tego repo podpina własnego operatora, więc płaci za
          swoje montaże. Instrukcja: PANEL.md.
        </p>
        {error && <p className="note warn">{error}</p>}
        <footer>
          <button type="button" className="btn" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary">
            Zapisz ustawienia
          </button>
        </footer>
      </form>
    </Modal>
  );
}
