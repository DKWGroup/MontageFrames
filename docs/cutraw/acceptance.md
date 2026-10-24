# CutRaw — odbiór faz

Kontrakt: [założenia](../../zalozenia-funkcji-CutRaw.md) · [plan](../../plan-wdrozenia-CutRaw.md).

## C0 — czeka na materiał

- [ ] Próbki w `inbox/cutraw/` (podcast 2 kamery + 2 mikrofony ≥ 20 min, nagranie z 1 kamery).
- [ ] Wzorzec `docs/cutraw/premiere-wzorzec.xml` wyeksportowany z Premiere użytkowniczki + numer wersji Premiere.
- [ ] Import próbnego XML w Premiere (niżej `out/cutraw-proba/`), zapis: co działa, co nie.

## C1 — zadanie 1 (synchronizacja) i 6 (generator XML) — 2026-10-24, bez commita

**Zrobione**
- `scripts/cutraw-sync.mjs`: strumieniowe dekodowanie FFmpeg (mono 16 kHz, highpass 80 Hz), obwiednia log-energii 100 Hz, `correlate` (Pearson + score piku), `alignEnvelopes` (20 Hz zgrubnie → 100 Hz w 3 oknach, mediana, dryf), `refinePcm` (co do próbki, fallback na obwiednię przy r < 0,3), `syncFiles`, `probe` (fps, VFR, rozdzielczość, kanały). CLI: `node scripts/cutraw-sync.mjs <kamera> <plik…>`. Bez nowych zależności.
- Pewność = score ≥ 6 **i** r ≥ 0,5: score łapie dwuznaczność (sygnał okresowy dawał poprawny offset przy score 2,7), r łapie obce nagranie.
- `scripts/cutraw-xml.mjs`: `rateOf` (25/50 i NTSC 29,97/23,976/59,94 z dokładnym 1000/1001), `placeClips` (luka poza zakresem pliku, przesunięcie w klatkach), `toXmeml` (sekwencja, ścieżki V/A, `clipitem` z `enabled`, plik zdefiniowany raz i dalej odwołanie `<file id/>`, `sourcetrack` dla audio, `file://localhost` z kodowaniem procentowym, escapowanie XML, błąd przy nieznanym pliku / braku strumienia / nachodzących segmentach).

**Dowody**
- `scripts/cutraw-sync.test.mjs` (4) i `scripts/cutraw-xml.test.mjs` (5): zielone. Syntetyczna mowa: offset 12,34 s i −30,5 s z obwiedni (±10 ms), plik przez FFmpeg 1,2345 s (±1 ms, metoda `pcm`), obce nagranie = „do sprawdzenia” (score 2,4, r 0,05 vs pasujące 10,6 / 0,96).
- Próba na syntetycznym podcaście (`out/cutraw-proba/`, 60 s, 25 fps): Kamera 2 włączona 2,0 s później, cichsza i z AAC → 1,99994 s; mikrofon 1,2345 s → 1,2345 s; obie pewne, dryf 0, synchronizacja 0,6 s. Ścieżka mowy wyrównana do mastera (`adelay`) ponownie zmierzona: offset 0 s. XML (4 segmenty → 1157 klatek, 2 ścieżki V, 4 A) przechodzi `xmllint --noout`.
- `npm test`: 555/556 (1 pominięty z założenia, 0 błędów). `npm run lint`: bez błędów.

**Czego nie sprawdzono**
- Importu w Premiere: brak Premiere i wzorca w środowisku. Elementy xmeml są z pamięci formatu; po wzorcu z C0 trzeba je porównać (stereo jako 1 czy 2 `clipitem`, `link`, przenikania).
- Prawdziwych nagrań: progi pewności (6 / 0,5) i ścieżka PCM dla dalekiej kamery są skalibrowane tylko na syntetykach.
- Korelacja zgrubna bierze okno ze środka krótszego nagrania. Mikrofon krótszy od kamery i włączony przed nią (częściowe nakładanie) może wymagać okna z innego miejsca.
- Dryf jest tylko mierzony (korekta w C3).

