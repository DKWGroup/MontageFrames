# Punkt wznowienia — lokalne F4, 2026-10-20

Kontynuować bez ponownego pytania o zgodę na opisany kod. **Vercel, infrastruktura backendu, Supabase i zakupy są odłożone.** [Co przygotować później / Mac mini](../server/odlozone-uruchomienie.md), [plan główny](../../plan-wdrozenia-Serwer.md).

## Stan przekazania

- F0/F1 i przyrost F2 pozostają jak w poprzednich odbiorach. Pełny korpus oraz przenośne zasoby/dwa workery nie są jeszcze przyjęte.
- F3: wspólny rdzeń v3, zakresy tekst/hook QC oraz zwykłych rolek; trwałe próby/usage, kontrola JSON i SHA źródła pod blokadą. Ręczny hook bez AI, CLI `reel:ops context|apply|edit`, konta Claude/Codex zachowane. Pełny operator pozostaje dla nieobsługiwanych operacji. [Odbiór 19.10](f3-local-2026-10-19.md).
- F4: dokładne granice ujęć i własność próbek, shotId, układy Happy News na dokładnym cięciu; obserwacje z hashem źródła. Kontrola read-only w Kadr i `reel:check --quality`, bez AI. [Odbiór](f4-acceptance.md).
- Końcowe testy tego przyrostu: 527 testów, 526 PASS, 1 SKIP, 0 FAIL; lint/typy i build panelu PASS. Niezależny review i poprawki RED→GREEN zapisane w odbiorach.
- Rzeczywiste Happy News: 229 próbek Vision, 10 ujęć; klatki 10–14 potwierdzają dokładne przejście przy 0,4 s na duo z przebitką. To częściowy dowód, bez pełnego odsłuchu i odbioru filmu. Oryginału nie zmieniono. Prywatne dowody `.quickcontent/quality/f4-detection-verified-2026-10-19/` i `f4-render-proof-2026-10-19/`.

## Przyrost odebrany 20.10 — inwentarz i miernik układu

[Odbiór i ograniczenia](f4-geometry-2026-10-20.md): jawny `reel:geometry --frames ...|--all`, zamrożony snapshot i pełna/częściowa ścieżka rzeczywistego Remotion. Napisy/hooki/emotki mają ID, inwentarz hosta, pomiar po fontach i transformacjach. Pełny skan bez sekwencji PNG, zwykły podgląd bez pomiaru. **537 testów: 536 PASS, 1 SKIP; lint/typy/build PASS.** Rzeczywiste 3 klatki Happy News, zwykła/mierzona klatka 40 identyczna, oryginał bez mutacji. Trzy Important z review poprawione RED→GREEN.

**Nie domknięto pełnego obrysu pikseli ani ominięcia twarzy.** DOM Range mierzy układ i może pominąć wystające `j`/`f`, cień lub clipping. Miernik jawnie oznacza `extent=layout` i `unknown`, nie jest certyfikatem całej animacji. Wcześniejszy punkt wznowienia obejmował ambitniejszy pełny obrys; nie oznaczać go jako zakończonego samym kolektorem.

## Przyrost pikselowy 20.10 — wykonanie i granice

[Raport rastra](f4-pixels-2026-10-20.md). `reel:geometry --frames ...|--all --pixels` wykonuje kontrolne przezroczyste rendery osobnych ID. Obrys alfa obejmuje malowane glify, cień, stroke, blur, clipping i zwykłe pseudo-elementy, z zachowaniem transformacji i fontów. Raport v2 wiąże PNG z manifestem, ID i klatką. DOM pozostaje tańszym domyślnym trybem. Pełny skan pikselowy nie zapisuje wszystkich masek na dysku, lecz zużywa więcej CPU.

Izolacja nie może zmieniać układu/stylów celu; efekty zależne od tła i niepotwierdzona pusta maska pozostają `unknown`. To obrys osobnej warstwy, nie dowód okluzji przez inne warstwy finalnego MP4. Oba Important z review (przeciek `display:contents`, zależne pseudo-elementy) poprawione RED→GREEN. Pełny zestaw **544 testy: 543 PASS, 1 SKIP, 0 FAIL**, z równoległością 2 i tymi samymi wzorcami plików co `npm test`; lint/typy/build PASS. Rzeczywista klatka 40: trzy czyste maski, zwykły/mierzony PNG identyczny, JSON/źródło bez mutacji. To częściowy dowód, nie odbiór całego filmu.

