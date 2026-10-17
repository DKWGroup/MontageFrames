# Panel MontageFrames w przeglądarce

Wrzucasz nagranie, operator AI montuje je według zasad klienta, poprawiasz szczegóły w podglądzie i renderujesz do `klienci/<klient>/Render/`.

## Zapis i wersje po audycie (2026-10-17)

Zwykły edytor, podobnie jak QuickContent, sprawdza rewizję przed zapisem. Konflikt zachowuje lokalny szkic; błąd zapisu blokuje montaż i render do czasu rozwiązania problemu. Plik uploadu o istniejącej nazwie daje konflikt — zmień nazwę, zamiast traktować zgodny rozmiar jako identyczny film.

Render zwykłej rolki z panelu tworzy kolejne `<nazwa>-vNNN.mp4` ze snapshotu i weryfikuje wynik. Poprawka oznacza poprzedni film jako wymagający nowego renderu; wcześniejsze pliki pozostają do pobrania. Motion również numeruje preview/draft/final i ich artefakty. Bezpośredni ręczny render CLI używa ścieżki podanej w poleceniu.

Biblioteka pokazuje tytuły propozycji, miniatury i stan wyniku; wyszukiwanie obejmuje tytuł i klienta. Zakładka Render pokazuje wersje wybranej rolki. Aktualny stan i granice odbioru: [macierz](docs/acceptance-matrix.md), [raport napraw](docs/audits/2026-10-17/fixes.md).

## QuickContent — moduł w odbiorze *(2026-10-15)*

W bocznym menu wybierz **QuickContent → Nowy projekt** (`http://127.0.0.1:3100/#qc`). Wklej YouTube albo wgraj film, wybierz klienta lub przestrzeń roboczą, szablon, Auto/tematy i długość. „Przetwarzaj” zapisuje źródło, uruchamia Whisper i analizę; dopiero „Zmontuj zaznaczone” montuje wybrane propozycje. Postęp pokazuje etap i rzeczywisty pomiar; partia liczy aktualne rendery. Rolka otwiera istniejący edytor z napisami, kadrem, czatem i wersjami MP4.

Narzędzia: Node≥22, FFmpeg/ffprobe, yt-dlp z EJS oraz Whisper Python CLI i lokalny model `large-v3-turbo` w `~/.cache/whisper/`. Model nie pobiera się w ukryciu. Materiał źródłowy i ASR są lokalne; tekst analizy trafia do wybranego dostawcy AI.

QuickContent domyślnie używa **Codex CLI zalogowanego kontem ChatGPT**. W formularzu i projekcie wybierasz Codex, Claude Code (konto terminalowe) albo jawnie płatne OpenAI API. Tryby konta nie przełączają się automatycznie na klucz API; wykorzystują subskrypcję i jej limity. Codex jest tutaj zalogowany; Claude wymaga `claude auth login`. Klucze z lokalnego `.env` pozostają wyłącznie po stronie serwera i są używane tylko po wyborze API. Wskaźnik Claude w bocznym menu dotyczy starszych rolek; QuickContent ma własny status operatora.

QuickContent działa także bez GUI. Terminal uruchamia tę samą kolejkę i zapisuje te same projekty; jeśli działa panel tego repozytorium, łączy się z nim. W przeciwnym razie uruchamia własny worker na czas polecenia:

```bash
npm run quickcontent -- list
npm run quickcontent -- status <projekt-lub-job>
npm run quickcontent -- import 'https://youtu.be/VIDEO_ID' --operator codex
npm run quickcontent -- import '/ścieżka/film.mp4' --operator claude
npm run quickcontent -- montage <projekt> --operator codex
npm run quickcontent -- retry <job> --operator codex
```

`montage` bez listy ID montuje zapisane zaznaczenia. Można podać po ID projektu listę ID propozycji rozdzielonych przecinkami. Polecenia `process` i `more` uruchamiają analizę; same nie montują. `--help` pokazuje opcje. Przerwanie nie usuwa źródeł i ukończonych wersji.

Naprawa montażu2026-10-15: model dostaje samowystarczalny kontrakt JSON zmian zamiast poleceń edycji plików. `data:null` jest odrzucane przed zapisem, a metadane, czasy i efekty klienta są zachowywane. Potwierdzono pełny montaż42,581s przez konto Codex i krótki test kontraktu API. [Dowód i ograniczenia](docs/quickcontent/terminal-operator-plan.md).