**Próba do importu (C0):** `out/cutraw-proba/cutraw-proba.xml` + `zrodla/` + `audio/`. W Premiere: Plik → Importuj → XML. Na V1 powinna być Kamera 1 z licznikiem, na V2 wyłączona Kamera 2 (licznik o 2 s mniejszy w tym samym miejscu osi), na A1 mowa, a niżej wyłączone oryginały. Cięcia: 0–8 s, 10,5–20 s, 23–40 s i 42,2–54 s mastera.

## C1 — zadania 2–5 i 7 — 2026-10-24, bez commita

**Zrobione**
- `npm run cutraw -- new|process|export` (`scripts/cutraw.mjs`). Rola pliku z typu (wideo = kamera, samo audio = mikrofon), referencja = pierwsza kamera albo `--ref`, klient z `--client` lub ścieżki `klienci/<klient>/`. Odcisk źródeł (rozmiar + sha256 pierwszego i ostatniego MB) sprawdzany przed przetwarzaniem i przed i po eksporcie. Stan w `public/cutraw/<nazwa>/` (gitignore): `cutraw.json` (zod), `transcript.json`, `mix.wav`, `.whisper/`.
- `process`: synchronizacja → miks mowy w czasie mastera (`mixArgs`) → energia co 10 ms na mikrofon (`masterLevels`) → Whisper `large-v3-turbo` (istniejący `transcribeSource`, cache) → słowa `w0…` z mówcą (mikrofon o największej energii) → cisza (`silencedetect` d = 0,1 s) + `silenceCuts` z presetem tempa + leksykon i `voicedGaps` → GPT‑6 Luna → ręczne decyzje z poprzedniego `cutraw.json` zostają → `snapQuietest` → `guardShortKeeps` → cenzura PL + EN.
- Silnik (`scripts/longform-roughcut.mjs`, LongForm bez zmian zachowania): `PACE` (spokojne 0,60/0,20 s, standard 0,40/0,12 s, gęste 0,28/0,08 s), `snapQuietest` (najcichsza granica klatki w ±60 ms; najwyżej pół klatki w sąsiednie słowo, bo Whisper podaje stykające się słowa i inaczej „znaczy” nie dałoby się wyciąć; cięcie krótsze niż klatka = do decyzji), `censorMutes` z `keepHead`/`keepTail` (litery proporcjonalnie do czasu słowa, min. 60 ms, maks. 45%, zawsze co najmniej jedna litera wyciszona, `sfx: null`). Nowy `src/longform/profanity-en.json`.
- `scripts/cutraw-ai.mjs`: przebieg 1 (propozycje + przekleństwa, `EDIT_SCHEMA`/`cutsFromAI` z LongForm, etykiety mówców), przebieg 2 (werdykt `cut/keep/undecided` + powód dla każdego cięcia, także ciszy i „yyy”). Reguły w kodzie niezależne od modelu: `keep` wygrywa; „do decyzji” staje się cięciem tylko przy zgodzie obu sygnałów; powtórzenie od pewności 0,85; dźwięk bez słowa ≤ 1,5 s; **dubel i powtórzenie tylko tej samej osoby** (`sameSpeaker`); duplikat zakresu z leksykonu pomijany; walidator po obu przebiegach. Model `gpt-6-luna` ustawiony jawnie; błąd AI = cięcia deterministyczne + uwaga.
- `scripts/cutraw-audio.mjs`: `renderMasterWav` (24-bit mono 48 kHz w czasie mastera, offset co do próbki, wyciszenia z rampą 5 ms, zapis przez `.tmp`), `masterLevels`, `mixArgs`.
- `export`: paczka `klienci/<klient>/Render/<nazwa>-cutraw-vNNN/` (bez klienta `out/`) = `<nazwa>.xml` + `audio/<mówca> — mowa (cenzura).wav` + `README.txt`; kolejny numer wersji, poprzednie nietknięte; zapis w `cutraw.json.exports`.
- Synchronizacja: pewność = (score ≥ 6 i r ≥ 0,5) albo (score ≥ 4 i r ≥ 0,8). Krótkie nagrania mają niższy score, a zły pik nie daje wysokiego r w oknach.

