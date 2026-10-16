# SDD ledger — plan: plan-wdrozenia-QuickContent.md

## 2026-10-14 — wdrożenie autoryzowane

- Ruling: praca w obecnym katalogu ze ścisłym podziałem plików, bez commitów — plan i dotychczasowe Motion Studio/style są niezacommitowane i potrzebne do integracji. Nie kopiujemy ani nie cofamy cudzych prac.
- Ruling: implementacja równoległa według odpowiedzialności, z TDD i wspólnym review — fundament/worker, media/ASR/adapter, GUI oraz analiza/integracja mają oddzielne pliki; backend/frontend uzgadniają kontrakty ze spec.
- Baseline testów przed kodem QC: 52/57 PASS, 5 błędów `listen EPERM` w testach Motion Studio (ograniczenie sandboxu, wymagają ponowienia poza sandboxem). Drugi przebieg już objął nowe testy TDD tworzone równolegle i nie jest baseline.
- Baseline lint: 24 ostrzeżenia istniejących wygenerowanych bloków; tsc: nieużywany `clamp` w `motion-projects/skyclass-warszawa-alicante-overlay/index.tsx`.

| Zadania | Uzgodniony kontrakt | Stan |
|---|---|---|
| 1→2→3 | createStore: sync factory, async methods; ctx.root/store/signal/runTool | W toku |
| 3→4→5 | Source.dataDir/masterPath/proxyPath relative root; Transcript.words + rawPath/wordsPath/hash | W toku |
| 1→6 | focus auto/prompt; duration min/max; sourceKind youtube/upload; templates jawne | W toku |
| 7→8→9 | origin globaltimes/wordMap; Reel local source; framing; revision/signature | W toku |

Wszystkie zadania 1–9 wymagają sprawdzenia przed zmianą statusu dokumentacji na „wdrożone”.

## 2026-10-15 — integracja i odbiór

- Fundament, importer, Whisper/cache, analizator, adapter, renderer i GUI są w kodzie; pełny odbiór produkcyjny pozostaje otwarty.
- Świeży zintegrowany `npm test`: 148/148 PASS (kolejne regresje są dodawane). `npm run lint`: 0 błędów, 24 wcześniejsze ostrzeżenia w wygenerowanych blokach Jeep; TypeScript PASS.
- Regresje RED→GREEN: równoległe zapisy QC z `X-Edit-Revision`; spójny odczyt danych i rewizji; walidacja fps/kadru/cięć/grup napisów/ścieżek assetów; nakładające się czasy ASR nie ucinają słów; cała mapa tematów przed review; przekazany analysisRunId.
- HTTP proxy: prawdziwy stream GET/HEAD 206, Content-Range/bajty, 416 i obca miniatura — PASS. Powiązany edytor używa trwałego workera i nie odpala Parakeeta.
- Media: 27/27 PASS, w tym rzeczywiste audio wycinka >0 i HDR→SDR/CFR. Renderer: 7/7 oraz prawdziwy 1-sekundowy MP4 1080×1920 H.264/AAC, 1,003 s; postęp 4 Hz; atomowy plik bez nadpisania.
- Ruling: wyłącznie osobna `QuickContentRender` czyta snapshot; stara `calculateReelMetadata` pozostaje bez zmian. To chroni dawny player i eliminuje fetch zmiennego JSON podczas renderu. Koszt pomyłki: osobny kontrakt metadata do utrzymania, objęty testem generatora.
- Ruling: nadzorowane narzędzia mają subprocess guardian, kolejka jest w procesie panelu i zachowuje trwałe manifesty. Nie dodajemy drugiej usługi. Koszt pomyłki: restart panelu przerywa narzędzie i wymaga jawnego retry.
- Dopisano jawne SDK `@remotion/bundler` i `@remotion/renderer` w tej samej już zainstalowanej wersji 4.0.532; bez aktualizacji Remotion.
- Live projekt: `qc-7b3be908-416a-430b-b011-16fe0aeb2fe8`, test YouTube `cNONgIqtjU0`. Metadata potwierdza tytuł „Dlaczego NIE nadpłacam kredytu? Oto liczby”, 1013 s, strumienie video-only do4K i polskie audio-only. Sam odczyt metadata nie potwierdza pobrania/mastera/ASR.
- Znaleziona blokada live: inny Vite na porcie3101 utrzymuje lock mimo pustej kolejki. Poprawka lifecycle w toku, nie zabijamy innego serwera.
- Operator Claude nie jest zalogowany (`claude auth status --json`, także poza sandboxem); brak `.panel.json` z innym operatorem. Użytkowniczka dostała instrukcję logowania w swoim Terminalu. Pełna analiza/montaż AI nie są jeszcze zweryfikowane.
- Uruchomiono świeży niezależny review całej funkcji; po review ważne uwagi wymagają reprodukcji RED→GREEN i pełnej regresji. Bez commitów/push/publikacji.

