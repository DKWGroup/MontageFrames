# QuickContent — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dostarczyć w obecnym GUI cały przepływ YouTube/upload → kompletne propozycje → montaż zaznaczonych według klienta → podgląd, korekty i pobranie.

**Architecture:** Osobny moduł QuickContent w istniejącym panelu. Trwałe JSON i nadzorowany worker Node wykonują import, Whisper, analizę oraz montaż; dopiero wybrane propozycje stają się zwykłymi rolkami Remotion. Istniejący player, style, klienci i operator pozostają podstawą edycji.

**Tech Stack:** React 19.2.3, Vite 8.3.3, Node ≥22, Remotion 4.0.532, Zod 4.5.4, FFmpeg/ffprobe, yt-dlp i już dostępny OpenAI Whisper Python CLI. Bez nowego frameworka, Redis i bazy danych. Aktualizacja2026-10-15 na jawne polecenie użytkowniczki: analiza i redakcja QuickContent obsługują również istniejący klucz/model OpenAI z konfiguracji AnimaFX; lokalne `.env` pozostaje poza Git. Szczegóły konfiguracji i postępu: [PANEL.md](PANEL.md).

**Spec:** [zalozenia-funkcji-QuickContent.md](zalozenia-funkcji-QuickContent.md), [GUI](docs/quickcontent/gui.md). Podstawa: [research OpusClip](docs/quickcontent/opusclip-research.md), [źródła techniczne](docs/quickcontent/technical-sources.md), [audyt obecnego kodu](docs/quickcontent/repo-audit.md).

**Status 2026-10-15:** moduły i integracja są zaimplementowane; pełny odbiór pozostaje otwarty. [Ledger](docs/quickcontent/implementation-progress.md) i [raport odbioru](docs/quickcontent/acceptance.md) wskazują wykonane sprawdzenia oraz brakujące próby. Checkbox oznacza pełny warunek odbioru, nie samo istnienie kodu. Repo zawiera inne niezacommitowane prace, szczególnie Motion Studio i style: zachowaj je.

## Global Constraints

- „Przetwarzaj” nie uruchamia montażu żadnej rolki.
- Montaż obejmuje tylko zaznaczone ID i właściwe zasady klienta.
- Czasy w `reel.json` pozostają sekundami pliku wskazanego przez `source` — tutaj krótkiego wycinka.
- Ręczna korekta zmienia tekst, nie czasy.
- Masterów i gotowych wersji nie usuwamy automatycznie.
- Render domyślnie 1080×1920, 30 fps; master może mieć 4K.
- „Zmontowane” wymaga: poprawny MP4 istnieje, ffprobe potwierdza obraz/audio i długość, `renderRevision === editRevision`, podpis nadal odpowiada wejściu.
- Nie symulujemy procentów zegarem.
- „Znajdź więcej” nie powtarza pobrania/ASR i nie obniża automatycznie bramki jakości.
- Zlecenia GUI: bez pytań do czatu, commitów, wysyłki plików i automatycznej publikacji; zwracaj stan/podsumowanie po polsku w panelu.

## Review Focus

Pięć warunków wymagających osobnego sprawdzenia poza typowym happy path:

1. Restart w środku pobrania/ASR/renderu: nie pozostawia fałszywego `running`, osieroconego procesu ani podwójnego wykonania — zadanie 2.
2. SkyClass wybrany z czasu >0: audio i napisy dotyczą dokładnie wycinka, z zachowaniem ciszy — zadanie 7.
3. Zmiana napisów albo stylu podczas renderu: stary wynik nie dostaje aktualnego badge — zadanie 8.
4. „Znajdź więcej” przy tej samej tezie i częściowo wspólnych zdaniach: odróżnia duplikat od dwóch odrębnych historii i zachowuje selekcję — zadanie 5.
5. Materiał poziomy z dwoma rozmówcami/slajdami oraz HDR/VFR: nie gubi istotnej treści, ma poprawny kolor/synchronizację i czytelne napisy — zadania 7 i 9.

## Kolejność i punkty odbioru

| Wydzielony etap | Zadania | Co można już sprawdzić |
|---|---|---|
| Fundament i źródła | 1–4 | Trwały projekt, kolejka, lokalny master, Whisper bez montażu |
| Selekcja w GUI | 5–6 | Kompletne propozycje, opis/ocena, preview, więcej, zapis zaznaczeń |
| Montaż i wynik | 7–8 | Adapter, branding, batch, render, wersje, poprawki i aktualność |
| Odbiór pełnego GUI | 9 | Cały scenariusz użytkowniczki i regresja istniejących modułów |

Można oddzielnie reviewować moduły, ale zadania 1→2→3→4→5→6 oraz 7→8→9 mają zależności. GUI po spisaniu kontraktów można rozwijać równolegle z analizą na jawnych fixture danych. Nie wdrażać makiet jako rzeczywistych wyników.

