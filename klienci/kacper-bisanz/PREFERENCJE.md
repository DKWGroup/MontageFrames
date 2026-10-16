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


## Poprawka wyglądu i pionu — 2026-10-15 (najwyższy priorytet)

- Podkreślenia/zakreślacze jak w GlowUp Nutrition i Świeża Bryka Ameryka, ale **#066FED**, zawsze z **białym tekstem** na akcencie. Ten dokładny kolor zastępuje wcześniejsze #066EED.
- Ładnie animowane wejście zakreślacza zsynchronizowane ze słowem; różnorodne, sensowne grupy i ruch (rise/slide/pop/bounce/letters), jeden mocniejszy efekt naraz. Nie zasłaniać twarzy. Domyślnie napisy w dolnej bezpiecznej strefie, mniejsze grupy pod twarzą; zmieniać układ inline/stack bez przepełnień.
- W pionie płynny tracking pozycji głowy: lokalne próbki twarzy, wygładzone przesuwanie kadru, bez nerwowych skoków. Brak detekcji → zachowany ostatni kadr/jawny fallback. Nie przeskakiwać bez powodu pomiędzy twarzami.
- Subtelne najazdy w granicach1,00–1,06 z łagodnym powrotem przy zmianie myśli. Głowa nie może być ucinana przez najazd.
- Zastosować do gotowej rolki QuickContent „Drogie auto na kredyt: ryzyko, o którym łatwo zapomnieć”; klient `kacper-bisanz`, styl `bisanz`, nowa wersja renderu w folderze klienta. Poprzedni render zostaje.

- Po tej poprawce domyślny środek napisów y≈0,70 (zamiast wcześniejszego0,83), aby klucz mieścił się w strefie Reels/TikTok; maksymalnie dolna krawędź≈0,75, twarz zawsze odsłonięta.


## Hook otwarcia nad głową — 2026-10-15 (obowiązuje przy poprawkach)

- Każda montowana rolka ma wyraźny tekst hooka **nad głową przez pierwsze3 sekundy**. Istniejącego hooka nie usuwać przy zmianie napisów, stylu, trackingiem ani porządkowaniu montażu. Kolizję rozwiązać pozycją, rozmiarem lub kadrem, zachowując tekst. Zmiana/usunięcie tylko na wyraźne polecenie użytkowniczki.
- Formę opracowywać z **Hook Engineer** (`hook-engineer`) i **Silnik Social Media** (`silnik-social-media`): konkret, liczba/kontrast/problem lub uczciwa luka ciekawości, krótki overlay≈5–8 słów czytelny bez dźwięku, obietnica spełniona przez fragment, bez pustego clickbaitu, zmyślonych faktów i guru-hype. Struktura historii: hook → zaciekawienie → konkrety/payoff → domknięcie; bez dopisywania obcego audio lub fikcyjnegoCTA do źródła.
- Skille dostarczają strukturę; głos, kolory i zakazy klienta mają pierwszeństwo. Nie przenosić osobistego tonu Wiktorii do klientów. Przy nowym hooku rozważyć3 różne kąty i wybrać najmocniejszy zgodny z nagraniem; istniejący zaakceptowany hook zachować.
- Hook to osobna warstwa od napisów wypowiedzi. Zachować pełną treść nagrania i wymagane napisy (SkyClass1:1); nie usuwać ich mechanicznie tylko dlatego, że na górze jest hook.

- Dla poprawianej rolki przywrócić dokładnie **„Auto za150 tysięcy?”** (w pliku z normalnymi spacjami),0–3s, biel/akcent#066FED, nad głową. To zaakceptowany hook liczbowy/pytanie, a dalsza wypowiedź dowozi porównanie50/150 tysięcy.


## Aktualizacja położenia hooka — 2026-10-15 (najnowsze polecenie, zastępuje „nad głową”)

- Hook przez pierwsze3s ma być **pod tekstem / pod napisami wypowiedzi**, nie nad głową. Zachować odstęp i nie nakładać warstw. Na te3s podnieść zwykłe napisy pod twarz, a krótki hook umieścić niżej.
- Docelowo całość w bezpiecznej strefie IG/TikTok: dolna krawędź ważnej treści≈0,75, prawa≤930/1080, lewa≥60/1080. Minimalne wejście w safezone tylko jeśli nie da się inaczej; najpierw zmniejszyć/zwęzić hook, skorygować układ i kadr. Twarz odsłonięta.
- Obowiązek zachowania hooka i zasady Hook Engineer + Silnik Social Media pozostają. Aktualne położenie ma pierwszeństwo przed starszą instrukcją „nad głową”.


