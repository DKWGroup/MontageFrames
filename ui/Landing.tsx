import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { COMPETITORS, PLANS, savings } from "./landing-data.mjs";
import "./landing.css";
gsap.registerPlugin(ScrollTrigger, useGSAP);

const Arrow = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);
function Wave({ quiet = false }: { quiet?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={quiet ? "land-wave quiet" : "land-wave"}
      viewBox="0 0 580 80"
      preserveAspectRatio="none"
    >
      {Array.from({ length: 95 }, (_, i) => {
        const h = quiet && i % 17 < 5 ? 3 : 8 + Math.sin(i * 2.1) ** 2 * 52;
        return (
          <rect
            key={i}
            x={i * 6.1}
            y={(80 - h) / 2}
            width="2.8"
            height={h}
            rx="1.4"
          />
        );
      })}
    </svg>
  );
}
export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [automatic, setAutomatic] = useState(false);
  const [captionWord, setCaptionWord] = useState("lepsze");
  const [count, setCount] = useState(20),
    [manual, setManual] = useState(30),
    [review, setReview] = useState(5),
    [hourly, setHourly] = useState(100);
  const saving = savings(count, manual, review, hourly);
  const pl = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 });
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      ScrollTrigger.create({
        trigger: ".land-edit-story",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => setAutomatic(self.progress >= 0.46),
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".land-hero h1, .land-hero > p, .land-hero-actions", {
          y: 28,
          opacity: 0,
          duration: 0.85,
          stagger: 0.12,
          ease: "power3.out",
        });
        gsap.fromTo(
          ".land-phone",
          {
            rotationY: -10,
            rotationX: 3,
            rotationZ: -2,
            y: 30,
          },
          {
            rotationY: 5,
            rotationX: 0,
            rotationZ: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".land-edit-story",
              start: "top 85%",
              end: "bottom bottom",
              scrub: 0.8,
            },
          },
        );
        gsap.utils
          .toArray<HTMLElement>(
            ".land-section > h2, .land-section-heading, .land-process-copy article, .land-plan, .land-operator-details article, .land-final h2",
          )
          .forEach((element) => {
            gsap.from(element, {
              y: 36,
              opacity: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: element, start: "top 90%", once: true },
            });
          });
        gsap.fromTo(
          ".land-voice-symbol span",
          { scaleY: 0.45 },
          {
            scaleY: 1,
            stagger: { each: 0.12, yoyo: true, repeat: -1 },
            duration: 0.7,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            scrollTrigger: {
              trigger: ".land-roadmap",
              start: "top bottom",
              end: "bottom top",
              toggleActions: "play pause resume pause",
            },
          },
        );
        gsap.from(".land-time-copy > *", {
          y: 26,
          opacity: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".land-manifesto",
            start: "top 75%",
            once: true,
          },
        });
        gsap.fromTo(
          ".land-time-work",
          { x: 0, opacity: 1 },
          {
            x: -36,
            opacity: 0.2,
            ease: "none",
            scrollTrigger: {
              trigger: ".land-manifesto",
              start: "top 70%",
              end: "bottom 65%",
              scrub: 0.6,
            },
          },
        );
        gsap.from(".land-time-done", {
          y: 22,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".land-manifesto",
            start: "top 35%",
            once: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );
  return (
    <div className="landing" ref={root}>
      <a className="land-skip" href="#tresc">
        Przejdź do treści
      </a>
      <header className="land-nav">
        <a
          href="/"
          className="land-brand"
          aria-label="MontageFrames — strona główna"
        >
          <span aria-hidden="true" className="land-mark" />
          MontageFrames
        </a>
        <nav aria-label="Menu strony">
          <a href="#jak-dziala">Jak to działa</a>
          <a href="#porownanie">Porównanie</a>
          <a href="#cennik">Cennik</a>
        </nav>
        <a className="land-panel" href="/panel">
          Otwórz panel <Arrow />
        </a>
      </header>
      <main id="tresc">
        <section className="land-hero">
          <h1>
            Ty nagrywasz.
            <br />
            <span>Resztę zmontuje AI.</span>
          </h1>
          <p>
            Napisy, cięcia, hook i styl Twojej marki. Wgrywasz rolkę, wybierasz
            klienta i oddajesz powtarzalną pracę MontageFrames.
          </p>
          <div className="land-hero-actions">
            <a className="land-button solid" href="/panel">
              Przejdź do montażu <Arrow />
            </a>
            <a className="land-button" href="#jak-dziala">
              Zobacz, jak to działa
            </a>
          </div>
          <a className="land-scroll-cue" href="#jak-dziala">
            Przewiń. Zobacz różnicę. <span aria-hidden="true">↓</span>
          </a>
        </section>
        <section
          className={`land-edit-story ${automatic ? "is-ai" : "is-manual"}`}
          id="jak-dziala"
          aria-label="Od ręcznego montażu do montażu AI"
        >
          <div className="land-edit-sticky">
            <div className="land-edit-heading">
              <span className="land-step">
                Ten sam materiał. Inny sposób pracy.
              </span>
              <h2>
                Mniej montowania.
                <br />
                <span>Więcej gotowych rolek.</span>
              </h2>
            </div>
            <div className="land-edit-visual">
              <div className="land-phone-space" aria-hidden="true">
                <div className="land-phone-size">
                  <div className="land-phone">
                    <div className="land-phone-screen">
                      <div className="land-phone-status">
                        <span>9:41</span>
                        <span>● ▰</span>
                      </div>
                      <div className="land-phone-island" />
                      <div className="land-phone-footage">
                        <div className="land-phone-source">
                          <span>Twoje nagranie</span>
                          <small>9:16 / 00:12</small>
                        </div>
                        <div
                          className="land-phone-composition"
                          aria-hidden="true"
                        >
                          <span>Twój głos.</span>
                          <span>Twój styl.</span>
                        </div>
                        <span className="land-phone-raw">
                          No więc… yyy… dzisiaj…
                        </span>
                        <div className="land-phone-finished">
                          Rób {captionWord}
                          <br />
                          <strong>rolki.</strong>
                        </div>
                      </div>
                      <div className="land-phone-bottom">
                        <span className="land-phone-dot" />
                        {automatic
                          ? "Twój styl. Gotowe napisy."
                          : "Surowe nagranie"}
                      </div>
                      <div className="land-phone-home" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="land-edit-desk">
                <div className="land-edit-copy">
                  <p className="land-edit-kicker">
                    {automatic ? "02 / Z MontageFrames" : "01 / Ręczny montaż"}
                  </p>
                  <h3>
                    {automatic ? (
                      <>
                        Wgrywasz film.
                        <br />
                        Reszta robi się sama.
                      </>
                    ) : (
                      <>
                        Cięcie. Napis. Poprawka.
                        <br />I tak przez cały wieczór.
                      </>
                    )}
                  </h3>
                  <p>
                    {automatic
                      ? "Wybierasz styl. Program montuje. Ty sprawdzasz wynik i poprawiasz tylko to, co chcesz."
                      : "W CapCut wszystko dopinasz osobno: pauzy, timing słów, animacje i kolejne klipy."}
                  </p>
                </div>
                <div
                  className="land-editor"
                  aria-label={
                    automatic
                      ? "Ilustracja automatycznego montażu"
                      : "Ilustracja ręcznego montażu"
                  }
                >
                  <div className="land-editor-top">
                    <span>
                      <i />{" "}
                      {automatic ? "MontageFrames" : "CapCut · montaż ręczny"}
                    </span>
                    <span>
                      {automatic
                        ? "Montaż gotowy do sprawdzenia"
                        : "Projekt bez tytułu"}
                    </span>
                  </div>
                  <div className="land-editor-tools" aria-hidden="true">
                    {automatic ? (
                      <>
                        <span>✓ Cięcia</span>
                        <span>✓ Napisy</span>
                        <span>✓ Twój styl</span>
                      </>
                    ) : (
                      <>
                        <span>Podziel klip</span>
                        <span>Usuń pauzę</span>
                        <span>Animacja</span>
                        <span>Timing</span>
                      </>
                    )}
                  </div>
                  <div className="land-editor-caption">
                    <span>
                      {automatic
                        ? "Popraw, jeśli chcesz"
                        : "Każde słowo osobno"}
                    </span>
                    <div className="land-edit-words">
                      <span>No więc…</span>
                      <span>yyy…</span>
                      <b>Rób</b>
                      {automatic ? (
                        <input
                          aria-label="Edytuj słowo w przykładowym napisie"
                          value={captionWord}
                          maxLength={18}
                          onChange={(event) =>
                            setCaptionWord(event.target.value)
                          }
                          style={{
                            width: `${Math.max(6, captionWord.length + 2)}ch`,
                          }}
                        />
                      ) : (
                        <b>lepsze</b>
                      )}
                      <b>rolki.</b>
                      <i className="land-editor-caret" />
                    </div>
                    <small>
                      {automatic
                        ? "Zmień podświetlone słowo. Od razu widać efekt."
                        : "Popraw tekst. Dopasuj czas. Ustaw animację. Powtórz."}
                    </small>
                  </div>
                  <div className="land-editor-timeline">
                    <div className="land-editor-ruler">
                      <span>00:00</span>
                      <span>00:05</span>
                      <span>00:10</span>
                      <span>00:15</span>
                    </div>
                    <div className="land-editor-track subtitles">
                      <small>Tekst</small>
                      <span>Rób</span>
                      <span>{automatic ? captionWord : "lepsze"}</span>
                      <span>rolki.</span>
                    </div>
                    <div className="land-editor-track video">
                      <small>Film</small>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <span key={i} />
                      ))}
                    </div>
                    <div className="land-editor-track audio">
                      <small>Głos</small>
                      <Wave quiet={!automatic} />
                    </div>
                    <div className="land-editor-playhead" />
                    <div className="land-editor-cursor" aria-hidden="true">
                      ↖<span>przytnij… przesuń… popraw…</span>
                    </div>
                  </div>
                  <div className="land-editor-result">
                    <span aria-hidden="true">{automatic ? "✓" : "↖"}</span>
                    {automatic
                      ? "Cięcia i napisy przygotowane. Ty masz ostatnie słowo."
                      : "Każda zmiana to kolejne kliknięcia."}
                  </div>
                </div>
                <p className="land-edit-proof">
                  Interaktywny schemat · układ ręcznego edytora inspirowany
                  CapCutem
                </p>
              </div>
            </div>
            <div
              className="land-edit-progress"
              role="group"
              aria-label="Porównaj sposoby montażu"
            >
              <button
                type="button"
                aria-pressed={!automatic}
                onClick={() => setAutomatic(false)}
              >
                Ręcznie w CapCut
              </button>
              <span aria-hidden="true">→</span>
              <button
                type="button"
                aria-pressed={automatic}
                onClick={() => setAutomatic(true)}
              >
                Z MontageFrames
              </button>
            </div>
          </div>
        </section>
        <section className="land-manifesto" aria-labelledby="land-time-title">
          <div className="land-time-layout">
            <div className="land-time-copy">
              <p className="land-time-before">
                Mniej wieczorów
                <br />
                nad napisami.
              </p>
              <h2 id="land-time-title">
                Więcej miejsca
                <br />
                na pomysły.
              </h2>
              <p className="land-time-after">
                Na klientów. Na życie
                <br />
                poza osią czasu.
              </p>
            </div>
            <div
              className="land-time-edit"
              data-ui="true"
              aria-label="Powtarzalny montaż przejmuje program"
            >
              <div className="land-time-work" aria-hidden="true">
                <div className="land-time-fragments">
                  <span>przytnij</span>
                  <span>przesuń</span>
                  <span>popraw</span>
                </div>
                <div className="land-time-fragments">
                  <span>napisy</span>
                  <span>timing</span>
                  <span>animacja</span>
                </div>
                <Wave quiet />
              </div>
              <div className="land-time-done">
                <span aria-hidden="true">✓</span>
                <p>
                  Montaż po naszej stronie.
                  <br />
                  <strong>Wieczór po Twojej.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="land-section land-calculator" id="czas">
          <div>
            <h2>
              Policz czas,
              <br />
              który możesz odzyskać.
            </h2>
            <p>
              Wpisz własne założenia. Liczymy pracę przy montażu i kontroli
              efektu — nie czas, przez który komputer renderuje film.
            </p>
            <p className="land-note">
              To symulacja, nie gwarancja ani pomiar szybkości programu.
            </p>
          </div>
          <div className="land-calc-tool">
            <div className="land-calc-inputs">
              {[
                {
                  label: "Rolki miesięcznie",
                  value: count,
                  set: setCount,
                  min: 0,
                  max: 500,
                  unit: "rolek",
                },
                {
                  label: "Ręczny montaż jednej rolki",
                  value: manual,
                  set: setManual,
                  min: 1,
                  max: 180,
                  unit: "min",
                },
                {
                  label: "Przegląd i poprawki z AI",
                  value: review,
                  set: setReview,
                  min: 1,
                  max: 180,
                  unit: "min",
                },
                {
                  label: "Wartość godziny Twojej pracy",
                  value: hourly,
                  set: setHourly,
                  min: 0,
                  max: 1000,
                  unit: "zł",
                },
              ].map((x) => (
                <label key={x.label}>
                  {x.label}
                  <span>
                    <input
                      type="number"
                      min={x.min}
                      max={x.max}
                      value={x.value}
                      onChange={(e) =>
                        x.set(
                          Math.max(
                            x.min,
                            Math.min(x.max, Number(e.target.value)),
                          ),
                        )
                      }
                    />
                    <small>{x.unit}</small>
                  </span>
                </label>
              ))}
            </div>
            <output aria-live="polite">
              <strong>{pl.format(saving.hours)} h</strong>
              <span>mniej pracy ręcznej w miesiącu</span>
              <small>
                Wartość tego czasu: {pl.format(saving.value)} zł według Twoich
                założeń.
              </small>
            </output>
          </div>
        </section>
        <section className="land-language">
          <div>
            <h2>
              Polski brzmi
              <br />
              tu po polsku.
            </h2>
            <p>
              Automatyczne napisy do Twojej wypowiedzi, a nie tekst do
              przepisywania od zera. Nadal możesz poprawić każde słowo.
            </p>
          </div>
          <div className="land-accuracy">
            <strong>
              96<span>%*</span>
            </strong>
            <p>
              Deklarowana trafność
              <br />
              polskich napisów
            </p>
            <p className="land-accuracy-condition">
              *Jeśli dźwięk jest wyraźny i zrozumiały dla ludzkich uszu.
            </p>
            <details>
              <summary>Co oznacza ta deklaracja?</summary>
              <p>
                *Jeśli dźwięk jest wyraźny i zrozumiały dla ludzkich uszu. To
                deklaracja produktu podana przez właścicielkę; nie opublikowano
                jeszcze benchmarku. Nazwy własne i trudne fragmenty wymagają
                sprawdzenia.
              </p>
            </details>
          </div>
        </section>
        <section className="land-section land-operators" id="integracje">
          <div>
            <h2>
              Twoje AI.
              <br />
              Twoje konto.
              <br />
              <span>Twój wybór.</span>
            </h2>
            <p>
              MontageFrames można połączyć z Claude Code lub Codexem w
              terminalu. Korzystasz z własnej subskrypcji i jej limitów, bez
              obowiązku rozliczania montażu przez API.
            </p>
            <a className="land-text-link" href="/panel">
              Sprawdź ustawienia operatora <Arrow />
            </a>
          </div>
          <div className="land-operator-details">
            <article>
              <h3>Claude Code</h3>
              <p>
                Operator na zalogowanym koncie: zwykłe rolki, poprawki,
                QuickContent, Film poziomy i planowanie Motion Studio.
              </p>
            </article>
            <article>
              <h3>Codex</h3>
              <p>
                Konto ChatGPT do QuickContent, Filmu poziomego i opisów. Jako
                agent terminalowy może też pracować bezpośrednio na
                repozytorium.
              </p>
            </article>
            <details>
              <summary>Jak uniknąć płatnego API?</summary>
              <p>
                Włącz tryb account-only zgodnie z README i wybierz operatora
                konta. Opisy również możesz skierować do CLI. Dostęp i limity
                zależą od Twojego planu u dostawcy; aplikacja nie uruchamia
                płatnego fallbacku.
              </p>
            </details>
          </div>
        </section>
        <section className="land-roadmap">
          <div className="land-voice-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="land-coming">Wkrótce</p>
            <h2>
              Powiedz agentowi.
              <br />
              „Zmontuj tę rolkę”.
            </h2>
            <p>
              Planujemy integrację z agentami AI, takimi jak Hermes. Docelowo
              podłączysz wybrany folder Dysku Google do swojego agenta i zlecisz
              montaż głosem.
            </p>
            <p className="land-note">
              Funkcja w przygotowaniu. Samo połączenie z Dyskiem Google dziś nie
              uruchamia montażu. Termin premiery nie został ustalony.
            </p>
          </div>
        </section>
        <section className="land-section" id="porownanie">
          <div className="land-section-heading">
            <h2>
              Podobny cel.
              <br />
              Różne sposoby pracy.
            </h2>
            <p>
              Porównaj cenę i jednostkę rozliczenia. Kredyt w jednym programie
              nie oznacza tego samego co kredyt w drugim.
            </p>
          </div>
          <div className="land-table-scroll">
            <table className="land-comparison">
              <caption>
                Publiczne cenniki miesięczne sprawdzone 17.10.2026
              </caption>
              <thead>
                <tr>
                  <th scope="col">Narzędzie</th>
                  <th scope="col">Cena i limit</th>
                  <th scope="col">Główne zastosowanie</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((x) => (
                  <tr key={x.name}>
                    <th scope="row">
                      <a href={x.href} target="_blank" rel="noreferrer">
                        {x.name}
                        <Arrow />
                      </a>
                    </th>
                    <td>
                      <strong>{x.price}</strong>
                      <span>{x.limit}</span>
                    </td>
                    <td>{x.focus}</td>
                  </tr>
                ))}
                <tr className="land-our-row">
                  <th scope="row">MontageFrames</th>
                  <td>
                    <strong>Plany od 129 zł/mies.</strong>
                    <span>
                      Od 15 rolek i 250 tys. tokenów poprawek. Oferta w
                      przygotowaniu.
                    </span>
                  </td>
                  <td>
                    Profile klientów, automatyczny montaż i własny operator CLI.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="land-note">
            Ceny konkurencji w USD, bez przeliczania walut; mogą zależeć od
            kraju, platformy i promocji. Captions: warunki na stronie dotyczą
            iOS. Kredyty i minuty źródła nie są liczbą gotowych rolek.
          </p>
        </section>
        <section className="land-section land-pricing" id="cennik">
          <div className="land-section-heading">
            <h2>
              Więcej rolek.
              <br />
              Mniej ręcznej roboty.
            </h2>
            <p>
              Planowany model: gotowe rolki w pakiecie i osobna pula na poprawki
              AI. Wybierz skalę, do której chcesz dojść.
            </p>
          </div>
          <div className="land-plans">
            {PLANS.map((p) => (
              <article
                className={
                  p.name === "Creator" ? "land-plan featured" : "land-plan"
                }
                key={p.name}
              >
                <h3>{p.name}</h3>
                <p>{p.for}</p>
                <div className="land-price">
                  <strong>{p.price}</strong>
                  <span>zł / miesiąc</span>
                </div>
                <ul>
                  <li>
                    <strong>{p.reels} gotowych rolek</strong> miesięcznie
                  </li>
                  <li>
                    <strong>
                      {new Intl.NumberFormat("pl-PL").format(p.tokens)} tokenów
                    </strong>{" "}
                    na poprawki AI
                  </li>
                  <li>Napisy i profil klienta</li>
                  <li>Ręczne korekty i ponowny render bez tokenów AI</li>
                </ul>
                <a
                  className={`land-button ${p.name === "Creator" ? "solid" : ""}`}
                  href="/panel"
                >
                  Poznaj działający panel <Arrow />
                </a>
                <small>
                  {new Intl.NumberFormat("pl-PL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(p.price / p.reels)}{" "}
                  zł / rolkę przy pełnym wykorzystaniu
                </small>
              </article>
            ))}
          </div>
          <p className="land-pricing-disclosure">
            To proponowany cennik usługi, która jest w przygotowaniu. Płatności
            i limity abonamentu nie są jeszcze aktywne. Obecna wersja działa
            lokalnie; własne konto AI ma odrębne limity. Nie naliczamy tu opłat.
          </p>
          <details className="land-pricing-faq">
            <summary>Jak planujemy liczyć rolki i tokeny?</summary>
            <p>
              Jedna rolka to pierwszy sprawdzony render unikalnego filmu do 90
              sekund. Tokeny poprawek obejmują mierzone wejście i wyjście modelu
              w zarządzanym API. Zwykły retry renderu i ręczne poprawki nie
              zużywają puli. Tryb własnego konta CLI ma limity dostawcy i nie
              jest tą samą pulą. QuickContent z długiego źródła i LongForm
              wymagają osobnych zasad wyceny.
            </p>
          </details>
        </section>
        <section className="land-section land-faq" id="faq">
          <h2>
            Zanim wrzucisz
            <br />
            pierwszy film.
          </h2>
          <div>
            {[
              {
                q: "Czy naprawdę wystarczy wgrać rolkę?",
                a: "Wybierasz nagranie i profil klienta, a program przygotowuje montaż. Ty sprawdzasz sens, obraz i dźwięk przed publikacją. QuickContent wymaga wyboru propozycji, a Film poziomy akceptacji cięć i planu.",
              },
              {
                q: "Czy muszę mieć klucz API?",
                a: "Nie do pracy z własnym kontem Claude Code lub Codex. W README opisaliśmy tryb account-only oraz opisy przez CLI. Wybrane funkcje zewnętrzne, np. Pexels, mają własną konfigurację.",
              },
              {
                q: "Czy pliki klientów zostają u mnie?",
                a: "Źródła i rendery lokalnej wersji zostają na Twoim komputerze. Tekst potrzebny do pracy AI jest przekazywany wybranemu dostawcy. To nie jest obietnica całkowicie offline.",
              },
              {
                q: "Czy potrzebuję mocnego komputera?",
                a: "ASR i render pracują lokalnie. Czas zależy od sprzętu i materiału; pełny zestaw narzędzi rozwijamy na macOS. W README znajdziesz wymagania i ograniczenia.",
              },
              {
                q: "Czy mogę już kupić pakiet?",
                a: "Cennik przedstawia planowaną ofertę. Sprzedaż i rozliczanie limitów nie są jeszcze uruchomione. Możesz już otworzyć lokalny panel i sprawdzić obecne możliwości.",
              },
            ].map((x) => (
              <details key={x.q}>
                <summary>{x.q}</summary>
                <p>{x.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="land-final">
          <h2>
            Masz już nagranie.
            <br />
            Daj mu wyjść do ludzi.
          </h2>
          <a className="land-button" href="/panel">
            Otwórz MontageFrames <Arrow />
          </a>
          <p>Sprawdź montaż. Zachowaj swój styl.</p>
        </section>
      </main>
      <footer className="land-footer">
        <a className="land-brand" href="/">
          MontageFrames
        </a>
        <p>Stworzone do pracy z Twoim materiałem.</p>
        <div>
          <a href="/panel">Panel</a>
          <a
            href="https://github.com/DKWGroup/MontageFrames"
            target="_blank"
            rel="noreferrer"
          >
            Repozytorium i instrukcja
          </a>
          <a href="#cennik">Cennik</a>
        </div>
      </footer>
    </div>
  );
}
