# MontageFrames — plan poprawek po audycie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ten dokument jest planem, nie poleceniem rozpoczęcia wdrożenia.

**Aktualizacja wykonania 17.10.2026:** użytkowniczka zleciła realizację poza LongForm. Wykonano zadania 3–5 i 8, części 9–11 niezwiązane z LongForm: bezpieczny zapis/upload, wersje rolek/Motion, streaming, podpisy, biblioteka, czytelność landingu, mała refaktoryzacja i oba buildy w CI. Zadania 1–2, 6–7 oraz części LongForm odłożono. Szczegółowy wynik, testy i ograniczenia: [raport napraw](../../audits/2026-10-17/fixes.md). Poniższa lista zachowuje pierwotny plan; nie stanowi deklaracji odbioru niewykonanych przepływów.

**Goal:** zabezpieczyć poprawki i wersje filmów, zamknąć luki LongForm, następnie uprościć codzienną obsługę i dopiero rozwijać odłożone funkcje.

**Architecture:** rozbudować obecne moduły, wykorzystując sprawdzone mechanizmy QuickContent: kontrolę rewizji, kolejkę mutacji, publikację sprawdzonego renderu i streaming mediów. Refaktoryzować według odpowiedzialności po dodaniu testów rzeczywistych błędów; bez przepisywania aplikacji i bez nowej bazy/frameworka.

**Tech Stack:** Node ≥22.12, React 19, Vite, Remotion, Zod, FFmpeg, istniejący operator CLI.

**Spec:** [audyt i reprodukcje](../../audits/2026-10-17/audyt.md), PREFERENCJE.md, frame.md, profile klientów, zalozenia-funkcji-QuickContent.md, zalozenia-funkcji-LongForm.md, docs/longform/gui.md, docs/motion-studio-acceptance.md. Dla UI uzupełnić, a nie zastąpić [wcześniejszy plan](2026-10-17-panel-ui-ux.md).

## Global Constraints

- Zachować master, transkrypt, źródło, ręczne korekty i wszystkie wcześniejsze MP4. Bez płatnego ponawiania AI do samego renderu lub opisu.
- Klient i jego PREFERENCJE wygrywają z globalnym stylem. Nową korektę użytkowniczki zapisać z datą przed kodem; audyt nie jest nową preferencją montażową.
- Brak limitu/logowania CLI nie uruchamia API. LongForm AI wyłącznie przez konto CLI.
- QuickContent „Przetwarzaj” i „Znajdź więcej” nie montują; montaż po jawnym wyborze.
- SkyClass zachowuje wypowiedź i ciszę 1:1; Bisanz bez skalowania kamery. Nie przenosić reguł wyglądu landingu na filmy klientów.
- Brak pomiaru usage nie oznacza zera. Zapis receipt przed walidacją odpowiedzi.
- Jedno ciężkie zadanie; procent wyłącznie z pomiaru. GET pobiera dane, nie uruchamia nowego kodowania.
- Bez publikacji, wysyłania, commitów i instalowania aktualizacji w ramach tego planu bez odrębnego polecenia. Testy AI/renderu na realnych źródłach prowadzić w jawnie wybranym zakresie.

## Review Focus

1. Dwie karty zmieniające ten sam projekt: dokładnie jeden zapis starej rewizji przechodzi, drugi daje 409 bez utraty draftu — zadania 1, 2, 3.
2. Zmiana po gotowym wyniku lub w trakcie renderu: stary MP4 pozostaje do pobrania, ale nie jest aktualny — zadania 1, 3, 5.
3. Zły zapis/pełny dysk/przerwany upload: poprzedni plik pozostaje poprawny, nowe zadanie nie renderuje nieudanych zmian — zadania 3, 4, 5.
4. Restart po odpowiedzi AI, przed walidacją lub w czasie eksportu: zużycie zostaje, retry nie powiela pracy ani plików — zadania 6, 7.
5. Długi tytuł, mobilne 390 px, klawiatura i reduced motion: czytelny nagłówek, dostępne akcje i zachowanie pracy — zadanie 9.

