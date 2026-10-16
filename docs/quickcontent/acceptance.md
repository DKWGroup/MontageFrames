# QuickContent — odbiór etapami

Stan: 2026-10-15. **Aplikacja nie ma jeszcze zamkniętego pełnego odbioru.** Dokument rozdziela sprawdzone zachowania od pozostałej pracy. Kontrakt: [założenia](../../zalozenia-funkcji-QuickContent.md), [plan](../../plan-wdrozenia-QuickContent.md), [ledger](implementation-progress.md).

## Etap 1 — kolejka, import i GUI

- Kod formularza, projektów, wyboru klienta/szablonu, uploadu, importera i Whisper jest podłączony do panelu.
- Naprawiono blokadę pustej kolejki przez drugi panel na porcie3101: właściciel zwalnia lock po zakończeniu pracy. Aktywna kolejka pozostaje wyłączna. Przejęcie nie zabija innego procesu.
- Restart/close Vite czeka na zamknięcie workera. Narzędzia mają nadzorowaną grupę procesów, a po awarii stan jest jawny. Polskie znaki dzielone pomiędzy bufory stdout/stderr pozostają poprawne.
- `node --test scripts/quickcontent-worker.test.mjs ui/quickcontent-server.test.mjs`: **22/22 PASS**, w tym RED→GREEN regresji pustej kolejki, UTF8 i lifecycle.
- Końcowe `npm test`: **154/154 PASS**. Rozszerzone `npm run lint`, obejmujące też nowe MJS/UI/testy i TypeScript: **0 błędów**, 24 wcześniejsze ostrzeżenia wygenerowanych bloków Jeep. `git diff --check`: PASS.
- GUI: rzeczywista kontrola formularza i pustego projektu, walidacji, błędu akcji i klawiatury; szerokości375/768/1024/1440 oraz200% powiększenia. Mobilne menu i układ pól poprawiono. [Raport GUI](gui-report.md).
- Test YouTube: projekt `qc-7b3be908-416a-430b-b011-16fe0aeb2fe8`, film `cNONgIqtjU0`, 1013 s, strumienie do4K i polskie audio. Uruchomiony z GUI job `job-a0a76ac9-545f-4d9a-ab78-16f52976e7b8` przeszedł do `video`, następnie dostał403. Metadane działają; master/ASR tego projektu nie były wtedy gotowe.
- yt-dlp zaktualizowano przez Homebrew do **2026.08.19** (formuła2026.8.19_2). Aktualizacja doinstalowała zależności Homebrew, w tym Python3.15; `whisper --help` po niej działa.
- Próba2 ujawniła konflikt cffi: panel odziedziczył `PYTHONPATH` innego venv. `runMediaTool()` izoluje teraz `PYTHONPATH/PYTHONHOME` dla yt-dlp i Whisper, także przez guardian. Regresja RED→GREEN, importer+transkrypcja19/19 PASS. Nie zmienia globalnych ustawień środowiska użytkowniczki.
- Próba3 ujawniła niezgodne bajty z przerwanego pobrania: zmieniony wariant dostarczania został dopisany do starego partiala. Zatrzymano proces i zachowano cały wadliwy folder diagnostycznie jako `.quickcontent/workspace/<projekt>-failed-attempt3-1792059591486/`; nic nie usunięto. Manifest źródła tej próby wycofano przed dalszą obróbką.
- Retry używa teraz unikalnego pliku tymczasowego dla każdej próby strumienia, reużywa wyłącznie ukończone etapy. Pełne skanowanie pakietów ffprobe odrzuca błędy strumienia również przy exit0. Obie regresje RED→GREEN.
- **Naprawa403 potwierdzona w próbie4** tego samego projektu i joba: osobny obraz **1920×1080/H.264, format270**, osobne polskie **AAC, format140-1**, połączony master **190975042bajty,1012,506s**. ffprobe bez błędów odczytał **25311pakietów video i43605audio**. Proces przeszedł do przygotowania proxy; Whisper/AI są dalszymi etapami, nie częścią tego potwierdzenia.
- Po ostatniej poprawce `npm test`: **156/156 PASS**; rozszerzony lint+TypeScript: **0 błędów**,24 wcześniejsze ostrzeżenia; `git diff --check` PASS.
- Proxy jest gotowe, źródło zapisane w projekcie, zadanie przeszło do **Whisper/transcribe**. [Zrzut rzeczywistego panelu](assets/etap-1-whisper.png). To zamyka naprawę importu403; wynik pełnej transkrypcji i montażu AI pozostaje do odbioru.

