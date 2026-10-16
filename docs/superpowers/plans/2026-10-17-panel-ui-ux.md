# Odświeżenie panelu MontageFrames — plan wdrożenia

> Realizacja krok po kroku przez `superpowers:executing-plans`. Zadania oznaczać checkboxami. Dokument jest planem do wdrożenia, nie potwierdzeniem wykonania.

**Cel:** jasny, biało-niebieski panel, w którym od razu wiadomo, co zrobić, a szczegóły są dostępne na żądanie.

**Architektura:** obecny React/Vite, istniejące API, komponenty i routing. Wspólne tokeny panelu, nawigacja oraz zasady formularzy i stanów. Zachować logikę montażu, zapisu, wersjonowania i bezpieczeństwa danych.

**Technologie:** React 19, TypeScript, zwykły CSS, Remotion Player; bez migracji frameworka i bez biblioteki komponentów.

**Specyfikacja:** polecenie użytkowniczki z 2026-10-17 i sekcja „Panel UI/UX” w `PREFERENCJE.md`; szczegóły ekranów i odbioru poniżej stanowią specyfikację tego odświeżenia.

## Ustalenia i granice

- Zakres: biblioteka/rolki, QuickContent, Film poziomy, Motion Studio, edytor, ustawienia, opis publikacji.
- Biel i niebieski dotyczą panelu. Nie zmieniać kolorów napisów, grafik, stylów klientów ani tokenów renderera w `src/`; `frame.md` nadal opisuje filmy.
- Jedna główna akcja w aktywnym kontekście. Pozostałe neutralne; niebieski nie jest dekoracją każdego elementu.
- „Szczegóły” odsłaniają informacje, „Więcej ustawień” odsłania edytowalne opcje. Nie mieszać obu funkcji.
- Błąd, brak zapisu, koszt nowej płatnej operacji i decyzja wymagana do dalszej pracy pozostają widoczne.
- Nie dopisywać nowych możliwości backendu. Brak obsługi importu lub eksportu ma pozostać uczciwie opisany.
- Bez automatycznego uruchamiania AI, płatnych API, renderów, commitów i publikacji w ramach odświeżenia.
- Repo ma rozległe niezacommitowane zmiany. Przed każdym etapem ponownie przeczytać diff; bez resetowania lub nadpisywania cudzej pracy.

## Co wynika z obecnego kodu

Analiza źródeł, bez odbioru ekranów w przeglądarce:

- `ui/panel.css`: ciemna paleta, Fustat, sztywny układ biblioteka 248 px / scena / inspektor 388 px.
- `ui/App.tsx`: biblioteka i przełączanie modułów; LongForm i Motion Studio zastępują cały widok aplikacji, przez co tracą wspólną nawigację.
- `ui/QuickContent.tsx`: już ma Propozycje / Zmontowane / Ustawienia, zwijane opcje operatora i jakości, szczegóły zadań. Rozwinąć ten wzorzec.
- `ui/LongForm.tsx`: własny nagłówek, lista projektów i formularz; operator jest eksponowany od początku.
- `ui/MotionStudio.tsx`: techniczny brief z nazwą pliku, BPM i referencją w głównym formularzu.
- `ui/motion.css`: niezależne fonty i ciemne kolory wpisane bezpośrednio. Sama zmiana `:root` nie wystarczy.
- `ui/Dialogs.tsx`, `ui/Inspector.tsx`, `ui/Timeline.tsx`: istniejące okna i narzędzia do ponownego wykorzystania.
- Dokumentacja LongForm mówi miejscami „plan”, choć kod modułu już istnieje. Redesign nie jest dowodem pełnego odbioru tego modułu.

## Kierunek wizualny i użycie gpt-taste

Skill `gpt-taste` stosujemy do hierarchii, oddechu, jakości typografii, kontrastu oraz reakcji na interakcję. Polecenie prostego interfejsu ma pierwszeństwo przed jego wzorcami strony marketingowej.

Nie przenosić do aplikacji hero AIDA, losowych zdjęć, marquee, opinii, pinowania scrolla ani nakładających się kart. Nie losować architektury roboczej. Nie dodawać GSAP wyłącznie do przycisków i rozwijania opcji. Przy późniejszym pisaniu UI przygotować preflight `design_plan`, jawnie oznaczając te adaptacje do aplikacji użytkowej.

