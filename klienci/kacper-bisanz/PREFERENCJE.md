# Kacper Bisanz — preferencje montażu klienta

Zapisano: **2026-10-05**. Strona: [bisanz.pl](https://bisanz.pl/). Styl w silniku: **`bisanz`** (`src/styles/bisanz.tsx`; napisy `Bisanz` i grafiki `BisanzOverlay`).

**To osobny klient, nie SkyClass.** Kacper jest współtwórcą SkyClass, więc styl jest „podobny, ale osobny”: ta sama logika układu (zwarte bloki, klucz i małe słowa, bez samosiek, karty pod napisami), ale **inna typografia, paleta i ruch**. Nie używaj tu różu, granatu, Poppinsa, zielonego neonu ani biletów SkyClass, chyba że rolka wprost dotyczy SkyClass i użytkowniczka o to poprosi.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe ogólne zasady obowiązują: 2–6 słów, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), potem zmieniam kod lub rolkę.

## Wytyczne i przebitki od użytkowniczki — najwyższy priorytet *(2026-10-05)*

- **Zawsze uwzględniaj przebitki i wytyczne, które użytkowniczka poda do danej rolki.** Jej opis („tu wstaw X”, „w tym miejscu przebitka Y”) i dostarczone pliki mają pierwszeństwo przed moim doborem i przed tym profilem. Dostarczone materiały wstawiam w miejscach i kolejności, które wskazała; jeśli czegoś nie da się zrobić, mówię o tym, zamiast pomijać.
- Przebitki od użytkowniczki trafiają do `klienci/kacper-bisanz/przebitki/` (lub ścieżki, którą poda), a do rolki kopiuję je do `public/reels/<nazwa>/`.
- **Zdjęcia-przebitki jako karta u góry kadru, nie na cały ekran** (poprawka 2026-10-05: wcześniej pod napisami): `media` z `fit: "card"` i `y: 0.2` — białe passe-partout, lekki skos, niebieska metka Menlo (`text`), pop przy wejściu. Zdjęcie/logo pojawia się w chwili, gdy pada słowo (np. „Książulo” → jego zdjęcie, „pizza” → pizza, „Żabka” → logo Żabki, „Muala” → logo Muala). `size` = wysokość zdjęcia, `aspect` przycina. *(2026-10-05)*
- **Napisy niżej i mniejsze, żeby nie zasłaniały twarzy:** środek bloku y = 0,83 (było 0,73), font o 5% mniejszy. *(2026-10-05)*
- **Dodatkowo dobieram własne przebitki** tam, gdzie wypowiedź o to prosi, a użytkowniczka niczego nie wskazała (tabela niżej). Zapisuję źródło i licencję w `public/reels/<nazwa>/sources.md`.

## Charakter marki *(rozeznanie bisanz.pl, 2026-10-05)*

- Przedsiębiorca, inwestor, prezes Slavia Group i Happy Holding. Wyszedł z 250 000 zł długu. Pomysłodawca „Expert w Bentleyu”, kanał SmartLife (finanse, biznes, mindset), autor książki „138” (15 000+ egzemplarzy, druga w drodze), 71 krajów, współtwórca SkyClass, Happy Taxes / Happy Invest / Happy News (z Damianem Abramowiczem).
- Hasła: „Buduję firmy. Tworzę media. Żyję na własnych zasadach.”, „Biznes i życie? Jeden ekosystem.”, „MARZ. PLANUJ. DZIAŁAJ.”, „Bez owijania w bawełnę”.
- Ton: konkretny, pewny siebie, „bez ściemy”. Rolka ma brzmieć jak przedsiębiorca, który dzieli się praktyką, nie jak coach.
- Strona: czysta biel, prawie czarny tekst `#141414`, jeden niebieski akcent, duże nagłówki Inter 700 z ciasnym światłem, monospace'owe etykiety jak na karcie pokładowej („BOARDING SECTION”, „GATE KB-001”, „/01”), białe karty z cienką krawędzią `#E6E6E6` i zaokrągleniem 12 px, liczby w niebieskim, chmury i niebo w tle.
- Liczby ze strony do sprawdzenia przed użyciem w rolce (mogą się zmienić).

## Paleta *(od klienta, 2026-10-05)*

| token | hex | rola |
|---|---|---|
| `white` | `#FFFFFF` | napisy, tło kart, tekst na niebieskim (czysta biel dozwolona u tego klienta) |
| `blue` | `#066EED` | jedyny akcent: słowa `hl`, kreska pod kluczem, pigułka `stamp`, liczby, numery list, CTA, kropka w metce |
| `ink` | `#141414` | tekst na białych kartach, cień napisów (ze strony) |
| `muted` | `#737373` | drugorzędne etykiety na kartach (ze strony) |
| `line` | `#E6E6E6` | krawędź kart i separatory list (ze strony) |

Nie: pomarańcz (globalny akcent tu nie obowiązuje), róż i granat SkyClass, zielony neon, żółty, gradientowy tekst, liquid glass.

## Typografia

