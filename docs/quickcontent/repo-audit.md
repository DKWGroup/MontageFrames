# QuickContent — audyt repozytorium i lokalnych narzędzi

Data: **2026-10-14**. Status: dokument planistyczny. Odczytano istniejące źródła i bezpieczne metadane narzędzi; audyt nie wdraża pipeline QuickContent. Nie pobierano filmów ani modeli, nie uruchamiano transkrypcji ani renderu. Research dokumentacji zewnętrznej znajduje się w osobnym dokumencie źródeł technicznych.

## Co można wykorzystać

| Obszar | Obecne możliwości | Pliki |
|---|---|---|
| Szkic montażu | Eksportowane `buildReel()`, `groupWords()`, `pickKey()`, `matchProducts()` i mapowanie klienta/stylu. Szkic zawiera segmenty, grupy napisów i grafiki. | `scripts/prep.mjs`, `scripts/prep.test.mjs` |
| Transkrypcja krótkiej rolki | CLI prepa zawsze uruchamia `npx hyperframes transcribe … -l pl --json` i czyta płaską tablicę słów. Obecnie używa Parakeeta, bez adaptera Whisper. | `scripts/prep.mjs` |
| Render | Remotion 4.0.532, React 19.2.3, kompozycje pionowe 1080×1920; napisy i grafiki klientów są już zaimplementowane. | `package.json`, `src/Reel.tsx`, `src/Root.tsx`, `src/styles/`, `src/overlays.tsx` |
| Montaż z zakresów | `segments` definiują zachowane zakresy pliku źródłowego. Wspólne `toOut()`, `keptWords()`, `captionClips()` i `reelFrames()` mapują źródło na wynik. | `src/reel-timing.ts`, `scripts/reel-timing.test.mjs` |
| Remotion Studio | Każda zmaterializowana rolka otrzymuje statyczne, edytowalne bloki ujęć/napisów/grafik. Zmiany inspektora zapisują się jako `data.studio`. | `scripts/studio-sync.mjs`, `scripts/studio-sync.test.mjs`, `src/TimelineSequence.tsx` |
| Klienci | `client` kieruje render do `klienci/<id>/Render/`; `style` wybiera styl. Preferencje i assety klienta już istnieją. | `AGENTS.md`, `PREFERENCJE.md`, `frame.md`, `klienci/<id>/PREFERENCJE.md`, `public/Brandings/` |
| Edycja i operator | Panel obsługuje zapis `reel.json`, historię JSON, montaż przez operatora, chat poprawek oraz osobny render. | `ui/server.mjs`, `ui/lib.mjs` |
| Postęp renderu | Parser CLI wylicza postęp bundlowania, renderowania klatek i kodowania. | `ui/lib.mjs:renderProgress()` |

`buildReel()` można wywołać na już gotowych słowach z wybranego fragmentu. Nie należy wtedy uruchamiać `main()` prepa: kopiuje materiał i ponownie transkrybuje go Parakeetem. QuickContent wymaga adaptera do istniejącego kontraktu, a nie drugiego systemu napisów.

## Zasady klienta i wybór brandingu

Obecny `clientOf()` wykrywa klienta ze ścieżki `klienci/<id>/…`; `styleOf()` wybiera styl przy użyciu regexów ścieżki. To wystarcza do aktualnego workflow plikowego, lecz nowy formularz powinien przekazywać **jawne `clientId` i `styleId`**. Serwer sprawdza istnienie klienta i dostępność stylu, zapisuje wybór w projekcie i przekazuje go do adaptera. Nie wywnioskowuje innego brandingu z tytułu filmu.

Pierwszeństwo wytycznych podczas montażu: preferencje klienta → ogólne `PREFERENCJE.md` → `frame.md`. QuickContent nie znosi wyjątków SkyClass, strefy bezpiecznej, zasad napisów pod twarzą ani wymagań hooka. Reguły produktów z `matchProducts()` można wykorzystać także przy montażu wybranego fragmentu.

## Konwencja czasu i integracja długiego źródła

W istniejącym `reel.json` wszystkie czasy są w sekundach **pliku wskazanego przez `source`**. `toOut()` dopiero przelicza je na oś po montażu. `SourceShot` czyta plik z `public/reels/<reel>/<source>`; silnik nie ma obecnie rejestru współdzielonych długich źródeł.

Najmniejsza integracja zgodna z tym kontraktem:

