# Plan wdrożenia CutRaw — MVP najpierw

Data: **2026-10-23**. Kontrakt: [zalozenia-funkcji-CutRaw.md](zalozenia-funkcji-CutRaw.md). Stan (2026-10-24): **C1 (terminal) i C2 (panel `#cr`) zrobione i sprawdzone na danych syntetycznych + syntezie mowy; import w Premiere i prawdziwy podcast czekają na C0.** W C2 zamiast wgrywania przez przeglądarkę jest wybór plików z `inbox/` i folderów klientów. Szczegóły: [docs/cutraw/acceptance.md](docs/cutraw/acceptance.md).

Zasada: najszybciej działająca ścieżka **pliki → XML w Premiere** (C0–C1, sam terminal), potem panel (C2), potem jakość (C3–C4). Każda faza kończy się wpisem w `docs/cutraw/acceptance.md`: co sprawdzone, na jakim materiale, czego nie sprawdzono.

## C0 — Próbki i spike importu do Premiere

Bez tego nie wiemy, jaki XML przyjmie wersja Premiere użytkowniczki.

- [ ] Materiał testowy od użytkowniczki w `inbox/cutraw/`: podcast 2 kamery + 2 mikrofony (≥ 20 min) i nagranie z 1 kamery.
- [ ] Wzorzec: użytkowniczka eksportuje z Premiere małą sekwencję (2 ścieżki wideo, 2 audio, jedno cięcie, przenikanie audio) przez Plik → Eksportuj → Final Cut Pro XML → `docs/cutraw/premiere-wzorzec.xml`.
- [ ] Jednorazowy XML z 3 cięciami na materiale testowym → import w Premiere. Sprawdzić: ścieżki ułożone jedna nad drugą, offsety, mono/stereo, spacje i polskie znaki w ścieżkach, przenikanie audio (przeżywa import czy nie).

**Gotowe, gdy:** wiemy, które elementy XML działają w tej wersji Premiere. Wynik zapisany w `docs/cutraw/acceptance.md`.

## C1 — MVP w terminalu: pliki → paczka XML

Najważniejsza funkcja działa end-to-end bez panelu.

| # | Zadanie | Plik | Test (bez sieci, bez prawdziwego Premiere) |
|---|---|---|---|
| 1 | Synchronizacja: probe, obwiednia log‑energii, korelacja 20 Hz → 100 Hz → PCM, pewność, pomiar w 3 oknach | `scripts/cutraw-sync.mjs` | fixture z FFmpeg (`adelay` o znany offset, inna głośność, szum) → błąd ≤ 1 ms; niski score przy niepowiązanym audio |
| 2 | Projekt i orkiestracja: `new <nazwa> <pliki…> [--ref kamera] [--client k]` (rola z typu pliku), `process`, `export`; miks mikrofonów → Whisper (`transcribeSource`), mówca słowa z RMS | `scripts/cutraw.mjs` + `npm run cutraw` | `cutraw.json` waliduje się, czasy mastera ↔ źródła |
| 3 | Tempo (3 presety) + **najcichsza klatka** (`snapQuietest`) + reguła „nikt nie mówi” na wszystkich mikrofonach | `scripts/longform-roughcut.mjs` (wspólny silnik) | krawędzie zawsze na klatce i w dozwolonym oknie; za wąskie okno → `undecided`; testy LongForm zielone |
| 4 | GPT‑6 Luna: przebieg 1 przez `editRoughCut` z providerem `openai`, przebieg 2 `verifyCuts` (`cut/keep/undecided` + powód), zapis zużycia | `scripts/cutraw-ai.mjs` | zapisane odpowiedzi modelu jako fixture; `keep` przywraca; account-only bez API = cięcia deterministyczne + komunikat |
| 5 | Cenzura: `keepHead`/`keepTail` w `censorMutes`, `profanity-en.json`, WAV z cenzurą przez `censoredAudioArgs` | `scripts/longform-roughcut.mjs`, `src/longform/profanity-en.json` | 2 litery słychać, reszta = cisza (pomiar dB w oknie); wyjątki nie wyciszone |
| 6 | Generator FCP7 XML według wzorca z C0: timebase/ntsc, ścieżki V i A, `clipitem` na cięcie, luki poza zakresem źródła, `file://` z kodowaniem, escapowanie | `scripts/cutraw-xml.mjs` | parsowanie wyniku: pozycje co do klatki, suma długości = czas po cięciach, poprawne ścieżki z `<>&` i polskimi znakami |
| 7 | Paczka `…-cutraw-vNNN/` (XML + `audio/*.wav` + `README.txt`), poprzednie wersje zostają, hash źródeł przed i po | `scripts/cutraw.mjs` | druga paczka = `v002`, `v001` nietknięta |

