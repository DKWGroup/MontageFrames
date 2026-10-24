# F2 — zasoby i manifest: odbiór przyrostu

2026-10-18. **Kod lokalnego renderu QC wdrożony; pełna przenośność i odbiór profili pozostają otwarte.** Serwer nie został uruchomiony. [Plan](../../plan-wdrozenia-Serwer.md), [kolejny zakres](next-stage.md).

## Wdrożone

Manifest v1 zawiera SHA-256 danych, kodu, plików publicznych, kontraktu, lockfile, fontów, środowiska i przeglądarki. Render QC buduje kopię silnika i zasobów przypisaną do zadania; sprawdza manifest i pliki przed oraz po renderze. Dotychczasowe rewizje/podpisy i wersjonowane MP4 pozostają.

Preflight sprawdza dostępność i hash zasobów oraz rzeczywiste pokrycie polskich glifów przez CoreText. Brak pomiaru daje `unknown`, brak zasobu blokuje render. Dla nowych brandingów z kontraktem kontrola zasobów poprzedza także redakcję AI. Legacy bez kontraktu zachowuje dotychczasowe wejście AI; ujednolicenie wejść pozostaje częścią F3.

Natywne fonty są jawnie ładowane z plików. Persona przypina obecne pliki MADE; gdy ich nie ma, zapisuje istniejący wariant Nunito. Wspólne grafiki zachowują własne zależności fontów również przy własnym brandingu. Nie instalowano nowych fontów ani nie zmieniano praw do nich.

Dekoracje napisów są wybierane raz dla snapshotu, z kotwicą słowa w tej rewizji; opcjonalny obraz lokalnej emotki zastępuje Unicode. Brak paczki rastrowej oznacza nadal systemowe Apple Emoji. Menlo i systemowe emoji mają jawne ograniczenie `runtime.portability=host-bound`.

## Dowody

- Testy RED→GREEN: brak fontu przed rendererem, zmienione/brakujące/cudze zasoby, polskie glify, manifest i jego mutacja, duplikaty kotwic, referencje dekoracji. Prawdziwy zmienny Nunito z nazwanymi instancjami przechodzi pomiar CoreText.
- Syntetyczne MP4 1,2 s, polskie „Żółć gęślą jaźń”, 720×1280 i dźwięk testowy: rzeczywisty render zakończony. Klatka obejrzana — znaki czytelne. To nie odsłuch rzeczywistej wypowiedzi.
- Klatki 12, 0, 35, 12 pobrane poza kolejnością na jednym komputerze; oba PNG klatki 12 mają identyczny SHA-256. Prywatne raporty: `.quickcontent/quality/f2-smoke-result.json`, `f2-frame-proof.json`; media w `f2-smoke/` poza Git.
- Niezależny review wykrył dobór fontu Persona i zależności fontów grafik własnego brandingu; oba przypadki odtworzone testami i naprawione. Podejrzenie braku natywnych fontów przy zapisanym brandingu nie potwierdziło się: istniejący `brandingRenderFiles` już je dodaje; pozostawiono test regresji.
- Świeże wspólne wyniki testów/lint/build i końcowe poprawki: [F3](f3-acceptance.md).

## Otwarte warunki pełnego F2

Brak zatwierdzonej przenośnej paczki emotek/fontów, pomiaru dwóch workerów i różnych concurrency, tolerancji obrazu/audio przypisanych przed pomiarem oraz odbioru prawdziwych filmów klientów. Manifest nie izoluje procesu w kontenerze i nie hashuje całego `node_modules`; pilnuje lockfile i wybranych plików runtime. Nie gwarantuje identycznych pikseli na dowolnym komputerze. Zwykły bezpośredni render Studio/CLI nie jest automatycznie przekierowany przez ten snapshot.