1. Zachować pełny master filmu, metadane i surową transkrypcję w katalogu projektu QuickContent. Dla klienta katalog jest w jego przestrzeni; bez klienta w przestrzeni roboczej.
2. Propozycje zapisywać jako globalne `sourceId`, `start/end`, identyfikatory słów granicznych, opis i ocenę. Samo znalezienie propozycji nie tworzy `reel.json` ani kompozycji Studio.
3. Podgląd propozycji odtwarza zakres wspólnego proxy. Można wykonać tani surowy wycinek do wygodnego oglądania, ale nie jest on zmontowaną rolką.
4. Dopiero „Zmontuj zaznaczone” przygotowuje dokładny, krótki `source.mp4` w `public/reels/<id>/`, słowa z czasu tego pliku oraz `reel.json` z jawnym klientem/stylami.
5. Powiązanie z masterem zachować w `origin.json`: identyfikator źródła, globalny zakres, dokładny offset, rewizja/hash transkrypcji i mapowanie źródłowych `wordId`.
6. `syncStudio()` i aktualny operator prowadzą dalszy montaż oraz kontrolę klatek. Render zawsze pozostaje w folderze klienta lub `out/` dla projektu bez klienta.

Przykład: propozycja `start=125.4`, `end=165.8`; słowo mastera `start=126.1` otrzymuje w krótkim źródle `start=0.7`. Ta jednorazowa konwersja przy utworzeniu wycinka jest operacją adaptera. Późniejsza korekta tekstu w GUI **nie zmienia `start/end`**.

Surowy JSON Whisper powinien pozostać niezmienny. Poprawki zapisywać jako rewizję transkrypcji lub warstwę tekstową. `groupWords()` obecnie zachowuje tylko `text/start/end`, więc identyfikatory słów trzeba przechować w sidecarze albo dodać jako opcjonalne pole kompatybilne z dotychczasowym typem `Word`.

`keptWords()` dopuszcza słowa zaczynające się do 0,25 s przed segmentem, aby tolerować ASR. To nie zastępuje walidacji granic nowego wycinka. Adapter musi sprawdzić, czy nie zabiera części poprzedniego zdania i czy zachowuje początek oraz koniec wybranej wypowiedzi.

## Krytyczna pułapka SkyClass

`src/Reel.tsx` odtwarza dla SkyClass globalne `<Audio>` pełnego `source` od czasu 0, a wideo w poszczególnych segmentach jest wyciszone. Przy długim masterze i `segments: [{start: 125, end: 165}]` obraz zacznie się od 125 s, lecz audio od początku filmu.

**MVP powinno materializować krótki wycinek przed montażem**, dzięki czemu SkyClass ponownie otrzymuje źródło zaczynające się od 0 oraz cały wybrany zakres. Nie wycinać ciszy ani zawahań wewnątrz tego wycinka, zachować napisy 1:1. Alternatywny przyszły wariant z odtwarzaniem bezpośrednio z mastera wymaga zmiany audio i osobnych testów zgodności dla wszystkich stylów.

## Jakość źródła, dokładne cięcie i formaty

Aktualny prep sprawdza jedynie `format.duration` przez ffprobe. QuickContent potrzebuje metadanych streamów: wymiary, FPS, rotacja, kodeki, kanały audio, czas startu streamów i informacje o przestrzeni barw. Podział na master i pliki robocze powinien być jawny:

- osobno pobrane video-only oraz audio-only → mux mastera bez zbędnej kompresji;
- master pozostaje nienaruszony i przechowuje pełną dostępną jakość;
- proxy służy wyłącznie płynnemu podglądowi;
- krótki wycinek do Remotion powstaje po wyborze propozycji, z dokładnymi granicami, zgodnym audio i formatem H.264/AAC.

`ffmpeg -c copy` dla dowolnej granicy wideo może opierać się na klatce kluczowej. Nie traktować takiego pliku jako gwarantowanego dokładnego cięcia słowa. Adapter wycinka wymaga dekodowania wybranego zakresu i kontroli faktycznego czasu oraz synchronizacji A/V.

`SourceShot` ma `toneMapped={false}` z komentarzem o materiale SDR. Materiał HDR lub nietypowe VFR trzeba wykryć; krótkie źródło robocze może być normalizowane do SDR/CFR, przy zachowaniu oryginalnego mastera. Rozdzielczości 1080p/4K oznaczają limit/prefencję dostępnego pobrania, nie gwarancję, że film oferuje taki stream.

## Kadrowanie poziomego filmu do rolki

Aktualny `SourceShot` używa `objectFit: "cover"`; brak `objectPosition`, śledzenia twarzy i wyboru mówcy. `Segment` zawiera tylko `start/end`, `zoom`, `zoomTo`. Obecne ustawienie daje centralny crop, który może usunąć rozmówcę stojącego po boku, slajd lub drugą osobę.

