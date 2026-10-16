# LongForm — postęp wdrożenia

## L0 + L1 — 2026-10-15 (Task 1–5, bez commita)

**Zrobione**
- `reel.json.format` → wymiary kompozycji (`reelDimensions` w `src/reel-timing.ts`, `calculateReelMetadata`). Brak `format` = 1080×1920.
- `tokensFor({T, T16}, dims)`; `T16` dla `persona` (`src/styles/persona.tsx`) i `bisanz` (`BISANZ16`, silnik `kineticCaptions/kineticOverlay(base, wide?)`): napis y 0,80, klucz ≈ 5% wysokości, blok ≤ 0,6, karty w prawej kolumnie (`cardColumn`). Ameryka/GlowUp/Vital/Happy News: `T` + `missing16x9`.
- `src/longform/schema.mjs` (RoughCut, Cut, Mute), `fillers-pl.json`, `profanity-pl.json` (20 pozytywów / 20 negatywów w testach).
- `scripts/longform-roughcut.mjs`: `silenceCuts`, `voicedGaps`, `fillerCuts`, `censorMutes`, `speechRms`, `validateCuts`, `applyDecisions` + CLI `propose|apply`. `detectSilences` wyeksportowane z `scripts/prep.mjs` (zachowanie prep bez zmian).
- `src/Reel.tsx`: `mutes` (gain per klatka, także pełna ścieżka SkyClass), napis `k***a`, SFX z `public/sfx/index.json` na −10 dB względem `level`.

**Dowody**
- `npm test`: 278/279; jedyny błąd (`quickcontent-ai.test.mjs` — ścieżka `codex` na tej maszynie) występował przed zmianami.
- `npm run lint`: 0 błędów.
- `pokazowka` klatka 30: PNG identyczny bajt w bajt przed i po.
- Rolka testowa `public/reels/longform-test` (14 s z poziomego nagrania Kacpra Bisanza, styl `bisanz`, `format` 1920×1080) → `out/longform-test.mp4` 1920×1080. Prawdziwe „jeb...” (3,95–4,39 s): okno wyciszenia −91 dB w renderze vs −25 dB w źródle; otoczenie bez zmian (−24,2 vs −24,1 dB). Napis „j***”.

**Czego nie ma / ograniczenia**
- Brak licencjonowanego `public/sfx/kruk.*` i `public/sfx/index.json` → cenzura działa jako samo wyciszenie (ostrzeżenie w CLI i renderze). Po dodaniu pliku wpisz `{ id: "kruk", file, license, source, rmsDb }`.
- Wyciszenie w Remotion ma dokładność klatki (±33 ms); dokładna rampa 5 ms dopiero w audio FFmpeg przy eksporcie OTIO (Task 8).
- Kolumna kart 16:9 zawsze po prawej — strona przeciwna do twarzy, gdy `face` dostanie `x`. Pozostałe typy kart (glowup/vital własne) — Task 12.
- Naprzemienny zoom bez wykrywania ujęć kamery. `Chapter/Plan/Effect` w schemacie dopiero w L3.
- Klatki 16:9: `bisanz` i `persona` — napisy nisko, karty w prawej kolumnie obok twarzy (persona: domknięte 2026-10-16, niżej).

**Dalej:** L2 (zrobione niżej).

## Domknięcie L0/L1 + L2 — 2026-10-16 (Task 6–8, bez commita)

