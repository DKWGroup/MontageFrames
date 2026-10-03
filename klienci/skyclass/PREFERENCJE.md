# SkyClass — preferencje montażu klienta

Rolki dla **SkyClass** (skyclass.pl): społeczność i subskrypcja o tanim, wygodnym podróżowaniu. Prowadzą ją Kacper (100+ podróży, 70+ krajów) i Damian (80–100 lotów rocznie).
Ten plik **ma pierwszeństwo** przed ogólnymi `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią (kolor akcentu, font, tło grafik). Reszta ogólnych zasad obowiązuje: 2–6 słów, zwarte bloki, grafiki na dole pod napisami, twarz odsłonięta. Wyjątki SkyClass: bez cięcia ciszy, pełne napisy 1:1 również przy grafikach oraz indywidualne pozycje: grafiki pozostają 15% kadru niżej niż w pierwszym montażu, a napisy w kolejnych rolkach mają być 6% kadru wyżej niż w Alicante v2.
Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), potem zmieniam kod/rolkę.

Logo: `public/Brandings/SkyClass/skyclass-logo-2.png` (1282×294, przezroczyste tło, granatowe; litera Y to kieliszek z samolotem).

## Aktualne poprawki użytkowniczki *(2026-10-03)*

- **Wycinanie ciszy jest na razie wyłączone dla SkyClass.** Zachowuj całe nagranie, naturalne pauzy, oddechy i zawahania; nie skracaj wypowiedzi ani nie usuwaj urwanych słów bez osobnego polecenia. Zoomy mogą dzielić obraz na ujęcia, ale oś dźwięku pozostaje ciągła.
- **Transkrypcja i napisy 1:1 z tym, co mówi prowadzący.** Bez parafraz, dopisywania i pomijania słów, także przy cenach, listach i CTA. Zachowuj powtórzenia i słyszalne urwane słowa (oznaczone wielokropkiem). Poprawiaj błędy ASR po sprawdzeniu nagrania. Reguła „bez dublowania” nie może usuwać wypowiedzianych słów z napisów SkyClass.
- **Wyliczanie miejsc na początku: ciągłe tło turystyczne.** Przebitki zaczynają się od pierwszego kierunku, również od początku rolki. Przejścia prowadzą bezpośrednio z miejsca do miejsca; pod przejściem pozostaje pełnoekranowy krajobraz. Prowadzący nie może przebłyskiwać w tle między kierunkami ani w maskach przejść. Wraca dopiero po zakończeniu wyliczania.
- **Pozycja napisów w kolejnych rolkach: o 6% wysokości kadru wyżej niż w Alicante v2** (−115,2 px dla 1080×1920). Napisy zwykłe: środek y=0,73 zamiast 0,79; przy grafice: dolna krawędź y=0,63 zamiast 0,69. Nowa korekta dotyczy napisów; karty i pozostałe grafiki zachowują pozycje z v2 (dolna krawędź kart y=0,94). Twarz pozostaje odsłonięta. **Nie zmieniaj ani nie renderuj ponownie obecnej rolki Alicante — to wytyczna na przyszłość.** *(2026-10-03)*
- **Bez „samosiek” (wiszących krótkich słów).** Nigdy nie zostawiaj „i”, „a”, „o”, „u”, „w”, „z” ani innych krótkich spójników i przyimków (np. „do”, „na”, „od”, „po”, „za”, „ze”, „we”) samotnie w osobnej linii ani na końcu linii, akapitu lub grupy napisów, gdy dalszy ciąg trafia do następnej. Łącz je z następującym słowem w tej samej linii i grupie (np. „w SkyClass”, „z tego”, „i rezerwujesz”); przy łamaniu tekstu przenoś cały taki fragment razem, używając spacji nierozdzielającej. Dotyczy też podziału wokół dużego słowa-klucza oraz animacji: krótkie słowo nie może przez moment wisieć samo — pokaż je razem z następnym słowem, zachowując pełny tekst wypowiedzi. *(2026-10-03)*

## Charakter marki *(rozeznanie skyclass.pl, 2026-10-03)*

- Hasło: „Podróżuj jak majętny człowiek. Płać jak sprytny inwestor”. Druga obietnica: „Podróżuj 3x częściej, płacąc nawet 4x mniej”.
- Ton: bezpośredni, energiczny, „sprytny”: luksus (business class, lounge, fast track) za mało pieniędzy. Rolka ma dawać poczucie, że widz właśnie dostaje bilet na okazję.
- Strona: jasna (biel, `#F7FAFC`), granatowe nagłówki, różowo-czerwone przyciski-pigułki, białe karty z zaokrągleniem ~24 px, ilustracja samolotu SkyClass i geometryczne koła.
- Nagłówki na stronie łączą dwie wagi: wstęp w Poppins 500 i mocny dopisek w Poppins 900 („Zdobądź dostęp do najlepszych / **okazji podróżniczych**”). To dokładnie układ naszych napisów: małe słowa i duży klucz.
- Ceny na stronie są podawane jak na kartach ofert: „369 zł · Katowice – Gran Canaria – Katowice (zamiast 800–1200 zł)”, „7 dni | 659 zł”. Grafiki cenowe mówią tym samym językiem.