## Mapa plików i wspólne kontrakty

| Plik docelowy | Odpowiedzialność |
|---|---|
| `src/quickcontent/schema.mjs` | Zod i wersja schematu Project/Source/Candidate/Run/Batch/Job |
| `src/quickcontent/templates.json` | Jawne szablony zgodne z istniejącymi stylami i klientami |
| `scripts/quickcontent-store.mjs` | Atomowe zapisy, optimistic revision, zdarzenia i trwały wybór |
| `scripts/quickcontent-worker.mjs` | Kolejka, procesy, checkpointy, anulowanie i odzyskanie |
| `scripts/quickcontent-ingest.mjs` | Upload, YouTube metadata/video/audio/mux/proxy |
| `scripts/quickcontent-transcribe.mjs` | Whisper, normalizacja i cache |
| `scripts/quickcontent-analyze.mjs` | Okna, analiza, kompletność, scoring, deduplikacja |
| `scripts/quickcontent-adapter.mjs` | Dokładny wycinek, origin i `buildReel()` |
| `scripts/quickcontent-render.mjs` | Snapshot, render, postęp, ffprobe i wersje |
| `src/quickcontent/RenderComposition.tsx` | Izolowana kompozycja renderu przekazanego snapshotu |
| `ui/quickcontent-server.mjs` | Endpointy spec, walidacja, media z Range i most do edytora |
| `ui/quickcontent-api.ts` | Typy payloadów i wywołania API |
| `ui/QuickContent.tsx`, `ui/quickcontent.css` | Formularz, projekt, propozycje i partia; komponenty można dzielić przy realnym wzroście |
| `ui/App.tsx`, `ui/Inspector.tsx`, `ui/api.ts` | Nawigacja, edytor, rewizje i powrót do projektu |
| `ui/server.mjs`, `ui/lib.mjs` | Podłączenie modułu, obecny operator/edytor i jawny montaż bez renderu w LLM |
| `src/Reel.tsx`, `src/Root.tsx` | Opcjonalny framing i izolowany render snapshotu |
| `scripts/studio-sync.mjs` | Zachowanie kompozycji QuickContentRender podczas regeneracji Root |
| `.gitignore`, `package.json`, `PANEL.md`, `AGENTS.md`, `CLAUDE.md` | Dane prywatne, komendy sprawdzeń i instrukcje |

Typy w poniższych sygnaturach oznaczają schematy z `schema.mjs`; to kontrakty planu, nie istniejące eksporty. Backend MJS pozostaje zgodny z wzorcem obecnego Motion Studio; typy TS frontendowe mogą być deklarowane w `quickcontent-api.ts`. Nie rozjeżdżać nazw z §10 spec.

`JobContext = {jobId, signal: AbortSignal, report(update): Promise<void>, checkpoint(name, artifacts): Promise<void>, runTool(executable, args, options): Promise<ToolResult>}`. `runTool` zawsze używa tablicy argumentów i `shell:false`; rejestruje swoje procesy, jest anulowalny, nie wypisuje sekretów. `ToolResult = {exitCode, stdout, stderr}` z limitami buforów; duże wyniki do pliku. `report` przyjmuje stage/progress/completedUnits/totalUnits zgodne z Job.

### Zadanie 1. Schematy, szablony i trwały store

**Files:** create `src/quickcontent/schema.mjs`, `src/quickcontent/templates.json`, `scripts/quickcontent-store.mjs`, `scripts/quickcontent-store.test.mjs`; modify `.gitignore`.

**Consumes:** spec §4, §10 i rzeczywiste profile klientów/style repo.

**Produces:** `createStore(root)` z metodami `createProject(input): Promise<Project>`, `getProject(id)`, `listProjects()`, `mutateProject(id, expectedRevision, update): Promise<Project>`, `getJob(id)`, `saveJob(job)`, `appendEvent(jobId,event)`, `loadEvents(jobId,after): Promise<{events,cursor}>`. `update` jest synchroniczną funkcją tworzącą nowy manifest; store zapewnia serializację per projekt. `getTemplates(clientId): Template[]` sprawdza istnienie preferencji/style/assetów, zwraca gotowość.

Eksport `createStore` żyje w `scripts/quickcontent-store.mjs`; `getTemplates(clientId)` jest metodą zwróconego store i korzysta z jego root. Rejestr pochodzi z `src/quickcontent/templates.json`. Nazwa/metoda nie może różnić się między API i UI.

