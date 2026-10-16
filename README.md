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

Panel: http://127.0.0.1:3100. `npm ci` generuje pusty rejestr Remotion; panel startuje bez prywatnych nagrań i projektów. Gdy instalowano z `--ignore-scripts`, uruchom `npm run studio:sync` przed sprawdzaniem typów.

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

Opcjonalnie skopiuj `.env.example` do `.env` i uzupełnij własne klucze: `OPENAI_API_KEY` do opisów publikacji / jawnie wybranego API, `PEXELS_API_KEY` do przebitek LongForm. Ustawienia panelu `.panel.json` i `.env` pozostają lokalne. Profile klientów mogą zawierać reguły biznesowe — przed dalszą dystrybucją przejrzyj ich treść.

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

Dla klienta wynik zapisz w `klienci/<klient>/Render/`. Opis publikacji korzysta z płatnego API, niezależnie od renderu.

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
