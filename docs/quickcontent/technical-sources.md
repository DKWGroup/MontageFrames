# QuickContent — research techniczny

Data weryfikacji: **2026-10-14**. To uzasadnienie planu, nie raport z działającego importera. [Audyt repo i komputera](repo-audit.md) opisuje fakty lokalne; poniżej są źródła pierwotne oraz nasze decyzje.

## Pobranie i zachowanie jakości

`yt-dlp` rozróżnia `bestvideo` (sam obraz) i `bestaudio` (samo audio), pozwala filtrować rozdzielczość i zapisywać metadane. W QuickContent wybieramy formaty z metadanych, pobieramy je w dwóch osobnych krokach i dopiero potem łączymy. Nie używamy `bestvideo*`, który może zawierać dźwięk. Tytuł przechowujemy jako metadane, identyfikator projektu jako bezpieczną nazwę katalogu. [Oficjalny README yt-dlp](https://github.com/yt-dlp/yt-dlp#format-selection).

Proponowane selektory do prototypu: `bestvideo[height<=1080]` lub `bestvideo[height<=2160]` oraz `bestaudio`. Produkcyjnie trzeba dodatkowo wybrać oryginalną ścieżkę językową i sprawdzić faktyczne wymiary; sam limit wysokości nie jest pełną polityką dla filmów pionowych. Najlepsze dostępne audio nie oznacza bezstratnego oryginału autora. Nie wymuszamy MP3 ani m4a kosztem jakości. [Opcje i sortowanie yt-dlp](https://github.com/yt-dlp/yt-dlp#sorting-formats).

Współczesny import YouTube wymaga też obsługi wyzwań JavaScript/EJS. Dokumentacja dopuszcza Node ≥22 uruchamiany przez `--js-runtimes node`; nie trzeba od razu dokładać drugiego runtime. Preflight ma sprawdzić obecność EJS dla użytej dystrybucji yt-dlp. Aktualizacja zależności może być potrzebna, gdy YouTube zmieni sposób udostępniania materiałów. [Oficjalne EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS).

## Master, proxy i dokładny wycinek

FFmpeg potrafi łączyć wybrane strumienie przez `-map` i `-c copy`, bez ponownego kodowania. Master YouTube zapisujemy jako `source.mkv`, aby nie wymuszać zmiany kodeka obrazu lub audio; osobny zgodny plik MP4 służy do przeglądarki. Dokładny wycinek na granicy słowa wymaga dekodowania i kodowania, ponieważ kopiowanie pakietów może zaczynać się przy klatce kluczowej. Master pozostaje nienaruszony. [Streamcopy i wybór strumieni](https://ffmpeg.org/ffmpeg.html#Streamcopy).

Procent konwersji liczymy z maszynowego `-progress pipe:1` i znanej długości materiału. Pole `out_time_us` wymaga przeliczenia jednostek; wynik ograniczamy do 0–1. Sukces potwierdza dopiero kontrola pliku przez ffprobe. [FFmpeg: opcje postępu](https://ffmpeg.org/ffmpeg.html#Options).

## Whisper i analiza treści

Whisper wykonuje rozpoznawanie mowy, identyfikację języka i zadania językowe związane z audio. Nie stanowi gotowego rankingu wartości redakcyjnej rolek. Model `turbo` jest wariantem zoptymalizowanym pod transkrypcję; jakość i prędkość zależą od języka oraz sprzętu. [Oficjalny Whisper](https://github.com/openai/whisper).

Kod transkrypcji udostępnia eksperymentalne `word_timestamps`, segmenty, prawdopodobieństwa słów i opcje dotyczące ciszy. CLI potrafi złapać wyjątek dla pliku i przejść dalej, dlatego sam kod wyjścia procesu nie wystarczy do oznaczenia etapu jako gotowego: wymagamy nowego, poprawnego JSON i rzeczywistych słów. [Kod źródłowy transcribe.py](https://github.com/openai/whisper/blob/main/whisper/transcribe.py).

**Decyzja Ponytail:** pierwszy adapter wykorzystuje już zainstalowany OpenAI Whisper Python CLI i model `large-v3-turbo`. Dopiero pomiar rzeczywistego polskiego materiału uzasadni zmianę runtime. `whisper.cpp` ma wsparcie Apple Silicon, ale jego czasy słów również są opisane jako eksperymentalne; nie jest obecnie podłączony w repo. [Oficjalny whisper.cpp](https://github.com/ggml-org/whisper.cpp).

Analiza semantyczna otrzymuje transkrypcję, identyfikatory słów, brief i zasady klienta; wynik waliduje kod. Początkowy plan używał operatora Claude z panelu. Dnia2026-10-15 użytkowniczka jawnie poleciła skopiowanie konfiguracji AnimaFX: adapter QuickContent używa teraz OpenAI Responses API zgodnie z lokalnym `.env`, z fallbackiem konfiguracji do Claude. Klucz jest czytany wyłącznie przez serwer. Treść analizy trafia do wybranego dostawcy; audio i wideo pozostają lokalne. Odpowiedź analizy ma ścisły JSON Schema, `store:false`, bez narzędzi modelu. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Montaż i widoczny postęp

Remotion udostępnia `renderMedia()` z `onProgress` oraz informacją o renderowaniu, kodowaniu i muxowaniu. Pozwala to pokazać mierzalny postęp renderu. Nie określa procentu wykonania pracy redakcyjnej przez LLM. Najpierw sprawdzamy API wersji 4.0.532 używanej w repo; nie aktualizujemy całego Remotion wyłącznie dla tej funkcji. [Remotion renderMedia](https://www.remotion.dev/docs/renderer/render-media).

## Dlaczego ten wariant

| Wariant | Decyzja i powód |
|---|---|
| Obecny panel + lokalne pliki JSON + worker Node | Rekomendowany: jedna użytkowniczka, obecne narzędzia i branding; trwałość bez nowej infrastruktury |
| Nowy SaaS, Redis, konta i cloud render | Poza zakresem obecnego zlecenia; sens przy wielu użytkownikach/hostach |
| Użycie API OpusClip zamiast lokalnego pipeline | Nie realizuje samodzielnego pobrania i lokalnej transkrypcji Whisper wymaganych przez użytkowniczkę |
| Analiza wyłącznie transkrypcji | Wersja podstawowa dla rozmów, wywiadów i wykładów; ograniczenia przy scenach bez mowy |
| Analiza multimodalna i śledzenie aktywnego mówcy | Etap późniejszy; osobny koszt i testy, nie obiecywać parytetu ClipAnything w pierwszej wersji |

## Co trzeba zmierzyć przed deklaracją wydajności

- Na próbce 10–20 min polskiej mowy: czas ASR / czas źródła, pamięć, czasy słów, nazwiska i liczby.
- Na źródle ≥60 min: pokrycie całej transkrypcji przez analizę, tokeny/koszt obecnego operatora, liczbę zaakceptowanych historii i duplikatów.
- Na fragmencie z czasu >0: synchronizację audio/wideo, szczególnie SkyClass, VFR i HDR.
- Na 1080p i 4K: transfer, miejsce na master/proxy/wycinki, czas renderu i zużycie pamięci.

Nie wykonano pobrania próbnego ani transkrypcji długiego filmu w tym zadaniu: użytkowniczka zamówiła research i plan, bez wskazania źródła do obróbki. Sprawdzenie obecności narzędzi nie potwierdza pełnego działania pipeline.