- [ ] Napisz testy: klient opcjonalny; puste focus przy mode=prompt odrzucone; zakres `min>max`/poza 10–300 odrzucony; template obcego klienta odrzucony; `expectedRevision` konflikt daje 409; równoległe zapisy nie gubią selekcji; `.tmp` po awarii nie zastępuje poprawnego manifestu; ścieżka/symlink poza root odrzucona. Assert: odczyt store po ponownym `createStore(root)` zachowuje dane, `revision` rośnie o 1 przy mutacji.
- [ ] Uruchom `node --test scripts/quickcontent-store.test.mjs`; przed implementacją oczekuj FAIL brakujących eksportów.
- [ ] Zaimplementuj schemat v1 i powyższe interfejsy. Backend nadaje ID; źródło projektu to `youtube` lub `upload`, ustawienia ze spec. `getTemplates` używa jawnego rejestru zgodnego z prawdziwym stylem klienta, bez fallbacku do cudzej marki. Sekrety `.panel.json` nie wchodzą do projektu.
- [ ] Dopisz ignore `.quickcontent/` i `klienci/*/QuickContent/`; nie ignoruj dokumentacji ani instrukcji. Dodaj bazowe snapshoty preferencji/template do przyszłych montaży, nie do pliku raw ASR.
- [ ] Powtórz test. PASS wszystkich asercji i brak nieoczekiwanej zmiany istniejących plików to odbiór zadania.

### Zadanie 2. Nadzorowany worker, checkpointy i postęp

**Files:** create `scripts/quickcontent-worker.mjs`, `scripts/quickcontent-worker.test.mjs`; modify `ui/server.mjs` dla lifecycle. Jeśli potrzebny współdzielony limit zasobów, create `ui/process-resource.mjs` i test; hooki w `ui/server.mjs` oraz `ui/motion-server.mjs` ograniczyć do obsługi tego limitu.

**Consumes:** store zadania 1; handlers wstrzykiwane przez serwer.

**Produces:** `createWorker({root,store,handlers})` z `enqueue(kind,payload,{idempotencyKey?}): Promise<Job>`, `cancel(jobId)`, `retry(jobId)`, `recover()`, oraz powyższy `JobContext`. Handler: `async (payload,ctx) => artifactReferences`.

- [ ] Testy z małym lokalnym procesem testowym: jeden ciężki job naraz; podwójny enqueue klucza ma ten sam wynik; cancel zabija wyłącznie własne drzewo; restart w każdym z video/transcribe/render zostawia `interrupted` lub zweryfikowany sukces; retry reużywa poprawny checkpoint; żywy worker nie może być przejęty przez drugi; PID należący do innego procesu nie jest zabijany. Assert: żaden przebieg po restarcie nie dubluje zapisu wyniku.
- [ ] `node --test scripts/quickcontent-worker.test.mjs` ma najpierw FAIL.
- [ ] Zaimplementuj trwały zapis przed wykonaniem, lock workera z tokenem właściciela i heartbeat. Worker jako nadzorowany subprocess Node; rozłączenie IPC/EOF rodzica anuluje własne dzieci. Przy graceful shutdown zatrzymaj procesy i zapisz checkpoint. Po awarii rejestr procesu sprawdza również tożsamość, nie tylko `kill(pid,0)`.
- [ ] Wprowadź Job state machine ze spec oraz przyrostowy event cursor. Niedokończony zapis/checkpoint nigdy nie staje się sukcesem. Awaria jednego kandydata nie usuwa sukcesów innych.
- [ ] QuickContent ma limit jednego ciężkiego procesu. Współdziel blokadę zasobów z istniejącymi jobami montażu/renderu i Motion Studio, aby 4K/ASR nie uruchamiały się niekontrolowanie równolegle; nie migruj całego starego systemu jobów w tym etapie.
- [ ] PASS testów oraz próba SIGTERM/SIGKILL na testowym workerze to odbiór. W RAM może być cache, ale dysk jest źródłem prawdy.

### Zadanie 3. Ingest YouTube, lokalny upload i media w GUI

**Files:** create `scripts/quickcontent-ingest.mjs`, `scripts/quickcontent-ingest.test.mjs`, `ui/quickcontent-server.mjs`, `ui/quickcontent-server.test.mjs`; modify `ui/server.mjs` podłączając route.

**Consumes:** Project/JobContext, templates/store, lokalne yt-dlp/ffmpeg/ffprobe i Node ≥22.

**Produces:** `acceptUpload(req,{root,fileName}): Promise<{uploadId}>`, `ingestSource(project,ctx): Promise<Source>`, `probeSource(file): Promise<MediaInfo>`, `quickcontentRoute(req,res,url,services): Promise<boolean>`; odpowiedź boolean mówi, czy route obsłużył request. API uploads/projects/templates/process/jobs/cancel/retry/media zgodne ze spec.