**Dowody**
- Testy: `cutraw.test.mjs` (6), `cutraw-ai.test.mjs` (5), `cutraw-audio.test.mjs` (4), `longform-roughcut.test.mjs` (+3 CutRaw, wszystkie stare LongForm zielone). `npm test`: 573/574 (1 pominięty z założenia, 0 błędów). `npm run lint`: bez błędów.
- Próba end-to-end na podcaście z polskiej syntezy mowy (`out/cutraw-tts/zrodla/`, 39 s, głos Zosia; 2 kamery + 2 mikrofony; zbliżenie włączone +1,7 s, mikrofon Ani −2,3 s, Bartka +0,8 s):
  - synchronizacja 1,69994 / −2,3 / 0,8 s;
  - Whisper rozpoznał tekst i obu mówców poprawnie; całość bez AI 34 s (CPU), z AI ~25 s przy transkrypcji z cache;
  - GPT‑6 Luna: 2 zapytania, 0,0008–0,0012 USD na przebieg (zmierzone, `usage` w projekcie). Wycięła ciszę z oddechem, „yyy”, „eee”, „znaczy”, falstart „w tym roku, znaczy” (→ „Bo w zeszłym roku”), powtórzone „Dzisiaj” i „Dobra, jeszcze raz”. Wynik czyta się płynnie;
  - cenzura w paczce: „Ku…” −5,8 dB jak oryginał, reszta słowa cyfrowa cisza (oryginał −5,1 dB), po słowie −6,2 dB jak oryginał. WAV mowy zmierzone względem kamery: offset 0;
  - paczki v001–v003 w `out/`, `xmllint` OK, v001 nietknięta po kolejnych eksportach.
- Znalezione i naprawione w próbie: stykające się słowa blokowały cięcie wtrąceń; Luna zostawiała prawie każdą pauzę przy zmianie mówcy (instrukcja: wycięcie zostawia oddech); dublowało się „eee” (leksykon + AI); raz wycięła całą kwestię Bartka jako „dubel”, bo Ania powtórzyła podobne zdanie (→ reguła tej samej osoby w kodzie); fałszywe „do sprawdzenia” przy krótkim nagraniu.

**Czego nie sprawdzono / ograniczenia**
- Import w Premiere (C0). Prawdziwe nagranie podcastu: synteza mowy nie ma naturalnych „yyy”, śmiechu, nakładania się głosów ani przesłuchu z prawdziwej sali.
- Odpowiedzi Luny różnią się między przebiegami (raz zostawiła, raz wycięła „No właśnie” i „Dobra, jeszcze raz”). Twarde reguły są w kodzie, ale ocena jakości wymaga przeglądu (C2) i prawdziwych nagrań.
- Czas liter w cenzurze to proporcja długości słowa (bez wyrównania głosek); `keepTail` sprawdzony tylko w testach.
- Pełny przebieg ponownie wycina wszystko od nowa (ręczne decyzje zostają). Przegląd i ręczne poprawki cięć pojawią się dopiero w panelu (C2). Na razie decyzje zmienia się w `cutraw.json`: `decision` i `auto: false`.
- Brak korekty dryfu (tylko ostrzeżenie) i auto-przełączania kamer (C3).

## C3 — jakość podcastu (dane testowe) — 2026-10-24, bez commita