**Zrobione**
- Karta `persona` w 16:9: `C16` w `src/overlays.tsx` (szerokość 0,4, kolumna x 0,75, góra 0,14) przez `tokensFor`; wspólne `OverlayView`, licznik, wykres liniowy i karta media liczą szerokość z tokenów. Kadr pionowy bez zmian.
- Rejestr SFX: `public/sfx/index.json` = `[]` (pusty). Kruka nie pobierano. Potrzebny plik: krótkie krakanie kruka 0,3–0,8 s, WAV/MP3, **CC0** (np. z Freesound z licencją CC0) albo kupiony z licencją komercyjną; plik do `public/sfx/kruk.wav` + plik licencji obok + wpis `{ "id": "kruk", "file": "kruk.wav", "license": "CC0", "source": "<URL>", "rmsDb": <zmierzony RMS dB> }`.
- Task 6 `scripts/longform-ai.mjs`: bloki ≤ 1500 słów z zakładką 100, prompt (transkrypt = dane), `EDIT_SCHEMA` (strict, tylko `wordIds`), `cutsFromAI` (czasy liczy kod; nieznane/spoza bloku/nieciągłe `wordIds` odrzucone; `repetition` zawsze `undecided`; pewność < 0,8 = `undecided`), `editRoughCut` (scalanie zakładek, `validateCuts`). Operator i koszty przez `quickcontent-ai.mjs`.
- `scripts/longform-roughcut.mjs`: `buildRoughCut` (wspólne dla CLI i panelu; ręczne decyzje i cięcia `user-*` przeżywają ponowne „Przetwarzaj”), `applyDecisions` przeniesione do `src/longform/cuts.mjs` (bez modułów Node — używa go też podgląd). `kind: "manual"` dla własnych cięć.
- Task 7 `ui/longform-server.mjs` (+ test), podpięty w `ui/server.mjs` pod `/api/lf`: `GET/POST /projects`, `GET /projects/:id`, `GET /sources` (inbox/ + foldery klientów bez Render/QuickContent), `POST /:id/process` (202; blokada ciężkiego joba wspólna z QuickContent → 409), `GET|PUT /:id/roughcut` (`X-Edit-Revision`, 409), `POST /:id/roughcut/approve` (segments + mutes → reel.json, `editRevision`++, `planStale`/`renderStale`), `GET /:id/export/otio`. Job: probe → Whisper (`transcribeSource`, prawdziwy %) → cisza/RMS (async FFmpeg) → redakcja AI (błąd = ostrzeżenie, zostają cięcia deterministyczne) → walidator → `awaiting-cut-review`. Edycja po zatwierdzeniu wraca do przeglądu i unieważnia plan/render. Stan w `public/reels/<id>/longform.json`; job przerwany restartem = `failed` z komunikatem.
- Task 8 `scripts/longform-otio.mjs` (+ test): `toOtio` (Timeline.1, tor V1/A1, Clip.1 na segment, klatki z zaokrąglonych granic, oś od 0), `censoredAudioArgs` (FFmpeg `volume=0` w zakresach wyciszeń → `audio-censored.wav` w torze audio).
- Task 8 `ui/LongForm.tsx` + `ui/longform.css` + `ui/longform-view.mjs` (+ test): `#lf` lista + „Nowy film” (plik, nazwa z pliku, operator AI) → „Przetwarzaj”; projekt ze stepperem (kroki 3–5 zablokowane z powodem); postęp z etapem, % tylko gdy mierzony, czas pracy; ekran „Cięcia”: player 16:9 „Po cięciach | Oryginał”, oś z cięciami, licznik wyciętego czasu, transkrypt z przekreśleniami i etykietami (rodzaj, pewność słownie, Przywróć/Wytnij), filtry z licznikami, „Przywróć wszystkie: <typ>”, własne cięcie z zaznaczenia, cenzura „k***a” + „wyłącz”, cofnij/ponów, skróty (Spacja, X, N/P, F, ⌘Z/⇧⌘Z), autozapis z rewizją (409 → szkic zostaje), „Zatwierdź cięcia”, „Eksport do Premiere (.otio)”. Przycisk „Film poziomy” w bocznym panelu.

**Dowody**
- `npm test`: 304/305; jedyny błąd to znany `scripts/quickcontent-ai.test.mjs:170` (ścieżka Codexa z ChatGPT.app), niezwiązany.
- `npm run lint`: 0 błędów (24 stare ostrzeżenia w `src/studio/*`).
- Panel na żywo (`npm run ui`, port 3100): projekt `longform-demo` z `inbox/longform-demo.mp4` (14 s Bisanza, kopia testowa) → Whisper + operator AI → przegląd. AI znalazło falstart „je...” (0,97 → cut), leksykon: „Tak” do decyzji, 2 dźwięki bez słów do decyzji. Przywróć → autozapis (rewizja 2), Cofnij (rewizja 3), Zatwierdź → `reel.json` segmenty [0–3,98] [4,32–14], OTIO 200 (klipy 0+119, 130+290 @30). PUT ze starą rewizją → 409, POST bez X-Panel → 403. Konsola bez błędów; układ wąski (768 px) składa się w jedną kolumnę.
- `pokazowka` klatka 30 nadal identyczna po zmianach kart.

**Otwarte**
- Benchmark Task 6 na 3 prawdziwych nagraniach (`docs/longform/benchmark.md`): `inbox/` nie miał nagrań poziomych gadającej głowy — do zrobienia, gdy użytkowniczka je wrzuci.
- „Domyślny z ustawień” rozwiązał się na **OpenAI gpt-6-luna** z `.env` (płatne API, test: 1 201 tokenów ≈ 0,0002 USD, zapisane w `longform.json.usage`). Koszty nie są jeszcze pokazywane w GUI LongForm.
- Whisper zapisał przekleństwo jako „je...” — leksykon go nie łapie, AI uznało za falstart i wycina. Kontekstowa detekcja przekleństw przez LLM (§4.4) jeszcze niezrobiona.
- Import `.otio` w Premiere ≥ 25.6 niesprawdzony (brak Premiere/biblioteki opentimelineio w środowisku) → `docs/premiere/acceptance.md` czeka. Markery rozdziałów dojdą w L3; kruk w WAV — po dodaniu pliku.
- „Odsłuchaj przed/po” i „Odsłuchaj oba ujęcia”, J/K/L, przywracanie pozycji w transkrypcie po odświeżeniu i ręczne cięcie przez zakres czasu — niezrobione. Upload pliku z komputera i „master z QuickContent” w kroku Materiał — niezrobione (wybór z inbox/ i folderów klientów).
- `ui/longform-api.ts` z planu nie powstał: zapytania i typy są w `ui/LongForm.tsx` (jak w Motion Studio).
- Zostawione do testów: `inbox/longform-demo.mp4`, `public/reels/longform-demo/`, `public/reels/longform-test/`, `out/longform-test.mp4`.