## Następny przyrost — projekcja twarzy do wyjścia

1. Reużyć dokładną geometrię rzeczywistego renderera `SourceShot` i `HappyNewsSource`: współdzielone obliczenia transformacji/paneli dla wideo oraz mapowania prostokątów twarzy. Nie utrzymywać drugiego przybliżonego cropu. Zachować fit/crop, ręczny kadr, segmenty/zoom, regułę Bisanz skala 1 i Happy News duo/przebitka/zbliżenie.
2. Każdy punkt dowodu ma wiązać źródło/hash, shotId, czas źródła→czas wynikowy, klatkę, panel i jego clipping. Nie interpolować twarzy przez kamerę. Jawnie oznaczać próbki 4 fps / brak dokładnej mapy PTS; nie uznawać ich za pełną obserwację każdej klatki ani niezależną referencję.
3. RED z niezależnie policzonymi prostokątami: wycinek od źródła >0, usunięta przerwa, ręczny kadr z wyłączonym trackingiem, proporcje pion/poziom, zoom, utrata twarzy, zła kamera, pełny fit, duo i panel z przebitką. Porównać z rzeczywistymi klatkami i ręcznymi oznaczeniami. Brak twarzy w danych nie jest dowodem braku człowieka.
4. Zestawić przypięte maski pikselowe z projekcją twarzy. Dopiero kompletne, wiarygodne pokrycie może zastąpić `text.face-evidence=unknown`; częściowe pomiary mogą wykrywać kolizję, ale nie zatwierdzać całego filmu. Sprawdzić również aktualną safezone konkretnego klienta/kontraktu zamiast uznawać domyślną wartość za pełne wdrożenie wszystkich preferencji.
5. Pomiar pozostaje osobnym jawnym zadaniem bez AI. Panelowy pełny skan dopiero przez lokalny job z postępem/anulowaniem, kontrolą zasobów i rewizji; nie blokować istniejącego szybkiego endpointu HTTP. Wynik skanu nadal dotyczy własnego manifestu, bez automatycznej akceptacji historycznego MP4 czy badge.

## Potem — PTS, ruch i odbiór

- Zapisać zmierzoną mapę klatka oryginału→PTS oraz mapę próbek do tego czasu. Obecne `sampleIndex/fps` to resampling, nie dowód CFR źródła. Pełne dekodowanie obrazu i audio musi mieć powiązanie z hashem pliku i zakończeniem narzędzia; nie ufać samemu `decodeComplete=true`.
- Skalibrować smoothing/martwą strefę/limit prędkości na ręcznych referencjach kilku klientów. Przypadek Happy News użyty w debugowaniu oznaczyć jako tuning i wykluczyć tę historię z holdout. Obserwacje ocenianego detektora nie są referencją samą w sobie.
- Obejrzeć ±2 klatki granic i pełny ruch, odsłuchać. Odbiór SkyClass z mastera >0, Bisanz bez skalowania oraz Happy News duo/ekran/zbliżenie; sprawdzić brak utraty przebitek, drżenia i pompowania. Tolerancje przypiąć przed pomiarem.
- Dopiero jawna migracja wybranej starej rolki może zastosować nowe obserwacje. Sprawdzić master/origin, zachować historię i MP4, bez automatycznego płatnego montażu/ASR. Nie nadpisywać istniejących projektów zbiorczo.

## Pozostałe lokalne F3

Pełny operator kadru/mediów ma jeszcze historyczny transport plikowy. Dodać kolejne ograniczone operacje i adaptery bez usuwania obsługiwanych poleceń; podpiąć wykonanie zależności/checkpointów. Zmiana klienta po cięciach wymaga jawnego odtworzenia ze sprawdzonego mastera i mapy słów, albo odmowy z zachowaniem poprzedniej wersji. Płatny benchmark modeli wymaga osobnego budżetu, nie uruchamiać go automatycznie.

## Końcowe sprawdzenia kolejnego przyrostu

Testy RED→GREEN, `npm test`, `npm run lint`, `npm run build:panel`, niezależny review, rzeczywiste klatki i odsłuch odpowiedniego zakresu. Zapisać dowody i ograniczenia; nie oznaczać pełnej fazy jako ukończonej na podstawie fixtures. Zachować CLI/konta i własne brandingi. Infrastruktura pozostaje oddzielnym odłożonym zadaniem.