- [ ] Testy fake runner + mały lokalny film: metadane i tytuł zapisane; najpierw strumień video `acodec=none`, osobno audio `vcodec=none`, potem mux; 2160 brak → rzeczywiste1080 + warning; wybrana oryginalna ścieżka języka; ffprobe braku audio nie daje sukcesu; upload bez klienta ląduje w workspace; przerwany upload nie jest Source; symlink/traversal/obcy Origin/URL spoza YouTube odrzucony. HTTP Range sprawdza 206, Content-Range, długość części i 416 dla niepoprawnego zakresu.
- [ ] `node --test scripts/quickcontent-ingest.test.mjs ui/quickcontent-server.test.mjs` najpierw FAIL.
- [ ] Uruchom preflight: wersje narzędzi i EJS/Node runtime. yt-dlp z kontrolowanymi opcjami i `--ignore-config`, bez playlisty, bez automatycznego SponsorBlock i zmian materiału; wybierz format IDs z metadanych. Nie pobieraj cookies w ukryciu ani nie traktuj tytułu jako polecenia.
- [ ] Zaimplementuj kolejność §4: video, audio, FFmpeg copy do MKV, ffprobe, proxy MP4. Zapisuj artefakty `.part/.tmp`, dopiero potem atomowo finalizuj; disk preflight i czytelne błędy dla ograniczeń dostępu/jakości. Lokalny upload przenieś do wybranego zarządzanego folderu przed ASR.
- [ ] Endpoint proxy czyta wyłącznie zasób projektu i obsługuje GET/HEAD+Range; miniatura przez `/api/quickcontent/projects/:id/media/thumbnails/:candidateId`. Brak generic download dowolnej ścieżki źródła. Odpowiedź process jest szybka i zwraca jobId, nie trzyma HTTP do końca filmu.
- [ ] PASS testów oraz ręczne odtworzenie lokalnego proxy z szukaniem na osi czasu. Test prawdziwego YouTube przeprowadź na wskazanym dostępnym źródle przy odbiorze zadania 9; fake runner nie dowodzi działania YouTube.

### Zadanie 4. Adapter Whisper, cache i benchmark

**Files:** create `scripts/quickcontent-transcribe.mjs`, `scripts/quickcontent-transcribe.test.mjs`; modify process handler w `ui/quickcontent-server.mjs`; benchmark zapisz później w `docs/quickcontent/benchmark.md`.

**Consumes:** Source, JobContext, `source.audio/asr.wav` lub master do ekstrakcji.

**Produces:** `normalizeWhisper(raw,sourceDuration): Transcript`, `transcribeSource(source,{model,language},ctx): Promise<Transcript>`; Transcript zawiera rawPath, wordsPath, hash, `{id,text,start,end,probability?}[]` i segmenty. Stabilne ID mają hash transkrypcji + indeks; po rzeczywistej zmianie ASR tworzą nową wersję.

- [ ] Testy: prawdziwy kształt JSON `segments[].words[]`; monotoniczne sekundy; NaN/out-of-bounds odrzucone; pusta mowa wraca jako no-speech; punktacja/nazwy PL zachowane; błędny/pusty JSON przy exit0 daje failure; zmiana modelu/języka/audio invaliduje cache, find-more go reużywa. Assert: ASR nie dotyka captions ani istniejących poprawek.
- [ ] `node --test scripts/quickcontent-transcribe.test.mjs` najpierw FAIL.
- [ ] Wywołaj już zainstalowany `whisper` z `large-v3-turbo`, transcribe, językiem pl, JSON, word timestamps. Zapisuj raw niezmieniony; normalizację do drugiego pliku. Nie traktuj eksperymentalnych czasów jako bezbłędnych i nie zmieniaj ich podczas korekty tekstu.
- [ ] Użyj etapowego progress/null, nie regexu przypadkowych procentów logów. Restart nieukończonego ASR może ponowić ten etap; nie deklaruj częściowego resume, którego CLI nie zapewnia.
- [ ] PASS testów + benchmark 10–20 min realnego polskiego źródła: czas, pamięć, urządzenie, próbka ręcznie sprawdzonych słów/nazw/liczb. Nie przełączaj na whisper.cpp/faster-whisper bez wykazanego problemu i zachowania tego samego kontraktu.

### Zadanie 5. Analiza historii, ocena i „Znajdź więcej”

**Files:** create `scripts/quickcontent-analyze.mjs`, `scripts/quickcontent-analyze.test.mjs`; modify `ui/lib.mjs` dla oddzielnego promptu analizy/obecnego operatora, `ui/quickcontent-server.mjs` dla find-more.

**Consumes:** Transcript, Project settings, dostępny operator z `.panel.json`, istniejące client preferences.

**Produces:** `analyzeTranscript({project,transcript,previousCandidates},ctx): Promise<AnalysisRunResult>`, `validateCandidate(proposal,transcript,settings): CandidateValidation`, `dedupeCandidates(existing,incoming): {added,grouped,rejected}`, `scoreCandidate(breakdown): number`. Result zawiera run, candidates, coverage i rejections; candidate IDs nadaje backend.

