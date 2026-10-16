# Happy News — preferencje montażu klienta

Zapisano: **2026-10-15**. Styl w silniku: **`happynews`** (`src/styles/happynews.tsx`, silnik ruchu Bisanza). Prep i QuickContent wykrywają go po „happy-news” w ścieżce / szablonie „Happy News”.

Program newsowy (Happy News, projekt Kacpra Bisanza i Damiana Abramowicza). Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Poprawki dla klienta dopisuję **tutaj** (z datą), potem zmieniam kod.

## Materiał źródłowy *(2026-10-15)*

- Najczęściej **poziomy odcinek z YouTube** (studio, kilka kamer, kilka osób), cięty w QuickContent do pionu 9:16.
- **Kadr podąża za osobą, która mówi.** Automat (QuickContent, `scripts/quickcontent-speaker.mjs`): wykrywa cięcia kamer, na każdym ujęciu znajduje twarze i po ruchu ust przypisuje głos do twarzy (kto mówi), potem śledzi tę twarz. Przy zmianie mówcy w szerokim ujęciu kadr przeskakuje cięciem, nie przejazdem.
- **Ujęcie z omawianego newsa** (materiał reporterski, grafika, nagranie bez mówiącej twarzy) pokazuje się **w całości** — poziomy kadr na środku, pod nim i nad nim rozmyte tło, napisy normalnie pod spodem. Nie przycinać takiego ujęcia do twarzy.
- Rolka wklejona osobno (już pionowa) → bez trackingu, zwykły montaż.

## Napisy *(2026-10-15)*

- Kinetic subtitles **jak u Kacpra Bisanza** (ten sam silnik, warianty ruchu, kreska rysowana pod kluczem).
- **Kreska pod słowem-kluczem różowa albo zielona** — kolor zmienia się między grupami napisów; `hl` w różu.
- **Fonty: Bebas Neue** (słowo-klucz, liczby, tytuły) + **Poppins** 600/400 (małe słowa, etykiety).
- Kolory: róż `#FF3D8B`, zieleń `#2EE06F`, biel `#FFFFFF`, czerń `#0B0B0F` (karty). Dokładną paletę marki uzupełnić, gdy przyjdzie logo do `public/Brandings/HappyNews/`.

## Do ustalenia po rolce testowej

- Odcień różu i zieleni, wielkość napisów, pozycja, hook.

## Układy, tracking i oprawa — 2026-10-15 (najnowsze polecenie)

- Przebitka/zdjęcie związane z tematem: prowadzący na górnej połowie pionu, materiał na dolnej połowie. Gdy jednocześnie mówią dwie osoby (ruch ust obu): automatyczny układ jedna nad drugą, obie z trackingiem, aby zachować reakcje.
- Dwie osoby omawiają przebitkę: materiał zajmuje dolne40% kadru, górne60% podzielone pionowo — jedna osoba po lewej, druga po prawej, każda śledzona osobno. Używać faktycznych widocznych obszarów źródła; nie udawać równoczesnych reakcji materiałem z innej chwili.
- Tracking ma być szybszy i bardziej responsywny. Cięcia kamer przełączane bez powolnego przejazdu; ręczny kadr nadal wyłącza automat.
- Mniej zielonego, więcej różu; róż dominuje w napisach, hooku i akcentach. Hook bez dopisków o kolorze/technicznych instrukcji, z mocnym kontrastem; widoczny w całości od pierwszej klatki, bez animacji wejścia; animacja wyjścia pozostaje.
- Stała mała metka na górnej granicy bezpiecznej strefy: „Pełny materiał dostępny na @ONLYHAPPYNEWS” z ikoną YouTube. Nie zasłania twarzy ani napisów.
- Subtelne emotki Apple przy pasującym wypowiadanym słowie, np. trzmiele→🐝, skuter→🛵, estetycznie połączone ze słowem. Globalna zasada; pełny dostępny zestaw Apple przechowywać lokalnie.
- Pokazywać przy każdej rolce koszt montażu: rzeczywiste tokeny wejścia/wyjścia, koszt API albo użycie konta/subskrypcji. Brak pomiaru kredytów nie jest zerem. Oddzielić poprawki i opis; nie dzielić kosztu analizy arbitralnie między rolki.

## Spokojniejsze kadry i poprawki oprawy — 2026-10-16 (najnowsze polecenie)