## Paleta *(od klienta, 2026-10-03)*

| token | hex | rola |
|---|---|---|
| `white` | `#FFFFFF` | napisy, „papier” biletu (u tego klienta czysta biel jest dozwolona) |
| `mist` | `#F7FAFC` | małe słowa, tło jasnych kart, przygaszone ceny |
| `ink` | `#505050` | drugorzędny tekst na białych kartach (miasta, daty, etykiety) |
| `navy` | `#124F81` | ciemna powierzchnia (talon biletu, tablica odlotów, karty z kwotą), cień napisów, tekst na bieli |
| `pink` | `#FF395C` | akcent: słowa `hl`, przekreślenie starej ceny, pieczątka, pigułka CTA, ikona oszczędności |
| `money` | `#3DFF8F` + poświata `#00E676` | **tylko kwoty**: zielony neon (prośba klienta) |

- Neon zielony świeci tylko na ciemnym: na wideo albo na granacie. Nigdy na białej karcie.
- Głębszy odcień granatu (`#0C3A60`) wolno użyć tylko w gradiencie granatowej karty, żeby nie była płaska.
- Nie: pomarańcz (ogólny akcent tu nie obowiązuje), żółty, inne zielenie poza kwotami, gradientowy tekst.

## Napisy: kinetic subtitles *(2026-10-03)*

- **Font: Poppins.** 900 = słowo-klucz i wyróżnienia, 500 = małe słowa. Bez innych krojów i wag w napisach.
- Kolory: małe słowa `mist`, klucz `white`, słowa z `hl` w `pink`. Cień granatowy (`rgba(12,58,96,0.55)`), nie czarny.
- Klucz bez wersalików (jak nagłówki na stronie), chyba że to jedno krótkie słowo-puenta.
- Ruch: **„start samolotu”**. Grupa wjeżdża po lekkiej skośnej (kąt ~6°, który się prostuje), z rozmyciem ruchu i miękkim odbiciem. Wyjeżdża **„odlotem”**: przyspiesza w górę, w kierunku wyjazdu, z rozmyciem. Wyjście szybsze niż wejście. Kierunek zmienia się przy nowym zdaniu (ogólna zasada).
- Klucz robi pop: wpada lekko większy i siada na miejsce.
- **Pieczątka** (puenta, max raz na ~5 s): klucz w biało na różowej pigułce `pink`, wbity jak stempel w paszporcie (obrót −4° → 0°, skala 1,2 → 1, krótki wstrząs).
- **Tablica odlotów** (split-flap): miasto, kraj, kod lotniska albo data w kluczu przewija litery jak tablica na lotnisku i zatrzymuje się na właściwym słowie (~8 klatek). Oszczędnie, tylko przy nazwach miejsc i datach.