| Token panelu | Wartość | Zastosowanie |
|---|---|---|
| `--bg` | `#F5F8FC` | delikatnie chłodne tło |
| `--surface` | `#FFFFFF` | formularze, listy, inspektor |
| `--raised` | `#EDF3FC` | powierzchnie pomocnicze |
| `--text` | `#17243B` | tekst główny |
| `--muted` | `#52627A` | tekst drugorzędny |
| `--faint` | `#52627A` | istniejące drobne etykiety; bez zbyt bladego tekstu |
| `--line` | `#DCE5F0` | dekoracyjne separatory |
| `--line-strong` | `#71829B` | istotne obrysy pól i kontrolek |
| `--accent` | `#1D4ED8` | główne akcje, aktywny stan, fokus |
| `--accent-ink` | `#FFFFFF` | tekst na akcencie |
| `--accent-hover` | `#1E40AF` | hover głównej akcji |
| `--accent-soft` | `#EFF6FF` | zaznaczone wiersze |
| `--danger` | `#B42318` | błędy i usuwanie |
| `--success` | `#166534` | ukończone zadanie z etykietą |
| `--warning` | `#92400E` | wymagana uwaga z etykietą |

Typografia: Geist lokalnie, z polskimi znakami i licencją; do czasu dostarczenia fontu zachować lokalny Fustat. Bez zewnętrznych requestów fontów. Treść i pola 16 px / 1,5; etykiety pomocnicze 14 px; tytuły 24–32 px. Nagłówki krótkie, szerokie, naturalnie łamane i sprawdzone na małym ekranie.

Skala odstępów 4/8/12/16/24/32 px. Promień pól/przycisków 10 px, paneli 16 px. Cień tylko dla menu i okien. Subtelne niebieskie tło aktywnej pozycji, delikatne separatory, liniowe ikony SVG, czytelny pusty stan. Bez ozdobników utrudniających montaż.

Ruch 120–180 ms dla hover/focus, 180–220 ms dla panelu. Bez autoplay miniatur i animowanego udawanego postępu. `prefers-reduced-motion` wyłącza ruch, zachowując czytelny stan końcowy.

## Nawigacja i układ

Stały panel boczny: **Rolki / QuickContent / Film poziomy / Motion Studio**. Na dole **Ustawienia**. Biblioteka klientów i rolek znajduje się w module Rolki, zamiast zajmować nawigację w każdym module. Nazwy modułów pozostają rozpoznawalne; krótkie opisy wyjaśniają ich zastosowanie na ekranach startowych.

Nagłówek: ścieżka powrotu, nazwa projektu, status zapisu/pracy, akcja właściwa dla aktualnego kroku. „Nowa rolka” jest główną akcją modułu Rolki, nie konkurencyjnym CTA podczas wyboru propozycji QC.

Desktop od 1280 px: nawigacja 224 px; edytor scena + inspektor 360 px i oś na dole. 900–1279 px: nawigacja zwijana, inspektor przełączany. Poniżej 900 px: jedna kolumna, Menu otwierane przyciskiem, podgląd przed edycją. Oś czasu może przewijać się we własnym obszarze; cała strona nie ma poziomego scrolla. Nie obcinać fokusu i menu przez globalne `overflow-x: hidden`.

## Zasady widoczności

| Kontekst | Widoczne od razu | Po rozwinięciu |
|---|---|---|
| Nowa rolka | nagranie, klient, styl, nazwa, start | przebitki, dodatkowe wskazówki, opcje renderu |
| QC — nowy projekt | źródło, klient, szablon, długość, Auto/własny temat, Przetwarzaj | operator, rozdzielczość wyjścia, limit pobrania YouTube |
| QC — propozycja | zaznaczenie, tytuł, długość, krótki opis, Podgląd | ocena z uzasadnieniem, pełny tekst, zakres mastera, koszty |
| QC — zmontowane | film, aktualność wersji, Popraw, Pobierz, opis do skopiowania | historia renderów, parametry i rozbicie kosztów |
| LongForm — start | istniejący wybór nagrania, nazwa, rozpoznany klient/styl, Przetwarzaj | operator i tylko obsługiwane opcje |
| LongForm — cięcia | podgląd, transkrypt, Do decyzji, Przywróć, Zatwierdź cięcia | metadane analizy i techniczne szczegóły |
| Motion — start | temat/produkt, marka/klient, długość, Utwórz storyboard | slug, URL, referencja, BPM |
| Edytor | podgląd, Napisy, Grafiki, Kadr, Asystent, Render | zaawansowane parametry wybranego elementu i logi |
| Ustawienia | aktywny operator i stan logowania, Zapisz | model, parametry i jawne ustawienia API |

Domyślnie rozwinięty tylko bieżący kontekst. Zwinięcie nie resetuje pól ani nie zapisuje zmian samo z siebie. Pod „Więcej ustawień” pokazać krótkie podsumowanie aktywnych wartości, np. „Codex · 1080 × 1920”. Błąd ukrytego pola automatycznie rozwija sekcję i przenosi fokus do pola.