## Kolejność

| Etap | Zadania | Warunek zakończenia |
|---|---|---|
| A — poprawność danych | 1–4 | Poprawki nie giną, pliki nie są mylone, stary wynik nie udaje aktualnego |
| B — wynik i zasoby | 5–8 | Wersje, trwałe usage, kontrolowany eksport, wspólne media |
| C — użytkowanie | 9 | Czytelna biblioteka, mobilny LongForm, poprawiony landing |
| D — porządek i odbiór | 10–11 | Węższe moduły, testy w CI i aktualna macierz gotowości |
| E — funkcje odłożone | 12 | Kolejne małe kontrakty z osobnym odbiorem; brak udawania gotowego L5/Premiere |

Nie zaczynać od generalnej refaktoryzacji. Zmiany A/B mają mierzalne błędy i własne testy. UI może korzystać z istniejących API po ustabilizowaniu kontraktów; nie wymaga nowego design systemu.

### Zadanie 1: bezpieczne mutacje i stan LongForm (#1–#3)

**Files:** create `ui/longform-project-store.mjs`, `ui/longform-project-store.test.mjs`; modify `ui/longform-server.mjs`, `src/longform/schema.mjs`; test `ui/longform-server.test.mjs`.

**Interfaces:** `mutateLongForm(id, {field, expectedRevision}, update)` serializuje odczyt, porównanie i zapis w obrębie jednej instancji serwisu; `field` to roughcutRevision/planRevision. `validateRoughCutForProject(doc, {duration, words, client})` zwraca zwalidowany dokument albo błąd 400; długość projektu jest nadrzędna. Nie eksportować uniwersalnego frameworka store.

- [ ] Dodać test dwóch równoległych PUT rewizji 5: statusy 200 i 409, jedna zmiana i rewizja 6. Objąć też zapis planu i approve.
- [ ] Dodać test 10 s źródła + `sourceDuration:1000`, zakres 500–501, nieznane wordIds i cięcie wewnątrz słowa: 400, niezmienione pliki. SkyClass odrzuca automatyczne cięcie ciszy/wtrąceń.
- [ ] Dodać test edycji rough cut dla cuts-approved/plan-review/done: awaiting-cut-review, planStale/renderStale true; dotychczasowy MP4 zostaje archiwalny. Podczas planning/montage zwrócić 409.
- [ ] Dodać test approve starego planu: 409 i zero wywołań renderera. Test świadomego ręcznego cięcia chronionego słowa ma utrwalać ustalony kontrakt, bez cichej zmiany decyzji.
- [ ] Uruchomić `node --test ui/longform-server.test.mjs` i potwierdzić, że nowe asercje wykrywają obecny błąd.
- [ ] Wprowadzić powyższe funkcje i podpiąć wszystkie mutacje; osobne pliki JSON zapisywać tak, by stan nie wskazywał akceptacji nieukończonej operacji. Zatrzymać wdrożenie przy niespójnym dokumencie, zachowując pliki.
- [ ] Uruchomić testy store i serwera; sprawdzić stare API w GUI i zmiany po akceptacji. Bez commita.

### Zadanie 2: zachowanie draftu planu (#4)

**Files:** modify `ui/LongFormPlan.tsx`; create `ui/longform-plan-draft.mjs`, `ui/longform-plan-draft.test.mjs` tylko jeśli czysta funkcja stanu uprości rzeczywisty test interakcji.

**Interfaces:** stan konfliktu zawiera lokalne `Edit`, rewizję bazową i wiadomość; pobranie nowej wersji nie zastępuje `Edit` bez działania osoby edytującej.