**Zrobione**
- **Auto-przełączanie kamer** (`scripts/cutraw-angles.mjs`): mówca słowa (mikrofon z największą energią) → kamera, która go pokazuje; kilka głosów naraz ≥ 0,4 s → plan ogólny; cisza → ujęcie zostaje; kamera wyprzedza mówcę o 0,25 s; minimalne ujęcie 2,5 s na osi **po cięciach** (krótsze dołączane do sąsiada, więc „mhm” i krótka odpowiedź nie przełączają); zmiana ujęcia w odległości ≤ 0,5 s od cięcia przesuwana dokładnie na cięcie. Wynik na V1 („montaż kamer”), wyżej wszystkie kamery wyłączone do ręcznej podmiany; gdy kamera ujęcia nie obejmuje fragmentu, na V1 idzie kamera główna (bez dziury).
- Kto jest na której kamerze: pole `shows` źródła (`"wide"`, id mikrofonu, `null`). Domyślnie: więcej kamer niż mikrofonów → kamera główna = plan ogólny, reszta po kolei na mikrofony; inaczej po kolei. Zmiana w panelu (Synchronizacja → „Pokazuje”, `POST /api/cutraw/<id>/angle` z rewizją) — wpływa tylko na eksport, bez ponownego przetwarzania. Bez osobnych mikrofonów przełączania nie ma (mówcy nie da się wtedy wiarygodnie rozpoznać — do decyzji po prawdziwym nagraniu z C0).
- **Korekta dryfu**: wszystkie 3 okna pomiaru doprecyzowane PCM (środek 8 s, brzegi 4 s); środek bez korelacji przy dobrych brzegach = prosta między brzegami. Dryf > ½ klatki → `sync.k` (s/s) i `sync.at`; audio źródła przepróbkowane do zegara mastera (`aresample=480000,asetrate=…`, błąd zaokrąglenia < 1 ppm) w WAV mowy, miksie do Whispera i poziomach; obraz i wyłączone oryginały w XML przesuwane osobno dla każdego klipu (offset w środku klipu). Ostrzeżenie w projekcie i README: „dryf … ppm — skorygowany”.
- **XML**: markery sekwencji na miejscach „do decyzji” i na treści, którą Luna kazała zostawić (bez ciszy i „yyy”), z powodem w komentarzu; `link` klipu obrazu kamery z klipem jej dźwięku. README paczki opisuje montaż kamer i markery; eksport zapisuje liczbę ujęć.
- Panel: projekt z plików **przeciągniętych z dysku** albo „Wybierz z dysku” (`POST /api/cutraw/upload` → `inbox/cutraw/`, zapis przez `.part`, zajęta nazwa → „nazwa (2)”, ten sam plik o tej samej nazwie i rozmiarze nie jest wysyłany drugi raz; pasek postępu). Limit 5 min na żądanie w serwerze panelu wyłączony (duże nagrania). Korekta synchronizacji jako „−1 / +1” (nagłówek „Korekta (klatki)”), wybór „Pokazuje” pod nazwą kamery.

**Dowody**
- Testy: `cutraw-angles.test.mjs` (3), `cutraw-xml.test.mjs` (+1: ujęcia z kamerą zapasową, dryf per klip, markery, `link`), `cutraw-audio.test.mjs` (+1: impuls na 1. i 50. s po korekcie ±0,2 ms, także w miksie), `cutraw-sync.test.mjs` (+1: 240 s syntetycznej mowy, mikrofon +300 ppm → `k` z błędem < 1e‑5, po korekcie początek i koniec ±2 ms wobec ~31 ms bez korekty), `cutraw.test.mjs` (oś z przełączaniem i markerami), `ui/cutraw-server.test.mjs` (+upload, +angle). `npm test`: 589/590 (1 pominięty z założenia, 0 błędów). `npm run lint`: bez błędów.
- `cutraw-tts` (synteza mowy, 2 kamery + 2 mikrofony): eksport v005 — V1 5 ujęć zgodnych z kolejnością mówców w transkrypcie (Ania → Bartek → Ania → Bartek → Ania), marker „Do decyzji: dubel” z powodem Luny, 56 linków, `xmllint` OK.
- Dryf na nagraniu z syntezy (39 s, mikrofon Bartka przyspieszony o 1000 ppm, bez AI): wykryty i skorygowany; skorygowany WAV mowy wobec WAV z nierozjechanego mikrofonu: −2,7 / −1,7 / +1,9 / +2,6 ms w 3., 8., 30. i 35. s (bez korekty rozjazd rośnie o ~32 ms). Projekt testowy usunięty po pomiarze.
- Panel (port 3100): przeciągnięcie WAV i MP4 → pliki w `inbox/cutraw/`, zaznaczone, projekt utworzony (pliki testowe usunięte); zmiana „Pokazuje” zapisana (rewizja 12); 1440 / 768 / 375 px bez poziomego przewijania; po przeładowaniu brak błędów zasobów.