Historyczne koszty można zwinąć. Wybrany płatny operator i potwierdzenie nowej płatnej czynności muszą pozostać widoczne przed startem; brak danych zużycia = „Brak danych”, nie zero.

## Przykładowy ekran QuickContent

Schemat układu, bez fikcyjnych wyników:

```text
MontageFrames     QuickContent / Nowy projekt

Rolki            Z długiego filmu wybierz rolki
QuickContent     Najpierw propozycje. Ty wybierasz, co zmontować.
Film poziomy
Motion Studio    [Link YouTube] [Plik z komputera]
                 Link do filmu [________________________]
                 Klient [________]  Szablon [___________]
                 Długość [_______]  Temat [Auto / Własny]

                 [Więcej ustawień]  Codex · 1080 × 1920

Ustawienia       Wróć do projektów          [Przetwarzaj]
```

Po analizie: zakładki **Propozycje / Zmontowane / Ustawienia**, lista wyników i dolny pasek „Zaznaczono N” z **Zmontuj zaznaczone**. „Znajdź więcej” pozostaje akcją dodatkową i nie montuje. W Zmontowanych dominują podgląd i pobranie, nie logi.

## Warunki wymagające szczególnej kontroli

1. Przejście między modułami podczas zapisu lub pracy — powrót odtwarza projekt; brak podwójnych zadań.
2. Błąd pola w zwiniętych ustawieniach — pole staje się widoczne, draft zostaje.
3. Konflikt 409 i odświeżenie — komunikat oraz draft pozostają; nie nadpisujemy serwera.
4. Długi polski tytuł, ścieżka, brak miniatury i telefon — czytelny układ bez wyjeżdżania poza ekran.
5. Stary MP4 po poprawkach oraz błąd opisu publikacji — historia pozostaje dostępna, aktualność i retry są uczciwe.

## Etapy wdrożenia

### 1. Wspólny język wizualny

Pliki: `ui/panel.css`, `ui/quickcontent.css`, `ui/longform.css`, `ui/motion.css`, `ui/publication-description.css`; ewentualnie lokalny font w `public/fonts/` z licencją.

- [ ] Spisać bazowe zrzuty obecnych ekranów przed zmianą. Sprawdzić bieżący diff i istniejące błędy testów.
- [ ] Wprowadzić tokeny powyżej, `color-scheme: light`, typografię, pola 44 px, stany hover/focus/disabled/error, neutralne i główne przyciski.
- [ ] Usunąć kolidujące sztywne ciemne kolory z modułów; zachować ciemne tło samego odtwarzacza.
- [ ] Sprawdzić formularz, menu, dialog i opis publikacji we wszystkich modułach. Kontrast treści ≥ 4,5:1, kontrolek/fokusu ≥ 3:1; sprawdzić wartości narzędziem, nie na oko.

Rezultat: spójna jasna aplikacja; działanie bez zmian.

### 2. Stała nawigacja i responsywny edytor

Pliki: `ui/App.tsx`, `ui/LongForm.tsx`, `ui/MotionStudio.tsx`, CSS tych widoków. Opcjonalnie wydzielić `ui/PanelNavigation.tsx`, jeśli ten sam komponent obsłuży wszystkie moduły.

- [ ] Przenieść wspólną nawigację ponad warunkowe zwroty modułów. Utrzymać istniejące adresy rolek, `#qc` i `#lf` oraz zachowanie Wstecz.
- [ ] Usunąć zdublowane nagłówki powrotu; dodać czytelną ścieżkę w projekcie. Nie przepinać edytora QC na zwykły zapis rolki.
- [ ] Na tablecie i telefonie wdrożyć przełączanie podgląd/edycja i zwijane Menu; zachować wszystkie akcje dostępne klawiaturą.
- [ ] Sprawdzić przejście Rolki → QC → edytor → projekt oraz LongForm/Motion → Rolki; osobno powrót do pracującego zadania i niezapisanego draftu.

Rezultat: te same punkty orientacyjne w całej aplikacji.

### 3. Proste formularze i szczegóły na żądanie

Pliki: `ui/Dialogs.tsx`, `ui/QuickContent.tsx` (`ImportForm`, `AnalysisFields`, `AnalysisSettings`, `OperatorOptions`), `ui/LongForm.tsx` (`ProjectList`), `ui/MotionStudio.tsx`.

- [ ] Przełożyć pola według tabeli widoczności. Wykorzystać obecne `<details>/<summary>`; dodatkowy komponent tylko przy rzeczywiście powtarzającym się zachowaniu.
- [ ] Ujednolicić etykiety „Więcej ustawień”, podsumowania aktywnych wartości i rozwijanie sekcji po błędzie. Zachować wartości pól przy zwijaniu i nieudanym wysłaniu.
- [ ] Zachować walidację slugów i zgodności szablonu; automatyczna nazwa nie może nadpisać ręcznie wpisanej ani kolidować z istniejącą.
- [ ] Zweryfikować klawiaturą: ukryte błędne pole zostaje ujawnione; fokus trafia do niego; czytnik dostaje powiązany błąd; wybrany płatny tryb jest jawny.