- [ ] Test: zmień hook i tytuł, zasymuluj 409, potwierdź zachowany tekst i brak automatycznego drugiego PUT.
- [ ] Zastąpić automatyczne `load()` po 409 panelem konfliktu z kopiowaniem draftu i jawnym „Wczytaj wersję z serwera”.
- [ ] Sprawdzić dwie karty i powrót do projektu; testować kliknięcie i widoczny tekst, nie samą obecność napisu w źródle.

### Zadanie 3: równy kontrakt zwykłych rolek i LongForm w edytorze (#7, część #1)

**Files:** modify `ui/server.mjs`, `ui/App.tsx`, `ui/api.ts`; create `ui/reel-store.mjs`, `ui/reel-store.test.mjs`; extend `ui/quickcontent-editor.test.mjs`.

**Interfaces:** GET reel każdego pochodzenia zwraca X-Edit-Revision; PUT wymaga tej rewizji. Błąd zapisu utrzymuje draft i blokuje montage/render/chat zależne od zapisanego dokumentu. LongForm edytowany przez ten endpoint aktualizuje jego stan przez serwis z zadania 1.

- [ ] Test dwóch okien zwykłej rolki: stare dane → 409, nowy zapis nie znika.
- [ ] Test błąd zapisu + Render: zero requestów startu, draft i komunikat zostają również dla rolki bez origin QC.
- [ ] Test edycji rolki LongForm w zwykłym edytorze: wynik przestaje być current, wcześniejszy plik pozostaje.
- [ ] Użyć istniejącej `createReelSaveQueue`; przenieść warunki ochrony poza `isQC`. Dodać serializowany zapis po stronie serwera.
- [ ] Uruchomić testy edytora/store, kontrolę ręcznego tekstu i undo bez zmiany czasów ASR.

### Zadanie 4: poprawny upload zwykłych nagrań (#5)

**Files:** modify `ui/server.mjs`; create `ui/upload.test.mjs` i ewentualnie mały `ui/upload.mjs`, jeśli to potrzebne do testowania rzeczywistego handlera.

**Interfaces:** istniejąca nazwa zawsze 409; najkrótsza poprawna wersja nie obiecuje deduplikacji.

- [ ] Test: istniejące `abcd` i nowe `efgh` pod tą samą nazwą, długość 4: 409, zachowane `abcd`.
- [ ] Test dwóch równoczesnych uploadów i zerwanego streamu: nie ma współdzielonego .part ani podmiany ukończonego pliku.
- [ ] Usunąć reużycie po rozmiarze, użyć unikalnego pliku tymczasowego i publikacji bez nadpisania. Walidować rozszerzenie i ścieżkę istniejącym mechanizmem safePath.
- [ ] Uruchomić testy uploadu i kontrolę komunikatu formularza; bez przesyłania prywatnych nagrań do usług zewnętrznych.

### Zadanie 5: wersjonowane eksporty i aktualność (#6, #12)

**Files:** modify `ui/server.mjs`, `scripts/motion-render.mjs`, `ui/motion-server.mjs`, `scripts/quickcontent-render.mjs`, `ui/reel-publication-state.mjs`; extend `scripts/quickcontent-render.test.mjs`, `ui/reel-publication-state.test.mjs`, `ui/motion.test.mjs`.

**Interfaces:** opublikowany rekord ma ścieżkę, wersję, rewizję, podpis wejścia i verified; przeglądarki pobierają rekord, nie rekonstruują nazwy. Motion dostaje wersję zestawu artefaktów, nie osobne niepowiązane wersje obrazków. Zachować legacy odczyt istniejących plików.