### Checkpoint etapów — 2026-10-15

- Na życzenie użytkowniczki finisz podzielono na3 etapy: (1) kolejka/import/GUI, (2) poprawki montażu i odporności z review, (3) rzeczywisty pełny odbiór. Szczegółowy stan i następne kroki w [acceptance.md](acceptance.md).
- Review przekazał6 ważnych usterek: częściowy startBatch, replay AI przy retry renderu, freeze kodu bundle, semantyczny duplikat-parafraza, proxyHDR i fit+zoom. Są zapisane w etapie2; nie oznaczono całej funkcji jako gotowej. Końcowy odczyt lifecycle przez review został przerwany limitem.
- Naprawiono idle lock i restart/close Vite, UTF8 stdout/stderr:22/22 testy worker+API, pełny zestaw154/154, rozszerzony lint0błędów. Nie zamykamy ani nie zabijamy innego panelu.
- Błąd403 realnego downloadu: aktualizacja yt-dlp do2026.08.19 przez Homebrew. Potem wykryto i naprawiono konflikt cffi z odziedziczonego PYTHONPATH; izolacja PythonCLI, testRED→GREEN. Próba3 tego samego trwałego zadania pobiera kolejne fragmenty obrazu (odczyt33,6MB), finalizacja w toku.
- Próba3 wykryta jako niekompletna po starym partialu; zachowana diagnostycznie, source wycofany. Unikalny partial per próba i skan pakietów ffprobe z obsługą stderr/exit0: RED→GREEN. Próba4 ukończyła video-only1080p270/audio-onlyPL140-1 i master190975042bajty/1012,506s,25311video+43605audio bez błędów. Aktualny pełny zestaw156/156PASS, lint+tsc0errors/24baselinewarnings, diffcheckPASS. Błąd403 naprawiony rzeczywistym pobraniem; etap2 z review nadal otwarty.
- Checkpoint przed kolejną poprawką: source+proxy gotowe, job próba4 **running/transcribe**, zapisany screenshot `assets/etap-1-whisper.png`. Nie zmieniać runtime plików podczas Whisper bez potrzeby: Vite restart przerwie własne narzędzie, a model wróci przy retry.

### Naprawa widoczności ASR i operatora — 2026-10-15

