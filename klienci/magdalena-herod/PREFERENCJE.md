# Magdalena Herod — profil klientki i preferencje montażu

Zapisano: **2026-10-03**. Strona: [magdalenaherod.pl](https://magdalenaherod.pl/). Ebook: [Zobacz siebie](https://magdalenaherod.pl/ebook). Styl w silniku: **`herod`**, wdrożony przy rolce nr 1 (2026-10-03).

**Zaakceptowany wzorzec: rolka nr 1, wersja v2.** Użytkowniczka potwierdziła „Aktualna rolka jest super”; kolejne rolki montuj w tym samym kierunku: dwie linie napisów, tematyczne przebitki, ikony, przestronne karty oraz duży ebook z osobnymi kafelkami i adresem nad głową. *(2026-10-03)*

**Zaakceptowane także: rolka nr 2.** Potwierdzenie użytkowniczki: „Aktualna rolka jest super”. Kontynuuj ten sam styl w rolce nr 3 i kolejnych. *(2026-10-03)*

**Rolki nr 3, 4 i 5:** kontynuacja spójnego stylu `herod`: Montserrat 400 + Libre Baskerville 400, krem/śliwka/złoto, podwójne linie bez samosiek, autentyczne tematyczne przebitki, liniowe ikony oraz duża prezentacja ebooka „Zobacz siebie” z kafelkami i linkiem nad głową. *(2026-10-03)*

Przed każdą rolką czytaj także główne `PREFERENCJE.md` i `frame.md`. Ten plik ma pierwszeństwo w kwestiach palety, fontów, tempa, wyglądu kart i położenia grafik. Pozostałe globalne zasady obowiązują: zwarte grupy 2–6 słów, bez wiszących spójników i przyimków również podczas animacji, odsłonięta twarz, czytelność na telefonie, grafiki dobrane do sensu wypowiedzi i bez zbędnego dublowania tekstu. Poprawki klientki dopisuj tutaj z datą. Jest to trwały profil do przyszłych montaży. Napisy i karty wdrożono w `src/styles/herod.tsx`.

## Charakter marki i kierunek montażu

Na stronie Magdalena łączy ponad 18 lat pracy z przedsiębiorcami, rozwojem biznesu i innowacjami z ponad 8 latami praktyki świadomego rozwoju. Główne tematy to świadomość, emocje, automatyczne reakcje, przekonania, relacje, decyzje i powrót do siebie. Biznes i sukces pojawiają się w kontekście osoby, która ponosi odpowiedzialność i podejmuje decyzje. Źródło: [strona główna, odczyt 2026-10-03](https://magdalenaherod.pl/).

Kierunek dla rolek: spokój, uważność, ciepło i przemyślana hierarchia. Ruch daje czas na przyjęcie myśli. Nie obiecuj natychmiastowej przemiany; nie dopisuj do wypowiedzi haseł motywacyjnych ani obietnic wyników. Rozmowa i naturalne emocje są centrum kadru. Dobieraj cięcia do końców myśli; nie przyspieszaj wypowiedzi dla samego tempa.

## Paleta — podana przez użytkowniczkę

| Token | Kolor | Zastosowanie w montażu |
|---|---|---|
| `cream` | `#FAF4EF` | jasne tła kart, jasne napisy na ciemnym obrazie |
| `ink` | `#271338` | główny tekst na jasnym tle, kontury ikon, delikatny cień napisów |
| `plum` | `#55255F` | wyróżnienia, ciemne karty, przyciski CTA |
| `gold` | `#D7A160` | oszczędny akcent: linia, znacznik, detal ikony lub przycisk |
| `blush` | `#F2E9E7` | alternatywna powierzchnia kart i spokojne tło sekcji |

Role kolorów to wskazówki montażowe na podstawie strony. Zastępują globalny pomarańczowy akcent. Dobieraj kontrast do ujęcia: na jasnej karcie tekst `ink` lub `plum`, na ciemnej karcie `cream`. Złoto przede wszystkim w detalach, nie jako drobny tekst na kremie. Jeśli napis zlewa się z obrazem, zastosuj subtelny śliwkowy cień lub lokalne przyciemnienie.

## Typografia i kinetic subtitles

- **Napisy domyślnie w dwóch celowo ułożonych liniach**, zamiast długiego jednoliniowego paska. Dziel według sensu, z wycentrowaniem i wyrównaną długością; nie rozrywaj przyimka od następnego słowa. Przegrupuj zbyt krótkie grupy, zamiast sztucznie tworzyć linię z pojedynczego spójnika. *(2026-10-03, korekta rolki nr 1)*

- **Montserrat 400:** zwykłe słowa, tekst uzupełniający, etykiety i opisy.
- **Libre Baskerville 400:** ważne słowa, puenty, nagłówki i kluczowe pojęcia.
- **Libre Baskerville 400 italic:** wybrane refleksyjne wyróżnienia lub krótki cytat; oszczędnie.
- Nie zastępuj klucza pogrubionym Montserratem. Hierarchię buduj krojem, rozmiarem i kolorem, zachowując wskazane wagi. Korzystaj z prawdziwej odmiany italic, bez sztucznego bolda ani pochylenia. W przyszłej implementacji zapewnij polskie znaki i dostępność tych fontów przed renderem.
- Zwarte, wycentrowane bloki `stack` / `inline`, zwykle 2–6 słów. Jeden istotny klucz w grupie, gdy wynika z treści; nie każda grupa potrzebuje dużego słowa. Krótkie spójniki i przyimki pokazuj razem z kolejnym słowem, także na wejściu.
- Klucz nie powinien dominować nad osobą ani rozbijać zdania. Wersaliki tylko gdy uzasadnia je wypowiedź. Wielkość dopasuj do długości tekstu i szerokości telefonu.
- **Ruch wolniejszy i bardziej przemyślany niż globalny styl oraz SkyClass.** Miękkie pojawienie, niewielkie przesunięcie i spokojne zatrzymanie. Bez mocnych odbić, potrząsania, agresywnego popu, glitcha, szybkich przelotów i migania słowo po słowie.
- Słowa pozostają zsynchronizowane z głosem. Wolniejsze tempo uzyskuj przez spokojny ruch, sensowne grupowanie i pozostawienie czytelnego bloku do następnej grupy, a nie przez opóźnianie napisu względem wypowiedzi. W pauzie daj myśli wybrzmieć.

### Pozycja napisów i animacji

**Wysokość jak aktualny projekt SkyClass**, zgodnie z korektą z 2026-10-03:

- Zwykły blok: **środek `y = 0,73`** wysokości kadru, czyli **1401,6 px przy 1080×1920**.
- Przy grafice: **dolna krawędź bloku `y = 0,63`**, czyli **1209,6 px przy 1080×1920**. To krawędź bloku, nie jego środek.
- **Animacja bezpośrednio pod napisami**, z niewielkim odstępem. Punkt wyjścia: 24–40 px przy 1080×1920, liczone od dolnej krawędzi widocznego napisu do górnej krawędzi grafiki. Odstęp skaluje się z kadrem.
- Nie kopiuj dolnego zakotwiczenia kart SkyClass na `0,94`: tutaj karta jest przywiązana do bloku napisów. Przy grafice stosuj pozycję podniesioną, dopasuj wysokość karty, a większą treść rozłóż w czasie.
- Sprawdź cały ruch, najdłuższy napis i wysokość klucza. Napisy, ikony i karty nie nachodzą na siebie ani twarz; ważne elementy mieszczą się w bezpiecznej strefie platformy, bez kolizji z prawymi przyciskami.

## Grafiki, ikony i animacje — inspiracja sekcjami strony

- **Większy padding kart**: wyraźna otoczka wokół treści, także na karcie „Inspirujące treści”. Punkt wyjścia 48–56 px po bokach i 40–48 px w pionie przy 1080×1920; zwiększ wysokość kontenera, zamiast ściskać tekst. *(2026-10-03)*
- **Dodawaj ikony podkreślające ważne słowa** — np. mózg przy przekonaniach, warstwy przy filtrach, oko przy zobaczeniu siebie, notes przy refleksji. Jeden spójny zestaw liniowy w kolorach marki, zsynchronizowany z wypowiedzią, bez zasłaniania twarzy i napisów. *(2026-10-03)*
- **Prezentacja ebooka ma być duża i estetyczna**: znacznie większa okładka `okladka1.png`, obok osobny schludny kafelek z tytułem „Zobacz siebie” i podpisem „Ebook”, oraz kafelek zakupowy „Do kupienia na mojej stronie” / „Link w bio”. Nie wracaj do małej miniatury zamkniętej w ciasnym kontenerze. *(2026-10-03)*
- **Przy animacji ebooka nad głową Magdaleny pokazuj kafelek `magdalenaherod.pl`**, wewnątrz bezpiecznej strefy u góry kadru. Widoczny przez czas prezentacji produktu, bez kolizji z głową. *(2026-10-03)*

Obserwacja strony: ciepłe jasne powierzchnie, śliwkowe szeryfowe nagłówki, zaokrąglone karty, cienkie separatory, dużo przestrzeni, przyciski w formie pigułek. Sekcja etapów pokazuje jasne karty na tle w odcieniu różowego beżu, z liniowymi ikonami: **oko → świadomość, serce → stabilizacja, mózg → zrozumienie, liść → zmiana**. Sekcja sposobu pracy używa numerów 01–03. To referencje wyglądu, nie potwierdzenie parametrów animacji strony. Źródło: [strona główna](https://magdalenaherod.pl/).

- Karty pełne w `cream` / `blush` albo `plum`, miękkie zaokrąglenia i delikatny cień. **Ten wygląd zastępuje globalny liquid glass** u tej klientki.
- Jeden spójny zestaw prostych ikon liniowych, o podobnej grubości i zaokrąglonych zakończeniach. Śliwkowe kontury, złoto tylko jako detal. Bez mieszania ikon 3D, emoji i rysunków z różnych zestawów.
- Dodatkowe motywy: dymki rozmowy, dom lub sylwetki rodziny, spokojny oddech, kompas / cel, teczka lub zespół. Ikona wynika ze zdania, nie pojawia się przy każdym rzeczowniku.
- Krótka myśl → mała karta z ikoną; proces → ponumerowane kroki; zmiana perspektywy → dwie spokojnie odsłaniane interpretacje; dane → czytelny licznik bez fajerwerków. Nie pokazuj równocześnie wielu konkurujących animacji.
- CTA wyłącznie gdy uzasadnia je wypowiedź: pigułka w `plum` lub `gold`, jak przyciski strony. Przy ebooku używaj prawdziwej okładki produktu; nie twórz własnej fikcyjnej okładki. Na stronie widoczna jest kremowa okładka z motywem delikatnych roślin / dmuchawców i śliwkowym tytułem.
- Globalna zasada logotypów przy wzmiankach o firmach i platformach obowiązuje: właściwy przezroczysty asset, oryginalne proporcje, bez zasłaniania osoby.

### Proponowane parametry ruchu do przyszłego wdrożenia

To ustawienia startowe profilu, dobierane do rytmu konkretnej wypowiedzi:

| Element | Ruch / czas |
|---|---|
| wejście napisów | 0,45–0,65 s, przesunięcie 16–28 px i łagodne pojawienie |
| klucz Libre Baskerville | delikatne odsłonięcie; opcjonalnie skala 0,98 → 1 bez odbicia |
| wyjście napisów | 0,30–0,45 s, wygaszenie i niewielkie przesunięcie |
| karta / ikona | 0,50–0,80 s, miękki ruch, bez przestrzelenia |
| rysowanie linii / ikony | 0,70–1,10 s, jeden przebieg |
| kolejne kroki | w rytmie wypowiedzi; odstęp orientacyjnie 0,25–0,40 s, jeśli są wypowiadane razem |
| przejście przebitki | przenikanie 0,35–0,55 s lub spokojne cięcie na zmianie myśli |

Skracaj wejście przy krótkiej grupie, aby widz zdążył przeczytać tekst w stanie ustalonym. Po wejściu element stoi spokojnie; bez ciągłego pulsowania i dryfu.

## Przebitki — tematyczne, skupione na ludziach

- **Przebitki mają pojawiać się częściej niż w rolce nr 3.** Od rolki nr 4 zwiększ częstotliwość tematycznych ujęć w trakcie wypowiedzi: dobieraj je do kolejnych myśli, przeplataj z Magdaleną i zachowuj powrót do niej przy puencie oraz prezentacji ebooka. Rolka nr 3 pozostaje bez zmian. Nie wydłużaj pojedynczej przebitki tylko po to, aby zwiększyć jej udział; stawiaj na więcej trafnych wejść. *(2026-10-03, polecenie użytkowniczki)*

- **Nie pomijaj przebitek**: przy każdej rolce przeanalizuj wypowiedź i dobierz kilka materiałów do konkretnych myśli, zamiast pozostawiać cały film jako samo ujęcie mówiącej osoby. W rolce nr 1: przekonania / słowa innych → rozmowa i słuchanie; lęki / doświadczenia → refleksja; zatrzymanie przy sobie / odkrywanie siebie → pisanie w dzienniku lub spokojna chwila w naturze. Zachowuj głos Magdaleny i napisy, wracaj do niej przy puencie i prezentacji ebooka. Źródło i prawa do materiałów zapisuj przy projekcie. *(2026-10-03)*

Dodawaj przebitki tam, gdzie ilustrują konkretną myśl. Punkt wyjścia: 3–5 s, naturalne światło, spokojny ruch kamery lub powolny najazd na zdjęcie. Materiał bez znaków wodnych i obcych napisów, z prawem do wykorzystania. Zapisuj źródło i licencję przy danym materiale. Materiały klientki mają pierwszeństwo.

| Temat wypowiedzi | Kierunek przebitki |
|---|---|
| rozmowa, komunikacja, relacja | dwie osoby słuchające się, spokojna rozmowa przy stole, gest wsparcia |
| samopoczucie, napięcie, odpoczynek | chwila zatrzymania, spacer, spokojny oddech, refleksja przy oknie, pisanie w notesie |
| rodzina, bliskość | wspólny posiłek, rozmowa, spacer, naturalny kontakt i codzienne gesty |
| sukces, sprawczość, decyzja | zakończenie pracy, spokojna satysfakcja, zapisanie celu, podjęcie konkretnego kroku |
| biznes, odpowiedzialność, zespół | autentyczne spotkanie, rozmowa z zespołem, planowanie, uważna praca |
| przekonania, schematy, nowy dialog | autorefleksja, dziennik, zatrzymanie przed reakcją, rozmowa pokazująca zmianę perspektywy |

Głos Magdaleny / rozmówcy biegnie dalej. Przebitka domyślnie bez własnego audio; napisy pozostają czytelne na wierzchu. Wracaj do osoby przy ważnej puencie lub osobistym wyznaniu. Zachowaj naturalność i przestrzeń na emocje; przebitki nie powinny zagłuszać opowieści. Nie przedstawiaj osób ze stocka jako klientek, członków rodziny Magdaleny ani świadectw efektów jej pracy.

## Subtelne efekty dźwiękowe

Obowiązuje globalna zasada: **SFX 10 dB poniżej poziomu oryginalnego filmu** w danym fragmencie, według zasad pomiaru i dopasowania z głównego `PREFERENCJE.md`. U Magdaleny efekty mogą być jeszcze ciszej, jeśli wymaga tego spokojny charakter wypowiedzi.

- Lekki whoosh przy wybranym przejściu, miękki klik przy CTA, delikatny akcent przy wejściu istotnej karty. Efekt ma wspierać moment, nie zwracać na siebie uwagi.
- Bez efektu przy każdym słowie i każdej ikonie. W refleksyjnych fragmentach i naturalnych pauzach można całkowicie zrezygnować z SFX.
- Globalne dopasowanie efektu do treści zachowuj w subtelnej formie: przy kwocie ewentualny dźwięk kasy musi być miękki i cichy, a przy akcencie łagodny pop. Żadnych ostrych uderzeń ani głośnych powiadomień.
- Synchronizuj efekt z konkretnym zdarzeniem, łagodź ostre początki i końce, sprawdzaj odsłuchem na słuchawkach oraz głośniku telefonu. Wypowiedź pozostaje pierwszym planem.

## Ebook — zapamiętana baza do przyszłych rolek

- **Przy wzmiance Magdaleny o ebooku pokazuj plik `klienci/magdalena-herod/okladka1.png`.** To wskazana przez użytkowniczkę okładka; zachowuj proporcje, pokazuj ją w momencie wypowiedzi o ebooku, z łagodnym wejściem pod napisami, bez zasłaniania twarzy. Obowiązuje w kolejnych rolkach tej klientki. *(2026-10-03)*

Źródło: [oferta ebooka](https://magdalenaherod.pl/ebook), odczyt **2026-10-03**. To informacje ze strony sprzedażowej, nie z przeczytanego pliku PDF. Cenę, dostępność i warunki sprawdź ponownie przed rolką sprzedażową.

- **Tytuł: „Zobacz siebie”**. Temat: świadomość oraz mechanizmy wpływające na myśli, interpretacje, decyzje i reakcje.
- Praktyczny materiał o zauważaniu podświadomych wzorców i automatycznych reakcji, rozumieniu ich źródeł oraz budowaniu nowych sposobów myślenia i działania. Zawiera pytania, praktyki i ćwiczenia do zastosowania w codzienności.
- **Około 100 stron, 8 modułów, PDF do pobrania. Cena widoczna na stronie: 99 zł brutto**, płatność jednorazowa, bez subskrypcji, dostęp do materiału bezterminowy. Można czytać na urządzeniach lub wydrukować.
- Po zakupie link przychodzi na e-mail. Strona podaje ważność linku **3 dni**, z możliwością wysłania nowego po wygaśnięciu. Ważność linku nie jest terminem dostępu do kupionego materiału.
- Dla osób, które zauważają powtarzające się schematy, presję, napięcie, trudność w odpoczynku, automatyczne reakcje i chcą lepiej rozumieć siebie. Nie jest obietnicą szybkiej zmiany bez własnego udziału.
- Materiał edukacyjny i rozwojowy, nie terapia ani diagnoza. Nie przedstawiaj go w rolkach jako zamiennika specjalistycznej pomocy.

### Osiem modułów — kolejność ze strony

| Nr | Moduł | Temat w skrócie |
|---|---|---|
| 01 | Świadomość | zauważenie automatycznego podejmowania decyzji |
| 02 | Analiza | źródła przekonań, reakcji i schematów |
| 03 | Rozpoznanie | rozpoznawanie wzorców w codziennych sytuacjach |
| 04 | Reframing | świadoma zmiana perspektywy |
| 05 | Nowa interpretacja | nadawanie doświadczeniom wspierającego znaczenia |
| 06 | Nowy dialog | świadomy i życzliwy dialog wewnętrzny |
| 07 | Utrwalenie | ćwiczenia wprowadzające nowe mechanizmy w codzienność |
| 08 | Tożsamość | działanie w zgodzie z osobą, którą świadomie się stajesz |

### Kontekst serii

Na [stronie głównej](https://magdalenaherod.pl/) ebook jest pierwszym krokiem serii „Bliżej siebie”, obejmującej pięć obszarów:

1. **Zobacz siebie** — świadomość; obecnie prezentowany ebook.
2. **Poczuj siebie** — emocje; w przygotowaniu.
3. **Wybierz siebie** — relacja ze sobą; w przygotowaniu.
4. **Spotkaj siebie** — relacje; w przygotowaniu.
5. **Doceń siebie** — wartość i obfitość; w przygotowaniu.

Nie reklamuj czterech kolejnych tytułów jako dostępnych bez sprawdzenia aktualnego statusu. Przy wzmiance o ebooku dobieraj kartę, okładkę lub ikonę do rzeczywistej wypowiedzi; ceny, liczby modułów i CTA nie pojawiają się automatycznie w każdej rolce.
