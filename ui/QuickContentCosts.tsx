import type { QCCosts, QCProject, QCProvider } from "./quickcontent-api";
const usd = (micro: number) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(micro / 1000000);
export function CostCard({
  costs,
  aiProvider,
}: {
  costs?: QCProject["costs"];
  aiProvider?: QCProvider;
}) {
  return (
    <section className="qc-card qc-stack">
      <h3>Koszty projektu</h3>
      <dl className="qc-costs">
        {(
          [
            ["analysis", "Analiza i znajdowanie fragmentów"],
            ["montage", "Montaż wybranych rolek"],
            ["chat", "Poprawki przez czat"],
            ["description", "Opis do publikacji · GPT-6 Luna API"],
          ] as const
        ).map(([key, label]) => {
          const row = costs?.[key];
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                {!row || row.missing
                  ? row?.costMicroUsd
                    ? `Zapisano ${usd(row.costMicroUsd)} · niepełny pomiar`
                    : "Brak pełnego pomiaru"
                  : row.requests
                    ? usd(row.costMicroUsd)
                    : "Jeszcze nie uruchomiono · 0 USD"}
                {Boolean(row?.subscriptionRequests) && (
                  <small>
                    {row?.subscriptionRequests} odpowiedzi w ramach konta CLI ·
                    bez osobnej opłaty API
                  </small>
                )}
                {Boolean(row?.requests) && (
                  <small>
                    {row?.requests} odpowiedzi AI · {row?.inputTokens} tokenów
                    wejścia / {row?.outputTokens} wyjścia
                  </small>
                )}
              </dd>
            </div>
          );
        })}
        <div>
          <dt>Whisper, wycinanie, kadr i render lokalny</dt>
          <dd>0 USD opłat API</dd>
        </div>
      </dl>
      <p className="qc-muted">
        Kwoty USD obliczamy ze zmierzonego zużycia i cennika dostawcy, bez
        podatków. Zużycie komputera nie jest opłatą API. Wcześniejsze zadania
        bez zapisu tokenów mają brak pomiaru; nie uruchamiamy ich ponownie dla
        wyceny.
      </p>
      <p className="qc-muted">
        {aiProvider && aiProvider !== "openai"
          ? "Analiza i montaż przez CLI korzystają z limitów zalogowanego konta, bez osobnej opłaty API. Opisy do publikacji korzystają z płatnego GPT-6 Luna API. Subskrypcja i jej limity nadal obowiązują."
          : "Koszt kolejnego montażu zależy od tokenów."}{" "}
        {aiProvider && aiProvider !== "openai"
          ? ""
          : costs?.montage.requests && !costs.montage.missing
            ? `Orientacyjnie ${usd(costs.montage.costMicroUsd / costs.montage.requests)} za odpowiedź AI na podstawie tego projektu.`
            : "Oszacowanie pojawi się po pierwszym zmierzonym montażu."}{" "}
        Zaznaczenie propozycji nie nalicza kosztu montażu.
      </p>
    </section>
  );
}

export function FilmCosts({ costs }: { costs?: QCCosts }) {
  return (
    <details className="qc-film-costs">
      <summary>
        Szczegóły kosztów tej rolki
        {costs?.montage.requests
          ? ` · ${new Intl.NumberFormat("pl-PL").format(costs.montage.inputTokens + costs.montage.outputTokens)} tokenów montażu`
          : " · brak pomiaru"}
      </summary>
      <dl className="qc-costs">
        {(
          [
            ["montage", "Montaż"],
            ["chat", "Poprawki"],
            ["description", "Opis do publikacji"],
          ] as const
        ).map(([key, label]) => {
          const row = costs?.[key];
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                {row?.requests ? (
                  <>
                    {row.inputTokens} tokenów wejścia / {row.outputTokens}{" "}
                    wyjścia
                    {row.missingTokenMeasurements
                      ? " · niepełny pomiar tokenów"
                      : ""}
                    <small>
                      {row.missing
                        ? `Zapisano ${usd(row.costMicroUsd)} · koszt niepełny`
                        : `${usd(row.costMicroUsd)} opłat API`}
                      {Boolean(row.subscriptionRequests) &&
                        " · użyto konta CLI / subskrypcji"}
                    </small>
                  </>
                ) : row?.missing ? (
                  "Brak pomiaru historycznego"
                ) : (
                  "Brak zapisanego zużycia"
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="qc-muted">
        Kredyty/limit konta: operator nie udostępnia pomiaru dla pojedynczej
        rolki. Analiza odcinka jest rozliczana osobno w ustawieniach projektu.
        Render lokalny nie zużywa tokenów.
      </p>
    </details>
  );
}