## Motywy graficzne *(2026-10-03)*

Jeden świat: **lotnisko i bilet**. Granat to „kabina nocą”, biel to „papier biletu”, róż to „pieczątka i przycisk”, zieleń to „pieniądze”.

- **Karta-bilet (boarding pass):** biały korpus z zaokrągleniem 24 px, perforacja z półkolistymi wycięciami po bokach, granatowy talon. Logo SkyClass w nagłówku biletu, w miejscu nazwy linii.
- **Trasa:** kody lotnisk Poppins 900 (`KTW` → `LPA`), pod nimi miasta w 500 `ink`. Między kodami przerywana łukowa linia, po której przelatuje mały samolot (rysowanie linii + lot).
- **Tablica odlotów:** granatowa, białe klapki split-flap. Do wyliczanek, kroków i list kierunków.
- **Ikony:** liniowe, zaokrąglone, w jednym stylu (samolot, pinezka, walizka, skarbonka, metka, zegar). Bez emoji w grafikach.
- Bez liquid glass u tego klienta. Karty są pełne (biel albo granat) z miękkim cieniem `0 24px 60px rgba(12,58,96,0.35)`.
- Pozycja SkyClass: karty na dole (dolna krawędź 0,94), napis nad nimi (dolna krawędź 0,63). Grafiki pozostają 15% kadru niżej względem pierwszego montażu Alicante; napisy w kolejnych rolkach są 6% kadru wyżej względem Alicante v2 (zwykłe: środek 0,73).

## Kwoty: zielony neon i dolary *(prośba klienta, 2026-10-03)*

Gdy w rolce pada kwota (cena lotu, hotelu, oszczędność, koszt subskrypcji):
- kwota w **zielonym neonie** (`money`): Poppins 900, poświata w kilku warstwach, odliczanie od 0 do wartości;
- **Gotówka wystrzeliwuje bezpośrednio z widocznej kwoty**, z obszaru cyfr, a nie z przesuniętego punktu obok. Punkt startu jest powiązany z aktualną pozycją i rozmiarem kwoty, również podczas jej animacji. Efekt ma być bardziej wizualny: **duże, wyraźne, rozpoznawalne banknoty**, czytelne na ekranie telefonu; znaki **$** mogą je uzupełniać. Bez drobnego pyłu, malutkich symboli ani banknotów zastąpionych ledwie widocznymi kreskami. Przy wejściu 6–10 elementów wystrzeliwuje z cyfr, rozchodzi się wachlarzem na boki i w górę, obraca i wygasa w ~1 s. Jeden wybuch, nie ciągłe sypanie; kwota pozostaje czytelna. **Wytyczna na kolejne montaże — obecnej rolki nie poprawiać.** *(2026-10-03)*
- poświata pulsuje raz przy dojściu do wartości, potem stoi spokojnie;
- waluta zostaje taka, jaką mówi osoba w rolce (zł, €, USD). Znaki „$” to motyw graficzny, nie przeliczenie;
- pełny napis nad kwotą, zgodny 1:1 z wypowiedzią, także gdy kwota jest równolegle na bilecie; nie usuwaj słów ani liczby z transkrypcji.

## Porównanie ceny: „zapłać X zamiast Y” *(prośba klienta, 2026-10-03)*

Animowana karta „okazja” na granatowym tle, w kolejności:
1. pojawia się stara cena Y (`mist`, przygaszona);
2. różowa kreska `pink` przekreśla ją jednym cięciem;
3. wpada nowa cena X w zielonym neonie, z odliczaniem i wybuchem dolarów;
4. wjeżdża pigułka **„Oszczędzasz Z”** z ikoną **skarbonki**, do której wpada moneta. Z = Y − X liczę sam; procent (np. „−65%”) dokładam, gdy robi wrażenie;
5. opcjonalnie trasa nad cenami (`KTW → LPA`), gdy w zdaniu pada kierunek. Wtedy karta staje się biletem z talonem cenowym.