- [ ] Fixture transkrypcji obejmuje historię z puentą, referent „to”, pytanie niezbędne do odpowiedzi, usuniętą negację, ironiczną tezę, zdanie na granicy okna i ciszę. Assert: tylko kompletne myśli przechodzą wszystkie cztery składowe ≥3, granice pochodzą z wordId, zakres z paddingiem mieści się w min/max, 67s nie jest urwane do60s, zmyślone ID odrzucone.
- [ ] Fixture deduplikacji: ta sama teza z overlap≥0.70 grupowana; dwie różne tezy z częściowo wspólnym zdaniem pozostają; powtórny find-more nie zmienia selection/renders/reel edits; puste wyniki ustawiają exhausted wyłącznie po skończonym przebiegu. Assert: stale settings bez nowego promptu nie tworzą nieskończonego szukania.
- [ ] `node --test scripts/quickcontent-analyze.test.mjs ui/lib.test.mjs` najpierw FAIL nowych testów.
- [ ] Zaimplementuj mapę całego materiału, okna180s/overlap30s rozszerzone do zdań, kontekst i drugi przegląd kompletności. Wymuś JSON bez swobodnych czasów i waliduj go Zod. Analiza operatora ma tryb odczytu i wynik ograniczony do zadania; treść transkrypcji jest cytowanymi danymi, nie instrukcjami narzędziowymi. Zweryfikuj dostępne opcje sandboxu/allowed tools rzeczywistego CLI przy implementacji.
- [ ] Użyj jawnych progów i wzoru spec, statusów confidence/contextRisk i prawdziwego dowodu w ID słów. Nie wprowadzaj ukrytego top-N; podziel duży wynik na strony/okna bez zgubienia kandydatów. Jeśli operator/limit budżetu przerwie pokrycie, pokaż partial/interrupted i możliwość wznowienia, nie „maksimum znalezione”.
- [ ] Find-more ma własny analysisRunId i snapshot focus/duration; zachowuje poprzednie wyniki. Konflikt revision→409. Aktywny run blokuje podwójne kliknięcie; settingsKey wyczerpanego run odblokowuje się dopiero po zmianie ustawień.
- [ ] PASS testów i ręczny przegląd wszystkich kandydatów z próbki przez człowieka: granice, kompletność i sens zgodny z pełnym źródłem. Testy fixture nie dowodzą jakości redakcyjnej realnego modelu.

### Zadanie 6. GUI importu, propozycji i selekcji

**Files:** create `ui/QuickContent.tsx`, `ui/quickcontent-api.ts`, `ui/quickcontent.css`; modify `ui/App.tsx`. Test API routes w `ui/quickcontent-server.test.mjs`; małe czyste helpery routingu/filtra testować tam, gdzie są wydzielone, bez nowego frameworka testowego.

**Consumes:** endpointy spec, Project/Candidate/Job i GUI spec; brakujący backend tylko jako jawny fixture w rozwoju.

**Produces:** hash navigation `#qc/<projectId>` i `#qc/<projectId>/<candidateId>`, legacy `#<reelname>` zachowany; import/settings/process/proposals/find-more/selection dostępne z jednego modułu.

- [ ] Napisz testy kontraktu API: selection tylko własnych kandydatów; stale revision409 bez utraty poprzednich danych; zerowe wyniki i exhausted; pagination zachowuje wszystkie wyniki; get projektu po reinitializacji store ma te same zaznaczenia. Routing nie interpretuje `qc/` jako nazwy zwykłej rolki.
- [ ] Uruchom `node --test ui/quickcontent-server.test.mjs` — nowe asercje najpierw FAIL, istniejące nadal PASS.
- [ ] Zaimplementuj ekrany z gui.md, dziedzicząc panel.css/Fustat. Domyślne Auto,30–60s,1080p; opcjonalny klient, osobny template, focus textarea i wszystkie presety długości. Błędy pola nie kasują formularza. Pokazuj faktyczny tytuł/jakość dopiero po ich poznaniu.
- [ ] Proposal cards: temat/opis, score breakdown/reason, character/confidence/risk, source time/duration, thumbnail i ograniczony podgląd proxy. Przy osiągnięciu końca zakresu zatrzymaj/loop zgodnie z jawną akcją; pauzuj poprzedni player. Nie odtwarzaj wszystkich kart ani nie materializuj reel.json przed wyborem.
- [ ] Sticky „Zmontuj zaznaczone(N)” i trwały PUT selection; sortowanie i find-more nie resetują wyboru. Polling ma cleanup, cursor dedupe i backoff; „Utracono połączenie” nie anuluje joba. Odświeżenie i Wstecz odtwarzają kontekst.
- [ ] Odbiór w 375/768/1024/1440px, klawiatura i zoom200%; focus nie ginie pod sticky; 44px cele, status aria-live, oznaczenia także tekstem. `npm run lint` PASS albo wyłącznie zidentyfikowany baseline błąd; sprawdzenia QC nie mogą być pominięte z powodu baseline.