- [ ] Test dwóch renderów: osobne wersje, pierwsza identyczna bajtowo; błąd drugiego zachowuje pierwszą. ffprobe poprzedza publikację.
- [ ] Test zmiany danych podczas renderu: plik może zostać wersją archiwalną, nie current. Zmiana rendererów/fontów/mediów też unieważnia właściwy wynik.
- [ ] Test zmiany tylko `src/motion` nie unieważnia SkyClass; zmiana stylu SkyClass unieważnia jego wynik. Jawna lista współdzielonych zależności obejmuje wszystkie realne importy.
- [ ] Reużyć `nextRenderPath`, `publishVerifiedRender` i izolowanych snapshotów. Operator zwykłych rolek ma edytować dane; deterministyczny krok serwera publikuje MP4 i generuje opis.
- [ ] Uruchomić testy renderu/publication/Motion; dopiero później mały neutralny render na fixture, kontrola obrazu i ffprobe. Bez renderowania całej biblioteki.

### Zadanie 6: trwałe usage LongForm (#8)

**Files:** modify `ui/longform-server.mjs`, `ui/longform-project-store.mjs`; extend `ui/longform-server.test.mjs`.

**Interfaces:** `ctx.recordUsage(receipt): Promise<void>` kończy się dopiero po atomowym zapisie; identyfikator receipt/operacji zapobiega duplikatom. Nie zmieniać historycznego „brak pomiaru” w 0.

- [ ] Provider testowy: await recordUsage, odczyt pliku natychmiast, potem niepoprawna odpowiedź — receipt już istnieje.
- [ ] Test przeplotu zapisu postępu i usage: oba zostają; retry tego samego receipt nie zwiększa sumy.
- [ ] Zapis w kolejce zadania 1; zachować pomiar mimo błędu parsowania/walidacji. Nie uruchamiać modeli do testu.
- [ ] Uruchomić testy serwera i quickcontent-costs; sprawdzić „Zużycie AI” na danych fixture.

### Zadanie 7: kontrolowany eksport OTIO i cenzura (#9–#10)

**Files:** modify `ui/longform-server.mjs`, `scripts/longform-otio.mjs`, `ui/LongForm.tsx`, `ui/LongFormPlan.tsx`; extend `ui/longform-server.test.mjs`, `scripts/longform-otio.test.mjs`.

**Interfaces:** POST `/:id/export/otio/prepare` przygotowuje pod blokadą cache podpisany source+segments+mutes; GET `/:id/export/otio` pobiera gotowy eksport albo 409 z powodem. Wystarczy istniejący mechanizm joba; nie tworzyć drugiej kolejki.

- [ ] Test dwa przygotowania + trwający render: najwyżej jeden proces FFmpeg; drugi dostaje stan istniejącego zadania albo 409.
- [ ] Test GET przed przygotowaniem: zero procesów, po przygotowaniu: gotowy manifest i stabilne media.
- [ ] Test audio na syntetycznym tonie: 80% wskazanego słowa wyciszone według okna, przejścia 5 ms, niezmienione otoczenie. Sprawdzić odsłuchem próbkę.
- [ ] Wprowadzić bezpieczne przygotowanie/cache i rampę. Kruka dodać dopiero z plikiem i licencją; brak zostawić jako jawne ostrzeżenie.
- [ ] Uruchomić testy eksportu/serwera. Import Premiere pozostaje osobnym odbiorem z realną aplikacją, nie symulacją.

### Zadanie 8: wspólny streaming mediów (#11)

**Files:** create `ui/media-response.mjs`, `ui/media-response.test.mjs`; modify `ui/server.mjs`, `ui/quickcontent-server.mjs`, `ui/motion-server.mjs`.

**Interfaces:** `serveMedia(req, res, file, type)` przeniesione z QC bez osłabiania walidacji ścieżek. Obsługuje GET/HEAD, prawidłowy Range→206, błędny zakres→416 i przerwany klient.

- [ ] Przenieść istniejące przypadki parseRange/serveMedia do współdzielonych testów; dodać suffix range, HEAD i download filename.
- [ ] Zastąpić pełny `readFile` Motion streamem, wpiąć helper do `/api/file`; zachować kontrolę allowed paths.
- [ ] Uruchomić testy mediów oraz QC/Motion; sprawdzić przewijanie neutralnego długiego filmu i pobieranie ZIP.