**Czego nie sprawdzono / ograniczenia**
- Import w Premiere (C0): czy Premiere czyta markery sekwencji i `link` z tego XML tak, jak zakładamy (elementy z pamięci formatu xmeml). Przenikań audio nie dodano — czekają na wzorzec z C0.
- Prawdziwy podcast: przypisanie kamer do osób jest domyślne (po kolejności plików), nie rozpoznawane z obrazu; progi 2,5 s / 0,4 s / 0,25 s do dostrojenia na prawdziwym materiale. Przesłuch między mikrofonami w jednej sali może przypisywać krótkie słowa złej osobie.
- Dryf skalibrowany na syntetykach (300 i 1000 ppm); prawdziwe urządzenia mają zwykle 10–50 ppm. Zakładamy dryf liniowy (stała różnica zegarów), bez skoków (np. zgubione próbki w rejestratorze).
- Cenzura znak po znaku (forced alignment) nie ruszona — plan wiąże ją z pomiarami słyszalnych błędów na prawdziwych nagraniach.

## C2 — panel CutRaw z przeglądem cięć — 2026-10-24, bez commita

**Zrobione**
- Wejście „CutRaw” w bocznym menu panelu, adresy `#cr` (lista) i `#cr/<projekt>` (`ui/panel-navigation.mjs`, `ui/App.tsx`).
- `ui/cutraw-server.mjs` pod `/api/cutraw` (podpięty w `ui/server.mjs`): lista projektów, wybór nagrań wideo i audio z `inbox/` i folderów klientów (bez `Render/`, `QuickContent/`, `branding/`), nowy projekt (tylko ścieżki wewnątrz repo, kamera główna spośród wybranych), przetwarzanie i eksport jako zadania w tle z prawdziwym postępem i wspólną blokadą ciężkiej pracy, zapis cięć z rewizją (409 przy nowszej wersji), ręczne przesunięcie synchronizacji, podgląd `proxy.mp4` z obsługą Range, „Pokaż w Finderze” dla paczki.
- `scripts/cutraw.mjs` przerobiony na funkcje dla CLI i panelu (`createProject`, `processProject`, `exportProject`, `saveCuts`, `nudgeSync`). Postęp idzie przez `report`. Cisza wykrywana asynchronicznie, żeby długi plik nie blokował serwera. W trybie panelu (albo `--proxy` w terminalu) powstają `levels.json` (fale wszystkich źródeł co 0,1 s) i `proxy.mp4` 720p (VideoToolbox na Macu, libx264 jako zapas; odtwarzany ponownie tylko po zmianie kamery albo offsetów mowy).
- `ui/CutRaw.tsx` + `ui/cutraw.css` (+ logika bez Reacta w `ui/cutraw-view.mjs`):
  - lista projektów i nowy projekt (pliki z nazwą i folderem, kamera główna, nazwa);
  - przetwarzanie z ustawieniami (tempo, redaktor: GPT‑6 Luna / Claude Code / Codex / bez AI, cenzura 1–3 liter + ostatnia litera), postęp z etapem, procentem tylko gdy mierzony i czasem pracy;
  - podgląd „Po cięciach / Oryginał”: przeskok przez wycięte fragmenty i wyciszanie cenzury na żywo;
  - **oś źródeł**: fala każdej kamery i mikrofonu wyrównana do kamery głównej, pasy cięć przez wszystkie źródła, głowica odtwarzania, klik = przewinięcie;
  - transkrypt z mówcami, cięciami (werdykt Luny w etykiecie), filtrami, „Wytnij zaznaczone”, Cofnij/Ponów, „Cenzura · wyłącz”; szczegół wybranego cięcia z powodem Luny i odsłuchem „oryginał / po cięciu”;
  - tabela synchronizacji z ±1 klatka; lista eksportów z „Pokaż w Finderze”; skróty Spacja, X, N/P, F, ⌘Z/⇧⌘Z; autozapis.