Widełki („800–1200 zł”) pokazuję jako zakres w starej cenie, a oszczędność liczę od dolnej granicy („Oszczędzasz od 431 zł”).

## Przebitki: znane miejsca *(prośba klienta, 2026-10-03)*

- **W każdej rolce SkyClass przynajmniej jedna przebitka musi pokazywać ludzi** — np. rodzinę na wakacjach, uśmiechniętych podróżnych, parę lub znajomych wspólnie cieszących się wyjazdem. Pokazuj naturalne emocje i radość z podróżowania; same krajobrazy, budynki i zwierzęta nie spełniają tej zasady. Ujęcie z ludźmi może jednocześnie pokazywać omawiane miejsce. **Wytyczna na kolejne montaże — obecnej rolki nie poprawiać.** *(2026-10-03)*

Gdy pada kraj, miasto, wyspa albo region, pokazuję **najbardziej rozpoznawalną lokację** tego miejsca:
- najdokładniejsza nazwa wygrywa: miasto > region/wyspa > kraj („Lizbona” → tramwaj 28, nie „Portugalia ogólnie”);
- 1,5–3 s, od ~0,1 s przed słowem z nazwą. Głos mówiącej osoby gra dalej, przebitka bez dźwięku, napisy zostają na wierzchu;
- najwyżej jedna przebitka na zdanie. Przy wyliczaniu kierunków na początku przebitki grają od pierwszego miejsca bez powrotów do twarzy między nimi; w pozostałych fragmentach hak może należeć do twarzy. Przy kilku miejscach w jednym zdaniu: bezpośrednie przejścia między przebitkami;
- **przejście na wejściu: „okno samolotu”.** Przebitka pojawia się w kształcie okna samolotowego (zaokrąglony owal z ramką), które rośnie na cały kadr (~12 klatek). Pod oknem pełnoekranowa poprzednia lub aktualna przebitka, nigdy prowadzący podczas wyliczania miejsc. Zamiennie **„przelot”**: samolot przecina kadr, a za jego smugą odsłania się przebitka;
- **przejście na wyjściu:** odwrotnie: przejście odsłania kolejną przebitkę, nie prowadzącego (~10 klatek). Powrót do prowadzącego dopiero po wyliczaniu;
- **metka miejsca:** obniżona o 15% wysokości kadru względem pierwotnej pozycji biała pigułka z pinezką: nazwa miejsca w 900 `navy`, kraj w 500 `ink`, np. „**Santorini** · Grecja”. Wjeżdża jak klapka tablicy odlotów;
- materiał: pionowe wideo z Pexels/Pixabay (darmowa licencja) albo zdjęcie z powolnym najazdem (Ken Burns). Najchętniej złota godzina, bez napisów i znaków wodnych, bez twarzy patrzących w kamerę. Plik ląduje w folderze rolki jako `broll-<miejsce>.mp4`. **Przed pobraniem pokazuję użytkowniczce listę klipów (źródło, nazwa) do akceptacji.**

### Kraj/miasto → lokacja (punkt wyjścia, uzupełniam na bieżąco)