Whisper pokazuje procent z liczby przetworzonych ramek audio, rozpoznany czas / długość nagrania, czas trwania etapu i oszacowanie pozostałego czasu z procesu. Ładowanie modelu ma osobny komunikat bez wymyślonego procentu. Postęp zmienia się po ukończeniu fragmentu;100% pojawia się dopiero po kontroli i zapisie transkrypcji. Zapisany wynik jest używany ponownie przy retry analizy AI.

**Pion i koszty (2026-10-15):** rozdzielczość rolki9:16 wybierasz w formularzu lub nad propozycjami:720×1280,1080×1920 (domyślna),2160×3840. Jakość pobrania YouTube jest oddzielna. Propozycje pokazują surowy zakres źródła; dopiero kliknięcie „Zmontuj zaznaczone” wycina i montuje wybrane pozycje. Domyślne kadrowanie wypełnia pion. NaMac lokalny detektor próbuje wykryć twarz co sekundę; kadr płynnie podąża za jej pozycją. Mocne zbliżenia źródła mogą być lekko oddalone na rozmytym tle, żeby zostawić miejsce na twarz i napisy. Brak detekcji utrzymuje ostatnią pozycję, a całkowity brak detektora daje jawne wyśrodkowanie. Ręczna korekta w zakładceKadr wyłącza śledzenie; nie gwarantujemy automatycznego wyboru aktualnego mówcy w rozmowie wielu osób.

Karta „Koszty projektu” rozdziela analizę/znajdowanie, montaż i czat. KwotyUSD wynikają z zapisanych tokenów odpowiedzi i jawnego cennika, bez podatków; brak pomiaru nie oznacza0. Dawnej analizy nie powtarzamy dla odzyskania kosztu. Whisper, wycinanie, kadrowanie i render mają0USD opłatyAPI — wykorzystują lokalny komputer. Wybranie checkboxa nie uruchamiaAI. Orientacyjny koszt kolejnej odpowiedzi montażu pojawia się po pierwszym zmierzonym montażu; nie jest gwarantowaną ceną rolki. Zmiana rozdzielczości i retry po błędzie renderu używają ukończonego montażu bez nowegoAI, zachowując ręczne poprawki i czat. Wcześniejsze MP4 pozostają w wersjach.

Po zmianie tekstu dotychczasowy MP4 staje się archiwalny; wyrenderuj nową wersję, aby dostać aktualny plik i badge. Konflikt zapisu zachowuje draft. Master jest w `klienci/<klient>/QuickContent/<projekt>/` albo `.quickcontent/workspace/<projekt>/`; rendery w folderze klienta `Render/` lub `out/`, z numerem wersji.

**Gotowe filmy:** otwórz projekt QuickContent i wybierz zakładkę **Zmontowane (N)** tuż pod tytułem źródła. Każda aktualna rolka ma odtwarzacz, **Obejrzyj i popraw** oraz **Pobierz**. Opcje techniczne, koszt i zakończone zadania są w **Ustawieniach**. Napisy poprawiasz w edytorze; po zmianie wyrenderuj poprawki. W zakładceKadr możesz wyłączyć **Podążaj za twarzą** lub przesunąć obraz ręcznie. Śledzenie bazuje na lokalnej detekcji co sekundę i wygładzonym ruchu; na komputerze bez detektora pokazujemy fallback.

**Pełny odbiór nadal trwa.** [Raport sprawdzeń i ograniczeń](docs/quickcontent/acceptance.md), [założenia](zalozenia-funkcji-QuickContent.md), [plan wdrożenia](plan-wdrozenia-QuickContent.md), [ekrany GUI](docs/quickcontent/gui.md), [research OpusClip](docs/quickcontent/opusclip-research.md). Dalsza instrukcja opisuje także dotychczasowy montaż rolek.

## Uruchomienie

```bash
npm install
npm run ui
```

Panel działa pod adresem http://127.0.0.1:3100.

Wymagania:
- Node 22 lub nowszy,
- ffmpeg (`brew install ffmpeg`),
- operator AI (opis niżej).

Narzędzie do transkrypcji (Parakeet) pobiera się samo przy pierwszej rolce.

## Operator AI

Panel nie ma własnej sztucznej inteligencji. Montaż wykonuje Claude Code uruchamiany w tle z tymi samymi zasadami co na czacie: `CLAUDE.md`, `PREFERENCJE.md`, `frame.md` i pliki klientów. Operatora wybierasz w **Ustawieniach** panelu.

