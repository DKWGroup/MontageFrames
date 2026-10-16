# QuickContent — backend mediów

Data: 2026-10-14. Status: kod modułów i testy lokalne; pełny odbiór funkcji pozostaje osobnym etapem.

## Dostarczone moduły

- `scripts/quickcontent-ingest.mjs`: normalizacja linków pojedynczego filmu YouTube; upload strumieniowy zakończony dopiero po ffprobe; bezpieczne ścieżki z kontrolą symlinków; zachowanie kopii uploadu; osobne formaty video-only i audio-only, preferencja oryginalnej ścieżki, mux bez rekompresji do MKV, proxy H.264/AAC oraz metadane i tytuł. Limit obrazu kontroluje oba wymiary dla pionowego i poziomego źródła. Niedostępna żądana jakość daje jawne ostrzeżenie.
- `scripts/quickcontent-transcribe.mjs`: zainstalowany OpenAI Whisper CLI, domyślnie large-v3-turbo/pl/transcribe/word timestamps; PCM mono 16 kHz; niezmieniony raw JSON; stabilne ID słów; walidacja czasu, segmentów i pewności; jawny `no-speech`; wersjonowany cache zależny od źródła, modelu, języka i opcji. Model musi już znajdować się na dysku; adapter nie pobiera go automatycznie.
- `scripts/quickcontent-adapter.mjs`: dokładny H.264/AAC/CFR 30 fps wycinek przez FFmpeg, konwersja HDR do SDR, lokalne czasy, globalny origin z mapą słów, jawny styl/snapshot szablonu i kopia preferencji klienta. Reużywa buildReel i katalog produktów. SkyClass zachowuje pełną wypowiedź i pauzy. Domyślny fit dla poziomego materiału/crop dla pionowego. Retry zachowuje ręczne poprawki i sprawdza pochodzenie/clipHash oraz canonical templateSnapshotHash. Zmiana snapshotu mimo tego samego stylu blokuje retry. Nazwa rolki mieści się w limicie obecnego panelu. Rejestracja Studio należy do nadrzędnego, serializowanego serwisu.

## Dowody kontroli

`node --test scripts/quickcontent-{ingest,transcribe,adapter}.test.mjs`: 26 testów. Początkowy przebieg nowych interfejsów miał 13 celowych porażek, kolejne testy wykazały zbyt długą nazwę rolki, niewłaściwe dopuszczenie szerokiego 4K w limicie1080p, ścieżkę logo katalogu produktów i brak kontroli exitCode; błędy poprawiono.

Prawdziwy test FFmpeg generuje pięciosekundowe źródło z tonem440Hz do2s i880Hz później, materializuje zakres2–4s oraz sprawdza kodeki,30fps, długość2s, segment SkyClass od0 i napisy od0,2s. Kontrola przejść przez zero w pierwszych0,5s audio wycinka potwierdza późniejszy ton880Hz. Jest to automatyczna kontrola przesunięcia audio, a nie odsłuch realnej wypowiedzi.

`npx eslint scripts/quickcontent-{ingest,transcribe,adapter}.mjs scripts/quickcontent-{ingest,transcribe,adapter}.test.mjs`: poprawnie.

Cały `npm test` w sandboxie:88/99,11 porażek dotyczących lokalnego nasłuchu/PID i powstającej integracji serwera. Przebieg poza sandboxem w trakcie integracji:109/110. Wynik końcowy całego repo sprawdza nadrzędna sesja po połączeniu modułów.

## Ograniczenia odbioru

Nie wykonano prawdziwego pobrania YouTube, benchmarku Whisper10–20min polskiego źródła, odsłuchu realnej wypowiedzi SkyClass, wizualnego odbioru HDR/VFR, kadrowania dwóch mówców/slajdów ani pełnej ścieżki GUI. Fake runner nie potwierdza pobierania z YouTube. JSON word timestamps Whisper są eksperymentalne. Adapter nie udaje częściowego wznawiania Whisper; ponawia niezakończony etap.

Preflight sprawdza Node22+, wersje yt-dlp/FFmpeg i wymaga pozytywnego potwierdzenia dostępnego Node/EJS w stderr metadanych `--verbose`. Lokalna inicjalizacja dyrektora JSC zainstalowanego yt-dlp (bez sieci) potwierdziła `node`, `yt_dlp_ejs-0.8.0` i Node22.23.2. Nie instaluje ani nie aktualizuje narzędzi. Nie obiecuje tempa transkrypcji ani działania zewnętrznej analizy offline.