**Dalej:** L3 — Task 9 (rozdziały i hook).

## L3 — 2026-10-16 (Task 9–13, bez commita)

**Zrobione**
- AI LongForm tylko przez konto CLI (`scripts/longform-ai.mjs`: wybór spoza Claude Code/Codex = błąd, bez płatnego fallbacku; PREFERENCJE.md 2026-10-16).
- Task 9–10 `scripts/longform-plan.mjs`: `validateChapters`, `validateHooks` (≤ 8 słów, anti-cringe, 3 warianty), `validateColdOpen` (3–8 s spoza wstępu), `validatePlan` (katalog Fundamentu, rytm jako ostrzeżenia), `youtubeChapters`, `planToReel` (hook, plansze rozdziałów, efekty → `overlays` z `lf: true`, zoom do segmentów). Plan jednym zapytaniem `requestPlan`.
- Task 11 `scripts/longform-assets.mjs`: Pexels (cache, `credits.md`), logo tylko z `public/Brandings/_logos`, brak = efekt pominięty z ostrzeżeniem.
- Task 12 `src/longform/effects.tsx` + kompozycja `LongFormRender` (`src/longform/index.ts`).
- Task 13 `ui/LongFormPlan.tsx`: Plan (rozdziały z edycją tytułów, 3 hooki + własny tekst, cold open, efekty wg torów z Usuń/Przywróć, odrzucone, ostrzeżenia, „Akceptuj plan i montuj”, zapis z rewizją/409); Wynik (player, wersje `vNNN`, „Aktualny”, Pobierz MP4, eksport `.otio`). Montaż = job z etapami assety → render (`scripts/longform-render.mjs`, snapshot, ffprobe).
- Poprawki znalezione na żywo: (1) `quickcontent-render.mjs` i `longform-render.mjs` reagowały na tę samą flagę `--render-snapshot` przy imporcie → render LongForm padał „Niedozwolona ścieżka materiału”; wejście CLI tylko dla pliku uruchomionego wprost. (2) `planToReel`: typography/plansza nachodząca na hook lub inną planszę jest pomijana z ostrzeżeniem (był podwójny napis w 0:00). (3) Stepper oznaczał nieosiągnięte kroki jako ✓. (4) „Ponów” po nieudanym montażu ponawia sam montaż, nie płatny plan.

**Dowody**
- `npm test` 347/348 (znany `quickcontent-ai.test.mjs` — ścieżka Codexa). `npm run lint` 0 błędów, `tsc` 0 błędów.
- Panel na żywo, `longform-demo` (14 s): Zatwierdź cięcia → Przygotuj plan (operator: Codex na koncie) → 2 rozdziały, 3 hooki, 4 efekty → Akceptuj i montuj → Pexels 1/1 → `out/longform-demo-v002.mp4` 1920×1080, h264+aac, 14,0 s; v001 zachowane. Klatki: hook sam w 0:00, plansza rozdziału, przebitka Pexels w karcie, napisy pod twarzą.

**Otwarte**
- Rozdziały w opisie publikacji (`reel-description.mjs`) i karta „Opis publikacji” w Wyniku — niezrobione.
- Na osi planu brak bloków czasowych / „Zamień na…” / „Wygeneruj ponownie ten efekt” (jest lista wg torów + Usuń); przeciąganie granicy wstępu — niezrobione.
- Zakładki Wyniku: Napisy i Czat poprawek — niezrobione; koszty LongForm w GUI — niezrobione.
- Kruk: nadal brak licencjonowanego pliku (`public/sfx/index.json` = `[]`).
- Odtwarzanie w Wyniku przez `/api/file` bez Range (przewijanie może nie działać w każdej przeglądarce).
- Test na 3 prawdziwych nagraniach (benchmark) — czeka na nagrania poziome w `inbox/`.

**Dalej:** L4 (wycięcie osoby, Vision) i L5 (efekty stylizowane, research) — mogą iść równolegle.