| Operator | Jak podłączyć | Kto płaci |
|---|---|---|
| Claude Code na koncie (domyślny) | zainstaluj Claude Code i raz w Terminalu wpisz `claude auth login` | montaże liczą się do planu zalogowanego konta (Pro lub Max) |
| Claude z kluczem API | Ustawienia → „Claude z kluczem API” → klucz z console.anthropic.com | właściciel klucza, za zużyte tokeny (koszt każdego montażu widać w logu) |

Klucz API zostaje na tym komputerze w pliku `.panel.json`, który jest poza git, i nie wraca do przeglądarki. Model: Opus (domyślnie, najstaranniejszy) albo Sonnet (szybciej i taniej).

## Co jest gdzie

- **Nowa rolka:** wybierasz klienta (albo zakładasz nowego), dodajesz nagranie, przebitki i nazwę. Panel uruchamia transkrypcję, cięcie ciszy i szkic, potem operator montuje i na życzenie od razu renderuje.
- **Napisy:** kliknij słowo, żeby poprawić tekst albo ustawić słowo-klucz i akcent. Czasy słów zostają bez zmian.
- **Grafiki:** przesuwasz o 0,25 s albo usuwasz.
- **Operator AI:** poprawki opisane słowami („napisy o 10% niżej”) oraz „Pełny montaż”. Operator pamięta rozmowę o danej rolce.
- **Render:** plik trafia do `klienci/<klient>/Render/<nazwa>.mp4`, a rolki bez klienta do `out/`. Gotowe pliki otworzysz w Finderze albo pobierzesz.

Każda zmiana zapisuje się od razu. Cofasz przyciskiem „Cofnij” albo ⌘Z. Kopie zapasowe trafiają do `public/reels/<nazwa>/historia/`. Gdy operator pracuje nad rolką, ręczna edycja tej rolki czeka.

Czat z Claude'em w Claude Code działa jak dotąd, na tych samych plikach.

## Udostępnianie innym

1. **Ktoś dostaje repo** (np. montażystka). Robi kroki z „Uruchomienia” na swoim komputerze i podłącza **własnego** operatora, czyli swoje konto Claude albo swój klucz API, więc płaci za swoje montaże.
   - Nagrania i rendery nie są w git. Każda osoba wrzuca swoje.
   - Zasady i pliki klientów (`klienci/*/PREFERENCJE.md`) są w git. Przed udostępnieniem zdecyduj, czy ta osoba ma je widzieć.
2. **Ktoś dostaje link do Twojego panelu.** Panel słucha tylko na tym komputerze. Udostępnienie go pod linkiem (np. przez Tailscale) wymaga dodania hasła, a to osobny krok (etap 4 w specyfikacji). Plan Claude jest przypisany do jednej osoby, więc gdy montuje ktoś inny, przełącz operatora na klucz API.
3. **Platforma dla wielu osób.** To osobny projekt: konta, transkrypcja i render na serwerze, klucze API użytkowników. Zewnętrzna platforma nie może logować kontem Claude.ai. Szczegóły: `docs/superpowers/specs/2026-10-07-panel-przegladarkowy-design.md`.

## Gdy coś nie działa

- **„Operator nie jest zalogowany”:** w Terminalu wpisz `claude auth login`, potem w panelu kliknij „Sprawdź ponownie”.
- **„Nie znaleziono programu claude” albo „…ffmpeg”:** doinstaluj brakujący program.
- **„Port 3100 is already in use”:** panel już działa w innym oknie Terminala. Zamknij go albo otwórz tamten adres.

## Edycja w Remotion Studio

Bloki ujęć, grafik i napisów pozostają na osi czasu przez całą rolkę. Kliknięcie wybiera konkretny blok i otwiera jego inspektor. Podstawowe ustawienia czasu i wyglądu zapisują się automatycznie; synchronizator przenosi je do sekcji `studio` w `reel.json`, którą uwzględniają również panel i render.

`npm run dev` synchronizuje definicje bloków i uruchamia obserwowanie zmian. `npm run studio:sync` służy do synchronizacji ręcznej. Definicje w `src/studio/<rolka>/` mają osobny plik dla każdego bloku, aby edycja nie zmieniała lokalizacji pozostałych ścieżek. Właściwości domyślne kompozycji zapisuje Studio w `src/Root.tsx`.


## Opis do publikacji (globalnie, 2026-10-15)