Testy domknięcia sprawdzają odrzucenie symlinków `.part` proxy/mastera/uploadu i obu pośrednich nazw pobierania YouTube. Ponowienie uszkodzonej kopii uploadu zastępuje tylko zweryfikowany zwykły plik tymczasowy; kompletny master i ręczne poprawki pozostają nienaruszone.

## Kontrola runtime — 2026-10-15

Narzędzia dostępne lokalnie: Node22.23.2, yt-dlp2026.07.04, FFmpeg/ffprobe8.1.1, OpenAI Whisper20250625 i Torch2.12.1. CLI potwierdza opcje model/language/transcribe/JSON/word timestamps. Plik `~/.cache/whisper/large-v3-turbo.pt` ma1617941637bajtów; pełny SHA256 `aff26ae408abcba5fbf8813c21e62b0941638c5f6eebfb145be0c9839262a19a` zgadza się z lokalnym rejestrem oficjalnego pakietu Whisper. Kontrola polegała na odczycie pliku, nie pobraniu modelu ani uruchomieniu transkrypcji. MPS nie był dostępny w procesie kontrolnym; domyślny CLI korzysta z CPU. To nie daje podstaw do deklaracji szybkości ASR.

Test prawdziwego PQ HDR wykazał, że obecny FFmpeg nie udostępnia `zscale`. Adapter korzysta teraz z dostępnej w FFmpeg8 konwersji transferu/primaries przez natywny `scale`, liniowego obrazu float, `tonemap=hable` i ponownego `scale` do BT709. Nowy test generuje małe źródło10-bit PQ, materializuje wycinek i potwierdza SDR BT709/yuv420p/CFR30. Kontrola nie zastępuje odbioru kolorów realnego materiału HDR.

Dziwny plik `-version` w repo był pięciobajtowym fixture `movie`: fake runner testów ingest zapisywał ostatni argument także dla preflight `ffmpeg -version`. Naprawiono runner, a dokładnie rozpoznany artefakt usunięto. Ponowiony komplet testów mediów nie tworzy już tego pliku.

Aktualna kontrola:27/27 testów mediów, eslint sześciu plików i diff check poprawne. Praktyczna gotowość testu `cNONgIqtjU0`: poprawny identyfikator11znaków, dozwolony YouTube URL, dostępne oddzielne pobieranie video/audio, Node/EJS, mux/proxy i zweryfikowany lokalny model Whisper. Dostępność konkretnego filmu, jakość/formaty/audio oraz faktyczny transfer potwierdza dopiero osobny job live w sesji nadrzędnej. Nie uruchamiano równoległego kosztownego ASR.

## Renderer — domknięcie 2026-10-15

`inputFiles` pomija artefakty kontrolne `review-*.png`; nie zmieniają podpisu aktualności ani nie trafiają do snapshotu mediów. Normalne obrazy overlay nadal zmieniają podpis. Raportowanie renderer→stdout i stdout→trwały job jest ograniczone do jednego pomiaru na250ms, z obowiązkowym końcowym1 po sukcesie.

Zweryfikowany MP4 trafia pod docelową wersjonowaną nazwę przez atomowy `link`, który odrzuca istniejący plik. Tymczasowa ścieżka jest potem odłączana, aby retry tego samego joba nie zmieniło poprzedniego wyniku przez wspólny inode. DlaEXDEV kopia powstaje pod unikalną nazwą tymczasową na filesystemie wyjścia; dopiero zamknięta kopia jest linkowana do finalnej nazwy. Nie kopiuje się bezpośrednio do publicznej nazwy MP4. Test EXDEV używa kontrolowanego błędu granicy filesystemów i rzeczywistych operacji kopiowania/linkowania; nie sprawdzono zewnętrznego dysku.

Nowe asercje najpierw wykazały błędną invalidację przez review PNG oraz brak helperów throttle/publication. Aktualnie7/7 testów renderera, eslint i diff check poprawne.

Prawdziwy smoke SDK w osobnym `/private/tmp` zakończył się poprawnym `out/clip-v001.mp4`:1080×1920, H.264/AAC,1,003s. Raporty0→0,02→0,37→1 zachowały odstęp co najmniej250ms między pośrednimi pomiarami, końcowy raport został zapisany przed powrotem. Plik tymczasowy odłączony po publikacji, checkpoint i record poprawne, dopisanie review PNG nie zmieniło podpisu. Fixture korzysta z minimalnej kompozycji QuickContentRender, a nie z rzeczywistej rolki klienta. Pierwszy przebieg w sandboxie miał `No available ports found`; poza sandboxem wynik1/1PASS. Artefakt kontroli: `/private/tmp/qc-sdk-render-54p8IE/out/clip-v001.mp4`; skrypt testu: `/private/tmp/qc-render-smoke-test.mjs`.