Do tego `public/cutraw/` w `.gitignore`.

**Gotowe, gdy:** na materiale z C0 spełnione kryteria 1–7 z założeń (§12), import w Premiere zrobiony u użytkowniczki, wynik w `docs/cutraw/acceptance.md`. `npm test` i `npm run lint` bez nowych błędów.

## C2 — Panel CutRaw

- `ui/cutraw-server.mjs` pod `/api/cutraw` (wzór: `ui/longform-server.mjs`): projekty, upload i wybór plików, `process` jako job z prawdziwym postępem, rewizje i 409, wspólna blokada ciężkiej pracy z QuickContent/LongForm, eksport.
- `ui/CutRaw.tsx` + wejście „CutRaw” w bocznym panelu: Materiały → Synchronizacja → Cięcia → Eksport (kierunek UX w założeniach §8). Przegląd cięć z ekranu LongForm, wspólny komponent wydzielony dopiero wtedy, gdy oba ekrany go potrzebują.
- Podgląd: `proxy.mp4` 720p (kamera referencyjna + miks mowy z cenzurą), bo przeglądarka nie odtworzy ProRes/HEVC 4K.
- Oś źródeł z falami dźwięku i pasami cięć, ręczne przesunięcie synchronizacji ±1 klatka, odsłuch cięcia przed i po, skróty klawiszowe, koszt Luny przy projekcie.

**Gotowe, gdy:** cały przepływ z C1 przechodzi w panelu bez terminala; kontrola na 1440 i 768 px; jeden przebieg `impeccable detect` + krytyka, poprawki w jednej partii.

## C3 — Jakość podcastu

**Stan 2026-10-24:** przełączanie kamer, korekta dryfu, markery i `link` zrobione na danych testowych ([odbiór](docs/cutraw/acceptance.md)). Przenikania audio czekają na wzorzec z C0, cenzura znak po znaku — na pomiary z prawdziwych nagrań.

- **Auto‑przełączanie kamer** na mówiącego (mikrofon z mową → przypisana kamera). Minimum 2–3 s na ujęcie, plan ogólny przy nakładających się głosach. Wynik na V1, pełne kąty zostają wyżej do ręcznej podmiany.
- **Korekta dryfu**, gdy pomiar w 3 oknach pokaże > ½ klatki: nowy WAV z korektą tempa (oryginał nietknięty).
- Markery w XML na miejscach „do decyzji” i uwagach Luny. Powiązanie (`link`) obrazu i dźwięku kamery. Przenikania audio, jeśli C0 je potwierdził.
- Cenzura znak po znaku (forced alignment), jeśli pomiary z C1 pokażą słyszalne błędy.

## C4 — Dalej

- Tryb **„Zwięźle”** (jak Digest w Pleofonie): redakcyjne skracanie całych zdań, zawsze do akceptacji.
- Progi uczone z decyzji użytkowniczki per klient (co przywraca, co tnie sama).
- Zatwierdzone cięcia jako wejście do LongForm / QuickContent (bez ponownej transkrypcji).
- DaVinci Resolve (ten sam FCP7 XML), import przez plugin UXP Premiere ([plan Premiere](plan-wdrozenia-Premiere.md) P2/P3).

## Ryzyka

| Ryzyko | Co robimy |
|---|---|
| Wersja Premiere inaczej czyta XML | wzorzec z jej Premiere (C0), generator go naśladuje |
| Kamera bez sensownego dźwięku (np. daleko od rozmówców) | niski score → ręczne przesunięcie + ostrzeżenie, bez udawania synchronizacji |
| Whisper pomija „yyy” i źle zapisuje przekleństwa | `voicedGaps` z audio + Luna z kontekstem; przegląd z odsłuchem |
| Za agresywne cięcia | tempo „standard”, wątpliwe = zostaje, kontrola sensu w przebiegu 2 Luny |
| Długie pliki (2 h, 4K) | bez kopiowania źródeł, audio wyciągane strumieniowo, cache RMS, proxy tylko dla panelu |