Minimalny nowy kontrakt `framing` powinien określać tryb `crop|fit|split`, znormalizowany prostokąt/punkt kadru i opcjonalne keyframes. W pierwszym etapie wystarczy propozycja cropa, ręczne przesunięcie w GUI i fallback `fit` dla slajdów/screen sharingu. Automatyczne śledzenie aktywnego mówcy oraz split screen wymagają osobnego etapu detekcji i sprawdzenia jakości.

`face.bottom` jest obecnie jednym parametrem kadru źródła. Przy reframe trzeba przeliczyć pozycję twarzy na wynik 9:16; zmienny crop wymaga informacji per ujęcie. Napisy i grafiki nadal muszą mieścić się pod twarzą i w wspólnej strefie bezpiecznej Instagrama/TikToka.

## Narzędzia dostępne lokalnie

Kontrola instalacji wykonana 2026-10-14. Dostępność polecenia lub modelu nie oznacza udanego pobrania filmu ani benchmarku produkcyjnego.

| Narzędzie | Wynik lokalnego odczytu |
|---|---|
| ffmpeg | `/opt/homebrew/bin/ffmpeg`, wersja `8.1.1` |
| ffprobe | `/opt/homebrew/bin/ffprobe`, wersja `8.1.1` |
| yt-dlp | `/opt/homebrew/bin/yt-dlp`, wersja `2026.07.04` |
| Whisper | `/opt/homebrew/bin/whisper`, OpenAI Python CLI, pakiet `openai-whisper=20250625` |
| Torch | `2.12.1` |
| Model Whisper | `~/.cache/whisper/large-v3-turbo.pt`, około 1,5 GB |
| whisper-cli / whisper-cpp | Nie znalezione przez `command -v` |
| Przyspieszenie Torch | W procesie audytu `torch.backends.mps.is_available()` i `torch.cuda.is_available()` zwróciły `False` |

`whisper --help` potwierdził lokalne opcje `--output_format json`, `--language pl`, `--word_timestamps True`, `--clip_timestamps` oraz `--hallucination_silence_threshold`. Word timestamps są oznaczone jako eksperymentalne. Obecny repozytoryjny prep ich nie wykorzystuje.

**Nie wykonano benchmarku.** Nie ma podstaw do obietnicy czasu analizy godzinnego filmu. Wdrożenie musi zmierzyć realny materiał 10–20 minut, pamięć, czas, jakość polskich słów/granic i wpływ równoległego renderu. Ewentualne whisper.cpp lub faster-whisper są kandydatami na wymienny adapter; nie są tutaj uznane za zainstalowany i działający pipeline.

## Luki analizy fragmentów

W repo nie ma obecnie modułu analizującego długą wypowiedź ani proponującego kompletne rolki. Whisper dostarcza tekst i czas; selekcję musi wykonywać osobna warstwa analizy.

Rekomendowany minimalny kontrakt analizy: źródłowe słowa graniczne, temat, streszczenie, typ fragmentu, uzasadnienie oceny, cytat/dowód z wypowiedzi i informacja o kompletności. Kod weryfikuje pochodzenie granic, zakres, docelową długość i duplikaty. Mocna opinia/konflikt/liczba nie wystarczają bez kontekstu i domknięcia myśli.

„Znajdź więcej” wykorzystuje cache transkrypcji i pamięć znalezionych zakresów, a nie ponowne pobranie ani obowiązkową retranskrypcję. Może zwrócić brak dodatkowych dobrych fragmentów. Maksymalna liczba oznacza wszystkie propozycje przechodzące uzgodniony próg jakości, nie gwarantowaną liczbę klipów.

## Luki zadań, postępu i wersji

`ui/server.mjs` trzyma zadania w `jobs = new Map()`; restart procesu je przerywa. Brak trwałych checkpointów pobrania, transkrypcji i analizy. `snapshot()` zapisuje historię `reel.json`, ale nie stan zadania ani snapshot wszystkich zasobów. QuickContent potrzebuje trwałego job store oraz odtwarzania stanu po restarcie.

Obecny `renderStep()` zapisuje stałe `<name>.mp4`; kolejna wersja nadpisuje wynik. Nowy moduł wymaga:

- `editRevision` i `renderRevision` oraz podpisu danych użytych do renderu;
- niezmiennego snapshotu przed renderem;
- wyników wersjonowanych w `klienci/<id>/Render/` lub `out/`, np. `<name>-v001.mp4`;
- badge „Zmontowane” dopiero po istniejącym, poprawnie sprawdzonym renderze aktualnej rewizji;
- statusu „Zmiany do wyrenderowania” po korekcie oraz zachowania poprzedniej wersji do pobrania;
- rozróżnienia postępu etapu, postępu pojedynczej rolki i liczby ukończonych rolek w batchu.

