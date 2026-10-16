# MontageFrames

Lokalna aplikacja do montażu rolek, wybierania fragmentów długich nagrań (QuickContent), pracy nad filmem poziomym i animacji Motion Studio. Panel po polsku, React/Vite + Remotion.

## Instalacja

Wymagany Node.js **22.12 lub nowszy** i npm. Pełny zestaw lokalnych narzędzi wideo jest rozwijany i sprawdzany na macOS. Detekcja twarzy i maska osoby korzystają z Apple Vision / Swift; na innych systemach nie należy zakładać identycznej obsługi.

```bash
git clone https://github.com/DKWGroup/MontageFrames.git
cd MontageFrames
npm ci
npm run ui
```

Strona produktu: http://127.0.0.1:3100. Panel montażowy: http://127.0.0.1:3100/panel. `npm ci` generuje pusty rejestr Remotion; panel startuje bez prywatnych nagrań i projektów. Gdy instalowano z `--ignore-scripts`, uruchom `npm run studio:sync` przed sprawdzaniem typów.

## Co zawiera baza

- kod programu, testy, dokumentację, style montażowe;
- klientów w `klienci/`, ich `PREFERENCJE.md`, logo i stałe materiały brandingowe;
- lokalne fonty oraz konfigurację narzędzi projektu.

Baza nie zawiera filmów, renderów, transkrypcji, historii montażu, kolejki zadań, prywatnych projektów ani kluczy API. Są to pliki lokalne ignorowane przez Git. Wcześniejsze commity repozytorium mogą zawierać metadane rolek; bieżąca dystrybucja ich nie zawiera, historia nie jest przepisywana.

## Narzędzia do montażu

Samo uruchomienie panelu nie instaluje modeli ani zewnętrznych programów. Do przetwarzania zainstaluj zależności odpowiednie dla modułu:

- Python **3.11 lub nowszy**, dostępny jako `python3` w PATH — parser konfiguracji operatora używa `tomllib`; systemowy Python 3.9 na macOS nie wystarcza;
- `ffmpeg` i `ffprobe` — przygotowanie źródeł, audio i render;
- `yt-dlp` — pobieranie YouTube w QuickContent;
- `whisper` z pakietu OpenAI Whisper i model `large-v3-turbo` w `~/.cache/whisper/` — transkrypcja QuickContent/LongForm; model trzeba pobrać osobno, worker nie pobiera go sam;
- HyperFrames CLI z poleceniem `transcribe` / lokalnym Parakeet — przygotowanie zwykłych rolek;
- zalogowany `codex` lub `claude` CLI — operator AI na własnym koncie;
- narzędzia deweloperskie Apple / `swiftc` — detekcja twarzy i maski na macOS.

AI i opisy publikacji wymagają połączenia z usługą. Brak konta lub limitu nie powinien uruchamiać płatnego fallbacku. Nie wszystkie funkcje mają zakończony pełny odbiór: ograniczenia i dowody są w `docs/quickcontent/acceptance.md` i `docs/longform/implementation-progress.md`.

Skopiuj `.env.example` do `.env`. Przykład domyślnie blokuje płatne API AI i wybiera konto Codex również do opisów. `PEXELS_API_KEY` jest opcjonalnym kluczem do przebitek LongForm. `OPENAI_API_KEY` zostaw pusty w trybie konta. Ustawienia panelu `.panel.json` i `.env` pozostają lokalne. Profile klientów mogą zawierać reguły biznesowe — przed dalszą dystrybucją przejrzyj ich treść.

Font Apple Color Emoji nie jest dystrybuowany. Na innym komputerze dostępność wyglądu emotek zależy od lokalnych fontów; nie zakładaj identycznego wyniku z macOS.

## Pierwsze nagranie i podgląd

W panelu wybierz **Nowa rolka**, **QuickContent**, **Film poziomy** lub **Motion Studio**. Klienta wybieraj zgodnie z profilem; nie dodawaj własnych nagrań do Git.

Zwykła rolka z terminala:

```bash
mkdir -p inbox
# Umieść własne nagranie w inbox/.
npm run reel -- inbox/nagranie.mov moja-rolka
npm run dev
```

Render po przygotowaniu i sprawdzeniu montażu:

```bash
npx remotion render moja-rolka out/moja-rolka.mp4
node scripts/reel-description.mjs moja-rolka
```

Dla klienta wynik zapisz w `klienci/<klient>/Render/`. Opis publikacji używa `REEL_DESCRIPTION_PROVIDER` z `.env`: `codex` lub `claude` = własne konto CLI; `openai` = osobno płatne API, domyślne wyłącznie w dotychczasowej konfiguracji bez trybu konta.

## Kontrola i dokumentacja

```bash
npm test
npm run lint
npm run build
```

Testy używają tymczasowych danych; nie wymagają prywatnych filmów. Część testów uruchamia procesy i lokalny serwer, dlatego restrykcyjny sandbox może uniemożliwić ich wykonanie.