### Zadanie 9: konkretne poprawki UX i landingu (#13–#15)

**Files:** modify `ui/LongForm.tsx`, `ui/longform.css`, `ui/App.tsx`, `ui/server.mjs`, `ui/panel.css`, `ui/Landing.tsx`, `ui/landing.css`; extend testy widoków/library.

**Interfaces:** biblioteka zwraca opcjonalne `title`, `module`, `renderState`, `thumbnail` oprócz stabilnego name; brak metadanych ma czytelny fallback. Nie zmieniać ID projektów ani plików.

- [ ] Reprodukować nagłówek LongForm przy 390×844; rozdzielić układ nagłówka i linków, sprawdzić 390/768/1440 oraz 200% zoom. Zero dzielenia „poziomy” na litery.
- [ ] Pokazać tytuł propozycji zamiast opaque ID, stan filmu i zwarty wiersz; dodać filtrowanie/szukanie dopiero na tych samych danych. Test tytułu, braku miniatury i przejścia do właściwego edytora.
- [ ] Landing: treść pomocnicza ≥13 px, podstawowa około16–18 px; skrócić lokalne nagłówki do 2 wierszy bez zmniejszania całości; mobilna tabela jako czytelne rekordy.
- [ ] Dołożyć jeden rzeczywisty, legalny klip przed/po z posterem i obsługą reduced motion. Jeśli brak materiału dopuszczonego do pokazania, pozostawić jawnie podpisaną symulację; nie używać filmu klienta jako publicznego demo bez uprawnienia.
- [ ] Ponownie uruchomić design-taste lint/inspect i obejrzeć wszystkie szerokości. Oznaczyć uzasadnione wyjątki (mockup telefonu, realne pole/tabela/data-ui), nie usuwać funkcji dla poprawienia licznika. Kontrola klawiatury, fokusów i kontrastu ≥4,5:1 dla małego tekstu.
- [ ] Ruch doszlifować po czytelności; bez wymuszania AIDA, GSAP scroll-pinning ani losowania fontów w aplikacji roboczej.

### Zadanie 10: mała refaktoryzacja i pełniejsze CI (#17)

**Files:** modify `ui/QuickContent.tsx`, `package.json`, `eslint.config.mjs`, `.github/workflows/release.yml`; wydzielać `ui/quickcontent/ImportForm.tsx`, `ProjectResults.tsx`, `ProjectSettings.tsx` tylko przy przeniesieniu istniejących odpowiedzialności.

**Interfaces:** istniejące API, hash-route i payloady pozostają kompatybilne. Każdy wydzielany komponent przyjmuje jawne dane i akcje; stan rewizji i selekcji ma jednego właściciela.

- [ ] Zachować/uzupełnić test powrotu do projektu, wyboru, aktualności wersji i konfliktu przed przenoszeniem komponentów.
- [ ] Wydzielić jeden obszar na raz, nie pojedyncze funkcje tylko dla zmniejszenia liczby linii; test po każdym ruchu. Nie scalać automatycznie styli klientów.
- [ ] Objąć lint źródłami `src`, `ui`, `scripts` z jawnymi wyłączeniami wygenerowanych/historycznych plików; zmierzyć nowe wyniki zamiast od razu autofix całego repo.
- [ ] CI: po npm test i lint wykonać Remotion bundle oraz Vite build przed paczką. Brak modeli/mediów na czystym klonie nie blokuje tych buildów.
- [ ] Uruchomić pełną regresję raz po ukończeniu zmian; porównać rozmiar chunka i start panelu przed/po bez arbitralnego celu „poniżej500 kB”.

### Zadanie 11: aktualna macierz gotowości i realny odbiór (#16)