`renderProgress()` jest użytecznym parserem istniejącego CLI, lecz procenty całego pipeline muszą opierać się na rzeczywistych zdarzeniach. Dla etapu bez policzalnego postępu GUI pokazuje bieżący etap/indeterminate, zamiast zmyślonego procentu. Sam sukces operatora AI nie potwierdza gotowego pliku MP4.

`syncStudio()` generuje wspólny rejestr `src/Root.tsx` i może zapisywać różnice Studio do JSON. Wywołania ze zmaterializowania wielu rolek trzeba serializować; równoległe procesy nie powinny nadpisywać rejestru ani przejmować niezapisanych zmian innych rolek. Stan edycji/renderu musi wiązać się z konkretną rewizją.

## Minimalne docelowe moduły

Poniższy podział jest propozycją odpowiedzialności. Nie wymaga Redis, nowej aplikacji ani chmury; mniejsze implementacje mogą łączyć pliki przy zachowaniu tych granic.

| Moduł | Odpowiedzialność |
|---|---|
| `quickcontent-store.mjs` | Projekty, źródła, propozycje, rewizje, atomowy zapis/checkpointy |
| `quickcontent-ingest.mjs` | URL/upload, metadane, osobne video/audio, mux, ffprobe, proxy |
| `quickcontent-transcribe.mjs` | Adapter Whisper, normalizacja, cache i mapowanie słów |
| `quickcontent-analyze.mjs` | Tematy, kompletność wypowiedzi, scoring i deduplikacja |
| `quickcontent-adapter.mjs` | Dokładny wycinek, offset, `origin.json`, `buildReel()` i materiały klienta |
| `quickcontent-worker.mjs` | Trwała kolejka, limity ciężkich procesów, stop/retry/postęp |
| `ui/quickcontent-server.mjs` | API, integracja operatora i bezpieczne media z obsługą Range |
| `ui/QuickContent.tsx` | Formularz → przetwarzanie → propozycje → wybór → montaż → obecny edytor |

## Najważniejsze sprawdzenia wdrożenia

1. Wycięty SkyClass ze środka filmu ma zsynchronizowany obraz i audio, pełne napisy 1:1 i zachowaną ciszę.
2. Granice propozycji nie ucinają słowa ani początku/kontekstu/zakończenia myśli; preferowana długość nie wymusza fragmentu bez puenty.
3. Ponowne szukanie nie nadpisuje mastera, dotychczasowych propozycji, wyborów ani ręcznych korekt.
4. Zmiana tekstu zachowuje timestampy, unieważnia aktualność renderu i nie usuwa poprzedniej wersji.
5. Restart podczas pobrania/transkrypcji/renderu ma określony stan i umożliwia bezpieczne ponowienie; nie pokazuje ukończenia bez artefaktu.
6. Wybrany klient i styl trafiają do rolki oraz prawidłowego folderu wyniku, niezależnie od tytułu i miejsca wgrania.
7. Twarz, napisy, slajdy i grafiki pozostają czytelne po konwersji poziomego materiału do 9:16.
8. Równoległy batch ma ograniczoną liczbę ciężkich procesów i serializuje zapis wspólnego rejestru Studio.

Nie uruchamiano testów projektu, ponieważ audyt nie zmienia jego kodu. Istniejące testy prepa, timingów i synchronizacji są podstawą regresji; nowe testy powinny dotyczyć realnych granic adaptera, wznowienia i rewizji, a nie tylko odwzorowywać implementację.

## Dodatkowy przegląd planu: snapshot i stary edytor

- `calculateReelMetadata()` w `src/Reel.tsx` pobiera zawsze bieżący JSON i zastępuje `props.data`; render snapshotu potrzebuje odrębnego wejścia z zachowaniem przekazanych danych.
- `scripts/studio-sync.mjs` regeneruje cały `src/Root.tsx`. Nową kompozycję `QuickContentRender` trzeba uwzględnić w generatorze i jego teście, inaczej zniknie po dodaniu następnej rolki.
- Dotychczasowy RenderTab wysyła `kind: render` do `/api/job/:name`, a stary backend renderuje do stałej nazwy MP4 i trzyma job w RAM. Dla rolki QuickContent z `origin` potrzeba jawnego przekierowania render/montage/chat/status/stop do trwałego workera.
- Operator może pisać bezpośrednio do `reel.json` podczas montażu i czatu, także przed błędem/anulowaniem. Kontrola rewizji musi obejmować każde zakończenie operatora i odzyskanie po awarii, a nie wyłącznie ręczny zapis panelu.

Te punkty zostały ujęte w zadaniu 8 planu i kontrakcie funkcji. Nadal są wymaganiami wdrożenia, nie zmianami w obecnym kodzie.