- **Inter 700:** słowo-klucz (WERSALIKI, światło −0,03 em), liczby, tytuł-hak (italic), CTA.
- **Inter 600:** małe słowa w napisach, punkty list, etykiety kart.
- **Inter 400:** dłuższe opisy i podpisy na kartach.
- **Menlo 400:** etykiety „boardingowe”: numer `/01`, nagłówek karty, metka przebitki („CYPR · PAFOS”), podpis CTA. Wersaliki, rozstrzelone 0,2 em, małe. Nigdy w samych napisach mowy.
- Inter jest w `public/fonts/Inter*.ttf`. Menlo to font systemowy macOS (bez pliku w repo), więc render musi iść na Macu.

## Napisy: kinetic subtitles

- **Kinetic subtitles z energią jak w SkyClass, a nawet bardziej różnorodne, ale przemyślane.** Poziom dynamiki jak w SkyClass: wyraźne wjazdy i wyjazdy, pop klucza, zmiana kierunku przy nowym zdaniu. Do tego więcej wariantów animacji niż w SkyClass, np. wysuwanie spod maski, rysowana kreska pod kluczem, pigułka `stamp`, pisanie słowa litera po literze w stylu Menlo, zoom-pop, przesunięcie z rozmyciem i podmiana słowa. Każdy wariant dobieram do sensu zdania, nie losowo. Liczba i kwota dostają odliczanie, kontrast „zamiast X → Y” podmianę słowa, puenta pieczątkę, a spokojny fragment łagodne wejście. Warianty rotuję tak, żeby dwie sąsiednie grupy nie wyglądały tak samo, ale w ramach jednego spójnego języka (Inter, biel, niebieski). Bez chaosu: maksymalnie jeden mocny efekt naraz, czytelność ważniejsza niż efekt, a tekst zawsze zsynchronizowany z głosem. *(2026-10-05)*
- Klucz **WERSALIKAMI** w bieli z niebieską kreską, która rysuje się pod nim od lewej. Małe słowa w Inter 600 w bieli; `hl` w niebieskim.
- `effect: "stamp"` zmienia klucz w białe słowo na niebieskiej pigułce (puenta, maksymalnie raz na ~5 s).
- Ruch **edytorski, nie „samolotowy”**: blok wsuwa się krótko (70 px) bez obrotu, każde słowo wysuwa się spod maski od dołu w chwili, gdy pada. Wyjście szybkie: w górę z rozmyciem. Kierunek zmienia się przy nowym zdaniu.
- Pozycja: środek bloku y = 0,83 (poprawka 2026-10-05), a przy karcie na dole dolna krawędź y = 0,63. Karta stoi 32 px pod napisem.
- **Cięcie ciszy:** jak w stylach ogólnych (włączone). Jeśli użytkowniczka zechce wypowiedź 1:1 jak w SkyClass, dopiszę to tutaj.

## Grafiki (`BisanzOverlay`)

| type | wygląd |
|---|---|
| `media` (fit `full`) | **przebitka** na cały kadr, powolny najazd 1,08 → 1, lekkie przyciemnienie góry i dołu; `text` = biała metka Menlo z niebieską kropką (miejsce, nazwa, data) |
| `counter` | biała karta: `title` w Menlo (np. `/01`), duża niebieska liczba Inter 700, `label` wersalikami (jak sekcja „Liczby mówią same za siebie”) |
| `list` | biała karta jak manifest „01 Biznes / 02 Content”: numery Menlo w niebieskim, punkty Inter 600 wchodzą przy `at` |
| `title` | hak u góry: WERSALIKI Inter 700 italic w bieli, fragment `hl` w niebieskim („MARZ. PLANUJ. **DZIAŁAJ.**”) |
| `cta` | `label` w Menlo + niebieska pigułka z białym tekstem (np. „Dołącz do SkyClass”, „Subskrybuj SmartLife”) |
| pozostałe (`bars`, `ring`, `line`, `compare`, `emoji`) | na razie wspólne grafiki silnika; przed użyciem przestylować na biel i niebieski |

Logo: folder `public/Brandings/Bisanz/` czeka na pliki (wordmark „bisanz.pl”, logotypy SmartLife, SkyClass, Happy, Slavia Group). Logo SkyClass jest w `public/Brandings/SkyClass/`.

## Przebitki: mój dobór, gdy użytkowniczka nic nie wskaże

| Temat wypowiedzi | Kierunek przebitki |
|---|---|
| podróże, 71 krajów, „świat to moje biuro” | lotnisko, okno samolotu nad chmurami, Bali, Karaiby, Dolomity, Afryka |
| biznes, firmy, zespół | biuro, spotkanie, podpisanie umowy, praca przy laptopie |
| pieniądze, inwestycje, długi | wykresy giełdowe, kalkulator i rachunki, gotówka, aplikacja inwestycyjna |
| media, YouTube, content | studio, kamera, montaż, ekran z kanałem |
| książka „138” | prawdziwa okładka od klienta (nie tworzę fikcyjnej) |
| luksus, „Expert w Bentleyu” | samochód premium, business class, lounge |

Przebitka trwa 2–4 s, bez znaków wodnych i obcych napisów, domyślnie bez własnego dźwięku. Do Kacpra wracam przy puencie i CTA.