- [Panel i operator](PANEL.md)
- [Preferencje globalne](PREFERENCJE.md) i profile w `klienci/`
- [Instrukcje montażu](AGENTS.md)
- [Plan odświeżenia UI/UX](docs/superpowers/plans/2026-10-17-panel-ui-ux.md)

Zasady licencji silnika sprawdź na [stronie Remotion](https://www.remotion.dev/license). Licencje dołączonych fontów i bibliotek obowiązują niezależnie.

## Pełna konfiguracja na własnej subskrypcji — bez API AI

**Tak: montaż, poprawki i opis mogą korzystać z własnego konta CLI.** Potrzebujesz dostępu do danego CLI w swoim planie, zalogowania i dostępnego limitu. Brak limitu nie przełącza programu na API. „Bez API AI” nie oznacza offline: operator łączy się z dostawcą, a pobieranie YouTube, pakietów i Pexels wymaga internetu. Nie gwarantujemy działania wszystkich narzędzi na każdym systemie ani jednakowego renderu bez lokalnych fontów.

### 1. Narzędzia lokalne na macOS

Jeśli nie masz Homebrew, zainstaluj go według [oficjalnej instrukcji](https://brew.sh). Następnie w Terminalu:

```bash
brew install node python@3.12 ffmpeg yt-dlp
xcode-select --install
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install openai-whisper
python -c 'import os, whisper; whisper.load_model("large-v3-turbo", download_root=os.path.expanduser("~/.cache/whisper"))'
```

Ostatnia komenda pobiera model ASR jednorazowo. Zapewnij miejsce na model, oryginalny film, robocze kopie, render i backup aktualizacji. Nie uruchamiaj tych komend z `sudo`. Virtualenv aktywuj przed uruchomieniem panelu, także po ponownym otwarciu Terminala. `python3 --version` ma pokazywać co najmniej 3.11.

Do zwykłych rolek potrzebny jest też działający HyperFrames CLI z lokalnym Parakeet. Sprawdź `npx hyperframes transcribe --help`; konfigurację i pobranie modelu wykonaj zgodnie z CLI. Samo `npm ci` nie instaluje tego modelu. W QuickContent/LongForm ASR działa przez wcześniej przygotowany Whisper.

### 2. Claude Code na koncie

Zainstaluj Claude Code według [oficjalnej instrukcji](https://code.claude.com/docs/en/overview). Zaloguj **konto subskrypcyjne**, nie konsolę rozliczaną kluczem API:

```bash
claude auth login
claude auth status
```

Nie publikuj wyniku logowania ani tokenów. W folderze repo:

```bash
cp .env.example .env
```

W `.env` ustaw:

```dotenv
MONTAGEFRAMES_ACCOUNT_ONLY=1
QUICKCONTENT_AI_PROVIDER=claude
REEL_DESCRIPTION_PROVIDER=claude
OPENAI_API_KEY=
```

Uruchom `npm run ui`; w Ustawieniach panelu wybierz **Claude Code na koncie**, pozostaw klucz API pusty. W QuickContent → Więcej ustawień oraz w Filmie poziomym wybierz Claude Code. Dla już istniejącego projektu sprawdź jego operatora — projekt zachowuje wcześniejszy wybór. Motion Studio korzysta z operatora zwykłego panelu, czyli Claude Code na koncie.

### 3. Codex na koncie ChatGPT

Zainstaluj oficjalny Codex CLI, otwórz repo w Terminalu i zaloguj konto ChatGPT:

```bash
codex login
codex login status
```

W `.env`:

```dotenv
MONTAGEFRAMES_ACCOUNT_ONLY=1
QUICKCONTENT_AI_PROVIDER=codex
REEL_DESCRIPTION_PROVIDER=codex
OPENAI_API_KEY=
```

W QuickContent oraz Filmie poziomym wybierz **Codex — konto**. Dzięki `REEL_DESCRIPTION_PROVIDER=codex` także automatyczny opis powstaje przez konto. **Zwykły panel „Nowa rolka” i AI Motion Studio mają obecnie operatora Claude Code, nie globalny przełącznik na Codexa.** Jeżeli chcesz pracować wyłącznie w Codexie bez Claude, użyj QuickContent/LongForm lub otwórz całe repo jako zadanie w terminalowym Codexie i zleć montaż zgodnie z `AGENTS.md`.

Przykładowe polecenie dla interaktywnego agenta:

> Przeczytaj AGENTS.md, PREFERENCJE.md i profil klienta. Zmontuj mój plik inbox/nagranie.mov jako moja-rolka. Używaj wyłącznie mojego konta CLI, bez API AI. Sprawdź klatki i dźwięk. Wyrenderuj do folderu klienta, a opis przygotuj przez node scripts/reel-description.mjs moja-rolka z providerem konta w .env. Nie publikuj filmu.

Oba CLI wymagają własnego konta i limitów usługodawcy. Nasz tryb blokuje wywołania API AI przez wspólny adapter i ustawienie API w zwykłym panelu; nie zarządza Twoimi ustawieniami całego Terminala ani narzędziami poza MontageFrames. Nie wklejaj `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` ani cudzych tokenów do repo. Brak logowania lub wyczerpanie planu wymaga ponownego logowania / odczekania, nie dodania klucza płatnego API.

### 4. Sprawdź konfigurację przed pierwszym montażem

```bash
node --version
python3 --version
ffmpeg -version
ffprobe -version
yt-dlp --version
whisper --help
npm test
npm run lint
npm run ui
```

W panelu sprawdź stan konta operatora, dodaj krótki własny plik i wybierz właściwego klienta. W QuickContent **Przetwarzaj** tworzy propozycje; dopiero **Zmontuj zaznaczone** montuje. W Filmie poziomym akceptujesz cięcia i plan. Po renderze sprawdź obraz, dźwięk, pełny sens wypowiedzi oraz status opisu. Te kroki są konieczne — nie obiecujemy uniwersalnego „100%” bez prawdziwej próby na Twoim komputerze.

### Gdy coś nie działa

| Objaw | Co sprawdzić |
|---|---|
| Nie znaleziono codex/claude | Zainstaluj CLI i uruchom panel z Terminala, w którym działa `--version`. |
| Parser konfiguracji Codex | `python3` musi mieć 3.11+; aktywuj `.venv`. Nie wyłączaj walidacji MCP. |
| Brak modelu Whisper | Pobrany `large-v3-turbo.pt` w `~/.cache/whisper/`, narzędzie `whisper` w aktywnym PATH. |
| Brak logowania / limit | Sprawdź lokalnie `codex login status` lub `claude auth status`, dostęp konta i limit. |
| API zablokowane | To zamierzony efekt `MONTAGEFRAMES_ACCOUNT_ONLY=1`; zmień operatora starego projektu na konto. |
| MP4 jest, opis nie powstał | Sprawdź `REEL_DESCRIPTION_PROVIDER` i konto; ponów sam opis, bez ponownego montażu. |
| Twarz/maska nie działa | macOS, Apple Vision i `swiftc`; użyj ręcznego kadru albo jawnego fallbacku. |
| YouTube odmawia pobrania | Sprawdź dostępność filmu i aktualny yt-dlp. Nie udawaj pobranego 4K. |
| Port 3100 zajęty | Zamknij drugi własny panel albo uruchom `npm run ui -- --port 3101`. |

## Aktualizacje bez utraty własnych klientów

Panel sprawdza oficjalne GitHub Releases przy starcie i co 6 godzin. W Ustawieniach: **Sprawdź teraz → Pobierz aktualizację → Zainstaluj i uruchom ponownie**. Bez internetu nadal pracujesz lokalnie. Przed instalacją zapisz poprawki i zakończ montaż/render.

Aktualizator porównuje manifest plików autora ze skrótami lokalnych plików. Własne profile klientów pozostają. Zmienione szablony, preferencje i branding są zachowywane i wymieniane w szczegółach. Niezmienione pliki autora otrzymują nową wersję. Konflikt lokalnego kodu blokuje instalację — nie robimy automatycznego `git pull`, resetu ani stasha. Zależności są przygotowywane przed podmianą, a kopia i dziennik trafiają do `.updates/backups/` i `.updates/transaction.json`.

Jeśli restart się nie uda, uruchom `npm run ui`; log jest w `.updates/install.log` / `.updates/panel.log`. Po przerwanej instalacji `npm run update:recover` sprawdza dziennik i odtwarza poprzednią wersję. Wariant ręczny: zatrzymaj panel i uruchom `npm run update:install` dla wcześniej pobranej paczki. Nie kasuj `.updates` przed sprawdzeniem kopii.

### Jak autor dostarcza nową wersję

Po push na **main** workflow `.github/workflows/release.yml` wykonuje testy i lint, buduje paczkę ze śledzonych plików Git i publikuje wydanie `app-<commit>` z deskryptorem, sumą SHA-256, paczką aktualizacji i `MontageFrames.zip`. W repo muszą być włączone GitHub Actions i prawo workflow do publikowania Releases. Push na gałąź roboczą lub pull request nie jest wydaniem dla użytkowników.

Pierwszą instalację zrób przez `git clone` albo przez **MontageFrames.zip z Releases**, następnie `npm ci`. ZIP źródeł generowany automatycznie przez GitHub nie zawiera manifestu instalacji; bez Git lub manifestu aktualizator nie zgaduje własności istniejących plików i blokuje instalację. Repo deweloperskie z lokalną zmianą kodu może wymagać ręcznego połączenia wersji.

Workflow trzeba raz wdrożyć na main i sprawdzić jego pierwszy rzeczywisty run. Testy fixture potwierdzają ochronę plików i transakcję, ale nie zastępują sprawdzenia publikacji paczki oraz aktualizacji na drugim komputerze.
