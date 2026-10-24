# F4 — lokalna kontrola obrazu i granice ujęć

2026-10-19. **Wdrożony lokalny przyrost, pełny odbiór F4 nadal otwarty.** Backend, Supabase i Vercel są odłożone zgodnie z [decyzją](../server/odlozone-uruchomienie.md). Brak publikacji, zakupów i płatnej redakcji.

## Co zmieniono

- Tracking zachowuje rzeczywiste cięcia także w pierwszej/ostatniej połowie sekundy. Wspólne `shotIntervals` porządkuje je i usuwa duplikaty. Próbka twarzy należy do ujęcia według swojego czasu, nie sąsiedniej kamery. Krótkie ujęcie bez próbki ma neutralny `fit`.
- Punkty mają lokalny `shotId`; renderer nie interpoluje między różnymi ujęciami nawet po zgubieniu znacznika `cut`. Historyczne ścieżki pozostają obsługiwane. Nie kalibrowano nowych progów wygładzania na nieodebranym korpusie.
- Układy Happy News zaczynają się na dokładnym cięciu źródła, zamiast czekać na następną próbkę detektora. Dopasowanie starych przedziałów ma wyłączny koniec — kolejne cięcie nie usuwa krótkiego ujęcia ogólnego. Pionowe Happy News zachowuje pełny obraz bez uruchamiania trackingu.
- Nowe materializacje QC zapisują `framing.observations.json` z hashem krótkiego źródła, próbkami czasu, twarzami, panelami i ID ujęć. Czas próbki jest czasem po resamplingu, **nie udajemy pełnej mapy klatek oryginału/VFR**. Plik jest przypięty w podpisie i kopii renderu. Starych projektów nie przeliczono automatycznie.
- `checkGeometry` wykrywa m.in. brak punktu przy cięciu, niepoprawny tracking, wyjście zmierzonego tekstu poza safezone i kolizję z twarzą. `checkMedia` kontroluje obecność obrazu/audio, czas źródła oraz osobno wymiary/czas renderu. Brak pomiaru daje `unknown`.

## Jak używać lokalnie

W edytorze: **Kadr → Sprawdź kadr i źródło**. Najpierw zapisz zmiany. Kontrola czyta źródło i aktualny draft, bez AI, zapisu rolki i renderu. Pokazuje problem albo zakres do obejrzenia; zmiana draftu ukrywa nieaktualny wynik. Przycisk ma stan pracy i błędu, szczegóły są zwijane.

W terminalu: `npm run reel:check -- <nazwa> --quality`. Wynik JSON jest związany z draftem i hashem źródła; `fail` daje exit 1, `unknown` jest jawnym brakiem dowodu, nie akceptacją. Zwykłe `reel:check` nadal sprawdza dotychczasową strukturę danych.

## Weryfikacja i review

Testy RED→GREEN: cięcia przy końcach, duplikaty cięć, ujęcie krótsze od okresu próbkowania, rozdzielenie shotId, krótkie ujęcie duo od 0,4 do 0,7 s, pionowe Happy News, brak audio, źródło za krótkie, VFR bez mapy PTS, safezone/kolizja i niepełne obrysy. Test CLI używa prawdziwego syntetycznego MP4 z audio i potwierdza brak mutacji.

Niezależny review wykrył możliwość fałszywego PASS po przekazaniu pustych boxów albo pojedynczej obcej próbki PTS. Odtworzono oba przypadki i poprawiono. Brak wiarygodnego powiązania/pokrycia danych daje `unknown`. Pełne certyfikowanie animacji tekstu jest celowo wyłączone do czasu dodania miernika w rendererze; sam komplet deklarowanych prostokątów nie jest dowodem. Dodatkowy review nowego przypisania układów do ujęć nie wykazał ustaleń; 34/34 testy layout/speaker.