**Files:** modify `AGENTS.md`, `PANEL.md`, `docs/longform/implementation-progress.md`, `docs/quickcontent/acceptance.md`; create `docs/acceptance-matrix.md`, `docs/longform/benchmark.md`, `docs/premiere/acceptance.md` z faktycznymi wynikami albo jawnym „nie sprawdzono”.

- [ ] Każdemu wymaganiu nadać stan: brak kodu / kod / test fixture / realny odbiór / ograniczenie; data, dowód i następny krok.
- [ ] Usunąć fałszywe aktualne „LongForm bez kodu”; zachować historyczne wpisy jako historię. Potwierdzić koszty i profanity w kodzie zamiast przepisywania starych braków.
- [ ] QuickContent: prawdziwy YouTube oraz upload lokalny → selekcja → montaż → poprawka → nowa wersja → pobranie. Osobno SkyClass z czasu >0 i odsłuch, brak 4K, więcej/duplikaty/wyczerpanie, restart/anulowanie.
- [ ] LongForm: 3 rzeczywiste nagrania poziome, ochrona sensu i decyzji, maska na różnych tłach, wynik i cenzura. Wcześniej odrzucać nie16:9 z czytelnym komunikatem lub wdrożyć jawny wybór kadru — nie udawać poziomu zachowując pionowe format.
- [ ] Motion: każdy oferowany format, prawdziwe assety, audio i restart w trakcie zadania; brak wyniku nie może pokazać poprzedniego pliku jako nowego sukcesu.
- [ ] Aktualizator: osobna kopia instalacji, nowy release, lokalny klient/szablon i konflikt kodu, backup/rollback po przerwaniu oraz brak internetu. Nie instalować na bieżącym warsztacie do samego testu.
- [ ] Dopiero po przejściu całej macierzy oznaczyć moduł jako odebrany. Każdy nieprzeprowadzony krok pozostaje otwarty z powodem.

### Zadanie 12: osobne następne plany dla funkcji odłożonych

Ten etap nie blokuje zabezpieczeń A–D. Każdy podpunkt wymaga własnego krótkiego kontraktu i kryteriów, a nie dopisywania wszystkiego do dużego PR.

- [ ] LongForm materiał: upload komputera/master QC, walidacja formatu i jawna rozdzielczość.
- [ ] LongForm przegląd: odsłuch przed/po i dubli, J/K/L, przywrócenie pozycji; weryfikacja na prawdziwym długim materiale.
- [ ] LongForm wynik: ręczne napisy bez zmiany czasów, czat z checkpointem, opis publikacji z rozdziałami i oddzielnym usage.
- [ ] LongForm plan/research: manipulacja blokami i pojedynczym efektem, źródła i licencje, zweryfikowane dane. Następnie L5 według katalogu efektów; nie rejestrować typu, którego renderer nie obsługuje.
- [ ] Premiere: najpierw P0 spike na rzeczywistej wersji, potem P1 kompletny pakiet OTIO+alfa+audio+SRT, dopiero P2–P5 plugin. Obecny OTIO jest częścią P1, nie ukończonym pakietem.
- [ ] Cennik/billing i integracje Hermes/głos/Drive pozostawić oznaczone jako planowane do czasu osobnego zlecenia i dowodów działania.

## Odbiór planu i sposób realizacji

Plan nie przewiduje nowych zależności ani generalnej wymiany architektury. Najbliższy zakres do realizacji: zadania1–4, potem5–8. Każde kończy test regresji i konkretny działający przepływ, dzięki czemu można odrzucić pojedynczą zmianę bez cofania reszty. Duży redesign i pełny plugin Premiere nie są warunkiem naprawy obecnych błędów.

Sprawdzenie własne: wszystkie17 wniosków audytu mają zadanie; pięć klas ryzyka ma test lub jawny odbiór. Szczegóły nieodebranych L5/Premiere pozostają w osobnych specyfikacjach, bez deklarowania niepotwierdzonych API. Implementację rozpocząć po zleceniu; aktualne zamówienie obejmuje audyt i przygotowanie planu.