### Zadanie 7. Materializacja wycinka, branding i kadrowanie

**Files:** create `scripts/quickcontent-adapter.mjs`, `scripts/quickcontent-adapter.test.mjs`; modify `src/Reel.tsx`, `ui/Inspector.tsx`, `scripts/studio-sync.mjs` wyłącznie jeśli nowe pole wymaga obsługi. Reuse eksportów `scripts/prep.mjs`.

**Consumes:** Project/Candidate/Transcript, template snapshot, master oraz JobContext.

**Produces:** `materializeCandidate({project,candidate,transcript},ctx): Promise<{reelName,origin,data}>`, `rebaseWords(words,sourceStart,sourceEnd): {words,wordMap}`, `buildCandidateReel(input): ReelData`. Origin zapisuje projectId/candidateId/sourceId/sourceStart/sourceEnd/transcriptHash i mapowanie źródłowych wordId na lokalne słowa.

- [ ] Test offset: master słowo [125.20,125.60], sourceStart125.00 → [0.20,0.60]; korekta tekstu nie zmienia obu wartości. Test SkyClass start>0: całe źródło krótkie, segment od0 do jego długości, pełne słowa i cisza, brak ponownego Parakeeta. Testy exact cut/HDR/VFR i istniejący style test: bez framing wynik zachowuje obecny cover.
- [ ] `node --test scripts/quickcontent-adapter.test.mjs scripts/prep.test.mjs` — nowe testy najpierw FAIL. Jeśli plik istniejących testów ma inną nazwę, użyj rzeczywistej listy z `rg --files scripts -g '*.test.mjs'`, nie wymyślaj nowego duplikatu.
- [ ] Przygotuj dokładny wycinek, nie `-c copy` na przypadkowej klatce kluczowej: CFR/SDR, H.264/AAC. Zakres nie może przesunąć pierwszego słowa; ffprobe i test odsłuchu >0s sprawdzają wynik. Master jest immutable.
- [ ] Przekaż words i jawny styleId/clientId do `buildReel()`, zachowaj produkty klienta przez istniejące `matchProducts()`. Bez wywoływania prep main. Nie nadpisuj istniejącego reel.json przy retry; sprawdź zgodność origin z kandydatem i stan etapu.
- [ ] Dodaj opcjonalny framing `fit|crop` i center0–1. Fit poziomego obrazu ma rozmyte tło z tego samego źródła, tylko główny obraz emituje audio. Crop ma ręczne przesunięcie w Inspector; istniejące rolki bez framing zachowują zachowanie. Sprawdź face.bottom w finalnym kadrze.
- [ ] Zarejestruj tylko wybrane rolki przez istniejący syncStudio, serializując zapis rejestru. PASS testów + klatki i odsłuch SkyClass, rozmowy dwóch osób i slajdów. Nie poprawiaj całego dotychczasowego audio SkyClass, jeśli adapter wystarcza.

### Zadanie 8. Batch montażu, render snapshotu i rewizje

**Files:** create `scripts/quickcontent-render.mjs`, `scripts/quickcontent-render.test.mjs`, `src/quickcontent/RenderComposition.tsx`; modify `ui/quickcontent-server.mjs`, `ui/server.mjs`, `ui/lib.mjs`, `src/Reel.tsx`, `src/Root.tsx`, `scripts/studio-sync.mjs`, `ui/Inspector.tsx`, `ui/api.ts`; test `ui/quickcontent-server.test.mjs`, `ui/lib.test.mjs`, `scripts/studio-sync.test.mjs`.

**Consumes:** materializeCandidate, worker/store, obecny operatorCommand/montagePrompt/chatPrompt, renderPath, nowy revision/signature contract.

**Produces:** `startBatch(projectId,{candidateIds,expectedRevision,idempotencyKey}): Promise<{batchId,jobIds}>`, `renderReelSnapshot({reelName,data,editRevision,outFile},ctx): Promise<RenderRecord>`, `isCurrentRender(candidate,inputSignature): boolean`, `updateReelRevision(reelName,reason): Promise<void>`; RenderRecord ma filePath, renderRevision, signature, verified i datę. `bridgeReelJob({method,reelName,body,cursor},services): Promise<LegacyJobResponse|null>` w `ui/quickcontent-server.mjs` zwraca null tylko dla rolki bez origin QuickContent; obsługuje start/status/cancel przez worker, przekładając zdarzenia na kontrakt istniejącego edytora.

