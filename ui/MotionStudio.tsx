import { revealInvalidField } from "./form-disclosure.mjs";
import { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Motion } from "../src/motion/Motion";
import {
  dimensions,
  productionReady,
  validateMotion,
  type MotionData,
} from "../src/motion/schema.mjs";
import "./motion.css";
async function request<T>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const r = await fetch("/api/motion" + url, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "X-Panel": "1", "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
type Job = {
  status: string;
  lines: string[];
  files: string[];
  mode?: string;
  format?: string;
};
export function MotionStudio({ onClose }: { onClose: () => void }) {
  const [names, setNames] = useState<string[]>([]),
    [data, setData] = useState<MotionData | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [format, setFormat] = useState("9:16"),
    [job, setJob] = useState<Job>({ status: "idle", lines: [], files: [] }),
    [busy, setBusy] = useState(false);
  const [filesVersion, setFilesVersion] = useState(0);
  const [brief, setBrief] = useState({
    name: "nowy-motion",
    brand: "MontageFrames",
    product: "",
    url: "",
    reference: "",
    duration: 15,
    bpm: 120,
    client: "",
  });
  const [review, setReview] = useState({
    score: 8,
    notes: "",
    phone: false,
    assets: false,
    timing: false,
  });
  const player = useRef<PlayerRef>(null);
  const latestData = useRef(data);
  useEffect(() => {
    latestData.current = data;
  }, [data]);
  const planWithAi = () =>
    run(async () => {
      if (!data) return;
      const sent = data;
      const proposed = await request<MotionData>(
        `/${data.name}/ai-plan`,
        "POST",
        { data },
      );
      if (latestData.current !== sent)
        throw new Error(
          "Brief zmienił się podczas pracy AI. Propozycję odrzucono, Twoje zmiany pozostają.",
        );
      edit(validateMotion(proposed));
      setStatus(
        "AI proponuje tekst ujęć. Sprawdź storyboard i kliknij Zapisz projekt, jeśli akceptujesz.",
      );
    });
  const [raw, setRaw] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    request<string[]>("").then(setNames, (e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (job.status !== "running") setFilesVersion((v) => v + 1);
  }, [job.status, data?.name]);
  const projectName=data?.name;
  useEffect(() => {
    if (!projectName) return;
    const id = setInterval(
      () =>
        request<Job>(`/${projectName}/job`).then(setJob, (e) =>
          setError(e.message),
        ),
      1000,
    );
    return () => clearInterval(id);
  }, [projectName]);
  const edit = (d: MotionData) => {
    setData({ ...d, reviews: [] });
    setStatus("Niezapisane zmiany • recenzje wymagają powtórzenia");
    setJob({ status: "idle", lines: [], files: [] });
  };
  const save = async (d = data) => {
    if (!d) return;
    const result = await request<MotionData>(
      `/${d.name}`,
      "PUT",
      validateMotion(d),
    );
    setData(result);
    setStatus("Zapisano");
  };
  const upload = async (file: File, assign: (asset: string) => void) => {
    if (!data) return;
    const r = await fetch(
      `/api/motion/${data.name}/asset?file=${encodeURIComponent(file.name)}`,
      { method: "POST", headers: { "X-Panel": "1" }, body: file },
    );
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    assign(result.asset);
  };
  const assetInput = (
    label: string,
    accept: string,
    assign: (s: string) => void,
  ) => (
    <label>
      {label}
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void run(() => upload(f, assign));
        }}
      />
    </label>
  );
  const [width, height] = dimensions(format);
  return (
    <div className="motion-workspace">
      <header className="motion-header">
        <div>
          <h1>Motion Studio</h1>
          <p>Brief → storyboard → podgląd → recenzje → eksport</p>
        </div>
        <button className="btn" onClick={onClose}>
          Wróć do rolek
        </button>
      </header>
      <div className="motion-layout">
        <aside className="motion-brief">
          <h2>Projekty</h2>
          <select
            aria-label="Otwórz projekt"
            value={data?.name || ""}
            onChange={(e) =>
              void run(async () => {
                setData(await request<MotionData>("/" + e.target.value));
                setStatus("Wczytano");
                setJob({ status: "idle", lines: [], files: [] });
              })
            }
          >
            <option value="">Wybierz projekt</option>
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <h2>Nowy film</h2>
          <form
            onInvalidCapture={revealInvalidField}
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const d = await request<MotionData>("", "POST", brief);
                setData(d);
                setNames(await request<string[]>(""));
                setStatus("Szkic utworzony");
              });
            }}
          >
            {(["brand", "product", "client"] as const).map((k) => (
              <label key={k}>
                {
                  {
                    name: "Nazwa pliku (slug)",
                    brand: "Marka",
                    product: "Produkt / temat",
                    url: "URL produktu (bez pobierania)",
                    client: "Klient (folder, opcjonalnie)",
                    reference: "Referencja: opisz ruch, nie kopiuj marki",
                  }[k]
                }
                <input
                  required={k === "brand"}
                  value={brief[k]}
                  onChange={(e) => setBrief({ ...brief, [k]: e.target.value })}
                />
              </label>
            ))}
            <label>
              Długość (6–60 s)
              <input
                type="number"
                min="6"
                max="60"
                value={brief.duration}
                onChange={(e) =>
                  setBrief({ ...brief, duration: Number(e.target.value) })
                }
              />
            </label>
            <details className="panel-details">
              <summary>
                Więcej ustawień <small>Nazwa, referencja i rytm</small>
              </summary>
              {(["name", "url", "reference"] as const).map((k) => (
                <label key={k}>
                  {
                    {
                      name: "Nazwa pliku (slug)",
                      url: "URL produktu (bez pobierania)",
                      reference: "Referencja ruchu",
                    }[k]
                  }
                  <input
                    required={k === "name"}
                    value={brief[k]}
                    onChange={(e) =>
                      setBrief({ ...brief, [k]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                BPM (siatka szacowana)
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={brief.bpm}
                  onChange={(e) =>
                    setBrief({ ...brief, bpm: Number(e.target.value) })
                  }
                />
              </label>
            </details>
            <button className="btn primary" disabled={busy}>
              Utwórz storyboard
            </button>
          </form>
          <p className="note">
            Montaż i render bez płatnych usług. AI wyłącznie po kliknięciu, z
            konta/operatora wybranego w Ustawieniach. Tylko własne, prawdziwe
            materiały; nie tworzymy atrap produktu ani danych. Siatka BPM nie
            wykrywa downbeatów.
          </p>
        </aside>
        <main className="motion-editor">
          {!data ? (
            <p>Utwórz film albo wybierz zapisany projekt.</p>
          ) : (
            <>
              <div className="motion-toolbar">
                <button
                  className="btn primary"
                  disabled={busy || job.status === "running"}
                  onClick={() => void run(() => save())}
                >
                  Zapisz projekt
                </button>
                <label>
                  Format
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    {data.formats.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label>
                  FPS
                  <select
                    value={data.fps}
                    onChange={(e) =>
                      edit({ ...data, fps: Number(e.target.value) as 30 | 60 })
                    }
                  >
                    <option>30</option>
                    <option>60</option>
                  </select>
                </label>
                <span role="status">{status}</span>
              </div>
              <div className="motion-preview">
                <Player
                  key={data.name + format + data.fps}
                  ref={player}
                  component={Motion}
                  inputProps={{ data, draft: true }}
                  compositionWidth={width}
                  compositionHeight={height}
                  fps={data.fps}
                  durationInFrames={Math.round(data.duration * data.fps)}
                  controls
                  style={{
                    width: "100%",
                    maxWidth: height > width ? 300 : 650,
                    aspectRatio: `${width}/${height}`,
                  }}
                />
              </div>
              <section>
                <h2>Materiały i branding</h2>
                <p>
                  Zdjęcia i screenshoty PNG/JPG/WebP, logo bez zmiany proporcji,
                  lokalny font. Muzyka: MP3/WAV/M4A (masz prawa).
                </p>
                <div className="motion-fields">
                  <label>
                    Akcent
                    <input
                      type="color"
                      value={data.accent}
                      onChange={(e) =>
                        edit({ ...data, accent: e.target.value })
                      }
                    />
                  </label>
                  {assetInput("Logo", ".png,.jpg,.jpeg,.webp", (s) =>
                    edit({ ...data, logo: s }),
                  )}
                  {assetInput("Font", ".ttf,.woff2", (s) =>
                    edit({ ...data, font: s }),
                  )}
                  {assetInput("Muzyka", ".mp3,.wav,.m4a", (s) =>
                    edit({ ...data, music: s }),
                  )}
                </div>
                <p className="note">
                  {data.logo || "Bez logo"} • {data.font || "Font domyślny"} •{" "}
                  {data.music || "Bez muzyki — cisza"}
                </p>
              </section>
              <section>
                <h2>Storyboard / lista stanów</h2>
                <button
                  type="button"
                  disabled={busy || job.status === "running"}
                  onClick={planWithAi}
                >
                  Zaproponuj tekst ujęć z AI
                </button>
                <p>
                  Opcjonalne: używa operatora z Ustawień, tylko po kliknięciu.
                  Tryb API: limit 2 USD na próbę i 120 s. AI proponuje tekst,
                  nie generuje ocen ani ekranów produktu; zapis wymaga Twojej
                  akceptacji.
                </p>
                <p>
                  Siatka {data.beatGrid.bpm} BPM — szacowana. Każde ujęcie 2–4
                  s. Kliknij czas, aby przewinąć.
                </p>
                {data.shots.map((s, i) => (
                  <article className="motion-shot" key={i}>
                    <button
                      className="btn"
                      onClick={() =>
                        player.current?.seekTo(Math.round(s.start * data.fps))
                      }
                    >
                      {s.start.toFixed(2)}–{s.end.toFixed(2)} s · {s.state}
                    </button>
                    <label>
                      Tytuł
                      <input
                        maxLength={100}
                        value={s.title}
                        onChange={(e) =>
                          edit({
                            ...data,
                            shots: data.shots.map((a, j) =>
                              j === i ? { ...a, title: e.target.value } : a,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Treść
                      <textarea
                        maxLength={220}
                        value={s.body}
                        onChange={(e) =>
                          edit({
                            ...data,
                            shots: data.shots.map((a, j) =>
                              j === i ? { ...a, body: e.target.value } : a,
                            ),
                          })
                        }
                      />
                    </label>
                    {assetInput(
                      "Prawdziwy screenshot / zdjęcie",
                      ".png,.jpg,.jpeg,.webp",
                      (asset) =>
                        edit({
                          ...data,
                          shots: data.shots.map((a, j) =>
                            j === i ? { ...a, asset } : a,
                          ),
                        }),
                    )}
                    {s.asset && <span>{s.asset}</span>}
                  </article>
                ))}
              </section>
              <details>
                <summary>
                  Zaawansowana edycja JSON (czasy, formaty, ścieżki)
                </summary>
                <button
                  className="btn"
                  onClick={() => setRaw(JSON.stringify(data, null, 2))}
                >
                  Wczytaj JSON do edycji
                </button>
                <textarea
                  className="motion-json"
                  aria-label="JSON projektu"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <button
                  className="btn"
                  onClick={() =>
                    void run(async () => edit(validateMotion(JSON.parse(raw))))
                  }
                >
                  Zastosuj JSON
                </button>
              </details>
              <section>
                <h2>Eksport i kontrola</h2>
                <div className="motion-toolbar">
                  {(["preview", "draft", "final"] as const).map((mode) => (
                    <button
                      className="btn"
                      key={mode}
                      disabled={
                        busy ||
                        job.status === "running" ||
                        (mode === "final" && !productionReady(data))
                      }
                      onClick={() =>
                        void run(async () => {
                          await save();
                          setJob(
                            await request<Job>(`/${data.name}/render`, "POST", {
                              mode,
                              format,
                            }),
                          );
                        })
                      }
                    >
                      {mode === "preview"
                        ? "Poster + contact sheet"
                        : mode === "draft"
                          ? "Render szkicu MP4"
                          : "Finalny MP4"}
                    </button>
                  ))}
                </div>
                <p>
                  Final: minimum 3 ręczne recenzje ≥8/10 z kontrolą telefonu,
                  materiałów i timingu. Bez wymyślonych ocen AI. Maksymalnie 6
                  rund; zmiana projektu resetuje recenzje.
                </p>
                <p role="status">Render: {job.status}</p>
                {job.files.map((f) => (
                  <a
                    className="motion-artifact"
                    key={f}
                    href={`/api/motion/${data.name}/artifact?file=${encodeURIComponent(f)}&v=${filesVersion}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f}
                    {f.endsWith("contact.png") && (
                      <img
                        alt="Arkusz kontrolny"
                        src={`/api/motion/${data.name}/artifact?file=${encodeURIComponent(f)}&v=${filesVersion}`}
                      />
                    )}
                  </a>
                ))}
                <details>
                  <summary>Log renderu</summary>
                  <pre>{job.lines.join("\n")}</pre>
                </details>
                <h3>Recenzja {data.reviews.length + 1}</h3>
                <label>
                  Ocena (ręczna, 0–10)
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={review.score}
                    onChange={(e) =>
                      setReview({ ...review, score: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Co sprawdzono / poprawiono
                  <textarea
                    value={review.notes}
                    onChange={(e) =>
                      setReview({ ...review, notes: e.target.value })
                    }
                  />
                </label>
                {(["phone", "assets", "timing"] as const).map((k) => (
                  <label className="motion-check" key={k}>
                    <input
                      type="checkbox"
                      checked={review[k]}
                      onChange={(e) =>
                        setReview({ ...review, [k]: e.target.checked })
                      }
                    />
                    {k === "phone"
                      ? "Czytelne na telefonie"
                      : k === "assets"
                        ? "Prawdziwe materiały i prawa"
                        : "Timing, strefy bezpieczne i dźwięk"}
                  </label>
                ))}
                <button
                  className="btn"
                  disabled={busy || data.reviews.length >= 6}
                  onClick={() =>
                    void run(async () => {
                      const d = validateMotion({
                        ...data,
                        reviews: [
                          ...data.reviews,
                          { ...review, round: data.reviews.length + 1 },
                        ],
                      });
                      await save(d);
                      setReview({ ...review, notes: "" });
                    })
                  }
                >
                  Zapisz recenzję
                </button>
                <ol>
                  {data.reviews.map((r) => (
                    <li key={r.round}>
                      {r.score}/10 — {r.notes}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </main>
      </div>
      {error && (
        <div className="motion-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