## Etap 2 — domknięcie montażu i odporności

Niezależny review wskazał sześć ważnych błędów. Punkty1–2 naprawiono w zmianie pionu i kosztów (2026-10-15); punkty3–6 nadal pozostają otwarte:

1. **Naprawione — `startBatch`:** ponowienie częściowego startu odzyskuje istniejące joby z niezmiennym payloadem i dodaje brakujące. Regresje obejmują przerwanie przed enqueue oraz replay po ukończeniu AI i błędzie renderu.
2. **Naprawione — retry montażu:** ukończony AI zapisuje osobny receipt/checkpoint per job. Późniejszy czat i ręczne edycje nie wywołują ponownego płatnego montażu przy retry renderu. Zmiana rozdzielczości wykonuje nowy render bez AI.
3. Renderer: publiczne assety i JSON są kopiowane, lecz kod stylu może zmienić się pomiędzy podpisem a bundle. Zamrozić kod wejściowy i testować zmianę+cofnięcie podczas renderu.
4. Deduplikacja: parafraza tej samej tezy z pokrywającym się zakresem może przejść jako nowa. Dodać semantyczne powiązanie z poprzednią propozycją i zachować odrębne historie.
5. Proxy HDR: adapter wycinka robi tonemap, ale proxy importera nie gwarantuje SDR. Objąć tę ścieżkę prawdziwym testem PQ→BT709.
6. `fit`: zoom ujęcia może przyciąć poziomy obraz. Fit ma zachować pełną treść również przy ustawionym zoomie.

Osobno domknąć wizualną kontrolę klatek: samo wygenerowanie PNG nie dowodzi oceny twarzy, napisów i slajdów. Kontrola ma pozostawić wynik, a nie jedynie pliki. Review przekazał powyższe dowody; jego końcowy odczyt zmienionego lifecycle został przerwany limitem. Nie twierdzimy, że cały końcowy kod ma zaliczony niezależny review.

Po obserwacji uszkodzonego partiala dodatkowo sprawdzić finalizację mux: walidacja ma poprzedzać opublikowanie niezmiennego mastera i checkpointu. Obecne skanowanie wykrywa uszkodzenie, lecz docelowe retry nie powinno pozostawiać błędnego finalnego pliku.

Dotychczasowe dowody mediów/renderera: [raport mediów](media-report.md), [raport fundamentu](foundation-report.md). Rzeczywisty krótki render fixture potwierdził1080×1920/H.264/AAC/długość1,003 s, atomowe wersje i postęp. To nie jest odbiór gotowej rolki z filmu użytkowniczki.

## Etap 3 — pełny test użytkowy

- Aktualizacja2026-10-15: na polecenie użytkowniczki QuickContent używa konfiguracjiOpenAI skopiowanej zAnimaFX do lokalnego`.env`. Prawdziwe połączenieAPI potwierdzone; logowanieClaude nie blokuje tej ścieżki. Pusty rejestrMCP w alternatywnej ścieżceClaude również poprawiono. Kluczy nie przekazywać przez czat.
- Pełny Whisper testowego filmu zakończony:12min25s,2707 słów z czasami. Wdrożono rzeczywisty procent ramek/ETA i informację o ładowaniu. Prawdziwy krótki test oraz testyUI/worker: PASS; pełnego źródła nie transkrybowano ponownie. [Benchmark](benchmark.md).
- Rzeczywista analizaOpenAI po naprawie: ukończona,13 propozycji z opisami, zakresami i ocenami wGUI;7/7 okien materiału. WynikASR ponownie użyty, brak automatycznego montażu. [Zrzut](assets/openai-proposals.png). Końcowa regresja166/166PASS,lint+TypeScript0 błędów/24 wcześniejsze ostrzeżenia.
- Przejść prawdziwe YouTube i lokalny upload przez Whisper → kompletne propozycje → więcej → selekcja → montaż → MP4.
- Sprawdzić poprawkę tekstu/czat/kadr, zachowanie timestampów, wersje i aktualne pobranie, także po restarcie i edycji podczas renderu.
- Odsłuchać wycinek >0 dla SkyClass, sprawdzić drugi styl, poziomy wywiad/slajdy/HDR oraz klatki początku/środka/końca. Dłuższy materiał60+min, brak mowy i fallback jakości nadal bez odbioru rzeczywistego.
- Po ważnych poprawkach powtórzyć pełną regresję i uzupełnić [benchmark](benchmark.md). Dopiero wtedy oznaczyć pełną funkcję jako wdrożoną.