- Pełna transkrypcja ukończyła się naturalnie po12min25s (744,812s),2707 słów z czasami, wynikready i cache zachowane. Przyczyna długiego oczekiwania: lokalny duży model naCPU oraz brak raportowaniastderrWhisper doGUI; nie był to martwy proces. NaM1Max MPSjest dostępny poza sandboxem, ale CLI wybieraCPU bezCUDA. Nie wymuszamy niezweryfikowanej ścieżkiGPU dla wyrównania słów.
- Dodano parser rzeczywistych licznikówramek/ETAWhisper, monotoniczne aktualizacje i końcowy100% po zapisie, etap ładowania, czas pracy i czas od ostatniego pomiaru. Worker trwale zapisuje pomiary i czyści pola na zmianie etapu; GUI rozróżnia czas audio od części analizy. Testy RED→GREEN obejmują parser, adapter, worker i renderUI. Prawdziwy12,12s wycinek:19,941s/30 słów, raporty0→99→100% ([dowód](asr-progress-proof.json)).
- BłądClaude`Invalid MCP configuration`: poprawiono `--mcp-config` na jawne `{"mcpServers":{}}`. Zgodnie z nową instrukcją użytkowniczki skopiowano dokładny plikAnimaFX`.env.local` do lokalnego`.env`,chmod0600,gitignored, bez wypisywania wartości. Adapter analizy i redakcjiQC obsługuje OpenAIResponsesAPI/model z tej konfiguracji oraz dotychczasowy fallbackClaude. Brak dodatkowego SDK, narzędzi modelu i ekspozycji klucza wUI.
- Rzeczywisty testOpenAI: poprawna odpowiedźJSON po połączeniu. Analiza filmu wznowiona zGUI jako próba5, przechodzi kolejne części naOpenAI; nie pobiera ani nie transkrybuje źródła ponownie. Pełny odbiór montażu z etapu2 pozostaje otwarty.
- Końcowa regresja poprawek postępu i operatora: `npm test` **166/166 PASS**; `npm run lint` (w tymTypeScript) **0 błędów /24 wcześniejsze ostrzeżenia**; `git diff --check` PASS. Rzeczywisty panel pokazuje ukończonyWhisper i postępOpenAI ([zrzut](assets/openai-analysis-progress.png)).
- **Wynik rzeczywisty próby5:** zadaniecompleted,13 propozycji, pokrycie7/7 okien materiału,8 odrzuceń przez kontrolę/deduplikację. GUI pokazuje opisy, zakresy, oceny i wybór do montażu; zaznaczenie0, niczego nie montowano automatycznie. Hash transkrypcji pozostał `c61bf421d2b3a1f7a0f70271c16dcc003fae06bbf3bb452e5b585560265621ca`; checkpointASR nadal10:34:39.532Z. [Wynik wGUI](assets/openai-proposals.png). To zamyka bieżącą naprawęoperatora, nie pełny odbiór etapu2/3.

### Pion, rozdzielczość i koszt — 2026-10-15

- [Plan bieżącej zmiany](portrait-cost-plan.md): domyślny crop9:16,720/1080/2160 wyjściowej szerokości; format pobrania pozostaje osobny. Obróbka wyłącznie wybranych propozycji po kliknięciu montażu. Gotowe JSON zachowują pełny krótki source, aby umożliwić ręczną zmianę kadru.
- Lokalny AppleVision naMac ustala stały kadr na podstawie największej twarzy z trzech próbek; fallback wyśrodkowany z komunikatem w edytorze. Nie deklarujemy śledzenia mówców. Rzeczywisty wycinek użytkowniczki:720×1280 i2160×3840,H.264/AAC,1,408s; twarz widoczna w pionie, obejrzana klatka. [Pomiar](portrait-proof.json), [klatka](assets/portrait-frame.png). To test krótkiego eksportu, nie odbiór całych wybranych rolek. Fixture przeniesiono do archiwum weryfikacji; zaznaczeń użytkowniczki nie zmieniono.
- Koszty zapisują tokeny/model/responseId/cennik w trwałym jobie przed walidacjąJSON; podział analiza/montaż/czat, lokalny render0opłatyAPI. Stare zadania mają brak pomiaru. Rzeczywisty krótki testAPI zachował35tokenów wejścia/14wyjścia i10,5mikroUSD; nie jest to koszt montażu rolki. [Dowód](cost-proof.json). CennikStandardgpt-6-luna sprawdzono w oficjalnej dokumentacji2026-10-15.
- Naprawiono z review częściowy startBatch oraz retry montażu: replay odzyskuje istniejące joby z niezmiennym payloadem, ukończonyAI ma osobny niezmienny receipt/checkpoint perjob. Późniejszy czat i ręczne poprawki zostają przy retry. Zmiana rozdzielczości oznacza poprzedni wynik jako nieaktualny dla projektu i tworzy sam render bez ponownegoAI. Regresje RED→GREEN obejmują oba przypadki oraz replay po awarii.
- Rzeczywisty eksport wykrył brakQC w zmiennym rejestrzeRoot (inny działający watcher). Render i still mają teraz niezależny `src/quickcontent/index.ts`, bez odczytu tego rejestru. Nie zatrzymano cudzych procesów. Pozostałe otwarte uwagi wcześniejszego review są nadal wacceptance.

