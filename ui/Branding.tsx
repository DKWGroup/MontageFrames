import { useEffect, useRef, useState } from "react";
import type { BrandingProfile, AssetRef, FontRef } from "../src/branding/types";
import { BrandPreview } from "../src/branding/BrandPreview";
import { api } from "./api";
import { brandingProfileSchema } from "../src/branding/schema.mjs";
import {
  brandingApi,
  BrandingError,
  uploadBrandFile,
  type FontChoice,
  type ScanJob,
} from "./branding-api";
import {
  applyBrandSuggestions,
  brandingSaveFailure,
  brandingHash,
  parseBrandingHash,
} from "./branding-view.mjs";
import "./branding.css";

type Section = "Marka" | "Materiały" | "Kolory" | "Fonty" | "Napisy";
const SECTIONS: Section[] = ["Marka", "Materiały", "Kolory", "Fonty", "Napisy"];
const fieldNames: Record<string, string> = {
  name: "Nazwa marki",
  websiteUrl: "Strona WWW",
  businessDescription: "O marce",
  audience: "Odbiorcy",
  tone: "Ton komunikacji",
  notes: "Dodatkowe informacje",
  palette: "Paleta kolorów",
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Nie udało się wykonać operacji.";
const activeScan = (job: ScanJob | null) =>
  !!job &&
  ![
    "completed",
    "done",
    "failed",
    "cancelled",
    "error",
    "interrupted",
  ].includes(job.status);
function safeLink(url: string) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function Branding({
  clients,
  onClientsChanged,
}: {
  clients: { id: string; label: string }[];
  onClientsChanged: () => void;
}) {
  const [clientId, setClientId] = useState(
    () => parseBrandingHash(location.hash)?.clientId || null,
  );
  const [profile, setProfile] = useState<BrandingProfile | null>(null);
  const [baseline, setBaseline] = useState("");
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState<unknown[]>([]);
  const [section, setSection] = useState<Section>("Marka");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [conflict, setConflict] = useState(false);
  const [clientName, setClientName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fontSource, setFontSource] = useState("local");
  const [fontQuery, setFontQuery] = useState("");
  const [fontChoices, setFontChoices] = useState<FontChoice[]>([]);
  const [fontLoading, setFontLoading] = useState(false);
  const [fontNotice, setFontNotice] = useState("");
  const [fontTarget, setFontTarget] = useState<"primary" | "emphasis">(
    "primary",
  );
  const [importingFont, setImportingFont] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanJob | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanFields, setScanFields] = useState<string[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewSource, setPreviewSource] = useState("");
  const dirty = !!profile && JSON.stringify(profile) !== baseline;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  const previousHash = useRef(location.hash);
  const loadGeneration = useRef(0);
  const editorClient = useRef(clientId);
  editorClient.current = clientId;
  const busy = loading || saving || !!uploading || !!importingFont;

  useEffect(() => {
    const discard = () => {
      dirtyRef.current = false;
      if (baselineRef.current) setProfile(JSON.parse(baselineRef.current));
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const clicked = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (!link || !dirtyRef.current) return;
      const href = (link as HTMLAnchorElement).href;
      const next = new URL(href, location.href);
      if (next.hash !== location.hash) {
        if (
          !window.confirm(
            "Masz niezapisane zmiany brandingu. Odrzucić je i przejść dalej?",
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
        } else discard();
      }
    };
    const navigate = () => {
      const next = location.hash;
      if (next === previousHash.current) return;
      if (
        dirtyRef.current &&
        !window.confirm(
          "Masz niezapisane zmiany brandingu. Odrzucić je i przejść dalej?",
        )
      ) {
        history.replaceState(null, "", previousHash.current);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        return;
      }
      if (dirtyRef.current) discard();
      previousHash.current = next;
      const parsed = parseBrandingHash(next);
      if (parsed) setClientId(parsed.clientId);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", clicked, true);
    window.addEventListener("hashchange", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", clicked, true);
      window.removeEventListener("hashchange", navigate, true);
    };
  }, []);
  useEffect(() => {
    const generation = ++loadGeneration.current;
    setProfile(null);
    setBaseline("");
    setError("");
    setStatus("");
    setScan(null);
    setConflict(false);
    setPreviewSource("");
    if (!clientId) return;
    try {
      const lastScan = sessionStorage.getItem(`branding-scan-${clientId}`);
      if (lastScan)
        brandingApi
          .scanStatus(clientId, lastScan)
          .then((job) => {
            if (generation === loadGeneration.current) setScan(job);
          })
          .catch(() => {});
    } catch {
      /* Storage may be disabled. */
    }
    setLoading(true);
    brandingApi
      .get(clientId)
      .then((result) => {
        if (generation !== loadGeneration.current) return;
        setProfile(result.profile);
        setBaseline(JSON.stringify(result.profile));
        setRevision(result.revision);
        setReady(result.ready);
        setIssues(result.issues || []);
      })
      .catch((e) => {
        if (generation === loadGeneration.current) setError(message(e));
      })
      .finally(() => {
        if (generation === loadGeneration.current) setLoading(false);
      });
  }, [clientId]);
  useEffect(() => {
    if (section !== "Fonty") return;
    let cancelled = false;
    setFontLoading(true);
    const timer = setTimeout(() => {
      brandingApi
        .fonts(fontSource, fontQuery)
        .then((result) => {
          if (cancelled) return;
          setFontChoices(result.fonts);
          setFontNotice(result.warning || result.message || "");
        })
        .catch((e) => {
          if (!cancelled) {
            setFontChoices([]);
            setFontNotice(message(e));
          }
        })
        .finally(() => {
          if (!cancelled) setFontLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [section, fontSource, fontQuery]);
  useEffect(() => {
    const scanId = scan?.scanId || scan?.id;
    if (!clientId || !scanId || !activeScan(scan)) return;
    let stopped = false;
    const timer = setTimeout(() => {
      brandingApi
        .scanStatus(clientId, scanId)
        .then((job) => {
          if (!stopped) setScan(job);
        })
        .catch((e) => {
          if (!stopped) {
            setError(message(e));
            setScan((current) =>
              current ? { ...current, status: "error" } : null,
            );
          }
        });
    }, 1800);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [clientId, scan]);
  function edit(update: (draft: BrandingProfile) => BrandingProfile) {
    setProfile((current) => (current ? update(current) : current));
    setStatus("");
  }
  function navigateClient(id: string | null) {
    if (dirty && !window.confirm("Odrzucić niezapisane zmiany brandingu?"))
      return;
    dirtyRef.current = false;
    previousHash.current = brandingHash(id);
    setClientId(id);
    location.hash = previousHash.current;
  }
  async function createClient(event: React.FormEvent) {
    event.preventDefault();
    if (!clientName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const result = await api.newClient(clientName.trim());
      onClientsChanged();
      setClientName("");
      navigateClient(result.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setCreating(false);
    }
  }
  async function save() {
    if (!profile || !clientId) return;
    const validation = brandingProfileSchema.safeParse(profile);
    if (!validation.success) {
      setError(
        validation.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(" · "),
      );
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    const submitted = profile;
    try {
      const result = await brandingApi.save(clientId, submitted, revision);
      if (editorClient.current !== clientId) return;
      setRevision(result.revision);
      setBaseline(JSON.stringify(result.profile));
      setProfile((current) =>
        current === submitted
          ? result.profile
          : current
            ? {
                ...current,
                revision: result.revision,
                updatedAt: result.profile.updatedAt,
              }
            : current,
      );
      setReady(result.ready);
      setIssues(result.issues || []);
      setConflict(false);
      setStatus(
        `Zapisano wersję ${result.revision}. ${result.ready ? "Branding jest gotowy do nowych montaży." : "Uzupełnij brakujące elementy przed montażem."}`,
      );
      onClientsChanged();
    } catch (e) {
      if (editorClient.current !== clientId) return;
      setError(message(e));
      const failure = brandingSaveFailure(
        profile,
        revision,
        e instanceof BrandingError ? e.status : 0,
      );
      setConflict(failure.conflict);
      setProfile((current) => (current === profile ? failure.draft : current));
    } finally {
      setSaving(false);
    }
  }
  async function reload() {
    if (
      dirty &&
      !window.confirm("Pobrać wersję serwera i odrzucić swój draft?")
    )
      return;
    if (!clientId) return;
    setLoading(true);
    try {
      const result = await brandingApi.get(clientId);
      setProfile(result.profile);
      setBaseline(JSON.stringify(result.profile));
      setRevision(result.revision);
      setReady(result.ready);
      setIssues(result.issues || []);
      setConflict(false);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  async function upload(
    file: File | undefined,
    kind: "logo" | "image" | "video" | "font",
  ) {
    if (!file || !clientId) return;
    setUploading(file.name);
    setUploadProgress(0);
    setError("");
    const targetClient = clientId;
    try {
      const result = await uploadBrandFile<AssetRef | FontRef>(
        clientId,
        file,
        kind,
        setUploadProgress,
      );
      if (editorClient.current !== targetClient) return;
      if (kind === "font") {
        edit((draft) => ({
          ...draft,
          fonts: { ...draft.fonts, [fontTarget]: result as FontRef },
        }));
      } else {
        const asset = result as AssetRef;
        edit((draft) => ({
          ...draft,
          assets: [...draft.assets, asset],
          ...(kind === "logo"
            ? { logo: { ...draft.logo, enabled: true, assetId: asset.id } }
            : {}),
        }));
      }
      setStatus("Plik dodany do draftu. Zapisz branding, aby utrwalić wersję.");
    } catch (e) {
      setError(message(e));
    } finally {
      setUploading(null);
    }
  }
  async function importFont(font: FontChoice, variant?: string) {
    if (!clientId) return;
    setImportingFont(font.id);
    setError("");
    const targetClient = clientId;
    try {
      const result = await brandingApi.importFont(
        clientId,
        fontSource,
        font.id,
        variant,
      );
      if (editorClient.current === targetClient)
        edit((draft) => ({
          ...draft,
          fonts: { ...draft.fonts, [fontTarget]: result },
        }));
    } catch (e) {
      setError(message(e));
    } finally {
      setImportingFont(null);
    }
  }
  async function startScan() {
    if (!clientId || !profile?.websiteUrl) return;
    setScanBusy(true);
    setError("");
    setScanFields([]);
    try {
      const job = await brandingApi.scan(clientId, profile.websiteUrl);
      if (editorClient.current !== clientId) return;
      setScan(job);
      const scanId = job.scanId || job.id;
      if (scanId)
        try {
          sessionStorage.setItem(`branding-scan-${clientId}`, scanId);
        } catch {
          /* Storage may be disabled. */
        }
    } catch (e) {
      setError(message(e));
    } finally {
      setScanBusy(false);
    }
  }
  async function cancelScan() {
    const id = scan?.scanId || scan?.id;
    if (!clientId || !id) return;
    try {
      setScan(await brandingApi.cancelScan(clientId, id));
    } catch (e) {
      setError(message(e));
    }
  }
  const knownClient = clients.find((c) => c.id === clientId);
  return (
    <main className="branding-page" aria-label="Branding klientów">
      <header className="branding-header">
        <div>
          <h1>Branding klientów</h1>
          <p>Wygląd i materiały marki, wspólne dla rolek i QuickContent.</p>
        </div>
        {profile && (
          <button
            className="btn primary"
            disabled={busy || !dirty || conflict}
            onClick={save}
          >
            {saving ? "Zapisywanie…" : "Zapisz branding"}
          </button>
        )}
      </header>
      <div className="branding-clientbar">
        <label>
          Klient
          <select
            value={clientId || ""}
            onChange={(e) => navigateClient(e.target.value || null)}
          >
            <option value="">Wybierz klienta</option>
            {!knownClient && clientId && (
              <option value={clientId}>{clientId}</option>
            )}
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={createClient}>
          <label>
            Nowy klient
            <input
              maxLength={120}
              placeholder="Nazwa klienta"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
          <button
            className="btn"
            disabled={creating || !clientName.trim() || busy}
          >
            {creating ? "Dodawanie…" : "Dodaj klienta"}
          </button>
        </form>
      </div>
      {error && (
        <div className="branding-alert" role="alert">
          <p>{error}</p>
          {conflict && (
            <>
              <p>
                Twój draft został zachowany. Wersja serwera zmieniła się w innym
                oknie. Skopiuj własne poprawki przed pobraniem aktualnej wersji.
              </p>
              <button className="btn" onClick={reload}>
                Pobierz wersję serwera
              </button>
              <button
                className="btn"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(profile, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `branding-${clientId}-draft.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Pobierz swój draft JSON
              </button>
            </>
          )}
        </div>
      )}
      {status && (
        <p className="branding-status" role="status">
          {status}
        </p>
      )}
      {loading && <p role="status">Wczytywanie profilu…</p>}
      {!clientId && !loading && (
        <div className="branding-empty">
          <h2>Każda marka ma swój kadr.</h2>
          <p>
            Wybierz klienta albo dodaj nowego. Zapiszesz tutaj materiały, fonty
            i własny styl napisów. Poprzednie montaże zachowają swój wygląd.
          </p>
        </div>
      )}
      {profile && !loading && (
        <>
          <div className="branding-version">
            <span>
              {dirty
                ? "Niezapisane zmiany"
                : revision
                  ? `Zapisana wersja ${revision}`
                  : "Nowy profil"}
            </span>
            <span>
              {ready && !dirty ? "Gotowy do montażu" : "Podgląd draftu"}
            </span>
          </div>
          {issues.length > 0 && (
            <details className="branding-readiness">
              <summary>Do sprawdzenia przed montażem ({issues.length})</summary>
              <ul>
                {issues.map((issue, index) => (
                  <li key={index}>
                    {typeof issue === "string"
                      ? issue
                      : typeof issue === "object" && issue && "message" in issue
                        ? String(issue.message)
                        : "Sprawdź kompletność profilu i dostępność materiałów."}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div
            className="branding-mobile-toggle"
            role="group"
            aria-label="Widok brandingu"
          >
            <button
              className="btn"
              aria-pressed={!mobilePreview}
              onClick={() => setMobilePreview(false)}
            >
              Ustawienia
            </button>
            <button
              className="btn"
              aria-pressed={mobilePreview}
              onClick={() => setMobilePreview(true)}
            >
              Podgląd rolki
            </button>
          </div>
          <div
            className={`branding-workspace ${mobilePreview ? "show-preview" : ""}`}
          >
            <div className="branding-editor">
              <nav className="branding-sections" aria-label="Sekcje brandingu">
                {SECTIONS.map((item) => (
                  <button
                    key={item}
                    aria-current={section === item ? "page" : undefined}
                    onClick={() => setSection(item)}
                  >
                    {item}
                  </button>
                ))}
              </nav>
              <div className="branding-fields" key={section}>
                {section === "Marka" && (
                  <>
                    <h2>Marka i wiedza</h2>
                    <p>
                      Te informacje pomagają agentowi zrozumieć klienta. Nie są
                      częścią publicznych materiałów renderu.
                    </p>
                    <label>
                      Nazwa marki
                      <input
                        value={profile.name}
                        aria-invalid={!profile.name.trim()}
                        aria-describedby={
                          !profile.name.trim()
                            ? "branding-name-error"
                            : undefined
                        }
                        maxLength={120}
                        onChange={(e) =>
                          edit((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                    </label>
                    {!profile.name.trim() && (
                      <p
                        id="branding-name-error"
                        className="branding-field-error"
                      >
                        Wpisz nazwę marki.
                      </p>
                    )}
                    <div className="branding-web">
                      <label>
                        Strona WWW
                        <input
                          type="url"
                          placeholder="https://twojamarka.pl"
                          value={profile.websiteUrl}
                          onChange={(e) =>
                            edit((d) => ({ ...d, websiteUrl: e.target.value }))
                          }
                        />
                      </label>
                      <button
                        className="btn"
                        disabled={
                          !safeLink(profile.websiteUrl) ||
                          scanBusy ||
                          activeScan(scan)
                        }
                        onClick={startScan}
                      >
                        {scanBusy ? "Uruchamianie…" : "Analizuj stronę"}
                      </button>
                    </div>
                    <p className="branding-hint">
                      Analiza proponuje wiedzę i wygląd. Samodzielnie wybierasz
                      dane do zastosowania.
                    </p>
                    {scan && (
                      <div className="branding-scan" aria-live="polite">
                        <strong>{scan.stage || scan.status}</strong>
                        {activeScan(scan) && (
                          <button className="btn" onClick={cancelScan}>
                            Anuluj analizę
                          </button>
                        )}
                        {scan.error && <p role="alert">{scan.error}</p>}
                        {!!scan.warnings?.length && (
                          <details>
                            <summary>
                              Ograniczenia analizy ({scan.warnings.length})
                            </summary>
                            <ul>
                              {scan.warnings.map((warning, i) => (
                                <li key={i}>
                                  {warning.startsWith("AI:")
                                    ? "Nie udało się uporządkować wiedzy przez konto AI. Odczytane treści i style zachowano; możesz je przejrzeć albo ponowić analizę."
                                    : warning}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {scan.suggestions && (
                          <>
                            <h3>Propozycje ze strony</h3>
                            {Object.entries(scan.suggestions)
                              .filter(([field]) => field in fieldNames)
                              .map(([field, suggestion]) => (
                                <label
                                  className="branding-suggestion"
                                  key={field}
                                >
                                  <input
                                    type="checkbox"
                                    checked={scanFields.includes(field)}
                                    onChange={(e) =>
                                      setScanFields((current) =>
                                        e.target.checked
                                          ? [...current, field]
                                          : current.filter(
                                              (item) => item !== field,
                                            ),
                                      )
                                    }
                                  />
                                  <span>
                                    <strong>{fieldNames[field]}</strong>
                                    <span>
                                      {typeof suggestion.value === "string"
                                        ? suggestion.value
                                        : JSON.stringify(suggestion.value)}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            <button
                              className="btn"
                              disabled={!scanFields.length}
                              onClick={() => {
                                edit((d) =>
                                  applyBrandSuggestions(
                                    d,
                                    scan.suggestions!,
                                    scanFields,
                                  ),
                                );
                                setScanFields([]);
                                setStatus(
                                  "Wybrane propozycje dodano do draftu. Zapisz branding, aby je zatwierdzić.",
                                );
                              }}
                            >
                              Zastosuj wybrane dane
                            </button>
                          </>
                        )}
                        {!!scan.sources?.length && (
                          <details>
                            <summary>Źródła analizy</summary>
                            <ul>
                              {scan.sources.map((source, index) => {
                                const href = safeLink(source.url);
                                return (
                                  <li key={index}>
                                    {href ? (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {source.title || source.url}
                                      </a>
                                    ) : (
                                      source.title ||
                                      "Nieprawidłowy adres źródła"
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                    {(
                      [
                        "businessDescription",
                        "audience",
                        "tone",
                        "notes",
                      ] as const
                    ).map((field) => (
                      <label key={field}>
                        {fieldNames[field]}
                        <textarea
                          rows={field === "notes" ? 5 : 3}
                          maxLength={
                            field === "notes" || field === "businessDescription"
                              ? 12000
                              : field === "tone"
                                ? 2000
                                : 4000
                          }
                          value={profile[field]}
                          onChange={(e) =>
                            edit((d) => ({ ...d, [field]: e.target.value }))
                          }
                        />
                      </label>
                    ))}
                  </>
                )}
                {section === "Materiały" && (
                  <>
                    <h2>Materiały klienta</h2>
                    <p>
                      Dodaj logo, zdjęcia i przebitki. Opis pomaga agentowi
                      dobrać materiał do treści.
                    </p>
                    <div className="branding-uploads">
                      {(["logo", "image", "video"] as const).map((kind) => (
                        <label className="btn" key={kind}>
                          {kind === "logo"
                            ? "Dodaj logo"
                            : kind === "image"
                              ? "Dodaj zdjęcie"
                              : "Dodaj przebitkę"}
                          <input
                            type="file"
                            disabled={busy}
                            accept={
                              kind === "video"
                                ? ".mp4,.mov,.webm"
                                : ".png,.jpg,.jpeg,.webp"
                            }
                            onChange={(e) => {
                              void upload(e.target.files?.[0], kind);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="branding-hint">
                      PNG, JPEG, WebP do 20 MB. Wideo MP4, MOV, WebM do 2 GB.
                      SVG wymaga wcześniejszego eksportu do PNG.
                    </p>
                    {uploading && (
                      <div role="status">
                        <p>
                          {uploading}: {uploadProgress}%
                        </p>
                        <progress max={100} value={uploadProgress} />
                      </div>
                    )}
                    {profile.assets.length === 0 && (
                      <p className="branding-empty-inline">
                        Nie dodano jeszcze materiałów. Logo i zdjęcia są
                        opcjonalne.
                      </p>
                    )}
                    {profile.assets.map((asset) => (
                      <article className="branding-asset" key={asset.id}>
                        {asset.kind === "video" ? (
                          <video
                            src={`/${asset.file}`}
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={`/${asset.file}`}
                            alt={asset.originalName}
                          />
                        )}
                        <div>
                          <strong>{asset.originalName}</strong>
                          <label>
                            Opis materiału
                            <textarea
                              rows={2}
                              maxLength={2000}
                              value={asset.description}
                              onChange={(e) =>
                                edit((d) => ({
                                  ...d,
                                  assets: d.assets.map((a) =>
                                    a.id === asset.id
                                      ? { ...a, description: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                            />
                          </label>
                          {asset.kind === "logo" && (
                            <label className="branding-check">
                              <input
                                type="radio"
                                name="brand-logo"
                                checked={profile.logo.assetId === asset.id}
                                onChange={() =>
                                  edit((d) => ({
                                    ...d,
                                    logo: {
                                      ...d.logo,
                                      assetId: asset.id,
                                      enabled: true,
                                    },
                                  }))
                                }
                              />
                              Używaj tego logo
                            </label>
                          )}
                          <button
                            className="btn"
                            onClick={() =>
                              edit((d) => ({
                                ...d,
                                assets: d.assets.filter(
                                  (a) => a.id !== asset.id,
                                ),
                                ...(d.logo.assetId === asset.id
                                  ? {
                                      logo: {
                                        ...d.logo,
                                        assetId: undefined,
                                        enabled: false,
                                      },
                                    }
                                  : {}),
                              }))
                            }
                          >
                            Usuń z draftu
                          </button>
                        </div>
                      </article>
                    ))}
                    <h3>Logo w rolce</h3>
                    <label className="branding-check">
                      <input
                        type="checkbox"
                        disabled={!profile.logo.assetId}
                        checked={profile.logo.enabled}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            logo: { ...d.logo, enabled: e.target.checked },
                          }))
                        }
                      />
                      Pokazuj logo
                    </label>
                    <label>
                      Pozycja logo
                      <select
                        value={profile.logo.position}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            logo: {
                              ...d.logo,
                              position: e.target.value as
                                | "top-left"
                                | "top-right",
                            },
                          }))
                        }
                      >
                        <option value="top-left">Lewy górny róg</option>
                        <option value="top-right">Prawy górny róg</option>
                      </select>
                    </label>
                    <label>
                      Wielkość logo: {Math.round(profile.logo.size * 100)}%
                      szerokości
                      <input
                        type="range"
                        min={0.05}
                        max={0.3}
                        step={0.01}
                        value={profile.logo.size}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            logo: { ...d.logo, size: Number(e.target.value) },
                          }))
                        }
                      />
                    </label>
                  </>
                )}
                {section === "Kolory" && (
                  <>
                    <h2>Paleta marki</h2>
                    <p>
                      Przypisz kolorom role w napisach. Możesz zapisać mniej
                      kolorów niż wybrany limit.
                    </p>
                    <label>
                      Maksymalna liczba kolorów
                      <select
                        value={profile.palette.maxColors}
                        onChange={(e) => {
                          const limit = Number(e.target.value) as 4 | 5 | 6;
                          if (
                            profile.palette.colors.length > limit &&
                            !window.confirm(
                              "Zmniejszenie limitu usunie ostatnie kolory z draftu. Kontynuować?",
                            )
                          )
                            return;
                          edit((d) => ({
                            ...d,
                            palette: {
                              maxColors: limit,
                              colors: d.palette.colors.slice(0, limit),
                            },
                          }));
                        }}
                      >
                        {[4, 5, 6].map((limit) => (
                          <option key={limit}>{limit}</option>
                        ))}
                      </select>
                    </label>
                    {profile.palette.colors.map((color, index) => (
                      <div className="branding-color" key={color.id}>
                        <label>
                          Kolor {index + 1}
                          <input
                            type="color"
                            value={color.hex}
                            onChange={(e) =>
                              edit((d) => ({
                                ...d,
                                palette: {
                                  ...d.palette,
                                  colors: d.palette.colors.map((c) =>
                                    c.id === color.id
                                      ? { ...c, hex: e.target.value }
                                      : c,
                                  ),
                                },
                              }))
                            }
                          />
                        </label>
                        <label>
                          HEX
                          <input
                            value={color.hex}
                            aria-invalid={!/^#[a-f0-9]{6}$/i.test(color.hex)}
                            aria-describedby={
                              !/^#[a-f0-9]{6}$/i.test(color.hex)
                                ? `color-error-${index}`
                                : undefined
                            }
                            pattern="#[0-9a-fA-F]{6}"
                            maxLength={7}
                            onChange={(e) =>
                              edit((d) => ({
                                ...d,
                                palette: {
                                  ...d.palette,
                                  colors: d.palette.colors.map((c) =>
                                    c.id === color.id
                                      ? { ...c, hex: e.target.value }
                                      : c,
                                  ),
                                },
                              }))
                            }
                          />
                        </label>
                        {!/^#[a-f0-9]{6}$/i.test(color.hex) && (
                          <p
                            id={`color-error-${index}`}
                            className="branding-field-error"
                          >
                            Wpisz sześć cyfr HEX, np. #1D4ED8.
                          </p>
                        )}
                        <label>
                          Rola
                          <select
                            value={color.role}
                            onChange={(e) =>
                              edit((d) => ({
                                ...d,
                                palette: {
                                  ...d.palette,
                                  colors: d.palette.colors.map((c) =>
                                    c.id === color.id
                                      ? {
                                          ...c,
                                          role: e.target.value as typeof c.role,
                                        }
                                      : c,
                                  ),
                                },
                              }))
                            }
                          >
                            <option value="text">Tekst</option>
                            <option value="accent">Akcent</option>
                            <option value="background">Tło</option>
                            <option value="secondary">Dodatkowy</option>
                            <option value="highlight">Podświetlenie</option>
                            <option value="muted">Przygaszony</option>
                          </select>
                        </label>
                        <button
                          className="btn"
                          aria-label={`Usuń kolor ${index + 1}`}
                          onClick={() =>
                            edit((d) => ({
                              ...d,
                              palette: {
                                ...d.palette,
                                colors: d.palette.colors.filter(
                                  (c) => c.id !== color.id,
                                ),
                              },
                            }))
                          }
                        >
                          Usuń
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn"
                      disabled={
                        profile.palette.colors.length >=
                        profile.palette.maxColors
                      }
                      onClick={() =>
                        edit((d) => ({
                          ...d,
                          palette: {
                            ...d.palette,
                            colors: [
                              ...d.palette.colors,
                              {
                                id: `color-${Date.now()}`,
                                hex: "#1D4ED8",
                                role: "secondary",
                              },
                            ],
                          },
                        }))
                      }
                    >
                      Dodaj kolor ({profile.palette.colors.length}/
                      {profile.palette.maxColors})
                    </button>
                  </>
                )}
                {section === "Fonty" && (
                  <>
                    <h2>Fonty do napisów</h2>
                    <p>
                      Font zostanie skopiowany do materiałów klienta. Render
                      używa dokładnie zapisanej odmiany, także bez dostępu do
                      sieci.
                    </p>
                    <div className="branding-font-current">
                      <strong>
                        Podstawowy:{" "}
                        {profile.fonts.primary?.family || "Nie wybrano"}
                      </strong>
                      <span>
                        Wyróżnienia:{" "}
                        {profile.fonts.emphasis?.family ||
                          "Jak font podstawowy"}
                      </span>
                    </div>
                    {profile.fonts.emphasis && (
                      <button
                        className="btn"
                        onClick={() =>
                          edit((d) => ({
                            ...d,
                            fonts: { ...d.fonts, emphasis: null },
                          }))
                        }
                      >
                        Używaj podstawowego fontu do wyróżnień
                      </button>
                    )}
                    <label>
                      Ustaw font dla
                      <select
                        value={fontTarget}
                        onChange={(e) =>
                          setFontTarget(
                            e.target.value as "primary" | "emphasis",
                          )
                        }
                      >
                        <option value="primary">Tekstu podstawowego</option>
                        <option value="emphasis">Wyróżnionych słów</option>
                      </select>
                    </label>
                    <label>
                      Źródło fontów
                      <select
                        value={fontSource}
                        onChange={(e) => setFontSource(e.target.value)}
                      >
                        <option value="bundled">Fonty aplikacji</option>
                        <option value="local">Zainstalowane na tym Macu</option>
                        <option value="google">Google Fonts</option>
                      </select>
                    </label>
                    <label>
                      Wyszukaj rodzinę
                      <input
                        type="search"
                        value={fontQuery}
                        onChange={(e) => setFontQuery(e.target.value)}
                        placeholder="Np. Montserrat"
                      />
                    </label>
                    {fontLoading && <p role="status">Wyszukiwanie fontów…</p>}
                    {fontNotice && <p role="status">{fontNotice}</p>}
                    {!fontLoading && !fontChoices.length && (
                      <p>Brak wyników. Zmień nazwę lub prześlij własny plik.</p>
                    )}
                    <div className="branding-font-list">
                      {fontChoices.map((font) => (
                        <FontRow
                          key={font.id}
                          font={font}
                          importing={importingFont !== null}
                          onImport={(variant) => importFont(font, variant)}
                        />
                      ))}
                    </div>
                    <label className="btn">
                      Prześlij własny font
                      <input
                        type="file"
                        disabled={busy}
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={(e) => {
                          void upload(e.target.files?.[0], "font");
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="branding-hint">
                      TTF, OTF, WOFF lub WOFF2 do 20 MB, z polskimi znakami.
                      Import nie instaluje fontu w systemie. Upewnij się, że
                      masz prawo do używania fontu.
                    </p>
                    {uploading && (
                      <p role="status">
                        {uploading}: {uploadProgress}%
                      </p>
                    )}
                  </>
                )}
                {section === "Napisy" && (
                  <>
                    <h2>Styl napisów</h2>
                    <p>
                      Ustawienia dotyczą nowego stylu marki. Dotychczasowe style
                      klientów pozostają dostępne.
                    </p>
                    <fieldset className="branding-presets">
                      <legend>Ruch napisów</legend>
                      {(
                        [
                          {
                            id: "plain",
                            name: "Zwykłe",
                            description: "Spokojny tekst bez animacji słów.",
                          },
                          {
                            id: "kinetic",
                            name: "Kinetic",
                            description:
                              "Słowa poruszają się w rytmie wypowiedzi.",
                          },
                          {
                            id: "pop",
                            name: "Pop-out",
                            description:
                              "Wypowiadane słowo wyraźnie się powiększa.",
                          },
                        ] as const
                      ).map((preset) => (
                        <label key={preset.id}>
                          <input
                            type="radio"
                            name="caption-preset"
                            value={preset.id}
                            checked={profile.captions.presetId === preset.id}
                            onChange={() =>
                              edit((d) => ({
                                ...d,
                                captions: {
                                  ...d.captions,
                                  presetId: preset.id,
                                },
                              }))
                            }
                          />
                          <span>
                            <strong>{preset.name}</strong>
                            <span>{preset.description}</span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      Wyróżnienie słów
                      <select
                        value={profile.captions.emphasis}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            captions: {
                              ...d.captions,
                              emphasis: e.target.value as
                                | "none"
                                | "color"
                                | "underline",
                            },
                          }))
                        }
                      >
                        <option value="none">Bez wyróżnienia</option>
                        <option value="color">Kolor akcentu</option>
                        <option value="underline">Podkreślenie</option>
                      </select>
                    </label>
                    <label className="branding-check">
                      <input
                        type="checkbox"
                        checked={profile.captions.emojiEnabled}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            captions: {
                              ...d.captions,
                              emojiEnabled: e.target.checked,
                            },
                          }))
                        }
                      />
                      Pozwalaj na emotki dobrane do treści
                    </label>
                    <label>
                      Wielkość napisów: {profile.captions.size}px
                      <input
                        type="range"
                        min={32}
                        max={140}
                        step={1}
                        value={profile.captions.size}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            captions: {
                              ...d.captions,
                              size: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Pozycja napisów:{" "}
                      {Math.round(profile.captions.position * 100)}% wysokości
                      kadru
                      <input
                        type="range"
                        min={0.35}
                        max={0.75}
                        step={0.01}
                        value={profile.captions.position}
                        onChange={(e) =>
                          edit((d) => ({
                            ...d,
                            captions: {
                              ...d.captions,
                              position: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
            <aside className="branding-preview">
              <div>
                <h2>Twój styl w ruchu</h2>
                <p>
                  Przykładowy tekst i neutralne tło. Podgląd korzysta z tego
                  samego silnika co render.
                </p>
              </div>
              {!profile.fonts.primary && (
                <p className="branding-hint">
                  Wybierz font w sekcji Fonty. Do tego czasu podgląd używa fontu
                  zastępczego.
                </p>
              )}
              {profile.assets.some((asset) => asset.kind === "video") && (
                <label>
                  Tło podglądu
                  <select
                    value={previewSource}
                    onChange={(e) => setPreviewSource(e.target.value)}
                  >
                    <option value="">Neutralne tło</option>
                    {profile.assets
                      .filter((asset) => asset.kind === "video")
                      .map((asset) => (
                        <option key={asset.id} value={`/${asset.file}`}>
                          {asset.originalName}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="branding-player">
                <BrandPreview
                  key={previewKey}
                  autoPlay={previewKey > 0}
                  branding={profile}
                  source={previewSource || undefined}
                />
              </div>
              <button
                className="btn"
                onClick={() => setPreviewKey((key) => key + 1)}
              >
                Odtwórz od początku
              </button>
              <p className="branding-hint">
                Zmiana brandingu wpływa na nowe montaże. Wcześniejsze rolki
                zachowują swoją zapisaną wersję.
              </p>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
function FontRow({
  font,
  importing,
  onImport,
}: {
  font: FontChoice;
  importing: boolean;
  onImport: (variant?: string) => void;
}) {
  const [variant, setVariant] = useState("");
  return (
    <div className="branding-font-row">
      <div>
        <strong>{font.family}</strong>
        <p>Zażółć gęślą jaźń</p>
      </div>
      {!!font.variants?.length && (
        <label>
          Odmiana
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="">Domyślna</option>
            {font.variants.map((item, index) => {
              const id =
                typeof item === "string"
                  ? item
                  : item.id ||
                    item.name ||
                    `${item.weight || "400"}-${item.style || "normal"}`;
              return (
                <option key={index} value={id}>
                  {id}
                </option>
              );
            })}
          </select>
        </label>
      )}
      <button
        className="btn"
        disabled={importing || font.importable === false}
        title={font.reason}
        onClick={() => onImport(variant || undefined)}
      >
        {importing ? "Importowanie…" : "Wybierz"}
      </button>
    </div>
  );
}
