# GlowUp Nutrition — preferencje montażu klienta

Zapisano: **2026-10-08**. Strona: [nutriglowup.pl](https://nutriglowup.pl) (sklep Shopify). Styl w silniku: **`glowup`** (`src/styles/glowup.tsx`, zbudowany 2026-10-08 przy rolce `glowup-4`) — trzeci motyw silnika ruchu Bisanza (`kineticCaptions(T)` / `kineticOverlay(T)` z `src/styles/bisanz.tsx`, jak `AMERYKA`) + własne grafiki `GlowupOverlay`, wpis w `STYLES` (`src/Reel.tsx`) i wykrywanie po „glowup-nutrition” w ścieżce (`styleOf` w `scripts/prep.mjs`). Do tego czasu ten plik jest profilem montażowym.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe ogólne zasady obowiązują: 2–6 słów, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), potem zmieniam kod lub rolkę.

## Wytyczne od użytkowniczki *(2026-10-08)*

- **Fonty:** Bebas Neue 400, Poppins 600, Poppins 400.
- **Kolory:** `#FFFFFF`, `#0A0A0A`, `#E63A46`, `#2F1A1B`, `#D4AF36`.
- **Napisy:** kinetic subtitles zbliżone do Świeżej Bryki Ameryki (silnik Bisanza, zakreślacz na całe słowo, zróżnicowane `motion`, `align` na przemian).
- **Animacje skupione na składzie suplementów** — nie „basic”, tylko estetyczne, designerskie, artystyczne sekcje: mały border radius, duże nagłówki, staranna typografia.
- **Animacje cenowe.**
- **Przebitki z Pexels.**
- **Logo marki** — użytkowniczka dorzuci do `public/Brandings/GlowUpNutrition/`.
- **Zdjęcia produktów** — użytkowniczka dorzuci do `public/Brandings/GlowUpNutrition/produkty/`.
- **Wykresy, porównania** i inne grafiki z danymi.
- **Wszystko wyglądem bliskie stronie** nutriglowup.pl.
- **Strefy bezpieczne** Instagram + TikTok (niżej).

## Wytyczne od użytkowniczki *(2026-10-09)*

- **Produkt na ekranie, gdy pada jego nazwa.** Gdy w rolce pada nazwa produktu z nutriglowup.pl (NA SERCE, DRIVE, BALANCE, SHIELD, REST, MIND, SYNAPSE, ZEN, shaker), pokazuję ten produkt na ekranie: grafika `product` (zdjęcie butelki ze smugą, nazwa Bebas, plakietka ze składem lub dawką). **Trzyma się dłużej niż sama wzmianka:** od słowa do co najmniej 3 s po nim, a gdy mowa dalej o tym produkcie, do końca tego fragmentu (wydłużam `end` ręcznie). Kolejny produkt zastępuje poprzedni, nigdy dwie karty naraz. Plakietka tylko skład/dawka, nigdy działanie (compliance).
- **Zdjęcia produktów:** `klienci/glowup-nutrition/produkty/` (PNG bez tła: `na-serce`, `drive`, `balance`, `shield`, `rest`, `mind`, `synapse`, `zen`, `shaker`). Katalog nazw, plakietek i wariantów zapisu: `produkty/produkty.json`.
- **Automat w prep:** `npm run reel` dla nagrania z `klienci/glowup-nutrition/` czyta `produkty.json`, poprawia przekręcone przez transkrypcję nazwy (np. „szild” → SHIELD, „drajw” → DRIVE, „glołap” → GlowUp), kopiuje zdjęcia do folderu rolki i sam dokłada karty `product`. Przy redakcji i tak sprawdzam nazwy ze słuchu: gdy ASR przekręcił nazwę w nowy sposób, poprawiam ją w napisach **i dopisuję ten wariant do `aliases` w `produkty.json`**, żeby następnym razem poprawił się sam. **„Na serce” i „balans/balance” zawsze traktuję jako produkt** (NA SERCE, BALANCE) i wstawiam kartę — u GlowUp te słowa padają prawie wyłącznie o produktach; wyjątek tylko, gdy użytkowniczka zgłosi go w poprawce rolki. *(2026-10-09)*
- **Więcej przebitek i wizualizacji.** Gdzie się da: przebitki (Pexels, zdjęcia produktów), animacje pokazujące działanie procesu (np. standaryzacja ekstraktu, droga składnika, synteza Q10 z wiekiem) i wykresy.
- **Zjawisko, badanie, statystyka → research + wizualizacja ze źródłem.** Gdy pada nazwa zjawiska (np. francuski paradoks), badanie albo liczba, szukam w internecie wiarygodnego źródła (PubMed, EFSA, WHO, GUS, publikacje recenzowane), biorę z niego dokładne dane i robię z nich wizualizację: wykres, animację procesu, licznik, porównanie — co pasuje. **Zawsze podpis ze źródłem** (Poppins 400, `#A0A0A0`, np. „Źródło: EFSA 2010”), a źródło z linkiem zapisuję w `public/reels/<nazwa>/sources.md`. Takie grafiki mogą iść **na cały ekran** (karta przykrywa wideo), z napisami na wierzchu. Compliance dalej obowiązuje: badanie mówi o składniku, nie o produkcie GlowUp; bez liczb, których nie ma w źródle.

## Wytyczne od użytkowniczki *(2026-10-09, po poprawce `glowup-4`)*

- **Zdjęcie produktu pod lekkim kątem, ogromne, wychodzi poza kartę.** Butelka jest duża (wyższa niż karta), wystaje poza jej ramkę (góra i bok) — designersko, jak wycinek z sesji. Pochylenie ~8° **od strony tekstu**: tekst (nazwa, opis) po prawej → produkt pochylony w lewo; tekst po lewej (`flip: true`) → produkt pochylony w prawo.
- **Cień na zdjęciach produktów.** Każde zdjęcie produktu ma wyraźny, miękki cień: rzucony w stronę przeciwną do pochylenia (butelka w lewo → cień w prawo i w dół) + cień kontaktowy (elipsa) pod podstawą butelki. Cień ciemny `#0A0A0A`/czerń, rozmyty, bez twardych krawędzi — produkt ma „stać” na karcie i odcinać się od wideo.
- **Produkt niżej i w ruchu** *(2026-10-09, 3. poprawka)*: wielkość i pochylenie butelki zostają, ale butelka stoi **~10% kadru niżej** (wystaje teraz dołem i bokiem karty). Wejście: **pop out** ze sprężyną, zaraz po nim gasnący **wiggle**, a potem przez cały czas **subtelne kołysanie** (±1,3°, lekkie unoszenie ~6 px) — produkt nigdy nie stoi martwo.
- **Ostatnie słowo grupy trzyma się dłużej.** Słowa wjeżdżają, gdy padają, więc ostatnie słowo grupy było widać ułamek sekundy, zanim wjeżdżała następna. Teraz ostatnie słowo stoi **min. 0,7 s** (`"hold": 0.7` w reel.json, prep wpisuje go sam dla `glowup`); następna grupa wjeżdża chwilę później, a jej słowa, które już padły, pokazują się od razu.
- **Napisy dłużej na ekranie: 2–5 słów na sekwencję**, nie po 1–2. Krótkie kawałki („to ściema.”, „bor.”, „Po trzecie,”) łączę z sąsiednią grupą, jeśli razem mieszczą się w 5 słowach. Prep dla stylu `glowup` tnie grupy po max 5 słów, a przecinek/pauza zamyka grupę dopiero od 3 słów.
- **Logo przy każdej nazwie marki.** Gdy na grafice ma się pojawić napis „GlowUp” / „GlowUp Nutrition” (eyebrow karty produktu, nagłówek składu, CTA) albo marka pada w wypowiedzi — pokazuję **logo** zamiast tekstu. Pliki: `klienci/glowup-nutrition/logo/` — **`logo-white.png` na ciemnym tle** (czarne karty, ciemne wideo), **`logo-black.png` na jasnym tle** (białe tło, jasne kadry). Zawsze wersja z kontrastem do tego, co pod spodem. Prep sam dokłada grafikę `logo` przy wzmiance o marce.

## Marka *(skill `glowup-nutrition` + przegląd strony 2026-10-08)*

- Polska marka suplementów, produkcja w Polsce, sprzedaż D2C. **Pełne, zdeklarowane dawki ze standaryzowanych ekstraktów; etykietę można sprawdzić i porównać.**
- Claim: **„PEŁNE DAWKI. JAWNE SKŁADY.”** Plakietki: STANDARYZOWANE EKSTRAKTY · JAWNE DAWKI NA ETYKIECIE · PRODUKCJA W POLSCE. CTA ze strony: „DOBIERZ SWÓJ PROTOKÓŁ →”, „Zobacz pełne składy”, „Porównaj sam”.
- Grupa: 30+ i 40+, suplementacja długofalowa, czytają etykiety, porównują standaryzację; przy DRIVE mężczyźni trenujący siłowo. Ambasador: Kamil Kozłowski, zawodnik HYROX PRO.
- Wróg: „proprietary blend”, mieszanki o nieujawnionym składzie, mikro-dawki dla długości etykiety, ekstrakty bez standaryzacji.
- **Ton:** ekspercki, rzeczowy, liczba przed emocją. Krótkie zdania, zero hype’u, wykrzykników, „rewolucyjny”, „przełomowy”. Marka nie obiecuje — pokazuje dawkę i mówi „porównaj sam”. Chwyt: **kontekst historyczny lub naukowy → konkretna liczba → zaproszenie do weryfikacji** (Dioskurides i ostropest, francuski paradoks i resweratrol, dieta śródziemnomorska i Na Serce).
- Język wizualny opakowań i sesji: czarne butelki, **halftone z czerwonych kwadratów** schodzących gradientem, **motion blur** (butelka w ruchu, smugi, przechyły), rozbłysk proszku podświetlony kontrowo, linia EKG w czerwieni przy Na Serce, grawiura serca z rastrem, twarde światło boczne/kontrowe, wysoki kontrast. Bez ikon stockowych, emoji i gradientowych teł.

## Compliance — twarde zasady (pilnuję w napisach i grafikach)

Rolka na profilu marki = reklama (rozp. WE 1924/2006).

- ✅ Wolno: skład, dawka, standaryzacja, forma surowca, część rośliny, pochodzenie, cena, logistyka, fakty biochemiczne **bez przypisania efektu produktowi** („L-tyrozyna jest prekursorem katecholamin”, „własna synteza Q10 spada po 30. roku życia”).
- ✅ Jedyne zatwierdzone oświadczenie: **cynk** (15 mg w DRIVE) „przyczynia się do utrzymania prawidłowego poziomu testosteronu we krwi” (także płodność, odporność, ochrona komórek przed stresem oksydacyjnym) — dosłownie i przypisane do cynku, nie do produktu.
- ⚠️ Ashwagandha (napięcie, relaks, sen) — oświadczenia on hold. Nigdy jako nagłówek ani grafika.
- ❌ Żadnego działania przypisanego produktowi: „Na Serce” to nazwa handlowa. Zero „wspiera / poprawia / obniża / podnosi / wzmacnia” z nazwą produktu. **Opisy produktów w sklepie zawierają takie sformułowania („obniżyć kortyzol”, „odbudowuje komórki wątroby”, „sprzymierzeniec prawidłowego ciśnienia”) — nie przenoszę ich do rolek.** Gdy padają w wypowiedzi, zostawiam w napisach 1:1 tylko po pytaniu użytkowniczki; w grafikach nigdy.
- ❌ Opinia Kamila ze strony (testosteron, tętno, efekty po miesiącu) nie trafia do grafik; wolno sam fakt współpracy.
- **Promocje (dyrektywa Omnibus):** przy przekreślonej cenie lub „-15%” zawsze dopisek Poppins 400 „Najniższa cena z 30 dni przed obniżką: X zł”. **Ceny sprawdzam na nutriglowup.pl w dniu renderu.**
- **Porównania z konkurencją:** bez nazw marek i bez liczb „typowego suplementu” bez źródła. Porównuję mechanizm (dawka zdeklarowana vs. nieujawniona, ekstrakt standaryzowany vs. proszek), a liczby tylko z etykiety GlowUp albo ze źródła podanego przez użytkowniczkę.

## Paleta i kontrast (WCAG)

Tokeny strony (z CSS, 2026-10-08): tło `#0A0A0A`, karty `#141414`/`#1C1C1C` z obrysem `#3D3D3D`, tekst `#F5F5F0`, opisy `#A0A0A0`, akcent `#E63A46`, **ceny w złocie `#D4AF37`** (klasa `price-tone--gold`), radius **4 px** (karty, przyciski) i **2 px** (plakietki).

| token | hex | rola |
|---|---|---|
| `black` | `#0A0A0A` | tło kart i sekcji, tekst na złotym, cień napisów |
| `white` | `#FFFFFF` | nagłówki, napisy, tekst na czerwonym (czysta biel z wytycznych — zakaz `#FFF` z `frame.md` tu nie obowiązuje) |
| `red` | `#E63A46` | jedyny akcent: zakreślacz klucza, eyebrow, plakietki dawek, dawki „500 MG”, aktywny pasek, linia EKG, przycisk CTA. **Najwyżej ~8% kadru** |
| `wine` | `#2F1A1B` | ciemna, czerwonawa powierzchnia: zakreślacz `hl`, druga karta w porównaniu, nieaktywne paski, tło halftone |
| `gold` | `#D4AF36` | **tylko ceny** (jak na stronie): kwoty, cena za dzień, cena zestawu |
| `muted` | `#A0A0A0` | opisy i formy surowca na kartach (ze strony) |
| `line` | `rgba(255,255,255,0.10)` | obrys kart 1 px, linie podziału w tabelach składu |

| tekst na tle | kontrast | gdzie |
|---|---|---|
| `#FFFFFF` na `#0A0A0A` | 19,80:1 | nagłówki, treść kart |
| `#FFFFFF` na `#2F1A1B` | 16,35:1 | akcent `hl`, druga karta |
| `#D4AF36` na `#0A0A0A` | 9,41:1 (AAA) | ceny na kartach |
| `#0A0A0A` na `#D4AF36` | 9,41:1 (AAA) | cena w napisie (złoty zakreślacz) |
| `#D4AF36` na `#2F1A1B` | 7,77:1 (AAA) | cena na bordowej karcie |
| `#A0A0A0` na `#0A0A0A` | 7,57:1 | opisy |
| `#E63A46` na `#0A0A0A` | 4,77:1 (AA) | eyebrow, dawki, plakietki |
| `#FFFFFF` na `#E63A46` | 4,15:1 (AA dla dużego tekstu) | **tylko duży tekst** ≥ 48 px: klucz Bebas, przycisk CTA |

**Zakazane pary:** biel na złotym (2,10:1), złoto na czerwonym (1,97:1), czerwony drobny tekst na `#2F1A1B` (3,94:1), złoty lub czerwony tekst prosto na wideo (zawsze na bloku albo karcie).

## Typografia

- **Bebas Neue 400** — nagłówki sekcji, słowo-klucz w napisach, liczby, dawki, nazwy produktów, ceny. Zawsze WERSALIKI. Tylko 400 (strona miejscami pogrubia sztucznie — nie powielam). Rozstrzelenie: nagłówki +0,02–0,05 em, nazwy produktów +0,04 em. Polskie znaki w pliku są komplet (sprawdzone 2026-10-08). Plik: `public/fonts/BebasNeue-Regular.ttf`.
- **Poppins 600** — małe słowa w napisach, eyebrow (WERSALIKI, czerwony, rozstrzelenie 0,15 em), plakietki dawek, CTA.
- **Poppins 400** — opisy i forma surowca na kartach (`#A0A0A0`), dopiski prawne (Omnibus), metki przebitek.
- **Skala jak na stronie:** ogromny kontrast — nagłówek Bebas 150–220 px przy eyebrow 26–30 px; liczba-bohater nawet 300+ px z jednostką „MG” w ⅓ wielkości. Bebas jest wąski: przy tej samej szerokości bloku daję mu ~1,25× wysokość klucza Poppins z Ameryki.

## Napisy: kinetic subtitles (styl `glowup`)

- **Ruch jak w Ameryce:** blok wsuwa się krótko z `from`, słowa wysuwają się spod maski, gdy padają (krótkie spójniki z następnym słowem), różne `motion` dobierane do sensu, `align` lewo/prawo na przemian przy nowym zdaniu, szybkie wyjście w górę z rozmyciem.
- **Zakreślacz na całe słowo, radius 2 px:**
  - słowo-klucz: Bebas Neue 400 WERSALIKI, **biały na czerwonym `#E63A46`**;
  - `hl`: Poppins 600 biały na `#2F1A1B`, blok wyskakuje (pop out) jak bordo w Ameryce;
  - **kwota w napisie:** `#0A0A0A` na złotym `#D4AF36` (złoto = cena, tak jak na stronie);
  - `effect: "stamp"`: czerwony blok wskakuje od razu z przechyłem (puenta, najwyżej raz na ~5 s).
- **Małe słowa:** Poppins 600, biel, cień z `#0A0A0A`.
- **Pozycja:** środek bloku y = 0,73, przy karcie na dole dolna krawędź y = 0,63 (jak Ameryka/SkyClass).
- **Cięcie ciszy:** jak w stylach ogólnych (włączone).

## Grafiki: „sekcje jak na stronie” (`GlowupOverlay`, do zbudowania)

**Anatomia sekcji (odwzorowana z „ANATOMIA FORMUŁY” na stronie):** eyebrow Poppins 600 w czerwieni → duży nagłówek Bebas w bieli → opis Poppins 400 w `#A0A0A0` → plakietka dawki (obrys 1 px `#E63A46`, wypełnienie `rgba(230,57,70,0.12)`, tekst czerwony WERSALIKAMI, radius 2 px, np. „500 MG W PORCJI DZIENNEJ”) → nazwa składnika (Bebas) → forma i standaryzacja (Poppins 400).

**Karty:** płaska matowa czerń `#0A0A0A` (92–96% krycia na wideo), obrys 1 px `line`, **radius 4 px**, bez liquid glass (strona nie używa szkła — tu wyjątek od `frame.md`). Linie podziału 1 px zamiast ramek wokół każdego wiersza. Dużo powietrza, siatka z wyrównaniem do lewej krawędzi.

**Ozdobniki marki (z umiarem, najwyżej jeden na grafikę):** halftone z czerwonych kwadratów schodzący gradientem w rogu karty; cienka czerwona linia pod nagłówkiem, która się rysuje; linia EKG rysowana przy Na Serce; smuga motion blur przy wjeździe zdjęcia butelki.

**Ruch:** wejście 0,4–0,6 s, wygaszanie wykładnicze (ease-out expo), krótki wjazd z rozmyciem ruchu (motion blur marki), wiersze kolejno co 80–120 ms, liczby odliczają się, linie i paski rysują się, bez sprężynowania w stylu cartoon i bez ciągłego migania. Wyjście szybsze od wejścia.

| type | wygląd | do czego |
|---|---|---|
| `formula` | karta „ANATOMIA FORMUŁY”: nagłówek z nazwą produktu, wiersze `nazwa składnika (Bebas, biel) · dawka (Bebas, czerwień)` rozdzielone linią 1 px, wchodzą przy `at`, dawki odliczają się; na dole suma „RAZEM 1100 MG” | pokazywanie składu |
| `dose` | składnik-bohater: liczba Bebas 300+ px („500” + „MG”), plakietka „W PORCJI DZIENNEJ”, nazwa składnika, forma surowca Poppins 400 | jeden składnik w centrum uwagi |
| `standard` | standaryzacja jako działanie: „200 MG × 70% = 140 MG SYLIMARYNY” — pasek ekstraktu wypełnia się czerwoną frakcją aktywną, liczba wyniku odlicza się | 98% trans-resweratrolu, 70% sylimaryny, 5% / 10% witanolidów, 20% polisacharydów |
| `price` | cena złotym Bebas z odliczaniem + „ZŁ”; warianty: **cena za dzień** („3,63 ZŁ / DZIEŃ”), **promocja** (stara cena przekreślona czerwoną kreską, nowa w złocie, plakietka „-15%” biała z czerwonym tekstem jak na stronie, dopisek Omnibus), **zestaw** („KUPOWANE OSOBNO 238 ZŁ → PROTOKÓŁ 199 ZŁ”) | animacje cenowe |
| `bars` | poziome paski na czarnej karcie, wyróżniony pasek czerwony, reszta `#2F1A1B`, wartości Bebas przy końcu paska, bez osi i siatki | porównanie dawek (np. Na Serce 500/500/100/100 mg) |
| `ring` | cienki pierścień, łuk czerwony, procent Bebas w środku, etykieta Poppins 600 | procent standaryzacji |
| `line` | linia rysuje się w czerwieni, wartość w pigułce przy końcu; wariant EKG jako ozdobnik | dane w czasie (tylko ze źródłem) |
| `compare` | dwie karty obok siebie: lewa `#0A0A0A` przygaszona („MIESZANKA BEZ DAWEK”, przekreślane punkty), prawa `#2F1A1B` z czerwonym obrysem („GLOWUP”, dawki w czerwieni) | „zamiast X — Y”, jawne vs. ukryte |
| `list` | numery „01” Bebas w czerwieni, treść Bebas w bieli, linie 1 px, wiersze przy `at` | protokoły, kroki stosowania, logistyka |
| `title` | hak u góry: Bebas 150–220 px w dwóch liniach, jedno słowo lub fragment `hl` w czerwieni (jak „PEŁNE DAWKI. JAWNE SKŁADY.”), eyebrow nad nim | pierwsze ~3 s |
| `product` *(zbudowany 2026-10-09)* | czarna karta: zdjęcie butelki (`src`) wjeżdża ze smugą motion blur i przechyłem, eyebrow „GLOWUP”, nazwa Bebas (`text`), plakietka (`label`), halftone w rogu | wzmianka o produkcie (prep dodaje sam) |
| `cta` | eyebrow + czerwony przycisk radius 4 px, Bebas biały „DOBIERZ SWÓJ PROTOKÓŁ →” + „nutriglowup.pl” Poppins 400 | koniec rolki |
| `media` (fit `full`) | przebitka na cały kadr, powolny najazd, korekcja w stronę czerni (kontrast, lekka desaturacja), metka Poppins 400 z czerwoną kropką | B-roll z Pexels |

Do czasu zbudowania `GlowupOverlay` nie używam wspólnych grafik silnika (pomarańczowy akcent, szkło) w rolkach GlowUp.

## Strefa bezpieczna (1080×1920)

- Tekst i karty: x 86–930 px (8% marginesu z lewej, prawy pas przycisków wolny), y od 250 px (0,13), **dolna krawędź kart i napisów ≤ 1440 px (0,75)** — marka idzie na TikTok i Instagram, więc trzymam wspólną strefę.
- Duże nagłówki Bebas łamię tak, by mieściły się w 844 px szerokości; dłuższe nazwy (np. „PROTOKÓŁ: DŁUGOWIECZNOŚĆ”) zmniejszam, nie wypycham za krawędź.
- Najważniejsze (cena, dawka, CTA) w środku strefy, nie przy brzegu. Twarz zawsze odsłonięta.

## Produkty i składy *(sprawdzone na nutriglowup.pl 2026-10-08)*

| Produkt | Cena regularna | Opakowanie | Porcja dzienna | Skład porcji (forma, standaryzacja) | Cena za dzień |
|---|---|---|---|---|---|
| GLOW UP \| NA SERCE | 109 zł | 60 kaps. / 30 dni | 2 kaps. | ekstrakt z czosnku 500 mg (bulwa, *Allium sativum*) · ekstrakt z pestek grejpfruta 500 mg (koncentrat bioflawonoidów, *Citrus paradisi*) · trans-resweratrol 98% 100 mg (ekstrakt z korzenia rdestowca japońskiego) · koenzym Q10 100 mg (ubichinon) — razem 1100 mg | 3,63 zł |
| GLOWUP \| DRIVE | 129 zł | 120 kaps. / 60 dni | 2 kaps. | L-tyrozyna 500 mg · ekstrakt z ashwagandhy 100 mg (10% witanolidów) · cynk 15 mg (150% RWS) · bor 3 mg | 2,15 zł |
| GLOW UP \| BALANCE | 109 zł | 100 kaps. / 100 dni | 1 kaps. | ashwagandha KSM-66® 200 mg, tylko korzeń, standaryzacja 5% witanolidów = 10 mg | 1,09 zł |
| GLOW UP \| SHIELD | 89 zł | 60 kaps. / 60 dni | 1 kaps. | ekstrakt z nasion ostropestu plamistego 200 mg, standaryzacja 70% = 140 mg sylimaryny | 1,48 zł |
| GLOWUP \| REST | 69 zł | 100 kaps. / 100 dni | 1 kaps. | L-tryptofan 500 mg, 30–60 min przed snem | 0,69 zł |
| GLOWUP \| MIND *(nowość)* | 99 zł | 50 ml płynu / 50 dni | 1 ml (pipeta) | ekstrakt z owocników soplówki jeżowatej (*Hericium erinaceus*) DER 10:1, 200 mg, min. 20% polisacharydów = 40 mg | 1,98 zł |
| GLOWUP \| SYNAPSE *(nowość)* | 99 zł | 50 ml płynu / 50 dni | 1 ml (pipeta) | ekstrakt z chagi (*Inonotus obliquus*, błyskoporek podkorowy) DER 10:1, 200 mg, min. 20% polisacharydów = 40 mg | 1,98 zł |
| GLOWUP \| ZEN *(nowość)* | 99 zł | 50 ml płynu / 50 dni | 1 ml (pipeta) | ekstrakt z owocników reishi (*Ganoderma lucidum*, lakownica żółtawa) DER 10:1, 200 mg, min. 20% polisacharydów = 40 mg | 1,98 zł |

- Kapsułki roślinne HPMC, bez żelatyny, laktozy i glutenu. MIND, SYNAPSE i ZEN to **płyny z pipetą** (gliceryna roślinna, woda; ekstrakcja wodno-glicerynowa), nie kapsułki — ważne przy doborze przebitek i zdjęć.
- Promocje w dniu zapisu: BALANCE 92,65 zł, SHIELD 75,65 zł, SYNAPSE i ZEN 84,15 zł (-15%; najniższa cena z 30 dni przed obniżką = cena regularna).

**Protokoły (zestawy):**

| Protokół | Cena zestawu | Kupowane osobno (regularnie) | Produkty |
|---|---|---|---|
| Pełna Optymalizacja | 429 zł | 505 zł | DRIVE · SHIELD · BALANCE · REST (+ 109 zł różnicy wobec System 24/7 — **skład do potwierdzenia**) |
| System 24/7 | 349 zł | 396 zł | DRIVE · SHIELD · BALANCE · REST |
| Żelazny Fundament | 289 zł | 337 zł | DRIVE · SHIELD · BALANCE (suma cen daje 327 zł — **do potwierdzenia**) |
| Tarcza Ochronna | 259 zł | 307 zł | NA SERCE · SHIELD · BALANCE |
| Dzień / Noc | 199 zł | 238 zł | DRIVE · BALANCE |
| Długowieczność (Longevity) | 169 zł | 198 zł | NA SERCE · SHIELD |
| Nocny Reset | 149 zł | 178 zł | BALANCE · REST |

**Logistyka:** wysyłka tego samego dnia przy zamówieniu do 13:00, dostawa 24–48 h, darmowa od 200 zł, zwrot 14 dni, odpowiedź w 24 h w dni robocze.

## Przebitki z Pexels

- Pobieram z [pexels.com](https://www.pexels.com) (licencja Pexels, bez znaków wodnych), pliki do `klienci/glowup-nutrition/przebitki/`, źródło i link zapisuję w `public/reels/<nazwa>/sources.md`.
- **Dobór pod markę:** ciemne, twarde światło, wysoki kontrast, czerń w kadrze; w montażu przyciemniam i lekko desaturuję w stronę palety. Bez kiczu stockowego (uśmiechnięci ludzie z tabletką, biały fartuch, szklanki z kolorowym napojem), bez kadrów sugerujących efekt zdrowotny (ciśnieniomierz, szpital).
- Najpierw zdjęcia produktów i materiał klienta, potem Pexels.

| Temat wypowiedzi | Kierunek przebitki | Hasła na Pexels |
|---|---|---|
| Na Serce: czosnek, grejpfrut, resweratrol, Q10 | czosnek na czarnym tle, przekrojony grejpfrut, winogrona w kontrze | `garlic dark`, `grapefruit dark`, `grapes dark moody` |
| SHIELD: ostropest | ostropest plamisty, nasiona | `milk thistle`, `thistle flower` |
| BALANCE, DRIVE: ashwagandha | korzeń, proszek | `ashwagandha root`, `herbal powder dark` |
| DRIVE: trening | trening siłowy, HYROX, sztanga, ciemna siłownia | `gym dark`, `weightlifting moody`, `rowing machine` |
| REST: sen | noc, ciemna sypialnia, wyciszenie | `night bedroom dark`, `sleeping dark` |
| MIND / SYNAPSE / ZEN: grzyby | soplówka, chaga na brzozie, reishi, pipeta z kroplą | `lions mane mushroom`, `chaga birch`, `reishi`, `dropper dark` |
| standaryzacja, produkcja | laboratorium, pomiar, kapsułki | `laboratory dark`, `capsules black background` |
| historia (Dioskurides, francuski paradoks, dieta śródziemnomorska) | grawiury, stare zielniki, śródziemnomorski stół | `ancient manuscript herbs`, `mediterranean food dark` |

## Pliki klienta

- `klienci/glowup-nutrition/surowe pliki/` — nagrania do montażu.
- `klienci/glowup-nutrition/przebitki/` — przebitki z Pexels.
- `klienci/glowup-nutrition/Render/` — gotowe rolki.
- `public/Brandings/GlowUpNutrition/` — **logo (czeka na pliki):** najlepiej biała wersja na ciemne tło + wersja czerwona lub czarna, PNG bez tła albo SVG. Logo pokazuję przy CTA na końcu i przy wzmiance o marce.
- `klienci/glowup-nutrition/produkty/` — **zdjęcia produktów** (PNG bez tła: `na-serce`, `drive`, `balance`, `shield`, `rest`, `mind`, `synapse`, `zen`, `shaker`) + `produkty.json` (nazwy, plakietki, warianty z transkrypcji). Każdą grafikę z etykietą sprawdzam znak po znaku z tabelą składów.
- Overlay `media` czyta pliki z folderu rolki — potrzebne logo i zdjęcia kopiuję do `public/reels/<nazwa>/`.

## Ustalenia z montażu *(2026-10-08, rolka `glowup-4`)*

- **Karty stoją dolną krawędzią na 0,75**, a napis nad kartą ma dolną krawędź 0,5 (`yRaised`), bo przy 0,63 nad kartą zostawało za mało miejsca na skład w strefie TikToka.
- **Nagrania mogą mieć wypalone grafiki** (hak u dołu, zdjęcie produktu z „NUTRIGLOWUP.PL”). Napisy w tych fragmentach przenoszę na y ≈ 0,42 (nad grafiką, pod twarzą). Wypalony hak zastępuje mój `title`.
- Zbudowane typy: `list` (anatomia formuły: `badge` = dawka, `sub` = forma; `mark: "flow"` = łańcuch A → B → C), `counter` (liczba-bohater z halftone), `bars`, `cta`. Reszta jeszcze z silnika Bisanza.
- SFX: `pop.mp3` przy wejściu kart, `sfxVolume` 0,5 (~11 dB pod głosem).

## Poprawka rolki `glowup-4` *(2026-10-09)*

- Dodane: przebitki z Pexels (pomiar pasa, laboratorium; podkolorowane w stronę czerni), pełnoekranowa animacja procesu `process` (testosteron → aromataza → estrogen), wykres obwodu pasa z badania BACH na cały kadr (`bars` + `dim`), podpisy źródeł na kartach z danymi (`source`), karty produktu DRIVE.
- **Wypalona w nagraniu biała ramka ze zdjęciem produktu** (od wzmianki o DRIVE do końca) — przykrywam ją kartą `product`/`list` z `h: 0.32`, `y: 0.685` (pełne krycie czerni, bez prześwitu).
- Hak „90% boosterów… nie działa!” jest wypalony w nagraniu, a góra kadru to twarz — drugiego hooka nie dokładam.
- Źródła i przebitki: `public/reels/glowup-4/sources.md`.