Bez commitów, publikacji i usuwania masterów. Istniejące niezwiązane zmiany Motion Studio i klientów pozostają zachowane.

## Pion i koszty — odbiór bieżącej zmiany (2026-10-15)

- GUI: osobna rozdzielczość eksportu9:16; analiza/montaż/czat rozliczane osobno; wybór użytkowniczki zachowany, samo zaznaczenie nie tworzy źródeł rolek. [Panel](assets/portrait-cost-settings.png).
- Rzeczywiste lokalne eksporty krótkiego wycinka użytkowniczki:720×1280 i2160×3840, H.264/AAC,1,408s. Obejrzana klatka pokazuje twarz w pionie; lokalna detekcja AppleVision działa. [Pomiar](portrait-proof.json), [klatka](assets/portrait-frame.png). To stały kadr z trzech próbek, bez śledzenia rozmówców.
- Rzeczywiste API: trwały zapis35tokenów wejścia/14wyjścia,10,5mikroUSD dla krótkiego testu połączenia. Nie przedstawiamy go jako kosztu montażu rolki. Historyczna analiza ma brak pomiaru. [Dowód](cost-proof.json).
- Regresja po uwagach review: **179/179 PASS**, TypeScript/lint **0 błędów**,24 wcześniejsze ostrzeżenia; diffcheckPASS. Pełny montaż wybranych przez użytkowniczkę rolek czeka na jej kliknięcie, zgodnie z żądanym oszczędnym przepływem. Pozostałe punkty pełnego odbioru z etapów2–3 są nadal otwarte.


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

### YouTube: wybór 4K bez dostępnego 4K i błąd audio — 2026-10-15

- Rzeczywista przyczyna błędu Happy News: yt-dlp oznacza nieopisane audio `language_preference=-1`, a filtr aplikacji wymagał wartości ≥0. Dopuszczono -1; jawny dubbing i audiodeskrypcja (w tym -10) nadal odrzucane, oznaczone oryginalne audio ma pierwszeństwo.
- Test regresji najpierw odtworzył identyczny błąd, po poprawce PASS. Pełna regresja: 240/240 PASS poza sandboxem (testy wymagają lokalnych portów i odczytu tożsamości procesów); lint + TypeScript: 0 błędów, 24 istniejące ostrzeżenia.
- Ponowiono job `job-49557b20-6e26-4fd2-bc07-b3f1e35b9f0f` przez lokalne API panelu z ustawieniem 2160. Film YouTube `nQhF-hJXxrs` udostępnił maksymalnie 1080p, także przy dodatkowym sprawdzeniu klienta web. Automatycznie pobrano video-only 270 i polskie audio-only 140, scalono FFmpeg `-c copy`.
- Rzeczywisty master: `klienci/happy-news/QuickContent/qc-42b2386b-063f-4787-ad94-55571385e7ed/master.mkv`. Niezależny ffprobe: 1920×1080, H264/AAC, 877,946 s. `metadata.json` zawiera tytuł „Otworzył sklep BEZ KAMER i SPRZEDAWCY. Ludzie naprawdę za to płacą?!” oraz ostrzeżenie o braku 4K. To potwierdzenie pobierania i scalania z fallbackiem jakości, nie odbiór montażu ani analizy.
- Poprzedni proces Vite 33156 zatrzymano; panel uruchomiony ponownie lokalnie na 127.0.0.1:3100. Master i istniejące projekty zachowane.

### Happy News: układy, tracking, emotki i koszt rolki — 2026-10-15

Wymagania zapisano przed kodem w preferencjach klienta oraz globalnie (emotki i statystyki). [Implementacja](happynews-layout-plan.md), [dowody renderów i pomiar](happynews-layout-proof.json).