## Bez zoomów kamery — 2026-10-15 (najnowsza korekta)

- **Usunąć zoomy kamery**: żadnych najazdów/odjazdów, pulsowania skali ani skoków wielkości obrazu. W segmentach `zoom=1` i `zoomTo=1`. To zastępuje wcześniejsze polecenie subtelnych zoomów1,00–1,06.
- Tracking utrzymuje głowę w poziomym centrum przez płynne przesunięcie; nie zmienia skali w czasie. Nie stosować adaptacyjnego pomniejszania/oddalania do twarzy ani rozmytych ramek z tego powodu. Naturalne zmiany ujęcia w oryginale zachować.
- Animacje napisów i niebieskie markery pozostają; hook pod napisami przez0–3s pozostaje. Poprawić gotową rolkę o aucie, zachowując poprzednieMP4.
- Po ukończeniu filmu opis według globalnej zasadyGPT‑6LunaAPI: hook, krótka puenta pod wyszukiwanie,5hashtagów.


## Czytelność napisów bez dźwięku — 2026-10-15 (najnowsza korekta)

- Napisy muszą przekazywać całą wypowiedź także przy oglądaniu bez głosu. Czytelność ma pierwszeństwo przed animacją.
- Grupować sensownie po około 4–6 słów (zwykle o jedno słowo więcej niż dotychczas), bez krótkich migających resztek i bez gubienia wypowiedzianych słów. Nie zmieniać czasów ASR.
- Cała grupa ma być czytelna od początku: krótki, spokojny wjazd całego bloku, bez czekania na odsłonięcie kolejnych liter/słów. Akcent niebieski może podążać za głosem, lecz sam tekst już jest widoczny.
- Dłuższa ekspozycja, minimum około 1 s na grupę, bez narastającego opóźnienia względem mowy. Wejście do około 0,13 s, wyjście do 0,07 s. Bez rozmywania tekstu, długiego literowania i niedokończonych wejść.
- Nadal białe napisy z markerem #066FED pod twarzą; hook pod napisami przez pierwsze 3 s. Tracking twarzy pozostaje, zoomy kamery wyłączone. Poprawić istniejącą rolkę o aucie i zachować poprzednie MP4.

- Cel ekspozycji około 1 s nie może kumulować opóźnienia względem mowy: maksymalnie około 0,35 s. Przy wyjątkowo szybkich zdaniach i końcu filmu skrócić ekspozycję, ale zachować cały czytelny blok, zamiast gubić słowa lub ucinać animację.


## Ruch napisów — korekta 2026-10-15 (zastępuje statyczne pełne bloki)

- Przywrócić wcześniejszy charakter i różnorodność animacji napisów. Uspokojenie jedynie o około 10–15%, bez radykalnego usuwania ruchu i zamiany w nudne statyczne bloki.
- Sprawdzić rzeczywistą czytelność słów, szczególnie ostatnich w grupie; wejścia muszą się kończyć przed zniknięciem napisu. Można pokazać jedno słowo wcześniej, zachować nieco większe grupy i ekspozycję, bez opóźniania wypowiedzi.
- Nadal tracking twarzy bez zoomów, hook pod napisami0–3s, biel i #066FED. Poprawić tę samą rolkę i zachować wcześniejsze MP4.


## Poprawny profil i bez dekoracji Happy News — 2026-10-16

- Rolki Kacpra Bisanza zawsze korzystają z klienta kacper-bisanz i stylu bisanz, także tworzone w panelu QuickContent/Studio. Podkreślenia i markery wyłącznie #066FED, białe litery, Inter. Pomarańczowy styl persona jest błędem przypisania i należy go poprawić w istniejących rolkach.
- Instrukcje częstych automatycznych emotek/flag, dużych naklejek za słowem i popów dotyczyły tylko Happy News. Nie dodawać ich automatycznie do Bisanza. Emotka tylko na konkretne polecenie do danej rolki i przy jednoznacznym znaczeniu; bez przypadkowych skojarzeń, ideogramów i przycisków CJK.
- Zachować dotychczasowe zasady: tracking pozycji bez zoomów kamery, hook pod napisami przez pierwsze 3 s, czytelne różnorodne animacje. Poprawić istniejące rolki z aktualnego projektu o kredycie, bez ponownej płatnej analizy.
