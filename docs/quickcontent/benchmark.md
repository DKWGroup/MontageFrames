# QuickContent — pomiary i ograniczenia

2026-10-15. To zapis rzeczywistych sprawdzeń, nie przewidywany czas pracy.

| Próba | Wynik |
|---|---|
| Metadata YouTube `cNONgIqtjU0` | Dostępne; „Dlaczego NIE nadpłacam kredytu? Oto liczby”, 1013 s, do3840×2160/25fps, polskie audio-only |
| Download przez GUI | Próba1: yt-dlp2026.07.04 HTTP403. Aktualizacja2026.08.19 + izolacja Pythonpath + czyste partiale; próba4 ukończyła osobny obraz1080p(format270) i polskie audioAAC(format140-1) |
| Master rzeczywistego filmu | 190975042bajty,1012,506s,1920×1080H.264/AAC; ffprobe pełny skan bez błędów,25311pakietów video/43605audio; proxy ukończone |
| Whisper pełnego filmu | `large-v3-turbo`, słowa z czasami, CPU, fp16False. Etap10:22:14.720Z→10:34:39.532Z: **744,812s (12min25s)** dla16min52s materiału; **2707 słów**, wynikready zapisany w cache. Obejmuje przygotowanie i kontrolę etapu, nie samą inferencję |
| Prawdziwy postęp Whisper | 12,12s wycinka: **19,941s**,30 słów; rzeczywiste raporty0→0,99→1. Ostatni1 dopiero po walidacji i zapisie JSON. [Dowód pomiaru](asr-progress-proof.json). UI ma test renderowania licznika, czasu i ETA; pełnego filmu nie transkrybowano ponownie tylko dla zrzutu |
| Dokładny adapter/offset | Rzeczywisty test dźwięku440→880Hz: wycinek od2s zawiera późniejsze audio; H.264/AAC/CFR30, SkyClass zachowuje słowa i ciszę |
| HDR wycinka | Rzeczywista konwersja PQ10-bit→BT709/yuv420p; natywny scale+tonemap, ponieważ lokalny FFmpeg nie ma zscale. Proxy HDR pozostaje do poprawy |
| Renderer SDK fixture | 1,003s MP4,1080×1920,H.264/AAC; około8s całej próby; postęp0→0,02→0,37→1, raportowanie ograniczone do4Hz |
| CPU/GPU | AppleM1Max,10 rdzeni; Whisper CLI wybrałCPU (domyślnie CUDA lubCPU). Proces zużywał około160–174%CPU. MPS jest dostępny w odczycie poza sandboxem; wcześniejszy odczytfalse wynikał z ograniczonego procesu. Nie wymuszonoMPS ani nie zadeklarowano przyspieszenia |
| AI wybór i redakcja | Claude początkowo nie był zalogowany, późniejszy błąd pustego MCP naprawiono. Na polecenie użytkowniczki skopiowano konfigurację AnimaFX i dodano adapter OpenAI. Rzeczywisty Responses API oraz analiza pełnego filmu: PASS,13 propozycji,7/7 okien,8 odrzuceń; źródło i transkrypcja z cache. [GUI](assets/openai-proposals.png). Pełny montaż/odsłuch jakości pozostają do odbioru |

Runtime przed aktualizacją: Node22.23.2, FFmpeg/ffprobe8.1.1, yt-dlp2026.07.04, yt-dlp-ejs0.8.0, Whisper20250625, Torch2.12.1. Po aktualizacji: yt-dlp2026.08.19, Homebrew Python3.15; Whisper pozostał naPython3.13, `whisper --help` PASS. Pobranie obrazu/audio, mux i pełna transkrypcja potwierdzone. PrzyspieszenieASR i długi materiał60+min wymagają osobnego pomiaru.

2026-10-15 — pion i koszty: prawdziwe krótkie wyjścia720×1280 i2160×3840/H.264/AAC,1,408s, obejrzana twarz w pionie ([dowód](portrait-proof.json)). Domyślny1080×1920 był już potwierdzony poprzednim fixture. Lokalny AppleVision, stały kadr z trzech klatek. Prawdziwy test rejestru użyciaAPI:35tokenów wejścia/14wyjścia,10,5mikroUSD; jest to koszt testu, nie całej rolki ([dowód](cost-proof.json)).


### Operator terminalowy i naprawa montażu — 2026-10-15

- Wdrożono wybór Codex/Claude Code na koncie terminalowym oraz osobny jawny tryb OpenAI API. Domyślnie Codex; bez automatycznego fallbacku API. Limity i koszt subskrypcji konta pozostają. CLI działa ze wspólną kolejką również bez uruchomionego GUI i sprawdza tożsamość repozytorium panelu.
- Przyczyną błędu API było `data:null` po sprzecznym poleceniu pracy na plikach. Nowy kontrakt jest samowystarczalny, walidowany przed zapisem. Regresje obejmują null, zachowanie efektów/końców napisów SkyClass i wyłączenie skonfigurowanych MCP/pluginów dla procesu Codex.
- Prawdziwy nieudany job `job-6cf92703-a817-4f89-ad40-ca6e71be8db4` wznowiono przez Codex ChatGPT: ukończony, H264/AAC,1080×1920,42,581s. Sprawdzono klatki, aktualność w GUI i pobieranie HTTP200/45516375 bajtów. Źródła i transkrypcji nie przeliczano;6 zaznaczeń zachowano,5 anulowanych montaży nie wznowiono. [Pomiar](terminal-montage-proof.json), [GUI](assets/terminal-montage-ready.png).
- Codex:33160tokenów wejścia/3426wyjścia,0 osobnej opłaty API (subskrypcja). Historyczna opłata wcześniejszego błędnego API pozostaje w kosztach. [Krótki rzeczywisty test nowego kontraktu API](api-edit-proof.json) przeszedł; to nie dowód pełnego montażu przez API. Claude jest zainstalowany, ale niezalogowany — prawdziwego wywołania Claude nie potwierdzono.
- Regresja193/193PASS; lint/TypeScript0błędów,24 wcześniejsze ostrzeżenia. Testy procesów wymagają dostępu do ich tożsamości poza sandboxem. Nie wykonano odsłuchu ani pełnego odbioru wszystkich stylów; wcześniejsze otwarte uwagi całej aplikacji pozostają.
