import { useEffect, useState } from "react";
import { api, type UpdateInfo } from "./api";

export function Updates({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [restarting, setRestarting] = useState(false);
  useEffect(() => {
    let live = true;
    const read = () =>
      api.updates().then(
        (x) => {
          if (live) setData(x);
        },
        () => {},
      );
    void read();
    const timer = setInterval(() => void read(), 60000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  async function run(action: "check" | "download" | "install") {
    setBusy(action);
    setError("");
    try {
      if (action === "install") {
        await api.updateAction(action);
        setRestarting(true);
        const timer = setInterval(() => {
          void api.updates().then(
            (next) => {
              if (next.status === "installed" || next.status === "error") {
                clearInterval(timer);
                window.location.reload();
              }
            },
            () => {},
          );
        }, 2000);
        // The panel can be restarted manually if the process cannot reopen its port.
        setTimeout(() => {
          clearInterval(timer);
          setBusy("");
          setError(
            "Jeśli panel jeszcze nie wrócił, uruchom npm run ui. Szczegóły w .updates/install.log.",
          );
        }, 180000);
      } else setData(await api.updateAction(action));
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    } finally {
      if (action !== "install") setBusy("");
    }
  }
  if (compact)
    return data?.status === "available" || data?.status === "ready" ? (
      <a
        className="update-notice"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event("open-app-settings"));
        }}
      >
        Dostępna aktualizacja <span aria-hidden="true">↗</span>
      </a>
    ) : null;
  return (
    <section className="app-updates" aria-label="Aktualizacje aplikacji">
      <h3>Aktualizacje aplikacji</h3>
      <p className="note">
        Sprawdzamy GitHub przy uruchomieniu i co 6 godzin. Własnych klientów i
        zmienionych szablonów nie nadpisujemy.
      </p>
      <p role="status">
        {restarting
          ? "Instaluję i uruchamiam panel ponownie…"
          : data?.status === "ready"
            ? "Aktualizacja pobrana. Możesz ją zainstalować."
            : data?.status === "available"
              ? "Dostępna nowa wersja."
              : data?.status === "current"
                ? "Masz aktualną wydaną wersję."
                : data?.status === "installed"
                  ? "Aktualizacja zainstalowana."
                  : data?.status === "unpublished"
                    ? "Nie opublikowano jeszcze paczki aktualizacji."
                    : data?.status === "offline"
                      ? "Nie udało się połączyć z GitHub. Możesz dalej pracować."
                      : data?.status === "uninitialized"
                        ? "Brak manifestu instalacji. Użyj oficjalnej paczki lub klona Git."
                        : "Sprawdzam wersję aplikacji…"}
      </p>
      {data?.current && (
        <p className="note">
          Twoja wersja: {data.current.version.slice(0, 7)}
          {data.checkedAt
            ? ` · Sprawdzono: ${new Date(data.checkedAt).toLocaleString("pl-PL")}`
            : ""}
        </p>
      )}
      {(error || data?.error) && (
        <p className="note warn" role="alert">
          {error || data?.error}
        </p>
      )}
      {data?.pending && (
        <details className="panel-details">
          <summary>Szczegóły aktualizacji</summary>
          <p>
            {data.pending.changes} plików do aktualizacji. Zachowamy{" "}
            {data.pending.preserved.length} lokalnych zmian.
          </p>
          {data.pending.preserved.length > 0 && (
            <ul>
              {data.pending.preserved.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {data.pending.conflicts.length > 0 && (
            <>
              <p role="alert">Instalację blokują lokalne zmiany kodu:</p>
              <ul>
                {data.pending.conflicts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={Boolean(busy) || restarting}
          onClick={() => void run("check")}
        >
          {busy === "check" ? "Sprawdzam…" : "Sprawdź teraz"}
        </button>
        {data?.available && data.status !== "ready" && (
          <button
            type="button"
            className="btn"
            disabled={Boolean(busy)}
            onClick={() => void run("download")}
          >
            {busy === "download" ? "Pobieram…" : "Pobierz aktualizację"}
          </button>
        )}
        {data?.status === "ready" && (
          <button
            type="button"
            className="btn primary"
            disabled={Boolean(busy) || Boolean(data.pending?.conflicts.length)}
            onClick={() => void run("install")}
          >
            Zainstaluj i uruchom ponownie
          </button>
        )}
      </div>
      <p className="note">
        Najpierw zapisz poprawki. Instalacja czeka na zakończenie montażu i
        renderu; robi kopię zapasową. Przy lokalnych zmianach kodu może wymagać
        ręcznego połączenia wersji.
      </p>
    </section>
  );
}
