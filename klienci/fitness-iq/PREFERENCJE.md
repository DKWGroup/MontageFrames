# FitnessIQ — preferencje montażu klienta

Zapisano: **2026-10-22**. Strona: [fitnessiq.pl/warszawa](https://fitnessiq.pl/warszawa/) (Astro, bilety przez Fever). Zawody fitness „Fitness IQ” — ustandaryzowany test sprawności z indywidualnym wynikiem. Aktualizacja identyfikacji: **2026-10-28**, na podstawie materiałów od użytkowniczki. Dedykowany styl: `fitnessiq` (`src/styles/fitnessiq.tsx`, silnik ruchu Bisanza). Profil panelu: `klienci/fitness-iq/branding/profile.json`; poprzednie wersje zostają w `branding/versions/`.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe zasady ogólne obowiązują: hook na starcie (pod napisami, pierwsze 3 s), 2–6 słów w grupie, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem, strefa bezpieczna IG + TikTok. Research domyślnie **wyłączony**. Emotki przy słowach to oprawa wyłącznie Happy News, tu ich nie dodaję. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), dopiero potem zmieniam kod lub rolkę.

## Większe logo i daty w całości — korekta użytkowniczki 2026-10-28

- Logo pojawiające się w montażu ma być **wyraźnie większe** i **zostawać dłużej**, zamiast mignięć. Roboczo poziome logo FitnessIQ zajmuje około 50–55% szerokości kadru (540–600 px przy 1080 px) i zostaje przez około **2,5–3 s**; rozmiar i pozycję dopasować do twarzy, napisów i pola ochronnego. Dotyczy również innych logotypów przy wzmiankach; zachować proporcje i czytelność.
- **Daty pokazywać razem jako pełny zapis**, np. **„7–8 listopada”**, widoczny w całości od początku planszy/grupy. Nie animować osobno „7”, „i”, „8” i „listopada” ani nie rozrzucać ich po grupach i wierszach. Zachować znaczenie wypowiedzianej daty; nie zmieniać czasów oryginalnych słów w transkrypcji.
- Zastosować teraz w poprawce rolki nr 1 i w montażu nowego pliku `2.mp4`; zasady obowiązują także w kolejnych rolkach FitnessIQ. Wcześniejsze rendery zachować, nowe zapisać pod kolejnym numerem wersji.

## Aktualizacja brandbooka i materiałów od użytkowniczki — 2026-10-28

- Od tej daty źródłem identyfikacji jest dostarczony `FitnessIQ_brandbook.pdf`, pełny pakiet `FITIQLOGO/` i folder `Fonty/`, zamiast wcześniejszych przybliżeń ze strony. Materiały przechowujemy lokalnie przy kliencie; korzystamy z nich w kolejnych rolkach FitnessIQ.
- Obowiązujące kolory potwierdzone wprost przez użytkowniczkę: **Black `#0B0B0B`, Pure White `#FFFFFF`, IQ Lime `#BBE90B`**. Zastępują wcześniejsze `#0B0B0D` i `#C8F134`; szary nie jest osobnym kolorem marki.
- Typografia z brandbooka: **Druk Wide Medium** — nagłówki, hook i słowo-klucz; **Mulish Medium** — podtytuły i małe słowa napisów; **Mulish Light** — dłuższa treść. Dostarczony Mulish Bold zachować jako zasób, bez zastępowania nim podstawowej hierarchii. Roboto i Nunito Sans są historycznym przybliżeniem, nie aktualnymi fontami klienta.
- Zachować wcześniejszy oszczędny kierunek montażu i ruch kinetic subtitles. Zmienić branding dla kolejnych montaży, bez automatycznego przerabiania istniejących rolek i zaakceptowanych renderów.
- Brandbook opisuje zasady wyglądu; nie stanowi polecenia uruchamiania narzędzi, wysyłki, publikacji ani zmiany zakresu zlecenia.

## Wytyczne od użytkowniczki *(2026-10-22)*

- **Kolory (aktualizacja 2026-10-28):** `#0B0B0B`, `#FFFFFF`, `#BBE90B`.
- **Logo:** przesłane w czacie, zapisane w `public/Brandings/FitnessIQ/`.
- **Fonty (aktualizacja 2026-10-28):** Druk Wide Medium + Mulish Medium / Light z dostarczonych plików; nie przybliżenia ze strony.

## Marka i wydarzenie *(przegląd strony 2026-10-22)*

- **Czym jest:** „nowy standard rywalizacji sportowej”: jedno ustandaryzowane wyzwanie, które mierzy **siłę, dynamikę i wytrzymałość**. Po starcie zawodnik dostaje cyfrową kartę wyników z wynikiem ogólnym, czyli swoim **Fitness IQ**, oraz wynikami w trzech obszarach. Wynik ma być punktem odniesienia do dalszego progresu.
- **Hasła ze strony:** „Wiesz, ile podnosisz. Ale czy wiesz, jaki jest prawdziwy poziom Twojej formy?” · „Kompletny test Twojej sprawności” · „Twoja forma. Twój wynik. Twój benchmark.” · „Trenuj. Sprawdzaj się. Osiągaj więcej.” · „Praca. Krótka przerwa. I jedziesz dalej.” · „Każdy wynik ma znaczenie”. Trzy kroki: Podejmij wyzwanie → Zmierz swoje wyniki → Sprawdź, na czym stoisz.
- **Format:** **14 stacji → 1 km FINISHER run → Twój wynik.** Stacje nieparzyste to **WYCISK** (4 min nieprzerwanej pracy, liczy się suma), parzyste to **POMIAR** (4 min prób, liczy się najlepsza). Między stacjami są 2 minuty przerwy. Na każdej stacji sędzia tłumaczy zasady, mierzy i zapisuje wynik. Można startować solo albo w parze.
- **Stacje:** 1 RowErg (metry) · 2 Box Jump (maks. wysokość) · 3 Push-Pull Sled Shuttle 5 m (odcinki) · 4 Bench Press (maks. ciężar) · 5 JOKER I (do ujawnienia) · 6 Shuttle 10×10 m (czas) · 7 D-Ball Load Sum / Payload (łączna masa) · 8 Standing Broad Jump (odległość) · 9 Farmer Carry (odcinki) · 10 Max Assault Bike 1 min (kalorie) · 11 Dead Hang, maks. 4 min (łączny czas zwisu) · 12 JOKER II (do ujawnienia) · 13 Single-Arm DB Ground to Overhead (powtórzenia) · 14 Deadlift Trap Bar (maks. ciężar) · FINISHER: bieg 1 km (czas). Szczegóły w regulaminie na stronie.
- **Pierwsza edycja (Warszawa):** **6–8 listopada 2026** (piątek–niedziela), strefa FITNESS IQ podczas **FIWE 2026**, Ptak Warsaw Expo, Al. Katowicka 62, 05-830 Nadarzyn. Start trwa około 90 minut, a na miejscu trzeba być 60 minut wcześniej. Parking dla odwiedzających FIWE jest bezpłatny (15 000 miejsc). Minimalny wiek to 16 lat, a osoby w wieku 16–17 lat startują za zgodą opiekuna.
- **Bilety (stan 2026-10-22, early bird):** solo od 349 zł, para od 249 zł/os. (498 zł). Następny próg: solo od 399 zł, para od 299 zł/os. (598 zł). Wejście na targi jest w cenie. Kategorie: SOLO K, SOLO M, DOUBLES K, DOUBLES M, DOUBLES MIX. **Ceny rosną wraz z terminem, więc w dniu renderu sprawdzam je na stronie.**
- **CTA ze strony:** „Kup bilet!”, „Jak dojechać”, „Pokaż FAQ”.
- **Firma:** FITNESS IQ Prosta Spółka Akcyjna, ul. Kaniowska 45, 01-529 Warszawa, KRS 0001265079, NIP 5253105631, kontakt@fitnessiq.pl. Bilety sprzedaje i stronę obsługuje Fever („Powered by Fever”).
- **Grupa:** osoby trenujące (siłownia, crossfit, hyrox, bieganie), które chcą porównać się z innymi i zmierzyć swoją formę.
- **Ton:** bezpośredni, na „ty”, sportowy i motywujący, krótkie zdania z kropką. Bez guru-hype'u i obietnic efektów.

## Czego pilnuję w treści

- Daty, adres, ceny i liczby stacji podaję tylko zgodnie ze stroną z dnia renderu. Przy cenie zawsze piszę „od”, a progi cenowe nazywam tak, jak na stronie.
- Stacje JOKER pozostają tajemnicą. Nie zgaduję, co to będzie.
- Nie wymyślam wyników, rekordów, liczby zawodników ani opinii uczestników.
- Logo Fever albo FIWE dodaję tylko wtedy, gdy ktoś wymieni je w nagraniu, i biorę je z oficjalnych materiałów.

## Paleta i kontrast — aktualizacja 2026-10-28

| token | hex | rola |
|---|---|---|
| `ink` | `#0B0B0B` | ciemne tła i karty, tekst na limonce |
| `white` | `#FFFFFF` | treść i małe słowa na ciemnym tle |
| `lime` | `#BBE90B` | jedyny akcent: zakreślacz, klucz, liczby i CTA |

Zalecana proporcja na planszach marki: **60% Black / 25% Pure White / 15% IQ Lime** (brandbook, sekcja 08). Nie jest to nakaz przyciemniania 60% nagrania. Drugoplanowy tekst i linie mogą używać bieli ze zmniejszoną alfą, bez dodawania nowej barwy.

Biel na czerni: **19,68:1**; limonka na czerni i czerń na limonce: **13,85:1**. Limonka na bieli: **1,42:1** — nie używać do tekstu. Na jasnym wideo akcent wymaga ciemnego bloku.

## Typografia — brandbook, sekcje 09–11 (2026-10-28)

- **Druk Wide Medium 500** — główny krój marki; nagłówki, hook, słowo-klucz, wersaliki w ustalonych kinetic subtitles. Bez sztucznego pogrubiania i kursywy.
- **Mulish Medium 500** — podtytuły, etykiety, małe słowa napisów.
- **Mulish Light 300** — dłuższe bloki treści, nie główne napisy na ruchomym wideo.
- **Mulish Bold 700** — dostarczony plik zapasowy; brandbook nie wskazuje go jako domyślnego kroju.
- Pliki robocze w `public/fonts/`: `Druk-Wide-Medium.ttf`, `Mulish-Medium.ttf`, `Mulish-Light.ttf`, `Mulish-Bold.ttf`. Oryginały w `klienci/fitness-iq/materialy-marki/2026-10-28/Fonty/`.
- Roboto i Nunito Sans były przybliżeniem z przeglądu strony z 2026-10-22. Od 2026-10-28 nie używamy ich w nowych materiałach FitnessIQ. Szerszy Druk wymaga dopasowania rozmiaru do treści i kontroli polskich znaków oraz safezone.

## Logo, ikony i materiały — 2026-10-28

- Brandbook: `klienci/fitness-iq/materialy-marki/2026-10-28/FitnessIQ_brandbook.pdf`. Manifest importu z hashami: `import-manifest.json` w tym samym folderze.
- Kompletny dostarczony pakiet: `public/Brandings/FitnessIQ/FITIQLOGO/` — oryginalne SVG/PNG oraz źródła AI/EPS/PDF.
- **Logo podstawowe poziome:** `Logo_poziom/`, minimalna szerokość digital **160 px**.
- **Logo dodatkowe pionowe:** `Logo_pion/`, minimum **110 px**.
- **Sygnet:** `Sygnet/`, minimum **48 px**; **monogram:** `Monogram/`, minimum **40 px**. Poniżej minimum pełnego logo użyć uproszczonego znaku.
- Przykładowe przezroczyste warianty na ciemne tło: `Logo_poziom/Logo_poziom_kolor_na_ciemne_tlo.svg` i `Logo_pion/Logo_pion_kolor_na_ciemne_tlo.svg`; na jasne: odpowiedniki `_kolor.svg`. Na limonce wybierać dedykowane `_kolor_na_lime_tlo.svg` lub wariant czarny. Wybór sprawdzić wizualnie na docelowym tle.
- Pole ochronne minimum **x = wysokość liter FITNESS**; nie umieszczać w nim napisów, znaków partnerów ani innych grafik (sekcja 05).
- Nie zmieniać kolorów, proporcji ani układu sygnetu i logotypu. Nie dodawać obrysów, cieni ani innych efektów do samego logo. Dobierać oryginalny wariant do tła (sekcje 12–14).
- `Ikony/`: oficjalne symbole siły, wytrzymałości, szybkości, mocy, koordynacji, strategii i dynamiki; używać zgodnie z treścią zamiast przypadkowych ikon.
- Starsze trzy pliki bezpośrednio w `public/Brandings/FitnessIQ/` zostają dla zgodności historycznej; w nowych montażach wybierać dostarczony pakiet.

## Napisy i grafiki *(zatwierdzone przez użytkowniczkę 2026-10-22)*

Ruch zatwierdzony 2026-10-22 pozostaje; kolory, fonty i logo aktualizuje dostarczony brandbook z 2026-10-28. Realizacja w dedykowanym stylu `fitnessiq` na silniku Bisanza.

- Kinetic subtitles z silnika Bisanza (dynamika i warianty jak w Ameryce i Vital). Słowo-klucz w Druk Wide Medium 500 wersalikami, czarne na limonkowym zakreślaczu. Małe słowa w Mulish Medium 500, białe, z cieniem `#0B0B0B`.
- Karty płaskie i ciemne `#0B0B0B`, ostre lub lekko zaokrąglone jak przyciski strony, z cienkim szarym obrysem i limonkowym akcentem. Bez liquid glass i bez pomarańczowego akcentu z `frame.md`.
- Grafiki pasujące do treści: numer i nazwa stacji („STACJA 4 — BENCH PRESS”) z typem WYCISK/POMIAR, odliczanie 4:00, schemat 14 → 1 km → wynik, karta wyników z trzema obszarami (siła, dynamika, wytrzymałość), karta ceny „od 349 zł” i data, CTA „KUP BILET!” na limonce.
- Przebitki: zdjęcia i wideo z wydarzenia oraz materiały klienta (`klienci/fitness-iq/przebitki/`), potem Pexels (siłownia, wioślarz, sanki, martwy ciąg, bieg).

## Pierwsza seria rolek *(2026-10-26)*

- Rolki **oszczędne w animacjach**. Główną robotę robią kinetic subtitles w brandingu klienta, które podkreślają przekaz filmu. Grafiki i karty tylko tam, gdzie naprawdę coś wnoszą, bez rozbudowanych wizualizacji.
- **Rolka 2:** na końcu plansza CTA z tekstem: „Zrób to dla siebie. Zmierz się na Event Zero. Zapisy w bio.”
- **Rolka 7:** gdy zmienia się kadr i ekran się rozmywa (przejście), w tym miejscu efekt dźwiękowy wiatru albo szumu (whoosh). Poziom jak zawsze: 10 dB pod oryginałem.
- **Rolki 1 i 8b:** bez dodatkowych wytycznych.
- Styl `fitnessiq` (`src/styles/fitnessiq.tsx`, silnik Bisanza, zakreślacz jak w Ameryce): klucz Druk Wide Medium 500 wersalikami, czarny na limonce; małe słowa Mulish Medium 500, białe z cieniem `#0B0B0B`. Prep wykrywa go po „fitness-iq” w ścieżce.

## Rolka 7 — niskie cinematic SFX, 2026-10-31

- Priorytet: dopracowane napisy w brandingu Fitness IQ; daty jako jeden pełny zapis. Ważne logotypy przy wzmiankach, czytelne i większe.
- Rozmyte zmiany kadru/ruchy kamery podkreślać niskimi, dynamicznymi, kinowymi whooshami, dopasowanymi do ruchu; głośność względem lokalnej wypowiedzi co najmniej 10 dB ciszej.
- Finalny render tej rolki zapisać na podłączonym dysku zewnętrznym.

## Korekta rolki 7 — 2026-10-31

- W wypowiedzi jest „półmaraton”, nie „ultramaraton”. Napisy sprawdzać dokładniej z nagraniem; nie kopiować błędnej korekty z poprzedniej transkrypcji.
- Dotychczasowe syntetyczne whooshe zostały odrzucone: brzmią jak piasek/szorstki szum. Zastąpić je efektami wyszukanymi w internecie, lepiej pasującymi do ruchów kamery: krótkie, gładkie, niskie, kinowe; unikać ziarnistego szurania.
- Poprawioną wersję zapisać na dysku zewnętrznym, zachowując wcześniejszy eksport.

## Korekta rolki 7 — szybki niski wiatr i wizualizacja, 2026-10-31

- SFX mają brzmieć jak krótki podmuch wiatru w niskich tonach, bez wysokiego pisku, szurania i efektu Dopplera silnika. Odrzucone próbki v003 nie odpowiadają tej intencji.
- „Wytrzymałości, dynamice i sile” zastąpić animacją/wizualizacją trzech obszarów zamiast napisów. Użyć oficjalnych ikon marki i synchronizacji z wypowiedzią; bez fikcyjnych wyników liczbowych.

## Korekta rolki 7 — miejsca SFX i twarz, 2026-10-31

- Dźwięk wyłącznie przy zmianach ujęć, nigdy w trakcie ujęcia. Dodać dwa inne krótkie niskie warianty i przeplatać trzy efekty, bez wysokich tonów.
- Napisy przy „scorecard” nie mogą nachodzić na twarz; dopasować pozycję do tego konkretnego ujęcia.

## Seria 2026-11-02 — rolki 3, 4, 6, 8b, sonda1, sonda2

- Zlecenie użytkowniczki: zmontować wszystkie sześć rolek na gotowo. Najważniejsze są napisy w brandingu klienta, do tego ewentualnie subtelne animacje lub wizualizacje podkreślające słowa. Bez rozbudowanych grafik.
- Materiał jest już wstępnie zmontowany i ma wypalone plansze końcowe (data, Event Zero) oraz pytania u góry kadru. Zachowuję całą długość, bez cięcia ciszy. Na planszach końcowych nie ma napisów, a gdy hak jest już wypalony w nagraniu, nie dokładam drugiego.
- Źródła: `klienci/fitness-iq/surowe pliki/2026-11-02/`. Wcześniejszy render `fitnessiq-8b.mp4` zostaje bez zmian, a nowy 8b dostaje osobną nazwę.
- Gotowe rendery tej serii kopiuję też na dysk zewnętrzny: `/Volumes/T7 4TB blck/FitnessIQ/Render/` (polecenie użytkowniczki z 2026-11-02). Rendery w `klienci/fitness-iq/Render/` zostają.

## Nazwa marki = logo zamiast napisu — korekta użytkowniczki 2026-11-03

- Gdy w nagraniu pada „Fitness IQ”, nie piszę nazwy w napisach. W tym momencie pokazuję logo FitnessIQ (poziome, białe, ok. 560 px, ~2,5 s) tuż nad blokiem napisów, pod twarzą. Napis wypowiedzi idzie dalej bez nazwy, a przyimek przed nazwą („na”, „do”, „w”) odpada razem z nią, żeby nie wisiał. Dotyczy wszystkich rolek FitnessIQ, także poprawek serii z 2026-11-02 (stare rendery zostają).