| miejsce | lokacja |
|---|---|
| Francja / Paryż | Wieża Eiffla |
| Włochy / Rzym | Koloseum |
| Wenecja | Canal Grande z gondolami |
| Hiszpania / Barcelona | Sagrada Família |
| Kanary / Gran Canaria | wydmy Maspalomas |
| Teneryfa | wulkan Teide |
| Portugalia / Lizbona | tramwaj 28 w Alfamie |
| Madera | Pico do Arieiro nad chmurami |
| Grecja | Santorini, Oia (białe domy, niebieskie kopuły) |
| Chorwacja | Dubrownik, mury starego miasta |
| Albania | plaże Ksamil |
| Bułgaria | Nesebyr nad morzem |
| Turcja | balony nad Kapadocją |
| Cypr | Petra tou Romiou |
| Malta | Valletta z wody |
| Wielka Brytania / Londyn | Big Ben i Tower Bridge |
| Holandia / Amsterdam | kanały z kamienicami |
| Niemcy / Berlin | Brama Brandenburska |
| Austria | Hallstatt |
| Szwajcaria | Matterhorn |
| Czechy / Praga | Most Karola |
| Węgry / Budapeszt | Parlament nad Dunajem |
| Islandia | wodospad Seljalandsfoss |
| Norwegia | Lofoty |
| Gruzja | cerkiew Gergeti pod Kazbekiem |
| Egipt | piramidy w Gizie |
| Maroko | Szafszawan (niebieskie uliczki) |
| Kenia | safari w Masai Mara |
| Zanzibar / Tanzania | plaża Nungwi z dhow |
| Wyspy Zielonego Przylądka | plaża Santa Maria na Sal |
| Seszele | Anse Source d'Argent |
| Malediwy | wille na wodzie |
| Mauritius | Le Morne |
| ZEA / Dubaj | Burdż Chalifa |
| Jordania | Petra, Skarbiec |
| Tajlandia | Maya Bay / łodzie longtail |
| Bali / Indonezja | tarasy ryżowe Tegallalang |
| Wietnam | zatoka Ha Long |
| Sri Lanka | pociąg na moście Nine Arch w Elli |
| Japonia | Fuji z pagodą Chureito |
| Chiny | Wielki Mur |
| Indie | Tadź Mahal |
| Singapur | Marina Bay Sands |
| USA / Nowy Jork | panorama Manhattanu / Statua Wolności |
| Meksyk | Chichén Itzá / plaża Tulum |
| Dominikana | plaża Punta Cana / wyspa Saona |
| Kuba | Hawana, stare auta |
| Bahamy / Karaiby | turkusowa woda z lotu ptaka |
| Brazylia / Rio | Chrystus Zbawiciel |
| Peru | Machu Picchu |
| Australia | Opera w Sydney |
| rejs (np. MSC) | statek wycieczkowy na otwartym morzu |
| lotnisko / lounge / business class | kabina business class, lounge, start samolotu o zachodzie |

## Pozostałe grafiki *(2026-10-03)*

- **Tytuł-hak:** pierwotna pozycja górna obniżona o 15% kadru, Poppins 900 `white`, fragment `hl` na różowej pigułce. Pod tytułem przelatuje mały samolot i zostawia przerywaną smugę.
- **Liczby nie-kwotowe** (liczba krajów, lotów, „3x częściej”): licznik w `white` 900 na granatowej karcie. Zieleń jest zarezerwowana dla pieniędzy.
- **Wyliczanki / kroki / kierunki:** tablica odlotów, wiersze „01 · BALI · ✈ BOARDING”, każdy wiersz klapuje, gdy pada.
- **Benefity** (lounge, fast track, bagaż): pigułki-metki bagażowe z ikoną, wjeżdżają po kolei.
- **CTA** (tylko gdy w rolce pada wezwanie typu „link w bio”, „dołącz”): różowa pigułka jak przycisk ze strony („Dołączam do SkyClass”), nad nią logo, kursor-tap. Bez stałego znaku wodnego z logo, chyba że klient poprosi.

## Ruch: tokeny

- Wejścia: sprężyna z małym przestrzeleniem (start samolotu), 10–14 klatek. Wyjścia: przyspieszające, 6–8 klatek.
- Przejścia przebitek: 10–12 klatek, ruch zawsze z jednym kierunkiem lotu w obrębie rolki (lewo → prawo).
- Odliczanie kwot: ~0,8 s, ostatnie cyfry zwalniają.
- Bez ciągłego migania, pulsowania i wiecznie sypiących się dolarów: każdy efekt gra raz.