- Ostateczna regresja tej zmiany: **179/179 PASS**, lint i TypeScript0błędów/24 wcześniejsze ostrzeżenia, diffcheckPASS. [Panel ustawień i kosztów](assets/portrait-cost-settings.png). Dwa istotne problemy oraz następstwo replay wykryte przez świeży review usunięto z regresjami; nie rozszerzano review na całą wcześniejszą aplikację.


### Operator terminalowy i naprawa montażu — 2026-10-15

- Wdrożono wybór Codex/Claude Code na koncie terminalowym oraz osobny jawny tryb OpenAI API. Domyślnie Codex; bez automatycznego fallbacku API. Limity i koszt subskrypcji konta pozostają. CLI działa ze wspólną kolejką również bez uruchomionego GUI i sprawdza tożsamość repozytorium panelu.
- Przyczyną błędu API było `data:null` po sprzecznym poleceniu pracy na plikach. Nowy kontrakt jest samowystarczalny, walidowany przed zapisem. Regresje obejmują null, zachowanie efektów/końców napisów SkyClass i wyłączenie skonfigurowanych MCP/pluginów dla procesu Codex.
- Prawdziwy nieudany job `job-6cf92703-a817-4f89-ad40-ca6e71be8db4` wznowiono przez Codex ChatGPT: ukończony, H264/AAC,1080×1920,42,581s. Sprawdzono klatki, aktualność w GUI i pobieranie HTTP200/45516375 bajtów. Źródła i transkrypcji nie przeliczano;6 zaznaczeń zachowano,5 anulowanych montaży nie wznowiono. [Pomiar](terminal-montage-proof.json), [GUI](assets/terminal-montage-ready.png).
- Codex:33160tokenów wejścia/3426wyjścia,0 osobnej opłaty API (subskrypcja). Historyczna opłata wcześniejszego błędnego API pozostaje w kosztach. [Krótki rzeczywisty test nowego kontraktu API](api-edit-proof.json) przeszedł; to nie dowód pełnego montażu przez API. Claude jest zainstalowany, ale niezalogowany — prawdziwego wywołania Claude nie potwierdzono.
- Regresja193/193PASS; lint/TypeScript0błędów,24 wcześniejsze ostrzeżenia. Testy procesów wymagają dostępu do ich tożsamości poza sandboxem. Nie wykonano odsłuchu ani pełnego odbioru wszystkich stylów; wcześniejsze otwarte uwagi całej aplikacji pozostają.


### Ukończony eksport Bisanza i prostszy dostęp — 2026-10-15

Użytkowniczka poleciła poczekać naClaude, potem potwierdziła zakończenie jego pracy. Nie przerywano obcego procesu. Po tej informacji eksport ukończył się poprawnie: `klienci/kacper-bisanz/Render/qc-c310ad37c2e34aed-56c8858e0acc6c3d-v003.mp4`,1080×1920,H264/AAC,42,581s. Job `job-c88f72b9-8f5c-465f-ae4f-508a0045a001` completed, rewizja7, serwerisCurrent=true, pobieranieHTTP200/46414764bajty. Bez nowych wywołańAI/ASR. Poprzednie wersje zachowane.

Hook „Auto za150 tysięcy?” jest pod napisami przez0–3s; klatka gotowegoMP4 potwierdza odstęp i bezpieczną pozycję. Sprawdzono także kadr zbliżenia i środek filmu oraz odtwarzanie wGUI; pełnego odsłuchu nie wykonano. ZakładkaZmontowane pokazuje aktualny film, Obejrzyj i popraw i Pobierz. Panel pozostawiono na tej zakładce. [Pomiar](usability-tracking-proof.json), [hook](assets/bisanz-hook.png), [GUI](assets/finished-bisanz-project.png).

Regresja tej zmiany przed późniejszymi równoległymi dodatkami silnika:202/202PASS,lint/TypeScript0błędów/24 wcześniejsze ostrzeżenia. Po zakończeniuClaude:9/9 ukierunkowanych testów geometrii/kontraktuAI iTypeScriptPASS. `git diff --check`PASS. Pełny odbiór całej aplikacji i wcześniejsze otwarte uwagi pozostają osobnym zakresem.