Rezultat: wystarczający krótki formularz z pełnym dostępem do dodatkowych opcji.

### 4. Wyniki, postęp i poprawki

Pliki: `ui/QuickContent.tsx` (`CandidateCard`, `FinishedCard`, `JobCard`, `FilmCosts`), `ui/Inspector.tsx`, `ui/Timeline.tsx`, `ui/PublicationDescription.tsx`, `ui/LongForm.tsx`, `ui/LongFormPlan.tsx`.

- [ ] Ograniczyć treść kart do decyzji użytkowniczki; ocenę, historię, metadane i logi zwinąć pod opisanym „Szczegóły” w kontekście danej karty.
- [ ] Zostawić zawsze widoczne błędy, retry, stan zapisu, wcześniejszą wersję i liczbę aktualnie gotowych filmów. Odblokowanie szczegółów nie uruchamia zapytań AI.
- [ ] Zachować podgląd, korektę napisów, kadr, asystenta i render. Surowe parametry edytora ujawniać po wyborze elementu; nie usuwać narzędzi.
- [ ] Ręcznie sprawdzić: zaznaczenie i Znajdź więcej; jawny start montażu; utratę aktualności po poprawce; pobranie poprzedniej wersji; samodzielne retry opisu bez renderowania.
- [ ] W LongForm zachować osobne akceptacje cięć i planu; „Do decyzji” oraz wpływ zmian na sens wypowiedzi nie mogą zniknąć w szczegółach.

Rezultat: wyniki i następna czynność są widoczne bez czytania logów.

### 5. Odbiór i dokumentacja

Pliki testów istniejących: `ui/quickcontent-ui.test.mjs`, `ui/quickcontent-editor.test.mjs`, `ui/longform-view.test.mjs`, `ui/reel-publication-state.test.mjs`, `ui/motion.test.mjs`. Dokumentacja: `PANEL.md`, `docs/quickcontent/gui.md`, `docs/longform/gui.md`.

- [ ] Dodać testy tylko nowej logiki nawigacji/stanu, jeśli powstała; nie testować samych hexów CSS. Istniejące testy źródeł nie zastępują interakcji w przeglądarce.
- [ ] Uruchomić `npm test` i `npm run lint`; porównać z bazą, osobno wskazać wcześniejsze błędy. Niczego nie oznaczać jako zaliczone bez wyniku.
- [ ] W `npm run ui` wykonać odbiór na 1440×900, 1024×768, 390×844 i przy powiększeniu 200%; sprawdzić długie nazwy, puste i błędne stany, fokus, Tab/Shift+Tab/Enter/Escape oraz reduced motion.
- [ ] Obejrzeć wszystkie moduły, dialogi, listy, inspektor i oś. Sprawdzić 409 z zachowaniem draftu, pracujące zadanie po nawigacji i błąd ukrytego pola.
- [ ] Na istniejącym projekcie sprawdzić odtworzenie i pobranie MP4. Realne pobieranie, AI i montaż testować tylko w osobno autoryzowanym odbiorze funkcji; fixture nie dowodzi ich działania.
- [ ] Zaktualizować instrukcję panelu i dołączyć zrzuty przed/po. Nie zmieniać statusu odbioru całego QuickContent/LongForm na podstawie samego redesignu.

## Definicja ukończenia

Każdy moduł korzysta z jasnej palety i wspólnej nawigacji. Główne zadanie da się rozpocząć bez otwierania technicznych ustawień. Szczegóły i ustawienia są dostępne klawiaturą, błędy pozostają widoczne, podgląd/poprawki/pobranie działają. Nie zmieniły się pliki montażowe, style klientów, warunki akceptacji ani zasady aktualności renderów. Wyniki testów i odbioru są zapisane.

## Przekazanie

Wdrażać kolejno 1 → 2 → 3 → 4 → 5. Najpierw ocenić jasny wygląd i nawigację na istniejących ekranach, potem upraszczać formularze. Status wszystkich etapów: **do wykonania**.

Materiały pomocnicze: `gpt-taste`, Ponytail, Superpowers writing-plans oraz UI/UX Pro Max. Wyszukiwanie lokalne UI/UX Pro Max nie zwróciło trafnych wskazówek dla progressive disclosure po zawężeniu zapytania; zasady ukrywania opcji wynikają tu z polecenia użytkowniczki, istniejącego QC i ogólnych wytycznych dostępności skilla.
