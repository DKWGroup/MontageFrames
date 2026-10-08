# Świeża Bryka Ameryka — preferencje montażu klienta

Zapisano: **2026-10-07**. Strona: [swiezabrykaameryka.pl](https://swiezabrykaameryka.pl). Styl w silniku: **`ameryka`** (`src/styles/ameryka.tsx`: motyw silnika ruchu Bisanza, napisy `Ameryka` i grafiki `AmerykaOverlay`). Prep sam wybiera ten styl, gdy nagranie leży w `klienci/swieza-bryka-ameryka/…`.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe ogólne zasady obowiązują: 2–6 słów, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), potem zmieniam kod lub rolkę.

## Wytyczne od użytkowniczki *(2026-10-07)*

- **Kolory:** złoto `#B79154`, czerń `#020203`, bordo `#651E1E`.
- **Fonty:** Poppins 900, 600 i 400.
- **Napisy:** kinetic subtitles i wyróżnienia słów jak u Bisanza, ale **wyróżnienie obejmuje całe słowo** (zakreślacz pod całym wyrazem), a nie kreskę na dole.
- **Kontrast ma się zgadzać** w każdej klatce (tabela niżej).
- **Zakreślacz:** słowo-klucz na złotym, akcenty `hl` na bordo.

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
  - `hl`: Poppins 600, krem na bordo (np. kwota, model auta, „Copart”);
  - `effect: "stamp"`: złoty blok pojawia się od razu i wskakuje z przechyłem (puenta, najwyżej raz na ~5 s).
- **Małe słowa:** Poppins 600, krem `#F6F3EE`, cień z `#020203`.
- Pole `color` grupy nie działa w tym stylu: kolory zakreślaczy są stałe, żeby kontrast zawsze się zgadzał.
- **Pozycja:** środek bloku y = 0,73, przy karcie na dole dolna krawędź y = 0,63 (jak SkyClass). Jeśli napisy zasłonią twarz, przesuwam je i dopisuję poprawkę tutaj.
- **Cięcie ciszy:** jak w stylach ogólnych (włączone).

## Grafiki (`AmerykaOverlay`)

| type | wygląd |
|---|---|
| `counter` | czarna karta ze złotą krawędzią, `title` jako złota etykieta Poppins 400, duża złota liczba Poppins 900, `label` w kremie |
| `list` | czarna karta, numery `01` w złocie, punkty Poppins 600 w kremie, wchodzą przy `at`; pasuje do rozpiski kosztów (cena aukcji, transport w USA, fracht, cło, akcyza, VAT, transport do Polski, naprawa, prowizja) |
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