- [ ] Testy: wybrane2 z5→dokładnie2 montage jobs; duplicate idempotencyKey→jedna partia; obceID409/400, gotowe pozycje nie renderują się ponownie; failure1 nie kasuje sukcesu drugiej. Procent partii3/8=37.5, błędy nie zwiększają licznika. AI exit0 bez MP4 nie daje „Zmontowane”.
- [ ] Testy wyścigów: snapshot revision3, edycja podczas renderu→revision4, wynik3 zachowany ale stale; zmiana stylu/fontu invaliduje signature; v002 nie nadpisuje v001; niepoprawny MP4 z exit0 nie jest verified; download aktualny zablokowany przy stale, archiwalny jawnie dostępny. Test że metadata i duration snapshotu nie są pobrane z późniejszego reel.json.
- [ ] Testy integracji starego edytora: POST `/api/job/:name` dla QC z kind montage/chat/render i GET/DELETE tego zasobu trafiają do trwałego workera; legacy prep/renderStep nie są wywołane. Nieznany lub uszkodzony origin blokuje operację, zamiast fallbacku. Operator zmienia JSON i kończy error/cancel: editRevision i stale wynik odzwierciedlają częściową zmianę. `syncStudio()` po dodaniu kolejnej rolki zachowuje `QuickContentRender`, stare rolki oraz MotionCompositions.
- [ ] `node --test scripts/quickcontent-render.test.mjs ui/quickcontent-server.test.mjs ui/lib.test.mjs` najpierw FAIL nowych asercji.
- [ ] Montaż operatora uruchamiaj z `render:false`. Po jego pracy osobno sprawdź JSON, preferencje klienta, klatki, potem uruchom jawny kontrolowany render. Nie wyciągaj procentu „pracy AI” z tekstu odpowiedzi. Przekaż tylko wskazaną rolkę jako obszar edycji i trwałą sesję/log czatu.
- [ ] Wywołuj bridgeReelJob przed legacy startTask/renderStep oraz przy GET/DELETE joba. Dla istniejącej rolki QC kind montage pracuje na gotowym krótkim source i szkicu, bez prep. QC wariant chatPrompt nie pozwala operatorowi samemu renderować; prośba o render uruchamia oddzielny job snapshotu po korekcie. Ograniczenia narzędzi i wynik procesu nie mogą pozwolić ominąć tego kontraktu. Nowy Inspector i dotychczasowy RenderTab muszą otrzymać ten sam trwały stan.
- [ ] **Pułapka istniejącego kodu:** `calculateReelMetadata()` zawsze pobiera bieżący reel.json i może nadpisać props.data. Dodaj obsługę przekazanego snapshotu oraz izolowaną kompozycję `QuickContentRender` z `src/quickcontent/RenderComposition.tsx`, używającą Reel bez wygenerowanych `timeline` templates. **Zmodyfikuj generator `scripts/studio-sync.mjs`, nie tylko Root**, ponieważ odtwarza Root przy każdej synchronizacji. Rozmiar/duration pochodzą ze snapshotu. Zwykłe kompozycje nadal korzystają z obecnego fetch, gdy data nie przekazano.
- [ ] Bundle renderu, media, fonty i assety używane do snapshotu mają stabilną wersję; nie czytaj zmiennego pliku w połowie renderu. Podpis obejmuje reel data, source/asset/font hashes i wersję kodu stylu. Render zapisuje wersjonowany plik tymczasowy, ffprobe verify, atomowe finalizowanie i dopiero RenderRecord. Użyj API Remotion postępu, jeśli już dostępne przez CLI dependencies; dodanie jawnego `@remotion/renderer` tylko w tej samej wersji, gdy import go wymaga.
- [ ] Hook zapisu reel i Studio sync zwiększa editRevision dla powiązania w origin. Wspólny operatorStep robi origin-aware reconciliation przy **każdym zakończeniu** montage/chat: success/error/cancel, także po bezpośrednim zapisie JSON przez operatora. Przy odzyskaniu po awarii porównaj podpis ostatniej zapisanej edycji z dyskiem. Zmiany globalne stylów/assetów wykrywa signature przy odczycie, nawet bez zmiany JSON. Pobranie używa właściwej wersji; nie mieszaj final z plikiem chwilowym.
- [ ] GUI partii: completed/total%, status każdej propozycji, current render%, failed/cancelled oddzielnie; aktualny badge tylko isCurrentRender. Render poprawki jako osobny job w tej samej kolejce. `node --test scripts/quickcontent-render.test.mjs ui/quickcontent-server.test.mjs ui/lib.test.mjs scripts/studio-sync.test.mjs` PASS oraz ręczna edycja podczas testowego renderu to odbiór.

### Zadanie 9. Pełny przepływ GUI, regresja i dokumentacja użytkowa