Odbiór rzeczywistego GUI: otwarta rolka Happy News pokazała „Wykryto problem do poprawy” dla brakującego punktu kadru na cięciu 0,4 s oraz brakujące dowody. Klatki źródła 0,32/0,40 s potwierdzają przejście ze zbliżenia do ujęcia ogólnego. Nie zmieniano oryginalnej rolki. Dowód prywatny: `.quickcontent/quality/f34-gui-2026-10-19.png`, klatki w `f4-source-cut/`.

Pierwsza rzeczywista próba Vision w sandboxie zgłosiła niedostępność detektora. Próba tych samych dwóch klatek poza sandboxem zadziałała — ograniczenie środowiska zostało potwierdzone, nie zmieniano z tego powodu algorytmu. Pełna lokalna analiza poza sandboxem zakończyła się pomiarem: **229 próbek, 10 ujęć**, poprawna walidacja trackingu, przełączenie `speaker` → `duo-media` dokładnie przy 0,4 s. Oryginalny draft ma niezmieniony hash. Prywatny dowód: `.quickcontent/quality/f4-detection-verified-2026-10-19/proof.json`.

## Otwarte bramki

Miernik obrysu każdego aktywnego napisu/emotki we wszystkich klatkach; rzeczywista mapa PTS i pełna kontrola dekodowania/audio; przypisanie i odbiór korpusu F1; kalibracja ruchu na ręcznych referencjach; pełny odsłuch i przegląd kamer/przebitek różnych klientów. Kontrola nie wybiera automatycznie prawidłowego semantycznie zdjęcia i nie potwierdza trafności emotki. Nie dodano automatycznego wydawania ani masowej migracji starych rolek.

## Rzeczywiste klatki i wynik końcowy

Osobna kopia zasobów i jawne dane renderu z nowym kadrem: klatki **10, 11, 12, 13, 14** obejrzane przy 30 fps (cięcie na klatce 12). Do 11 jest zbliżenie, od 12 obaj prowadzący i zdjęcie w dolnym panelu; w tej próbie brak przebłysku poprzedniego układu. Fonty i dekoracje przeszły preflight. Nie zmieniono oryginału i nie wykonano nowej redakcji ani pełnego eksportu. Prywatne PNG i `proof.json`: `.quickcontent/quality/f4-render-proof-2026-10-19/`.

Końcowa suite: **527 testów, 526 PASS, 1 SKIP, 0 FAIL**. ESLint/TypeScript i build panelu PASS, `git diff --check` PASS. Logi: `/private/tmp/montage-f34-complete-tests.log`, `montage-f34-complete-lint.log`, `montage-f34-complete-panel.log`. Pojedyncza obejrzana granica nie jest pełnym odbiorem korpusu ani wszystkich rolek.

Decyzje: pełny skan animacji zachowuje `unknown` do czasu własnego miernika (koszt: brak automatycznej akceptacji); API w nowym ograniczonym zakresie zwykłych rolek jest odrzucone, pełny historyczny zakres pozostaje (koszt: mniejsze operacje API wymagają dalszego adaptera); odłożony odbiór prawdziwego konta/modeli, całych filmów i dwóch hostów nie jest przedstawiany jako wykonany. Brak odłożonych Minor z review. [Kolejny konkretny zakres](next-stage.md).

## Przyrost 2026-10-20

[Jawny skan geometrii](f4-geometry-2026-10-20.md): ID i inwentarz, pomiar układu w zamrożonym rendererze, pełne/częściowe klatki, 536 PASS/1 SKIP. Pełny obrys glifów/efektów i projekcja twarzy nadal otwarte; nie utożsamiać miernika DOM z odbiorem pikseli.

## Raster tekstu i dekoracji — dalszy przyrost 2026-10-20

[Raport pikselowy](f4-pixels-2026-10-20.md): jawne `--pixels`, maski pojedynczych warstw i dowód v2. Zamyka część braków obrysu glifów/efektów DOM; nie zastępuje pełnej projekcji twarzy, PTS, okluzji ani odbioru MP4.