- Panel korzysta z funkcji cięć LongForm (`longform-view.mjs`: przełączanie, przywracanie rodzaju, własne cięcie, wyłączanie cenzury). Identyfikatory DOM mają prefiks `cr-`, bo ukryty moduł LongForm zostaje zamontowany obok.

**Dowody**
- Testy: `ui/cutraw-server.test.mjs` (4: źródła, walidacja nowego projektu, zadanie z postępem i blokady, rewizje, eksport, Finder), `ui/cutraw-view.test.mjs` (4), `scripts/cutraw.test.mjs` (+1: prawdziwe `createProject`, `saveCuts` i `nudgeSync` na plikach z FFmpeg), `ui/panel-navigation.test.mjs` (`#cr`). `npm test`: 582/583 (1 pominięty z założenia, 0 błędów). `npm run lint` (eslint + tsc): bez błędów. `impeccable detect` na `CutRaw.tsx` i `cutraw.css`: brak uwag.
- W przeglądarce (panel na porcie 3101, projekt `cutraw-tts`):
  - przetwarzanie z panelu z GPT‑6 Luna: postęp z etapami, potem przegląd z werdyktami; reguła tej samej osoby zadziałała (dubel Bartka oznaczony przez Lunę → „do decyzji”);
  - przełączenie cięcia → autozapis (rewizja 10, decyzja ręczna), ⌘Z → cofnięcie zapisane (rewizja 11, decyzja automatyczna);
  - eksport z panelu → `out/cutraw-tts-cutraw-v004` (XML zgodny z `xmllint`, 56 klipów, 2 WAV mowy z cenzurą) i wpis na liście eksportów;
  - 1440 px: dwie kolumny; 768 px i 375 px: jedna kolumna bez poziomego przewijania; konsola bez błędów.
- Poprawione w trakcie: lista plików (nazwa + folder zamiast długiej ścieżki), dublowane etykiety („do decyzji · do decyzji”, „zostawić · zostaje”), opis etapu powtarzający nazwę etapu, okno ustawień otwarte po starcie, koszt AI podpisany jako suma wszystkich przebiegów, nagłówek „CutRaw” łamany w środku słowa na telefonie, etykiety osi ucinane od początku, tabela synchronizacji łamana litera po literze (na telefonie wiersze jako bloki z podpisami pól).

**Czego nie sprawdzono / ograniczenia**
- Brak wgrywania plików przez przeglądarkę: nagrania wybiera się z `inbox/` i folderów klientów (2-godzinne pliki 4K lepiej kopiować w Finderze niż przez HTTP).
- „Pokaż w Finderze” sprawdzone tylko w teście z podstawionym `open` (w podglądzie nie klikane, żeby nie otwierać okien na Macu).
- Odsłuch „przed/po” to przewinięcie i odtworzenie proxy. Precyzja przeskoku zależy od pętli klatek przeglądarki (wyprzedzenie 30 ms), więc ostateczne cięcia ocenia się w Premiere.
- Zadania żyją w pamięci panelu: restart przerywa przetwarzanie (projekt zostaje w ostatnim zapisanym stanie, można ponowić).
- Szerokie odstępy między słowami w zrzutach to sposób renderowania fontu w podglądzie (ten sam efekt w LongForm), nie styl CutRaw.
- Prawdziwy podcast i import w Premiere nadal czekają na C0.

**Dalej:** C0 na prawdziwym materiale (próbki + wzorzec XML z Premiere), potem C3.
