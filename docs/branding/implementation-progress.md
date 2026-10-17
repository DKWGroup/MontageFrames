# Branding — przebieg wdrożenia

Plan: `docs/superpowers/plans/2026-10-17-client-branding.md`, specyfikacja w sąsiednim katalogu specs. Użytkowniczka 2026-10-17: „no to wdrazaj to”.

Ruling: zachować obecny checkout `codex/panel-ui-ux` i wszystkie wcześniejsze niezacommitowane zmiany — nowy checkout zgubiłby wymagane integracje panelu; niczego nie resetujemy ani nie commitujemy.

Ruling: przy braku wybranego przez użytkowniczkę trybu wykonania użyć subagent-driven-development dla wydzielonych plików danych, skanera i UI; koordynator odpowiada za renderer i wszystkie integracje. Kontrakty są przekazane jawnie i nie ma współdzielonej własności plików.

Pre-flight: schemat profilu → store/UI/renderer: wspólne typy w src/branding/types.ts, public-relative file. Store → QC: identyfikator szablonu zgodny z IdSchema, `brand-<id>-v<revision>`. Scanner → UI: propozycje i źródła, bez zapisów aktywnego profilu.

Ruling: Vercel dostaje osobny build samego landingu, z dozwolonymi fontami i bez public/reels, public/Brandings, lokalnych API i klientów. Publikacja nie jest wykonywana przez agenta; użytkowniczka prosi o instrukcję.

Kod B0–B6 dostępny: dane/fonty/zasoby, skaner, panel, renderer i integracje. Dowody poszczególnych sprawdzeń oraz nieukończone elementy odbioru w acceptance.md. Checkboxy planu nie są automatycznie oznaczane jako pełny odbiór.

Ruling: CoreText waliduje rzeczywiste pliki i polskie glify; TTC/dfont nie są importowane. Na systemach bez CoreText import jest jawnie niedostępny, nie zastąpiony fałszywym sukcesem.

Ruling: skaner pozwala na ograniczony publiczny odczyt JS/CSS, blokuje fetch/XHR/workery/ramki. Brak semantyki konta zachowuje wynik deterministyczny i pokazuje ograniczenie w GUI. Publiczny transport i przeglądarka sprawdzone rzeczywiście, semantyczny wynik konta nie został potwierdzony.

Ruling: nowe pliki materiałów z hashem nie zmieniają podpisów innych klientów. Starsze style zachowują swój algorytm zależności; samo wdrożenie zmienia wspólny kod renderera i może uczciwie oznaczyć starsze wyniki do odświeżenia.

Ruling: style klientów nie są automatycznie migrowane. W Nowej rolce użytkowniczka wybiera zapisany branding zamiast dotychczasowego stylu; QC udostępnia nowy wersjonowany szablon. Reguły pełnej wypowiedzi SkyClass i cameraScale=1 Bisanza działają także dla nowego stylu brand.

Weryfikacja: pełny npm test poza sandboxem 429 testów: 428 pass, 1 browser skip; osobny test Chromium 8/8 w tym pominięty. npm run lint i tsc bez błędów/ostrzeżeń; build:panel i build:site udane. Prawdziwe trzy MP4 H.264/AAC 540×960, klatki obejrzane. GUI: klient, font, upload PNG z opisem, zapis wersji1–4 i odświeżenie; warianty dawnych snapshotów zachowane.

Przegląd kodu niezależnego ogólnego agenta przerwany przez limit konta; integracje sprawdzono w głównym kontekście i testami. Niezależny reviewer Impeccable wykonał review wizualne i zwrócił dwie poprawki. Po poprawce odtwarzania oraz ponownym zapisie pełnych zrzutów 1120×987 i 390×844 potwierdził ich rozwiązanie: `disposition: ship`, bez pozostałych uwag w tym zakresie. Dokumentacja wyglądu: design-review.md. Brak commitów, push, merge i Deploy. Testowe profile pozostają lokalnie i są ignorowane przez git.