- Ograniczyć częste zmiany układu. Przebitkę ze studyjnego ekranu wydzielać tylko w ogólnym ujęciu z dwiema osobami: materiał na dole, obaj prowadzący u góry (60/40). Nie przełączać na podział z przebitką w zbliżeniach pojedynczej osoby. Utrzymywać układ w obrębie ujęcia, bez migania od chwilowych braków detekcji/ruchu ust.
- Śledzona twarz bardziej wycentrowana, mniej zbliżona, bez czarnych pasów u góry i dołu. W układzie pionowym Kacper na górze, Damian na dole; twarz Damiana trochę powyżej środka dolnej połowy. Napisy nieco niżej.
- Metka w dwóch wierszach: „pełny materiał dostępny na” / „@ONLYHAPPYNEWS”, z ikoną YouTube. Mocniejsza waga fontu, proste narożniki, małe odstępy; tło dopasowane do słów każdego wiersza, bez szerokich pustych prostokątów.
- Hook: grubszy font, bez border radius, mniejszy padding; tło tylko za słowami/wierszami, bez pustej przestrzeni na szerokość karty. Widoczny od początku, animacja wyjścia pozostaje.
- Emotka poza zakreślaczem i tłem słowa, tuż za nim, większa i z estetycznym krótkim popem zsynchronizowanym z wypowiedzią.
- W ramach tej korekty poprawić i wyrenderować tylko jedną otwartą rolkę („Zarzuty o rozprzedaż Polski i cisza przy zakupach”), bez ponownej transkrypcji i płatnej redakcji AI. Naprawić blokujący QuickContent brak importu LongFormPlan.

## Korekta po v006: twarz, metka i większe emotki — 2026-10-16 (najnowsze polecenie)

- Napisy i hook przy pojedynczym prowadzącym przesunąć minimalnie niżej, aby nie nachodziły na twarz. Zaakceptowaną pozycję napisów między dwiema osobami zachować.
- Metka: „Pełny materiał dostępny na” / „@ONLYHAPPYNEWS” — duże P, nieco wyżej, oba wiersze o20% większą czcionką; zachować dopasowane do tekstu proste tło.
- Bez animowania zoomu i dalszego eksperymentowania ze zbliżeniem. Kadr jednej osoby około0:24 w v006 jest zaakceptowany — zachować jego skalę; tracking tylko pozycji, bez pompowania wielkości twarzy.
- Nazwy wymienianych krajów można ozdabiać odpowiadającymi flagami. Emotki większe, na końcu powiązanego słowa, poza tłem/zakreślaczem; stały niewielki przechył w lewo/prawo oraz krótki pop. Emotka „zakłady” ma być większa i wyraźnie po słowie.
- W tej iteracji poprawić i wyeksportować dwie rolki: „Zarzuty o rozprzedaż Polski i cisza przy zakupach” oraz „Trzmiel nie zdążył wrócić? Śpi w kwiatku” (przebitka). Nie powtarzać ASR ani płatnej redakcji montażuAI; poprzednie wersje zachować.

## Stabilne okno kamery i automatyczne emotki — 2026-10-16 (najnowsze polecenie)

- Pojedyncza kamera ma nieruchome okno obrazu: granice wideo nie przesuwają się na tle. Tracking działa jako spokojny pan/crop wewnątrz tego okna, z martwą strefą i wygładzeniem; nie reagować na drobne ruchy głowy. Stała skala w ujęciu, bez pompowania zoomu. Rozmyte wypełnienie tła stabilne.
- Emotki dobierane automatycznie częściej do znaczących słów i kontekstu, nie tylko do ręcznie podanych przykładów. Zachować większy rozmiar, pozycję po słowie, lekki przechył i pop. Unikać dekorowania spójników, przypadkowych podobieństw słów i dodawania nowych twierdzeń.
- Poprawić obie ostatnio wskazane rolki: zarzuty/przejęcia i trzmiel z przebitką. Zachować zaakceptowane układy, napisy/hook/metkę oraz poprzednie wersje. Bez ponownego ASR i redakcji montażuAI.

## Zdjęcia na dole i rozmyte wypełnienie — 2026-10-16 (najnowsze polecenie)

- Gdy omawiane zdjęcie/przebitka pojawia się w materiale, pokazywać je w dolnym panelu pionowej rolki. Jeśli źródło przełącza na pojedynczą kamerę, zachować aktualnie omawiane zdjęcie na dole; zmieniać je zgodnie z faktyczną kolejnością zdjęć w źródle, bez podstawiania losowych ilustracji.
- W rolce o trzmielach od0:40 pokazać zdjęcia trzmieli, o których mówią („zdjęcie”, „drugie”, „trzecie”), także podczas zbliżeń prowadzących.
- Bez czarnych pasów po bokach zdjęć/przebitek: dopasowany w całości materiał na pierwszym planie, ten sam materiał powiększony i rozmyty jako wypełnienie panelu. Nie rozciągać zdjęcia ani nie ucinać istotnej części.
- Poprawić i udostępnić do pobrania wyłącznie rolkę o trzmielach, zachowując poprzednie wersje. Tę zasadę dopisać także do skilla montażowego.


## Zakres i trafność emotek — 2026-10-16

- Automatyczne emotki, flagi i pop za słowem są preferencją wyłącznie Happy News, nie regułą globalną innych klientów.
- Dobierać do konkretnego znaczenia w wypowiedzi. Bez ozdabiania słów funkcyjnych, wieloznacznych dopasowań ze słownika i podobnych rdzeni. Nie używać chińskich/japońskich ideogramów ani przycisków CJK, znaków technicznych lub nieczytelnych symboli. Jeśli skojarzenie jest niepewne, pominąć emotkę.