- Układy na lokalnym czasie źródła: prowadzący/przebitka50/50; rozmówcy jeden nad drugim; rozmówcy obok siebie w górnych60% i temat w dolnych40%. Wszystkie widoki z tej samej chwili. Ręczny kadr wyłącza automat. Detekcja ekranu skalibrowana na zielonym studiu Happy News; bez potwierdzonego ekranu/twarzy zachowany crop/fit.
- Tracking co0,25s; krótkie pauzy utrzymują reakcje. Naprawiony błąd używania przyszłej twarzy przed jej pojawieniem się, odtworzony testem i sprawdzony na klatce0 MP4.
- Hook bez drukowania koloru, z mocnym kontrastem i bez wejścia, wyjście zachowane. Róż dominuje, metka YouTube ze wskazanym kanałem. Emotki przy słowach bez zmian ASR; cały font Apple Emoji lokalnie183MB, kopia z zainstalowanego macOS ignorowana w Git.
- Cztery aktualne eksporty1080×1920/H264/AAC: zarzuty/przejęciav003, sercev002, trzmielv002, skuterv002. Poprzednie wersje zachowane. Bez ponownego ASR i montażu AI; osobny etap opisu wykonał generowanie/cache zgodnie z istniejącym workflow. GUI potwierdza cztery badge Zmontowane i aktualne rewizje4/5/5/5.
- Karty każdej rolki pokazują tokeny i koszty montażu, poprawek i opisu. Kredyty konta pozostają jawnie niezmierzone; wspólna analiza nie jest arbitralnie dzielona. Retry/usage deduplikowane.
- Regresja280/280PASS, typy/lint0błędów/24 istniejące ostrzeżenia. Klatki rzeczywistych MP4: [hook0](assets/happynews-hook-frame0.png), [60/40 i pszczoła](assets/happynews-split-frame.png), [50/50](assets/happynews-half-frame.png), [reakcje](assets/happynews-duo-frame.png), [koszt wGUI](assets/happynews-film-costs.png). Próbka audio: różnica poziomu−0,012dB, przesunięcie−0,3125ms, korelacja0,9837; brak podwojenia audio. Pełnego odsłuchu wszystkich czterech filmów nie wykonano. Pełny odbiór całego QuickContent pozostaje odrębnym zakresem.

### Happy News: zakończenie wznowionych eksportów — 2026-10-16

Po równoległych zmianach wspólnego silnika wcześniejsze podpisy renderów straciły aktualność. Przeładowanie Vite przerywało zadania panelu; wznowiono je samodzielnym workerem tej samej trwałej kolejki, bez ponownej transkrypcji i redakcji AI. Nie zatrzymywano innych prac w repozytorium.

Końcowa niezależna kontrola podpisów: **4/4 isCurrent=true**, rewizje4/5/5/5. Aktualne wersje: skuter **v004**, trzmiel **v003**, serce **v004**, zarzuty/przejęcia **v005**. GUI potwierdza cztery etykiety Zmontowane, podglądy i pobieranie. Poprzednie pliki zachowano. [Trwały pomiar](happynews-layout-proof.json). Ostatnia pełna regresja przed zakończeniem eksportów: **286/286 PASS**, typy/lint0błędów,24 wcześniejsze ostrzeżenia. Kontrola klatek i próbki audio opisana wyżej; pełnego odsłuchu wszystkich filmów nadal nie wykonano. To odbiór wskazanych zmian Happy News, nie całego modułu QuickContent.

### Happy News: spokojniejsze kadry, jedna rolka kontrolna — 2026-10-16

Nowe polecenie zapisano przed kodem w preferencjach klienta. Wydzielanie ekranu tylko w ogólnym kadrze z dwiema osobami; utrzymanie układu niezależnie od chwilowego ruchu ust, krótkie braki detekcji uzupełniane wyłącznie wewnątrz ujęcia. Zbliżenia pojedynczej osoby mają mniejsze powiększenie z rozmytym źródłem w tle zamiast czarnych pasów. Twarz wycentrowana; dolny rozmówca w układzie pionowym wyżej od środka swojej połowy. Napisy obniżone. Hook ma Poppins800, mały padding, tło dopasowane do wierszy bez zaokrąglenia. Metka YouTube dwuwierszowa. Większa emotka z popem jest poza zakreślaczem; naprawiono przypisanie do sąsiedniego słowa przy różnicy50ms.

Przyczyną blokady panelu był brak opcjonalnego pliku LongFormPlan importowanego statycznie. Ładowanie tych ekranów korzysta teraz z Vite glob/lazy; brak pliku pokazuje komunikat w LongForm i nie blokuje QuickContent. Nie oznacza to ukończenia brakujących ekranów LongForm. HTTP200 dla transformacji modułu, pełny build paneluPASS. Bezpośrednią inspekcję przeglądarki zablokowała polityka URL narzędzia; nie obchodzono jej.