Po ukończeniu filmu panel tworzy przezGPT‑6LunaAPI krótki opis z jego transkrypcji: hook, puenta ze słowami kluczowymi i5hashtagów. Znajdziesz go przy gotowym filmie wZmontowane lub wRender edytora. PrzyciskKopiujopis kopiuje całość. Koszt jest osobny od montażu przez kontoCLI. BłądAPI nie usuwa filmu; Ponówtylkoopis nie renderuje go ponownie. Dawna biblioteka nie jest automatycznie wysyłana doAPI przy oglądaniu.

KacperBisanz ma wyłączone zoomy kamery; tracking w poziomie pozostaje. Poprzednie plikiMP4 zostają wwersjach. Opis zapisuje się również w `public/reels/<rolka>/publication.txt` iJSONz pomiaremkosztu. Bezpośredni eksportCLI kończ poleceniem `node scripts/reel-description.mjs <rolka>`.

### Własne wytyczne i poprawianie opisów (2026-10-15)

QuickContent → projekt → **Ustawienia**: pole wskazówek do opisu przed pierwszym montażem. Przy konkretnej rolce można zapisać inne wskazówki. Opisy powstają w pierwszej osobie autora. Przy gotowym opisie zmień tekst w polu i kliknij **Zapisz opis bez AI**; zapis jest bezpłatny, nie uruchamia renderu. **Kopiuj opis** kopiuje aktualnie widoczny tekst. Ponowne generowanie korzysta zAPI i jest rozliczane oddzielnie.

## Branding klientów (2026-10-17)

Istniejący klienci otwierają się z ustalonym stylem: Bisanz, SkyClass, Herod, Ameryka, GlowUp, Vital lub Happy News. Panel pokazuje jego rzeczywiste kolory/fonty i natywny podgląd. Zakładka **Preferencje** zawiera aktualny plik klienta, a **Materiały** udostępnia wcześniejsze logo, zdjęcia i przebitki. Parametry ustalonej oprawy są tylko do odczytu; wybierz **Własny styl**, aby używać edytowalnego presetu. Zapis profilu tworzy wersję z właściwym styleId, domyślnie wybieraną przy nowych zleceniach. Starsze zapisane własne profile nie są automatycznie migrowane. [Szczegóły integracji](docs/branding/established-integration.md).

Wybierz **Branding klientów** w menu (`/panel#branding`), klienta albo „Dodaj klienta”. W sekcjach dodasz wiedzę i adres strony, logo/zdjęcia/przebitki z opisami, paletę z limitem4/5/6, fonty i styl napisów. Fonty domyślnie pochodzą z lokalnego Maca; dostępne są również fonty aplikacji, Google Fonts i własny plik. Importowane są konkretne pliki z polskimi znakami; TTC/dfont wymagają osobnego TTF/OTF. Sam upload nie instaluje fontu w systemie.

Podgląd9:16 używa tego samego komponentu napisów co render. „Odtwórz od początku” uruchamia próbkę. Na telefonie przełączysz Ustawienia/Podgląd rolki. Zmiany utrwala **Zapisz branding** — każda wersja zostaje zachowana. Konflikt zapisu409 zachowuje draft i pozwala go pobrać. Nie nadpisuj ręcznych PREFERENCJE klienta formularzem.

W **Nowej rolce** pole „Wygląd rolki” pozwala wybrać zapisany branding zamiast dotychczasowego stylu. W **QuickContent** zapisany profil pojawia się jako wersjonowany szablon klienta. Własny profil bez zaimportowanego fontu można zapisać jako draft, ale nie użyć do montażu; ustalony styl wymaga swoich fontów aplikacji. Zmiana profilu wpływa na nowe zlecenia; wcześniejsze projekty zachowują snapshot.

Analiza strony działa na publicznym URL, bez logowania. Najpierw otrzymujesz propozycje i źródła; dopiero **Zastosuj wybrane dane** zmienia draft. Gdy konto AI nie może uporządkować wiedzy, odczytane treści i style pozostają dostępne, z ograniczeniem w panelu. Nie wszystkie strony oparte na XHR/workerach można odczytać. [Dowody i ograniczenia](docs/branding/acceptance.md).

Publikacja publicznej strony: [ustawienia Vercela](docs/vercel.md). Użyj `npm run build:site` i `dist-site`; pełny lokalny silnik nie jest automatycznie przenoszony na Vercela.
