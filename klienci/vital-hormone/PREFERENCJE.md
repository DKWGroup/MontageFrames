# Vital Hormone — preferencje montażu klienta

Zapisano: **2026-10-09**. Strona: [vital-hormone.pl](https://vital-hormone.pl) (WordPress + Tailwind). Centrum medyczne online: diagnostyka hormonalna i terapia testosteronem (TRT) dla mężczyzn. Styl w silniku: **`vital`** (jeszcze niezbudowany). Plan: czwarty motyw silnika ruchu Bisanza (`kineticCaptions(T)` / `kineticOverlay(T)` z `src/styles/bisanz.tsx`, jak `AMERYKA` i `glowup`), własne grafiki `VitalOverlay`, wpis w `STYLES` (`src/Reel.tsx`) i wykrywanie po „vital-hormone” w ścieżce (`styleOf` w `scripts/prep.mjs`). Dopóki styl nie powstanie, ten plik służy jako profil montażowy.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe zasady ogólne obowiązują: hook na starcie, 2–6 słów w grupie, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem, strefa bezpieczna IG + TikTok. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), dopiero potem zmieniam kod lub rolkę.

## Wytyczne od użytkowniczki *(2026-10-09)*

- **Fonty:** Montserrat 800 i 700, Plus Jakarta Sans 700 i 400, **Plus Jakarta Sans 700 italic tylko na cytaty**.
- **Kolory:** `#230C4A`, `#F8F9FA`, `#2C1651`, `#1A1C1D`, `#D9F99D`.
- **Ten sam zakres co GlowUp Nutrition:** kinetic subtitles z silnika Bisanza i Ameryki oraz dużo przebitek i animacji procesów. Zjawiska, badania i statystyki opieram na researchu, pokazuję je na wykresach z podpisem źródła i mogę wypełnić nimi cały ekran.
- **Logo** — użytkowniczka dorzuci później do `public/Brandings/VitalHormone/`. Do tego czasu nie wstawiam logo i nie piszę nazwy marki jako zastępczej grafiki.
- **Wygląd bliski stronie** vital-hormone.pl. Strefy bezpieczne IG + TikTok.

## Marka *(przegląd strony 2026-10-09)*

- Firma przedstawia się jako „pierwsze w Polsce profesjonalne centrum medyczne testosteronu i terapii TRT”. Działa online: darmowa konsultacja (15 min) → komplet badań w laboratorium w mieście pacjenta → terapia z lekarzem, e-recepta, wizyty kontrolne. Badania są płatne osobno, panel 12 badań kosztuje szacunkowo 300–450 zł.
- **Grupa:** mężczyźni, najczęściej 26–34 lata (na podstawie relacji pacjentów). Zgłaszają zmęczenie, spadek libido, gorszy sen, gorszą koncentrację, przyrost tkanki tłuszczowej albo brak efektów na siłowni.
- **Claimy ze strony:** „Zmęczenie, spadek libido i brak efektów na siłowni to nie »wiek«.” · „Sprawdzamy to badaniami, nie na oko.” · „To nie cykl z siłowni. To uzupełnienie hormonu do poziomu, który powinieneś mieć.” · „Trzy kroki od domysłów do konkretnego planu”.
- **Wróg:** zgadywanie bez badań, „boostery” z apteki, mit „to wiek” i mylenie terapii ze sterydami z siłowni.
- **Ton:** bezpośredni, na „ty”, rzeczowo-medyczny w warstwie merytorycznej. W rolkach odejmuję sprzedażowość strony: **badanie → liczba → decyzja lekarza**, bez straszenia i bez obietnic efektu.
- **CTA ze strony:** „Umów darmową konsultację”, „Zobacz listę badań”, „Rozpocznij terapię”, „Porównaj pakiety”.
- **Język wizualny strony:** jasne tło `#F8F9FA`, lawendowe powierzchnie `#F3F0F9`, ciemnofioletowe sekcje `#230C4A` z limonkowymi akcentami `#D9F99D`, duże zaokrąglenia (karty 24–28 px, przyciski i plakietki jako pigułki), ikony **Material Symbols Outlined** (stethoscope, science, medication, monitor_heart, bolt, favorite, fitness_center, self_improvement), karta „-1% rocznie” na grafice DNA, plakietki „verified” i „Najbardziej intensywny”.

## Compliance — rejestr medyczny (pilnuję w napisach, hookach i grafikach)

Klient jest podmiotem medycznym, a temat to lek na receptę. To surowszy rejestr niż suplementy GlowUp. **Zasady poniżej to moja ostrożna wykładnia. Granice potwierdzam z klientem przed pierwszą publikacją.**

- ❌ **Nie reklamuję leku na receptę** (Prawo farmaceutyczne, art. 57). Nie pokazuję nazw preparatów, dawek, strzykawek, ampułek, żeli ani schematów. Mówię o diagnostyce, procesie i opiece lekarza, a nie o „produkcie”.
- ❌ **Informacja o świadczeniach nie może mieć cech reklamy** (ustawa o działalności leczniczej, art. 14). Pakiety i ceny pokazuję jako fakty ze strony, bez „hitów”, „promocji życia” i presji czasu.
- ❌ **Bez obietnic efektu.** W grafikach nie piszę „więcej energii po 4 tygodniach”, „+X kg mięśni” ani „wrócisz do formy”. Harmonogram 4–6 tygodni i około 3 miesięcy ze strony mogę pokazać tylko jako to, co **zwykle oceniane jest na kontroli**, z dopiskiem „efekty są indywidualne, ocenia lekarz”. Pomijam go, jeśli wypowiedź nie mówi o nim wprost.
- ❌ **Bez zdjęć przed/po i bez cytatów pacjentów o efektach.** Relacje ze strony (Michał, Rafał, Norbert, Tomasz) nie trafiają do grafik. Cytaty kursywą dotyczą procesu („Bez wyników terapia się nie zaczyna”) albo słów samego mówcy.
- ❌ **Bez straszenia:** żadnych czaszek, czerwonych alarmów ani „Twój testosteron umiera”. Objaw → „sprawdź badaniem”.
- ✅ **Wolno:** lista badań, przygotowanie do pobrania, normy laboratoryjne, mechanizmy fizjologiczne ze źródłem, mit/fakt, przebieg współpracy, legalność i nadzór lekarza, ceny pakietów ze strony (sprawdzam je w dniu renderu).
- ⚠️ **Na stronie są dwa różne adresy e-mail:** `kontakt@vitalhormone.pl` w treści i `kontakt@vital-clinic.pl` w danych strukturalnych. Kontakt w CTA potwierdzam z klientem. Domyślnie w CTA daję samo „vital-hormone.pl”.

## Paleta i kontrast (WCAG)

| token | hex | rola |
|---|---|---|
| `violet` | `#230C4A` | marka: ciemne karty, tło pełnoekranowych grafik, tekst na limonce, tekst na jasnych kartach |
| `violet2` | `#2C1651` | druga powierzchnia: wiersze w kartach, druga karta w porównaniu, nieaktywne paski, zakreślacz `hl` |
| `paper` | `#F8F9FA` | jasne karty („wydruk z laboratorium”), tekst na fiolecie |
| `ink` | `#1A1C1D` | tekst na jasnych kartach, cień napisów (zamiast czerni) |
| `lime` | `#D9F99D` | **jedyny akcent:** zakreślacz klucza, aktywny pasek, linia wykresu, wynik na skali, ikony, przycisk CTA. **Maks. ~10% kadru**, nigdy jako tło dużych kart |
| `muted` | `#B9B3C9` *(pochodna)* | opisy i źródła na fiolecie (8,47:1) |
| `muted-l` | `#49454F` *(ze strony)* | opisy na jasnych kartach (8,86:1) |
| `lavender` | `#F3F0F9` *(ze strony)* | wiersze naprzemienne na jasnej karcie |

| para | kontrast | gdzie |
|---|---|---|
| `#F8F9FA` na `#230C4A` | 16,29:1 | treść ciemnych kart, napisy na bloku |
| `#D9F99D` na `#230C4A` | 14,71:1 | liczby-bohaterowie, ikony, wynik |
| `#230C4A` na `#D9F99D` | 14,71:1 | słowo-klucz na zakreślaczu, tekst przycisku CTA |
| `#D9F99D` na `#2C1651` | 13,42:1 | akcent na drugiej powierzchni |
| `#1A1C1D` na `#F8F9FA` | 16,23:1 | jasna karta wyników |
| `#230C4A` na `#F8F9FA` | 16,29:1 | nagłówki na jasnej karcie |

**Zakazane:** limonka na jasnym tle (`#D9F99D` na `#F8F9FA` = 1,11:1) i jakikolwiek limonkowy tekst na jasnej karcie. Na jasnych kartach akcent robię fioletem albo limonkowym **blokiem** z fioletowym tekstem. Limonkowego tekstu nie kładę prosto na wideo, zawsze na fiolecie. Biel `#F8F9FA` z wytycznych zastępuje zakazaną w `frame.md` czystą biel.

## Typografia

- **Montserrat 800** — nagłówki grafik, słowo-klucz w napisach, liczby-bohaterowie, ceny. Zwykły zapis zdaniowy jak na stronie (nie wersaliki), tracking −0,02 em.
- **Montserrat 700** — nagłówki mniejszych kart, nazwy badań, etykiety pakietów.
- **Plus Jakarta Sans 700** — małe słowa w napisach, eyebrow (WERSALIKI, rozstrzelenie 0,12 em), plakietki, CTA.
- **Plus Jakarta Sans 400** — opisy, normy, podpisy źródeł, dopiski „efekty są indywidualne”.
- **Plus Jakarta Sans 700 italic — tylko cytaty** (`quote`): mit w sekcji mit/fakt, zdanie kluczowe mówcy, cytat z wytycznych (np. EAU). Cudzysłów „…” w limonce.
- Pliki: `public/fonts/Montserrat.ttf` (zmienny, już jest). Plus Jakarta Sans leży w `~/Library/Fonts/` (`PlusJakartaSans-VariableFont_wght.ttf`, `-Italic-…`) — przy budowie stylu kopiuję do `public/fonts/` i dopisuję do `FONTS` w `src/fonts.ts`. Polskie znaki sprawdzam na klatce.

## Napisy: kinetic subtitles (styl `vital`)

- **Ruch jak w Ameryce i GlowUp:** blok wsuwa się krótko z `from`, słowa wysuwają się spod maski, gdy padają (krótkie spójniki razem z następnym słowem), `motion` dobierane do sensu, `align` lewo/prawo na przemian przy nowym zdaniu, szybkie wyjście w górę z rozmyciem. **2–5 słów na grupę i `hold` 0,7 s na ostatnim słowie** (te same poprawki co w GlowUp z 2026-10-09).
- **Zakreślacz na całe słowo, zaokrąglony (radius 8–10 px, bliżej pigułki strony niż ostrego 2 px GlowUp):**
  - słowo-klucz: Montserrat 800, **`#230C4A` na limonce `#D9F99D`**;
  - `hl`: Plus Jakarta 700, `#F8F9FA` na `#2C1651`, blok wyskakuje (pop out);
  - liczba i wynik badania w napisie: jak klucz (limonka). Kwota pakietu: `#D9F99D` na `#230C4A`;
  - `effect: "stamp"` tylko przy puencie typu „badaniem, nie na oko” (maks. raz na ~5 s).
- **Małe słowa:** Plus Jakarta 700, `#F8F9FA`, cień z `#1A1C1D`.
- **Pozycja:** środek bloku y = 0,73, a przy karcie na dole napis stoi nad nią (dolna krawędź jak w GlowUp: `yRaised` 0,5, karta do 0,75). Cięcie ciszy włączone.

## Grafiki „jak sekcje strony” (`VitalOverlay`, do zbudowania)

**Dwa rodzaje kart, jak na stronie:**
- **ciemna** — `#230C4A` (92–96% krycia), obrys 1 px `rgba(217,249,157,0.18)`, radius **24 px**, limonkowe akcenty. Domyślna: liczby, procesy, wykresy, pakiety;
- **jasna** — `#F8F9FA`, wiersze `#F3F0F9`, tekst `#1A1C1D`/`#230C4A`, radius 24 px, miękki cień fioletowy. Używam jej, gdy treść „jest dokumentem”: wynik badania, lista badań, checklista przygotowania.
- Bez liquid glass, bo strona go nie używa (wyjątek od `frame.md`). Plakietki to pigułki (radius pełny): limonka z fioletowym tekstem albo fiolet z limonkowym.
- **Ikony:** Material Symbols Outlined, jak na stronie (plik fontu do `public/fonts/` przy budowie stylu), w limonce na fiolecie, w kółku `#2C1651`. Ikona tylko tam, gdzie niesie sens (probówka przy badaniach, stetoskop przy lekarzu, księżyc przy śnie), nigdy jako dekoracja w każdym wierszu.
- **Ruch:** wejście 0,4–0,6 s ze sprężyną o małym przeregulowaniu (miękko, „medycznie”), wiersze kolejno co 80–120 ms, liczby się odliczają, paski i linie się rysują, marker wyniku przesuwa się po skali i robi pop. Wyjście szybsze od wejścia, bez migania.

| type | wygląd | do czego |
|---|---|---|
| `title` | hak u góry: Montserrat 800, 2 linie, fragment `hl` na limonkowym zakreślaczu | pierwsze ~3 s |
| `labs` | jasna karta „wydruk z laboratorium”: wiersze `parametr · wynik · norma`, wchodzą przy `at`, wynik odlicza się; grupy jak na stronie (Profil hormonalny 7 · Bezpieczeństwo 2 · Metabolizm 3) | lista badań, „co sprawdzić” |
| `range` | pozioma skala normy (np. 250–900 ng/dl, zakres jako fioletowy pasek), limonkowy marker wyniku wjeżdża i staje; podpis „norma laboratoryjna orientacyjna” | „masz wynik w normie, a…”, pozycja wyniku w zakresie |
| `steps` | 3 kroki jak na stronie (Konsultacja → Badania → Terapia i prowadzenie): numery w limonkowych kółkach, łączy je linia, która się rysuje | proces współpracy |
| `process` | pełnoekranowa animacja mechanizmu na fiolecie, np. oś podwzgórze → przysadka (LH, FSH) → jądra → testosteron ↔ SHBG / wolny; aromataza → estradiol | fizjologia, „dlaczego badamy LH i SHBG” |
| `line` | wykres w czasie: limonkowa linia rysuje się na fiolecie, wartość w pigułce na końcu, podpis źródła | spadek z wiekiem (tylko ze źródłem) |
| `bars` | poziome paski, wyróżniony limonkowy, reszta `#2C1651`, wartości Montserrat 800 | porównania liczb ze źródła |
| `counter` | liczba-bohater Montserrat 800 w limonce + jednostka w ⅓ wielkości | „30–40%”, „2 pomiary”, „7:00–10:00” |
| `mythfact` | dwie karty: „MIT” — cytat Plus Jakarta italic na `#2C1651`, przekreślany limonkową kreską → „FAKT” — ciemna karta z limonkowym obrysem | sekcja mit/fakt ze strony |
| `quote` | cytat Plus Jakarta 700 italic, limonkowy cudzysłów, podpis Plus Jakarta 400 | zdanie kluczowe, cytat z wytycznych |
| `checklist` | jasna karta, ✓ w limonkowych kółkach (na jasnym: fioletowe kółko z limonkowym ✓) | przygotowanie do badań: rano 7–10, na czczo, bez treningu i alkoholu 24–48 h |
| `price` | karty pakietów: nazwa, „pierwszy miesiąc / kolejne”, cena Montserrat 800, plakietka „Najbardziej intensywny” | gdy mowa o kosztach |
| `cta` | limonkowa pigułka, fioletowy tekst „Umów darmową konsultację →” + „vital-hormone.pl” | koniec rolki |
| `media` (fit `full`) | przebitka na cały kadr, powolny najazd, lekki fioletowy grading (cienie w stronę `#230C4A`), metka Plus Jakarta 400 z limonkową kropką | B-roll |

Dopóki nie ma `VitalOverlay`, nie używam w rolkach Vital wspólnych grafik silnika (pomarańczowy akcent, szkło).

## Research, badania, wykresy *(2026-10-09, jak w GlowUp)*

- **Włączony dla tego klienta.** Gdy pada zjawisko, badanie, norma albo liczba, szukam wiarygodnego źródła i pokazuję dane na wizualizacji (wykres, proces, licznik, skala) z podpisem **„Źródło: …”** (Plus Jakarta 400, `muted`). Źródła z linkami zapisuję w `public/reels/<nazwa>/sources.md`. Grafika może zająć cały ekran, a napisy idą wtedy na wierzchu.
- **Hierarchia źródeł:** wytyczne towarzystw (EAU Guidelines on Sexual and Reproductive Health, Endocrine Society — Bhasin i in. 2018), duże badania kohortowe (np. Massachusetts Male Aging Study, Baltimore Longitudinal Study of Aging), przeglądy na PubMed, potem dane ze strony klienta. Liczby ze strony (np. „-1% rocznie po 30.”, „30–40% zaniżenia wyniku”, norma 250–900 ng/dl) przed pokazaniem **weryfikuję w źródle**. Gdy źródło podaje inną wartość, pokazuję wartość ze źródła i informuję użytkowniczkę.
- Bez liczb, których nie ma w źródle. Dane populacyjne opisuję jako populacyjne, nigdy jako „u Ciebie”.

## Przebitki

- Najpierw materiał klienta, potem Pexels (licencja Pexels). Pliki trafiają do `klienci/vital-hormone/przebitki/`, a źródło do `sources.md`.
- **Dobór:** realni mężczyźni 25–40 lat, naturalne światło, chłodne tony, które da się podciągnąć w stronę fioletu. Bez kiczu stockowego: uśmiechnięty lekarz z kciukiem w górę, nagi tors „przed/po”, strzykawki, ampułki, tabletki, sterydy, szpitalne alarmy.

| temat | kierunek | hasła Pexels |
|---|---|---|
| zmęczenie, koncentracja | mężczyzna przy biurku wieczorem, przecieranie oczu, kawa | `tired man desk night`, `exhausted office` |
| sen | ciemna sypialnia, budzik, bezsenność | `man insomnia dark`, `alarm clock night` |
| siłownia, „brak efektów” | trening siłowy, moody | `gym moody man`, `deadlift dark` |
| badania krwi | probówki, laboratorium, pobranie (bez igły w kadrze na zbliżeniu) | `blood test tubes`, `laboratory samples`, `lab analyzer` |
| rano 7–10, na czczo | poranek, zegar, pusta kuchnia | `morning clock`, `early morning city` |
| konsultacja online | wideorozmowa, laptop, telefon | `video call doctor`, `telemedicine laptop` |
| wyniki, decyzja | kartka z wynikami, wykres na ekranie | `medical report`, `data screen` |
| wiek, „to nie wiek” | mężczyźni 30+ aktywni, bieg o świcie | `man running dawn`, `man 30s portrait` |

## Hook *(PREFERENCJE.md → „Hook na początku rolki”)*

- Typy: **contrarian** („To nie wiek.”), **liczba** („12 badań zamiast zgadywania”), **self-relevance** („Masz 30 lat i ciągle zmęczony?”), **open loop** („Wynik w normie, a jednak…”).
- Bez straszenia, bez obietnicy efektu, bez wykrzykników. Hook nie sugeruje, że każdy zmęczony mężczyzna potrzebuje terapii.

## Strefa bezpieczna (1080×1920)

- Tekst i karty: x 86–930 px, y od 250 px, **dolna krawędź ≤ 1440 px (0,75)** — marka publikuje na IG i TikToku. Liczby, wynik na skali i CTA umieszczam w środku strefy. Twarz zawsze odsłonięta.

## Pliki klienta

- `klienci/vital-hormone/surowe pliki/` — nagrania · `przebitki/` — B-roll · `Render/` — gotowe rolki.
- `public/Brandings/VitalHormone/` — **logo (czeka na pliki):** wersja jasna na fiolet i ciemne kadry, wersja fioletowa na jasne tło, PNG bez tła albo SVG. Logo pokazuję przy CTA i przy wzmiance o marce, zawsze w wersji kontrastowej do tła.
- Overlay `media` czyta pliki z folderu rolki, więc logo i przebitki kopiuję do `public/reels/<nazwa>/`.

## Dane ze strony *(sprawdzone 2026-10-09, ceny przed renderem sprawdzam ponownie)*

**Pakiety:**

| pakiet | start | kolejne | zawiera |
|---|---|---|---|
| Pakiet 1 — TRT | 525 zł (pierwsza wizyta) | 400 zł / wizyta kontrolna | prowadzenie lekarskie |
| Pakiet 2 — TRT + Forma | 775 zł (1. miesiąc) | 600 zł / mies. | + dieta, trening, suplementacja |
| Pakiet 3 — Transformacja („Najbardziej intensywny”) | 990 zł (1. miesiąc) | 800 zł / mies. lub 1990 zł za 3 mies. z góry | + cotygodniowe raporty i korekty |

Badania płatne osobno. Konsultacja wstępna: 15 min, bezpłatna.

**Panel 12 badań (`/badania/`):** profil hormonalny (7): testosteron całkowity, SHBG, testosteron wolny, LH, FSH, estradiol (E2), prolaktyna · bezpieczeństwo (2): morfologia z hematokrytem, PSA całkowity (40+) · metabolizm i narządy (3): lipidogram, próby wątrobowe (ALT, AST), glukoza na czczo. Uzupełniające na zlecenie lekarza: TSH, witamina D3, ferrytyna, HbA1c, kreatynina. Płodność: seminogram, inhibina B.

**Przygotowanie (ze strony, do weryfikacji w źródle przed grafiką):** pobranie 7:00–10:00, bo po 11:00 wynik może być zaniżony · dwa niezależne pomiary testosteronu (wymóg EAU) · posiłek bogaty w węglowodany obniża testosteron na ~2 h · alkohol, ciężki trening i infekcja w ciągu 24–48 h zaburzają wynik · błędy przygotowania mogą zaniżyć wynik o 30–40% · progi kwalifikacji: PSA > 4 ng/ml, hematokryt wyjściowy > 50%.

**Mit / fakt (ze strony):** terapia ≠ sterydy (uzupełnienie do normy fizjologicznej, dawka z wyników) · terapia jest legalna, prowadzona na receptę pod nadzorem lekarza · przerwanie zależy od przyczyny niedoboru · suplementy nie podnoszą testosteronu przy realnym niedoborze.