Zgodnie z poleceniem wyeksportowano tylko „Zarzuty o rozprzedaż Polski i cisza przy zakupach”: **v006**, rewizja6, **isCurrent=true**,1080×1920,H264/AAC,33,003s. Zmiany układu4→2. Pozostałych trzech filmów nie renderowano; wcześniejsze pliki zachowane. Brak ponownego ASR i redakcji montażuAI. Automatyczny etap po renderze odświeżył opis:2175tokenów wejścia/134wyjścia,0,0003388USD; zapisany w trwałym jobie. [Dowód](happynews-v3-proof.json), rzeczywiste klatkiMP4: [hook](assets/happynews-v3-hook.png), [dwie osoby i emotka](assets/happynews-v3-duo.png).

Regresja341/341PASS, typy/lint0błędów/24wcześniejsze ostrzeżenia, buildVitePASS. Klatki gotowegoMP4 sprawdzone, pełnego odsłuchu nie wykonano. Odbiór całości QuickContent pozostaje osobnym zakresem.

### Happy News: v007 i przebitka v004 — 2026-10-16

Zapisane przed kodem nowe polecenie w preferencjach klienta. Naprawiono przyczynę nachodzenia napisów: stare jawne captions[].y nadpisywały token stylu w ujęciach pojedynczego prowadzącego. Renderer Happy News stosuje dolną pozycję≥0,65, hook≥0,735; zaakceptowane pozycje duo0,535 i duo-media0,565 zachowane. Pojedyncze ujęcia mają stałą skalę0,735 z zaakceptowanego kadru0:24, bez zależności skali od wysokości wykrytej twarzy. Metka: dużeP, y220, czcionki27,6/31,2px (+20%). Emotki po słowie, poza markerem:1,5em do150px, stały przechył±7° i pop; flagi dla wymienianych krajów, również form „Polskę”, „Polski”, „niemiecki”.

Wyeksportowano wyłącznie dwie wskazane rolki: zarzuty/przejęcia **v007**, trzmiel z przebitką **v004**. Niezależna kontrola **2/2 isCurrent=true**,1080×1920,H264/AAC; poprzednie pliki zachowane. Nie powtarzano ASR ani redakcji montażuAI. Automatyczne opisy po renderze:2679 i2785tokenów, razem0,000771725USD. Trwały pomiar i media: [dowód](happynews-v4-proof.json). Klatki rzeczywistychMP4: [pojedyncza osoba/hook](assets/happynews-v4-single.png), [duo i fabryka](assets/happynews-v4-duo.png), [flaga](assets/happynews-v4-flag.png), [przebitka i pszczoła](assets/happynews-v4-broll.png).

Regresja343/343PASS, typy/lint0błędów/24wcześniejsze ostrzeżenia. Sprawdzono klatki kontrolne i MP4; pełnego odsłuchu nie wykonano. Ta korekta nie stanowi odbioru całego QuickContent.

### Happy News: nieruchome okno kamery i automatyczne emotki — 2026-10-16

Wymagania zapisane przed kodem w preferencjach klienta. Przyczyną „pływania” było przesuwanie całej pomniejszonej warstwy filmu, wraz z granicą na rozmytym tle. Nowy pojedynczy widok ma stałe okno1080×1440 na y220, overscan1,08 i przesuwanie źródła wyłącznie wewnątrz maski. Tło zamrożone w obrębie ujęcia. Tracking: martwa strefa0,018, wygładzenie0,9s i limit przesunięcia środka źródła0,025/s; po cięciu odporny start z początkowych próbek tej samej kamery, aby spóźniona stara detekcja nie wyciągała nowej twarzy poza ekran. W podziale skala twarzy stała w obrębie ujęcia (mediana rozmiaru), pozycja nadal śledzona.

Automatyczny dobór rozszerzono o3187lokalnych polskich nazw i słów kluczowych UnicodeCLDR, ostrożne dopasowanie odmian, reguły znaczeń oraz filtr wieloznacznych/wypełniających słów. To heurystyka słownikowa, nie pełne rozumienie kontekstu przez model. Ręczny anchor nadal ma pierwszeństwo. Do2różnych akcentów na grupę, z zachowaniem flag krajów;20 i26zaplanowanych emotek w tych rolkach. [Źródło i hash danych](../../src/emoji-data/source.json), licencjaUnicode-3.0 przy danych. Bez sieci i płatnegoAI podczas doboru.

