# Świeża Bryka Ameryka — preferencje montażu klienta

Zapisano: **2026-10-07**. Strona: [swiezabrykaameryka.pl](https://swiezabrykaameryka.pl). Styl w silniku: **`ameryka`** (`src/styles/ameryka.tsx`: motyw silnika ruchu Bisanza, napisy `Ameryka` i grafiki `AmerykaOverlay`). Prep sam wybiera ten styl, gdy nagranie leży w `klienci/swieza-bryka-ameryka/…`.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe ogólne zasady obowiązują: 2–6 słów, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), potem zmieniam kod lub rolkę.

## Wytyczne od użytkowniczki *(2026-10-07)*

- **Kolory:** złoto `#B79154`, czerń `#020203`, bordo `#651E1E`.
- **Fonty:** Poppins 900, 600 i 400.
- **Napisy:** kinetic subtitles i wyróżnienia słów jak u Bisanza, ale **wyróżnienie obejmuje całe słowo** (zakreślacz pod całym wyrazem), a nie kreskę na dole.
- **Kontrast ma się zgadzać** w każdej klatce (tabela niżej).
- **Zakreślacz:** słowo-klucz na złotym, akcenty `hl` na bordo.

- **Nazwy modeli aut piszę poprawnie** (ASR przekręca: „cipa grant siroki” → **Jeep Grand Cherokee**). Przy wątpliwości pytam o model. *(2026-10-08)*
- **Gotowe nagrania ze scenkami:** gdy użytkowniczka prosi „bez przebitek”, nie dodaję żadnego B-rollu; logo i karty z danymi zostają. Napisy omijają tekst wypalony w nagraniu (pole `y` grupy). *(2026-10-08)*
- **Kinetic subtitles bardziej zróżnicowane, ale uporządkowane:** różne animacje wejścia słów (pole `motion`: wysuw z dołu, opad z góry, wjazd z boku z rozmyciem, pop, litera po literze), dobierane do sensu. Bloki zawsze wyjustowane do lewej albo do prawej (`align`), na przemian przy nowym zdaniu; nigdy losowe rozmieszczenie. Pozycja jak dotąd. *(2026-10-08)*
- **Hak tekstem na start:** w pierwszych ~3 s rolki-scenki zamiast napisów tytuł na ekranie (np. „Christoff zamawia Jeepa Grand Cherokee z USA”). *(2026-10-08)*
- **Imię Krzyśka w scenkach: „Christoff”** (nie „Chris”). Dane auta z karty sprawdzam z obrazem: felgi Jeepa są srebrne, czarny jest lakier auta. *(2026-10-08)*
- **Akcent bordo (`hl`) cięższy i z popem:** słowo na bordo ma wagę o 200 wyższą od małych słów (Poppins 800 zamiast 600), a zakreślacz nie przejeżdża od lewej, tylko wyskakuje (pop out: blok rośnie sprężyście z lekkim przestrzeleniem i przechyłem). Złoty klucz zostaje bez zmian. *(2026-10-08)*
- **Wyliczanki po amerykańsku, typograficznie:** listy (np. specyfikacja auta, etapy, koszty) nie stoją na zwykłej ciemnej karcie. Każdy punkt to pas jak pas flagi USA (na przemian czerń i bordo) wjeżdżający od lewej, ze złotą gwiazdką, która wyskakuje z obrotem, numerem `01` w złocie i treścią WERSALIKAMI Poppins 900 w kremie. Nad listą rząd złotych gwiazdek, które zapalają się po kolei, opcjonalnie z etykietą `title`. Kontrast: krem na czerni 18,7:1, krem na bordo 10,8:1. *(2026-10-08)*

- **Auto z przebitek przy wzmiance, cła z researchem *(2026-10-19, rolka „import tesla z usa”)*:** gdy w wypowiedzi pada model auta, którego zdjęcie leży w `klienci/swieza-bryka-ameryka/przebitki/`, pokazuję je w chwili wzmianki (przezroczysty PNG → `media` z `fit: "overlay"`: czarna karta ze złotą krawędzią, auto wjeżdża z prawej i hamuje, metka z modelem). Gdy mowa o cłach, akcyzie lub VAT przy imporcie, szukam źródła (rozporządzenie UE, ustawa) i pokazuję animację wyjaśniającą jako tabelę stawek z podpisem „Źródło: …”, a linki zapisuję w `sources.md` rolki. Zamiast „zero cła” bez kontekstu podaję warunek, np. auto wyprodukowane w USA, od 1.07.2026, i to, co zostaje (VAT).

- **SFX przy cenach i popupach, dolary, napisy wyżej *(2026-10-20, poprawka rolki „import tesla z usa”)*:** przy kwotach dźwięk kasy (cash register) i subtelny wysyp dolarów wokół napisu z ceną (złote „$” i małe banknoty w kremie ze złotą ramką, krótko, bez zasłaniania twarzy i liczby); przy wejściach grafik, kart i tytułu krótki pop. Kasa najmocniej przy kluczowych cenach, przy powtórzeniach lżej albo bez dźwięku. Wszystkie SFX ok. 10 dB pod mową (pomiar względem fragmentu). **Napisy wyżej:** środek bloku y = 0,62 zamiast 0,73 — poprzednia pozycja była za nisko.

- **Odprawa w Holandii, VAT 21% *(2026-10-20, poprawka rolki „import tesla z usa”)*:** auta z USA odprawiamy w Holandii, więc w grafikach i opisach VAT przy imporcie to **21%** (stawka holenderska), a nie polskie 23%. Przy rozpisce opłat piszę „odprawa w Holandii”.

- **Rolka „kredyt-import” *(2026-10-24)*:** bez logo, zdjęć i przebitek, same napisy, animacje i wizualizacje. Użytkowniczka zatwierdziła w grafice „90 dni na znalezienie auta” i „oprocentowanie spada” (bez liczb kosztu kredytu). Gdy pada „ściąganie aut z Ameryki”, wchodzi animowana, falująca flaga USA (overlay `flag`). Opis do rolki od razu z montażem.

## Marka *(rozeznanie strony i skilli `swiezabryka-ameryka`, `swiezabryka-ameryka-social`, 2026-10-07)*

- Import aut z USA na zamówienie (Copart, IAAI, Manheim): wybór i weryfikacja, umowa i zwrotna kaucja, licytacja, płatność w 48 h, transport do portu, rejs do Europy, odprawa, naprawa i przygotowanie do rejestracji. Siostrzana marka Świeżej Bryki (auta z Europy). Twarze: Krzysiek (frontman) i Dawid.
- Hasła ze strony: „Twój wóz. Twoja legenda.”, „Znajdź swoją brykę.”, „Ameryka możliwości.”, „Od marzenia do kluczyków”, „Nie każde auto z USA się opłaca.”, „Osiem kroków. Jedna płynna podróż.”
- **Sprzedajemy zaufanie, nie auto.** Klient wysyła duże pieniądze za auto, którego nie widział. Rolka pokazuje proces (aukcja, port, laweta, warsztat), twarze, plac i to, co poszło nie tak.
- **Ton:** na ty, konkretnie, językiem placu i warsztatu, o pół tonu spokojniej niż Świeża Bryka. Liczba przed emocją. Amerykańska estetyka tak, amerykański hype nie. Domyślnie bez wulgaryzmów.
- **Strona:** czarne tło, kremowy tekst `#F6F3EE`, złoty akcent na ostatnim słowie nagłówka („Twoja **legenda.**”), złote przyciski z czarnym tekstem (zaokrąglenie 8 px), małe etykiety wersalikami z szerokim rozstrzeleniem, nagłówki Poppins 600, numery kroków „01–08” w złocie. Logo: okrągła złota plakietka z Challengerem i flagą USA.

## Zakazy w treści *(ze skilli marki — pilnuję w napisach i grafikach)*

- **Bez liczb o finansowaniu** (oprocentowanie, rata, „kredyt od X%”, maksymalna kwota): to uruchamia obowiązek podania RRSO i przykładu reprezentatywnego, także w rolce. W grafikach piszę „ogarniamy finansowanie”. Gdy liczby padają w wypowiedzi, pytam użytkowniczkę, zanim je zostawię.
- **Bez gwarancji ceny końcowej i terminu co do dnia:** zawsze widełki („od … do …”) i powód zmienności (kurs dolara, opłaty aukcyjne, fracht, zakres naprawy).
- **Prowizja jawna:** jeśli rolka rozpisuje koszty, prowizja jest jedną z pozycji listy.
- Nie nazywamy konkretnych firm oszustami: pokazujemy mechanizm, nie nazwy.
- Szkód nie chowamy: auto po szkodzie pokazujemy jako auto po szkodzie.
- Nie pokazujemy nazwy dostawcy, importera ani partnera w USA.
- Zgody wizerunkowe przy materiałach z klientami.

## Paleta i kontrast (WCAG)

| token | hex | rola |
|---|---|---|
| `gold` | `#B79154` | zakreślacz słowa-klucza, liczby i numery na kartach, CTA, krawędź kart, kropka metki |
| `black` | `#020203` | tekst na złotym, tło kart, cień napisów |
| `burgundy` | `#651E1E` | zakreślacz akcentów `hl` |
| `cream` | `#F6F3EE` | napisy, tekst na kartach i na bordo (kolor tekstu ze strony) |
| `muted` | `#9D948A` | drugorzędne podpisy na kartach (ze strony) |

| tekst na tle | kontrast | gdzie |
|---|---|---|
| `#020203` na `#B79154` | 7,10:1 (AAA) | słowo-klucz, CTA, fragment `hl` w tytule |
| `#F6F3EE` na `#651E1E` | 10,79:1 (AAA) | akcent `hl` |
| `#F6F3EE` na `#020203` | 18,74:1 | tekst kart, cień pod napisami |
| `#B79154` na `#020203` | 7,10:1 (AAA) | liczby i numery na kartach |
| `#9D948A` na `#020203` | 6,95:1 | podpisy na kartach |

**Zakazane pary:** krem lub biel na złotym (2,64:1 / 2,92:1), złoto na bordo (4,09:1) oraz złoty tekst prosto na wideo (zawsze na bloku albo na karcie).

## Typografia

- **Poppins 900:** słowo-klucz (WERSALIKI), liczby na kartach, tytuł-hak.
- **Poppins 600:** małe słowa w napisach, punkty list, CTA.
- **Poppins 400:** etykiety kart (wersaliki, rozstrzelenie 0,3 em), podpisy, metki przebitek.
- Pliki: `public/fonts/Poppins-Regular.ttf`, `Poppins-SemiBold.ttf`, `Poppins-Black.ttf`.

## Napisy: kinetic subtitles (styl `ameryka`)

- **Ruch jak u Bisanza:** blok wsuwa się krótko (70 px) z kierunku `from`, a każde słowo wysuwa się spod maski w chwili, gdy pada (krótkie spójniki razem z następnym słowem). Kierunek zmienia się przy nowym zdaniu, wyjście idzie szybko w górę z rozmyciem.
- **Zakreślacz zamiast kreski:** blok pod całym słowem przejeżdża od lewej chwilę po jego wejściu. Ciemny tekst siedzi na bloku i odsłania się razem z nim, więc litery zawsze leżą albo na bloku, albo na wideo z cieniem.
  - słowo-klucz: WERSALIKI Poppins 900, czarny na złotym;
  - `hl`: Poppins 800, krem na bordo, blok wyskakuje (pop out) (np. kwota, model auta, „Copart”);
  - `effect: "stamp"`: złoty blok pojawia się od razu i wskakuje z przechyłem (puenta, najwyżej raz na ~5 s).
- **Małe słowa:** Poppins 600, krem `#F6F3EE`, cień z `#020203`.
- Pole `color` grupy nie działa w tym stylu: kolory zakreślaczy są stałe, żeby kontrast zawsze się zgadzał.
- **Pozycja:** środek bloku y = 0,62 *(od 2026-10-20; wcześniej 0,73 — za nisko)*, przy karcie na dole dolna krawędź y = 0,63, a z `face.bottom` napis startuje tuż pod twarzą. Jeśli napisy zasłonią twarz, przesuwam je i dopisuję poprawkę tutaj.
- **Cięcie ciszy:** jak w stylach ogólnych (włączone).

## Grafiki (`AmerykaOverlay`)

| type | wygląd |
|---|---|
| `counter` | czarna karta ze złotą krawędzią, `title` jako złota etykieta Poppins 400, duża złota liczba Poppins 900, `label` w kremie |
| `list` z `value` | tabela stawek na pasach flagi: `was` (np. „10%”) się przekreśla, `value` wyskakuje na złotym, `sub` = podpis pod punktem, `source` = źródło pod listą; np. cło / akcyza / VAT |
| `media` (fit `overlay`, PNG) | auto z przebitki w czarnej karcie ze złotą krawędzią: wjazd z prawej z rozmyciem ruchu, hamowanie, złota linia drogi, metka `text`; `aspect` (wys./szer. PNG) dopasowuje kartę do auta, `y` = środek |
| `list` | pasy flagi USA (czerń/bordo) bez karty, złota gwiazdka z popem, numer `01` w złocie, punkt WERSALIKAMI Poppins 900 w kremie, wchodzą przy `at`; pasuje do rozpiski kosztów (cena aukcji, transport w USA, fracht, cło, akcyza, VAT, transport do Polski, naprawa, prowizja) |
| `title` | hak u góry: WERSALIKI Poppins 900 w kremie, fragment `hl` na złotym zakreślaczu z czarnym tekstem |
| `cta` | etykieta + złoty przycisk z czarnym tekstem (jak „Porozmawiajmy” na stronie), np. „Napisz model i budżet” |
| `media` (fit `full`) | przebitka na cały kadr, powolny najazd, czarna metka ze złotą kropką, np. „COPART · TEXAS” |
| `media` (fit `card`) | zdjęcie na czarnym passe-partout z lekkim skosem i złotą metką |
| pozostałe (`bars`, `ring`, `line`, `compare`, `emoji`) | na razie wspólne grafiki silnika (pomarańczowy akcent); przed użyciem przestylować na czerń i złoto |

Logo: `public/Brandings/SwiezaBrykaAmeryka/logo-swieza-bryka.png` (PNG 1600×1600, przezroczyste tło, pobrane ze strony 2026-10-07). Pokazuję je przy CTA na końcu albo przy wzmiance o marce.

## Przebitki: mój dobór, gdy użytkowniczka nic nie wskaże

| Temat wypowiedzi | Kierunek przebitki |
|---|---|
| aukcje, licytacja | ekran aukcji Copart/IAAI, auto na placu aukcyjnym |
| transport, port | laweta, port, kontener, statek, rozładunek |
| naprawa | warsztat: blacharka, lakier, ujęcia przed i po |
| amerykańskie auta | Mustang, Challenger, Charger, Camaro, Corvette, RAM, F-150 |
| dokumenty, cło | tytuł własności, dokumenty odprawy, Carfax |
| odbiór | wydanie auta i kluczyki (klient tylko za zgodą) |

Najpierw własny materiał klienta (marka nagrywa każdy etap telefonem), potem stock bez znaków wodnych. Źródło i licencję zapisuję w `public/reels/<nazwa>/sources.md`.

## Opisy do rolek *(2026-10-08)*

- W stałej końcówce opisu zawsze dodawaj numer telefonu. Numer marki potwierdzony na swiezabrykaameryka.pl: **797 978 478**. Nie pomijaj go przy stronie i CTA.

## Karuzele i posty pisane *(2026-10-20, korekta użytkowniczki)*

- Zdjęcia aut do karuzel wyszukuj na **Pexels** i wykorzystuj jako tła lub elementy kompozycji. Zapisuj stronę zdjęcia, autora i licencję; stock jest ilustracją, nie dokumentacją auta klienta ani warsztatu firmy.
- Seria ma mieć **10 osobnych karuzel w Canvie**, z jednoznacznymi nazwami, bezpośrednimi linkami i wspólnym folderem, aby cały komplet był łatwy do znalezienia. Nie uznawaj jednego otwartego projektu za widoczność całej serii.
- Kierunek: estetyczny magazyn motoryzacyjny i storytelling inspirowany energią Top Gear: konkretna sytuacja, napięcie, wyjaśnienie i puenta, bez kopiowania ich tekstów, identyfikacji czy wymyślania historii klientów. Korzystaj z Impeccable, GPT Taste, Brand i mechaniki Copy na stronę. Zachowaj paletę i Poppins marki; więcej zdjęć, zróżnicowana kompozycja i krótsze bloki tekstu.

## Stories przypięte — finansowanie *(2026-10-24)*

- Zestaw 9 stories w Canvie: hook → konkret → pytanie → konkret → hook → konkret → pytanie → konkret → CTA.
- Cała treść merytoryczna wyłącznie z aktualnej strony `https://swiezabrykaameryka.pl/finansowanie`; nie uzupełniać warunków informacjami z historycznych materiałów.
- Zachować identyfikację Świeża Bryka Ameryka; zdjęcia, proste diagramy i zestawienia mają ułatwiać zrozumienie.
- CTA uzgodnione w czacie: telefon ze strony **797 978 478**.
- **Wyjątek zaakceptowany w czacie 2026-10-24 dla tego zestawu:** uwzględnić parametry z aktualnej strony: maksymalna kwota 150 000 zł, maksymalny okres spłaty 120 miesięcy, minimum 75% kwoty na zakup auta. Nie dopisywać stawki oprocentowania, raty ani RRSO, których strona nie podaje.

## Rolka „Marzenia się spełniają” *(2026-10-29)*

- Zmontować przekazane nagranie w stylu marki, z animacjami dopasowanymi do wypowiedzi i numerem telefonu **797 978 478** na ekranie.

- **Wyjątek dla tej rolki (2026-10-29):** użytkowniczka poleciła „Po prostu zostaw” — zachować oryginalne zdanie o racie od 800 do 1500 zł w dźwięku i napisach. Zgoda dotyczy tego nagrania; bez dopisywania nowych warunków finansowania.

- **Korekta rolki „Marzenia się spełniają” (2026-10-29):** użytkowniczka oceniła oprawę jako toporną i poleciła usunąć dodane logo z tej rolki. Usunąć oba wystąpienia logo oraz pop przypisany do jego wejścia; zachować telefon i pozostały montaż.

- **Czytelność napisów — „Marzenia się spełniają” (2026-10-29):** napisy znikają za szybko i są nieczytelne. W tej rolce pokazywać od razu całe, sensowne frazy, z większą i równą typografią, krótkim spokojnym wejściem i dłuższym podtrzymaniem. Bez rozmywania liter, skakania słów i szybkiej zmiany lewo/prawo. Zachować kolory marki, telefon, brak logo i oryginalne czasy słów.

- **Animacje kinetic — „Marzenia się spełniają” (2026-10-29):** po poprawie czytelności przywrócić wyraźne animacje napisów: pop out, slide, bounce i krótkie glitch. Zachować większe litery, dłuższe grupy i czas na czytanie; animować krótko na wejściu, potem zostawić frazę stabilną. Nie wracać do znikania ostatnich słów podczas ich wejścia.