**Files:** modify `ui/QuickContent.tsx`, `ui/App.tsx`, `ui/Inspector.tsx`, `PANEL.md`, `AGENTS.md`, `CLAUDE.md`, `package.json`; create `docs/quickcontent/acceptance.md`, `docs/quickcontent/benchmark.md` i `ui/quickcontent-flow.test.mjs`.

**Consumes:** wszystkie wcześniejsze interfejsy i warunki odbioru spec §11.

**Produces:** kompletny przepływ z gui.md; raport z prawdziwych sprawdzeń, wersji narzędzi i znanych ograniczeń.

- [ ] Test HTTP z realnym store + fixture runner: upload→process→proposals→find-more→selection→montage→current render→text edit→stale→rerender→download. Assert: żaden render przed selection, wybór zachowany, stare timestampy identyczne, v001 nadal istnieje. Osobne asercje zero/exhausted, cancellation i partial failure.
- [ ] `node --test ui/quickcontent-flow.test.mjs` najpierw FAIL brakującego przepływu.
- [ ] Sprawdź, że nowy schemat/backend/frontend używają identycznych nazw. Dodaj docelowy thumbnail endpoint, render context w istniejącym Inspector i przycisk powrotu; hash reload wraca do tego samego fragmentu. Czat i download działają też po restarcie.
- [ ] Uruchom `npm test`, `npm run lint`, `npx eslint ui/QuickContent.tsx ui/quickcontent-api.ts`, `git diff --check`. Obecny lint tylko `src` nie jest dowodem lintowania całego nowego UI; uzupełnij skrypt tak, aby nowe pliki MJS/TSX i testy były sprawdzane bez przypadkowego pominięcia.
- [ ] W prawdziwym GUI przy `npm run ui` przejdź scenariusz na wskazanym publicznym lub niepublicznym YouTube i lokalnym materiale. Sprawdź best video-only/audio-only format IDs, mux i folder klienta/workspace, długość60+min, quality fallback, brak mowy i restart. Wyniki fixture nie zastępują tego testu.
- [ ] Sprawdź min. dwa style klientów: SkyClass pełna cisza i 1:1 oraz styl dopuszczający cięcia; ręczna transkrypcja, chat, crop/fit, download, current badge. Obejrzyj klatki początku/środka/końca oraz odsłuch. Sprawdź scenariusz responsive375/768/1024/1440, klawiaturę, 200% zoom i reduced motion.
- [ ] Regresja: istniejąca zwykła rolka bez framing i origin, upload starego formularza, edycja, Studio sync, render klienta i Motion Studio. Zachowaj wcześniejsze niezacommitowane zmiany; błędy baseline opisuj z dowodem, nie przypisuj im sukcesu.
- [ ] PANEL opisuje rzeczywiście wdrożony moduł i konfigurację Whisper/yt-dlp. AGENTS/CLAUDE wskazują tę samą spec; dopiero po całym odbiorze zmień status „projekt” na „wdrożone” z wersją/datą. Raport acceptance zawiera wynik każdego punktu, ograniczenia i linki do prawdziwych plików/klatek; nie wpisuj PASS dla niewykonanego sprawdzenia.

## Zasada kończenia każdego zadania

Po zielonym sprawdzeniu sprawdź diff tylko plików etapu i zaktualizuj jego checkboxy z dowodem. Przy wykonaniu w normalnej sesji developerskiej można zrobić lokalny commit tylko tych zmian (`git add -- <dokładne pliki>`); w zadaniu uruchomionym z GUI commitów nie robić. Nie używaj `git add .` i nie zapisuj w commicie cudzych niezacommitowanych prac.

## Samokontrola planu

| Wymaganie użytkowniczki | Zadania pokrywające |
|---|---|
| YouTube1080/4K obraz osobno, audio najlepsze, tytuł, ffmpeg i lokalne foldery | 1,3 |
| Lokalny plik, workspace bez klienta | 1,3,6 |
| Whisper i analiza pełnego źródła | 4,5 |
| Auto/wskazówki, długość i branding w GUI | 1,5,6 |
| Maksimum sensownych pełnych historii, opis i ocena | 5,6 |
| Znajdź więcej, bez duplikatów i utraty wyboru | 1,5,6 |
| Montaż zaznaczonych według klienta | 7,8 |
| Liczba zmontowanych, procent i praca w tle | 2,6,8 |
| Badge, podgląd, tekst, chat i pobranie | 7,8,9 |
| GUI od początku do końca, restart i wcześniejsze moduły | 2,6,9 |

Nazwy API i pola są związane ze spec §10; nowe funkcje mają producenta i odbiorcę w opisanych interfejsach. Przegląd wykonano bez implementacji. Największe niewiadome wymagające realnego materiału: wydajność Whisper na obecnym sprzęcie, jakość selekcji oraz niezawodność pobierania z YouTube. Plan nie uzależnia przygotowania dokumentów od tych pomiarów, ale wymaga ich przed wydaniem funkcji.