Eksport tylko dwóch wskazanych rolek: zarzuty/przejęcia **v008**, trzmiel/przebitka **v005**. Obie1080×1920,H264/AAC; **2/2 isCurrent=true**, także przezAPIpanelu. Weryfikacja geometrii całej ścieżki: identyczne granice/skala okna we wszystkich próbkach, pan≤69,12px/s. Fragment tła w gotowymMP4 identyczny w1s/2s (zgodny hash pikseli). [Trwały dowód](happynews-v5-proof.json), [nieruchome okno](assets/happynews-v5-single.png), [automatyczne akcenty](assets/happynews-v5-autoemoji.png), [sen/kwiat](assets/happynews-v5-sleep.png).

Regresja347/347PASS; typy/lint0błędów/24 wcześniejsze ostrzeżenia. Poprzednie wersje zachowane, bezASR i ponownej redakcji montażuAI. Automatyczne opisy po renderze:2964 i3062tokeny; koszt razem0,000841975USD. Sprawdzono klatki, geometrię ruchu i parametryMP4; pełnego odsłuchu nie wykonano. Pełny odbiór całegoQuickContent pozostaje osobnym zakresem.

### Rozdzielenie klientów, niebieski Bisanz i zdjęcia trzmieli — 2026-10-16

Wymagania zapisane przed zmianami w preferencjach ogólnych, Bisanza i Happy News. Przyczyną pomarańczowych markerów było utworzenie projektu qc-7b3be908-416a-430b-b011-16fe0aeb2fe8 bez klienta, ze stylem persona. Skorygowano projekt i jego snapshot na kacper-bisanz/bisanz oraz istniejące szkice. Trzy wcześniej gotowe rolki wyrenderowano ponownie: rata/wynajem v001 w folderze klienta, nadpłata v001 w folderze klienta, auto v007. Dotychczasowe pliki w out i folderze klienta zachowane; anulowanej propozycji nie montowano. Kamera bez zoomów, zatwierdzone hooki i czasy słów zachowane. W rolce o nadpłacie zwykłe napisy przesunięto pod twarz, hook pozostaje pod napisami.

Automatyczne ozdobniki słów i flagi działają wyłącznie w stylu happynews. Usunięto mylące dopasowania po rdzeniach oraz zablokowano ideogramy/przyciski CJK i przyciski literowe. Prompt redakcji także jawnie ogranicza automat do Happy News; inne marki wymagają konkretnego polecenia. To nadal heurystyka, nie model rozumiejący pełen kontekst. Niebieski branding w gotowych MP4: [rata](assets/bisanz-fixed-blue.png), [nadpłata](assets/bisanz-fixed-caption.png), [auto](assets/bisanz-fixed-car.png).

Z wcześniejszego zlecenia ukończono wyłącznie rolkę Happy News o trzmielach v006. Od40s do53,57s prawdziwe zdjęcia ze źródła pozostają na dole, także gdy detektor gubi drugą twarz lub oryginał przełącza na zbliżenie. Zmiana drugiego/trzeciego zdjęcia na43,61/46,87s. W szerokim ujęciu obaj prowadzący u góry, w zbliżeniu bieżący prowadzący. Ten sam obraz wypełnia boki pod spodem w powiększeniu i rozmyciu, bez czarnych pasów. Zasadę zapisano również w talking-head-recut/SKILL.md, wyłącznie dla Happy News. Klatki gotowegoMP4: [zdjęcie2](assets/happynews-bee-photos-v006.png), [podtrzymanie zdjęcia przy zbliżeniu](assets/happynews-bee-photo-hold-v006.png).

**4/4 isCurrent=true** przez API panelu; wszystkie1080×1920,H264/AAC. Zadania action=render, bezASR i ponownej redakcjiAI. Opisy generowane osobno:3gotowe; opis rata/wynajem nie przeszedł walidacji także po jednym ponowieniu samego opisu. MP4 jest prawidłowy, koszt prób zachowany. [Raport](client-scope-2026-10-16-proof.json). Testy351/351PASS, lint/typy0błędów i24wcześniejsze ostrzeżenia. Sprawdzono klatki i parametry gotowych MP4, bez pełnego odsłuchu ani odbioru GUI w przeglądarce. Nie stanowi to pełnego odbioru QuickContent.
