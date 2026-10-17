## Poprawki po audycie — 2026-10-17

- Wdrożyć pozostałe poprawki audytu z 17 października: ochrona zapisów i uploadów, wersje eksportów, media, QuickContent, biblioteka, landing i kontrola jakości kodu. Temat funkcji LongForm na razie pominąć; nie rozszerzać go ani nie poprawiać jego osobnych ekranów i workflow w tym etapie. Zachować lokalne projekty, źródła i wcześniejsze filmy.

## Landing: nagłówek sekcji montażu — 2026-10-17

- Nagłówek „Ten sam materiał. Inny sposób pracy. / Mniej montowania. Więcej gotowych rolek.” nie może znikać pod hero ani być ucinany przez przypięty kontener. Na niskich ekranach zachować czytelność całej sekcji.

## Landing: sekcja odzyskanego czasu — 2026-10-17

- Przebudować sekcję „Mniej wieczorów nad napisami…”: bardziej estetyczna, wizualna kompozycja zamiast dużego jednolitego akapitu. Zachować przekaz o czasie na pomysły, klientów i życie poza osią czasu.

## Landing: CapCut → MontageFrames, bez infantylnych dekoracji — 2026-10-17

- iPhone może zostać jako podgląd, ale bez rysunkowej osoby w ekranie, emotek i infantylnych dekoracji.
- Najpierw pokazać ręczny montaż w UI inspirowanym CapCutem i dużą liczbę czynności, potem ten sam materiał montowany w MontageFrames: prosto i bezproblemowo, z łatwą edycją napisów. Spokojniejsza, bardziej estetyczna sekcja i czytelna oś czasu; bez wymyślonych pomiarów szybkości.

## Landing: iPhone i prostota edycji — 2026-10-17

- Zamiast obracanego panelu: trwały mockup iPhone’a w 3D, który obraca się podczas przewijania. Najpierw trudny montaż ręczny, następnie AI wykonujące montaż, z gwiazdkami i emotkami.
- Sekcja ma być czytelna i bardziej wizualna: oś czasu inspirowana Premiere Pro, widoczna edycja napisów i jasny przekaz, że obsługa jest banalnie prosta.

## Landing page — ruch i publikacja kodu — 2026-10-17

- Dodać automatyczny motion design do istniejącego landingu: animowane sekcje, przejścia stanów, wyróżnienia i subtelną perspektywę 3D. Zachować czytelność i obsługę ograniczonego ruchu.
- Po sprawdzeniu wysłać zmiany kodu na GitHub bez filmów, plików env i prywatnej historii montażu.

## LongForm: napisy i typografia tylko we wstępie — 2026-10-17

- Bazowo w filmie poziomym **poza wstępem nie robimy napisów ani typografii**. Wyjątek: podkreślenie konkretnego słowa albo dokładniejsze wytłumaczenie danego fragmentu (wtedy napisy/typografia tylko na tym fragmencie, z powodem w planie). Wstęp (hook, napisy, typografia) bez zmian.

## LongForm: AI tylko przez konto CLI — 2026-10-16

- Redakcja, rozdziały, hook, plan efektów i research LongForm idą przez operatora na koncie (Claude Code / Codex CLI), **nie przez płatne API gpt-6-luna**. „Domyślny z ustawień” w LongForm nie może rozwiązać się na płatne API; brak zalogowania = czytelny błąd, bez płatnego fallbacku. GPT-6 Luna zostaje tylko do opisów publikacji (zasada 2026-10-15).

## Montaż poziomy LongForm i plugin Premiere — 2026-10-15 (plan)

- Nowa funkcja (na razie research i plan, bez kodu): montaż poziomych nagrań „gadającej głowy”. Program sam tnie: cisza, „yyy/eee/aaa”, falstarty, dubli i zbędne powtórzenia — **inteligentnie, sens filmu i zdań bez zmian**. Cenzura przekleństw: ok. **80% słowa wyciszone do zera** (początek słyszalny) + **dźwięk kruka**.
- Najpierw **pocięty materiał do przejrzenia**, dopiero po zatwierdzeniu montaż. Program dzieli film na rozdziały i rozpoznaje wstęp; **wstęp ma być angażujący** (hook, typografia, śledzenie twarzy, wycięcie osoby, podmiana tła, 3D, mockup telefonu, logotypy, liczby, wykresy, porównania, napisy z globalnych presetów kinetic i efekty z katalogu `docs/longform/efekty.md`).
- Przebitki z Pexels, animacje, wizualne pokazanie omawianych rzeczy oraz **research tego, co mówi autor, żeby skutecznie doedukować widza** — w LongForm research domyślnie włączony (źródła obowiązkowe). Przejścia na cięciach, branding i preferencje klienta.
- W przyszłości całe MontageFrames jako **plugin Premiere Pro**: montaż i animacje wykonywane na plikach zaimportowanych do projektu Premiere.
- Przy pracy: UI/UX Pro Max, Superpowers, Ponytail, Hook Engineer, Silnik Social Media. Dokumenty: `zalozenia-funkcji-LongForm.md`, `plan-wdrozenia-LongForm.md`, `zalozenia-funkcji-Premiere.md`, `plan-wdrozenia-Premiere.md`, `docs/longform/`, `docs/premiere/`.

## Opisy gotowych rolek — 2026-10-15 (globalnie)

- Po ukończeniu montażu/renderu każdej gotowej rolki, dla każdego klienta oraz bez klienta, przygotować z faktycznej transkrypcji filmu krótki opis do publikacji przez **OpenAI API, model gpt-6-luna**. To jawnie zaakceptowany wyjątek od montażu przez kontoCLI.
- Opis: mocny, prawdziwy hook + krótka puenta zachęcająca do obejrzenia, naturalne słowa kluczowe pod wyszukiwanie i **dokładnie5 hashtagów**. Bez streszczania wszystkiego, lania wody, keywordstuffingu, zmyślania faktów i obietnic, których film nie dowozi. Zachować ton klienta.
- Opis udostępnić przy gotowym filmie wGUI do skopiowania oraz zapisać lokalnie. Koszt opisu pokazywać osobno od montażu. Zmiany samych zoomów/kadru nie powinny ponownie opłacać identycznego opisu; zmiana transkrypcji wymaga aktualnego opisu.
- BłądAPI opisu nie usuwa gotowegoMP4 ani nie wymusza ponownego renderu; pokazać błąd i możliwość ponowienia samego opisu.

## Nowy klient Happy News — 2026-10-15

- Styl `happynews`: napisy jak u Bisanza, kreska pod kluczem różowa albo zielona, Bebas Neue + Poppins. Profil: `klienci/happy-news/PREFERENCJE.md`.
- QuickContent przy poziomym źródle (YouTube, kilka kamer/osób): rozpoznaje cięcia kamer, przypisuje głos do twarzy po ruchu ust i śledzi osobę, która mówi. Ujęcia bez mówiącej twarzy (np. materiał z omawianego newsa) pokazuje w całości (poziomo, z rozmytym tłem) z napisami. Dotyczy wszystkich klientów QuickContent.

## Poprawki użytkowniczki — 2026-10-15: prosty panel i ruch kadru

- QuickContent: zmontowane filmy mają wyraźną zakładkę/przycisk w projekcie, szybkie obejrzenie, poprawki i pobranie. Uprościć panel: główne zadanie i wyniki na wierzchu, opcje techniczne/koszty/historia w ustawieniach lub zwijane.
- Pion9:16 ma płynnie podążać za głową mówcy, utrzymując ją na środku, kiedy przesuwa się w poziomie. Subtelne zoomy. Nie deklarować śledzenia, jeśli detekcja nie zadziałała.
- Gotową rolkę QuickContent o drogim aucie poprawić według profilu Kacpra Bisanza i zachować poprzedni MP4.

# Preferencje montażu — zasady użytkowniczki

Spisane poprawki i życzenia. Mają pierwszeństwo przed domyślnymi ustawieniami.
Każdą nową poprawkę dopisuję tutaj (z datą), zanim zmienię kod.

## QuickContent — założenia nowej funkcji *(2026-10-14)*

- **Operator terminalowy i naprawa montażu *(2026-10-15)*:** QuickContent ma obsługiwać Claude Code i Codex przez lokalne CLI, na zalogowanym koncie, jako alternatywę dla osobno płatnego API. Wybór operatora ma być jawny w GUI i działać również przy uruchomieniu zadania z terminala. Sprawdzić i naprawić rzeczywisty błąd montażu API; zachować transkrypcję, selekcję i dotychczasowe poprawki.
- **Pion i koszty *(2026-10-15)*:** fragmenty wynikowe mają być wycięte i wykadrowane do9:16; w GUI wybór rozdzielczości wyjściowej. Dla oszczędności wycinanie, pionowe kadrowanie i montaż dopiero po wyborze propozycji i kliknięciu przycisku montażu, bez kosztownej obróbki wszystkich propozycji. Pokazuj oddzielnie koszt analizy, montażu i kolejnych poprawek, z rozróżnieniem kosztu rzeczywistego, oszacowania i brakujących danych.
- **Widoczność transkrypcji *(2026-10-15)*:** długie oczekiwanie na Whisper bez informacji jest punktem irytacji. Pokazuj prawdziwy postęp procentowy, przetworzony fragment/całość, aktualny krok i czas pracy; sprawdź też przyczynę wolnego działania. Procent ma wynikać z pracy narzędzia, bez animowanego zgadywania.
- **Operator AI *(2026-10-15)*:** użytkowniczka poleciła skopiować `.env` z projektu AnimaFX i użyć jego konfiguracji, aby naprawić `Invalid MCP configuration: mcpServers: Invalid input` oraz uruchomić dalsze przetwarzanie QuickContent. Kluczy nie wypisywać w logach ani czacie.

- **Kontynuacja i priorytet *(2026-10-15)*:** finisz aplikacji dzielić na etapy, jeśli całość grozi przekroczeniem limitu; po etapie zapisać stan i następne zadania. Użytkowniczka poleciła od razu naprawić błąd YouTube `HTTP403` przy yt-dlp2026.07.04 i ponowić rzeczywiste pobieranie.

- **Zgoda na wdrożenie *(2026-10-14)*:** użytkowniczka poleciła rozpocząć implementację przygotowanych założeń i planu QuickContent. Etapy może dobrać Codex; podczas całego wdrożenia korzystać z Ponytail, UI/UX Pro Max i Superpowers. Zgoda obejmuje kod oraz integrację przez obecne GUI, nie tylko dalszą dokumentację.

- Użytkowniczka zleca research i plan wdrożenia modułu QuickContent w obecnym GUI: link YouTube lub lokalny film → propozycje kompletnych rolek → wybór → montaż według klienta → korekty i pobranie. Dokumentacja ma obejmować założenia funkcji, plan wdrożenia i instrukcje w `AGENTS.md`. Przy planowaniu używać Ponytail, UI/UX Pro Max i Superpowers.
- YouTube: osobno obraz bez audio w 1080p albo 4K, osobno najlepsza dostępna ścieżka audio, tytuł i metadane; ffmpeg łączy strumienie. Gotowy materiał źródłowy zostaje lokalnie w folderze wybranego istniejącego klienta; bez klienta w przestrzeni roboczej. Nie deklarować 4K, jeśli źródło go nie udostępnia.
- Transkrypcja QuickContent przez Whisper. Analiza ma znajdować ciekawe, mocne, kontrowersyjne lub mające potencjał na rolki fragmenty. W GUI: klient i branding/szablon, tryb Auto albo tekstowe wskazówki tematów, preferowana długość, przycisk „Przetwarzaj”; praca w tle.
- Najpierw maksymalnie wiele sensownych propozycji, bez automatycznego montażu. Każda ma zrozumiały początek, rozwinięcie i puentę, opis tematu oraz uzasadnioną ocenę charakteru/potencjału. Przycisk „Znajdź więcej” szuka nowych fragmentów bez powielania poprzednich; nie wymyśla treści, gdy materiał się wyczerpał.
- Montować tylko zaznaczone propozycje. GUI pokazuje liczbę gotowych rolek, etapy i rzeczywisty postęp; po poprawnym zakończeniu wybranego montażu i renderu oznacza fragment „Zmontowane”. Dostępne: podgląd, ręczna korekta tekstu transkrypcji bez przesuwania czasów, czat do poprawek i pobranie aktualnego renderu.
- Selekcja fragmentu nie pozwala zmieniać sensu wypowiedzi; w późniejszym montażu obowiązują preferencje klienta, w tym SkyClass: pełna wypowiedź i cisza wewnątrz wybranego fragmentu. Szczegóły architektury i domyślne ustawienia zapisane w dokumentacji QuickContent są propozycjami wdrożeniowymi, nie istniejącą funkcją panelu.

## Motion Studio — dodatkowa funkcja *(2026-10-13)*

- Na polecenie użytkowniczki poradnik „How to Build a Motion Design Studio With Opus 5.5” wdrażamy jako **osobny moduł w MontageFrames**, wykorzystujący istniejące Remotion, panel i narzędzia. Nie zastępuje montażu rolek, edycji transkrypcji ani stylów klientów i nie przebudowuje ich wyglądu.
- Motion Studio: brief i prawdziwe materiały → plan ujęć → podgląd klatek i kontrola czytelności → poprawki → render. Modele i dostęp do AI z obecnych ustawień; nie wymuszać modelu z tytułu PDF, nie włączać płatnych API ani automatycznej publikacji przy instalacji.
- Nie wymyślać ekranów produktu, liczb, opinii ani wyników kontroli jakości. Referencja służy do analizy języka ruchu, nie kopiowania cudzych znaków/treści. Zasady i istniejący branding klienta mają pierwszeństwo przed przykładami wyglądu z poradnika.
- Niezapisane zmiany i gotowe materiały pozostają nienaruszone. Rendery motion dla klienta również trafiają do `klienci/<klient>/Render/`; pokazy/testy do `out/`.

## Pliki wynikowe

- **Rendery w folderze klienta.** Gotową rolkę klienta zapisuj zawsze w `klienci/<klient>/Render/<nazwa>.mp4` (struktura: Klienci → nazwa klienta → Render), nie we wspólnym `out/`. Brakujący folder `Render` tworzy się przy renderze. W `out/` zostają tylko rolki bez klienta (testy, pokazówki). *(2026-10-06)*

## Hook na początku rolki *(2026-10-09)*

- **Każda rolka zaczyna się tekstowym hookiem: 2–5 słów** u góry kadru (grafika `title`, pierwsze ~2–3 s), który najlepiej streszcza film albo zatrzymuje scroll: pytanie, mocne stwierdzenie, kontrowersja, liczba, wywołanie emocji.
- Hook dobieram skillem **`hook-engineer`** (bank formuł szkieletowych PL + taksonomia typów, tier 1: kontrast, contrarian, liczba, self-relevance, open loop). Rozważam 3 warianty, wybieram najlepiej dopasowany do treści i przepuszczam przez jego anti-cringe check: konkret zamiast ogólnika, działa na wyciszonym telefonie, zero hype'u i „szokujących” dopowiedzeń, hook obiecuje tylko to, co rolka dowozi.
- Rejestr i zakazy klienta mają pierwszeństwo (np. GlowUp: bez działania przypisanego produktowi i bez wykrzykników; Herod: tylko miękkie typy). Hook nie zasłania twarzy i stoi w strefie bezpiecznej (od y ≈ 250 px).
- Hook to osobny tekst — napisy wypowiedzi zostają (w SkyClass zawsze 1:1); zdejmuję je tylko, gdy hook powtarza to samo zdanie. Gdy w nagraniu jest już wypalony hak, nie dokładam drugiego.

## Napisy

- **Bez „samosiek” (wiszących krótkich słów).** Nigdy nie zostawiaj „i”, „a”, „o”, „u”, „w”, „z” ani innych krótkich spójników i przyimków (np. „do”, „na”, „od”, „po”, „za”, „ze”, „we”) samotnie w osobnej linii ani na końcu linii, akapitu lub grupy napisów, gdy dalszy ciąg trafia do następnej. Łącz je z następującym słowem w tej samej linii i grupie (np. „w SkyClass”, „z tego”, „i rezerwujesz”); przy łamaniu tekstu przenoś cały taki fragment razem, używając spacji nierozdzielającej. Dotyczy też podziału wokół dużego słowa-klucza oraz animacji: krótkie słowo nie może przez moment wisieć samo — pokaż je razem z następnym słowem, zachowując pełny tekst wypowiedzi. *(2026-10-03)*

- **Napisy zawsze pod twarzą, nigdy na niej.** Zanim nałożę napisy, sprawdzam, gdzie mniej więcej jest twarz w kadrze (arkusz klatek co ~5 s z liniami pomocniczymi, dolną krawędź twarzy z zapasem na ruch zapisuję jako `face.bottom` w `reel.json` — silnik stawia napis nad kartą pod nią). Napis, tytuł-hak i każdy tekst stoją poniżej dolnej krawędzi twarzy (z zapasem), z uwzględnieniem zoomu ujęcia. Gdy napis stoi nad kartą, karta jest na tyle niska, żeby oba zmieściły się pod twarzą w strefie bezpiecznej. Przy kontroli klatek sprawdzam to na każdej grafice. *(2026-10-09)*
- **Urozmaicone wejścia słów, mniej „pop out”.** Pop out (wyskakiwanie) to przyprawa, nie domyślny ruch: maks. kilka razy na rolkę, przy prawdziwej puencie. Wejścia dobieram do sensu i mieszam: `color` (słowo zalewa się kolorem akcentu), `slide` (wsuwa się z boku), `bounce` (spada ze sprężystym odbiciem), `wiggle` (wchodzi z krótkim zakołysaniem), `rise`/`drop` (spod maski), `letters` (litera po literze). Bez dwóch takich samych wejść pod rząd. Zakreślacz `hl` domyślnie przejeżdża od lewej zamiast wyskakiwać. *(2026-10-09)*
- **Styl bazowy:** jak u Krzysztofa Persony / Toma Pietrzyka: płynne wjazdy i wyjazdy (lewo/prawo, góra/dół), słowo-klucz duże, reszta mała, estetyczna typografia, która dodaje rolce wartości. *(2026-10-02)*
- **2–6 słów naraz**, napis trzyma się dłużej na ekranie, żeby nie migał. *(2026-10-02)*
- **Zwarte, nie rozrzucone:** słowa stoją blisko siebie, wycentrowane, jako jeden blok. Żadnego rozrzucania słów po kadrze na lewo i prawo (np. „Spróbuj tego w swojej następnej rolce” ma być jednym zgrabnym blokiem). Dozwolone układy: `stack` i `inline`. *(2026-10-02)*
- Linie małych słów łamane równo, bez samotnego słowa w linii. *(2026-10-02)*
- Ma być kreatywnie: zmiana kierunku wjazdu przy nowym zdaniu, akcenty kolorem na liczbach i puentach, pop słowa-klucza. *(2026-10-02)*

## Strefa bezpieczna (Instagram Reels i TikTok) *(2026-10-08)*

Kadr 1080×1920. Napisy, grafiki, logo i CTA trzymam tam, gdzie nie zasłoni ich interfejs żadnej z platform. Rolka idzie na oba serwisy, więc obowiązuje część wspólna:

| krawędź | Instagram Reels | TikTok | wspólna strefa |
|---|---|---|---|
| góra | ~220–250 px (nagłówek, „Rolki”, kamera) | ~150–160 px (Obserwowani / Dla Ciebie) | **od y ≈ 250 px (0,13)** |
| dół | ~320–400 px (nick, opis, dźwięk) | ~450–480 px (nick, opis, dźwięk, pasek) | **do y ≈ 1440 px (0,75)** dla tekstu ważnego na TikToku; na samego Instagrama do ~1520 px (0,79) |
| prawo | ~120–140 px (serduszko, komentarze, udostępnij) | ~140–160 px (avatar, akcje) | **bez prawych 150 px (x ≤ 930)** |
| lewo | ~40 px | ~60 px | **od x ≈ 60 px** |

- Najważniejsze treści (kwoty, numer telefonu, CTA, słowo-klucz) celuję w środek strefy, nie w jej brzeg.
- Napisy wyrównane do prawej kończą się przed prawym pasem przycisków (x ≤ 930), nie przy krawędzi kadru.
- Twarz i tak ma pierwszeństwo: jeśli strefa wypada na twarz, przesuwam grafikę, a nie twarz zasłaniam.
- Przy kontroli klatek sprawdzam, czy dolna krawędź kart i bloków napisów nie schodzi poniżej 0,75 (TikTok) lub 0,79 (tylko Instagram).

## Grafiki i animacje

- **Logo przy wzmiance o firmie lub platformie.** Gdy w wypowiedzi pada nazwa marki, firmy, aplikacji lub platformy (np. Facebook, Instagram, WhatsApp, XTB), pobierz jej właściwe logo **bez tła** (przezroczysty PNG lub SVG), najlepiej z oficjalnych materiałów marki. Dodaj je do animacji albo jako osobny element graficzny pojawiający się w rolce w momencie wzmianki. Logo ma być czytelne, zachowywać oryginalne proporcje i nie zasłaniać twarzy ani napisów. **Zasada obowiązuje w kolejnych montażach; nie poprawiaj aktualnej rolki bez osobnego polecenia.** *(2026-10-03)*

- **Wykresy, liczniki, listy i karty są na dole, pod napisami.** Napis stoi wtedy tuż nad grafiką. Wyjątki: tytuł-hak (góra kadru) i emoji. *(2026-10-02)*
- Grafiki nie zasłaniają twarzy. *(2026-10-02)*
- **Estetycznie, ale nie ubogo:** czysto i z powietrzem, bez krzykliwych efektów — ale animacje mają życie: sprężyste wejścia, odliczanie liczb, rysowanie linii i pasków, pop znaczników, połysk. Wersja „same cienkie linie bez tła” była za bardzo uproszczona. *(2026-10-02)*
- **Tło grafik: liquid glass.** Każdy wykres/licznik/lista/porównanie stoi na karcie jak dawniej, ale ze szkła: ciemniejsza, półprzezroczysta, z mocnym rozmyciem tego, co jest za nią (wideo w tle zblurowane), z delikatnym połyskiem krawędzi. *(2026-10-02)*
- **Kolor akcentu: pomarańczowy, nie żółty** (grafiki i akcenty w napisach). *(2026-10-02)*

## Research i wizualizacje danych *(2026-10-09)*

- **Funkcja dostępna dla każdej rolki, ale domyślnie wyłączona.** Gdy w wypowiedzi pada zjawisko, badanie, norma albo statystyka, mogę znaleźć wiarygodne źródło (wytyczne, recenzowane publikacje, PubMed, WHO, EFSA, GUS) i pokazać dokładne dane z niego jako wykres, animację procesu, licznik, skalę lub porównanie. Taka grafika może zająć cały ekran. Zawsze dodaję podpis „Źródło: …”, a link zapisuję w `public/reels/<nazwa>/sources.md`. Nie pokazuję liczb, których nie ma w źródle.
- **Kiedy stosuję:** tylko wtedy, gdy włącza go plik klienta (dziś: GlowUp Nutrition, Vital Hormone) albo użytkowniczka poprosi o to przy danej rolce. W pozostałych rolkach **nie dodaję go sam**. Po oddaniu gotowej rolki pytam, czy chce wersję z researchem, i wypisuję konkretne miejsca (np. „0:12 francuski paradoks → wykres ze źródłem”). W zleceniu z panelu, gdzie nie mogę zadawać pytań, umieszczam tę propozycję w podsumowaniu.

## Efekty dźwiękowe

- **Głośność SFX: 10 dB poniżej oryginalnego filmu.** Ustawiaj efekty względem poziomu dźwięku oryginalnego nagrania w danym fragmencie, aby nie raziły w ucho i nie zagłuszały wypowiedzi. To różnica poziomów **−10 dB**, nie docelowe −10 dBFS ani mechaniczne ściszenie każdego pliku efektu o 10 dB bez porównania z nagraniem. Po dopasowaniu poziomu odniesienia mnożnik amplitudy wynosi `10^(-10/20) ≈ 0,316`. Przy pauzie odnoś się do sąsiedniej wypowiedzi, nie podbijaj efektu; sprawdź miks odsłuchem. Klient może wymagać jeszcze subtelniejszych efektów. Zasada obowiązuje w kolejnych montażach. *(2026-10-03)*

- **Dodawaj efekty dźwiękowe pasujące do treści i animacji.** Przy pokazaniu kwoty lub wystrzale gotówki używaj dźwięku kasy fiskalnej (**cash register**); ważne wejście lub akcent animacji podkreśl krótkim **popem**. Dobieraj także inne pasujące dźwięki, np. whoosh przy przelocie lub przejściu, klik przy przycisku albo powiadomienie przy wiadomości. Synchronizuj efekt z konkretnym zdarzeniem na ekranie, stosuj go z umiarem i ustawiaj głośność tak, by wypowiedź pozostawała wyraźna. **Zasada obowiązuje w kolejnych montażach; nie poprawiaj gotowych rolek bez osobnego polecenia.** *(2026-10-03)*

## Dane i dublowanie tekstu

- **Nie dublować:** grafika i napis nie mówią tego samego. Grafika pokazuje dane (kwoty, liczby, %, punkty listy), napis niesie resztę zdania. *(2026-10-02)*
  - liczba w grafice → w napisie zostaje tylko wstęp/kontekst, bez tej liczby; jeśli liczba jest bohaterem, napis nad nią bez dużego słowa-klucza (`key: -1`), np. „zrobiły ponad” + licznik „120 000 wyświetleń”;
  - lista / porównanie pokazują punkty, gdy padają → napisy w tym czasie znikają;
  - karta bez nagłówka, jeśli nagłówek powtarzałby napis;
  - tytuł-hak zastępuje napisy tego samego zdania.
- Każda decyzja ma być przemyślana pod widza, a nie mechaniczna. *(2026-10-02)*

## Fonty

- W bazie (`src/fonts.ts`): **Nunito** (domyślny), **Fustat**. MADE Tommy Soft, gdy pojawią się pliki. *(2026-10-02)*
- **Bez Times New Roman** — usunięty z bazy i z grafik; etykiety w tym samym bezszeryfie co napisy. *(2026-10-02)*

## Oś czasu w Studio

- **Stała lista wszystkich elementów montażu.** Oś czasu ma stale pokazywać wszystkie ujęcia, grupy napisów i grafiki, z czytelnymi nazwami i rzeczywistymi czasami. Przewijanie i odtwarzanie nie mogą dodawać ani usuwać ścieżek. Nie ukrywaj elementów tworzonych z danych jako duplikatów kodu; wewnętrzne kontenery, kopie mediów do rozmycia i części animacji nie tworzą osobnych ścieżek. Dotyczy wszystkich stylów. *(2026-10-08)*

- **Bloki osi czasu pozostają klikalne i edytowalne w inspektorze.** Stabilność listy nie może wyłączać zaznaczania ani edycji. Domyślne ustawienia każdej kompozycji muszą dać się zapisać bez ostrzeżenia o defaultProps. *(2026-10-08)*

## Panel montażowy

- **Ręczna korekta transkrypcji jest najważniejszą funkcją.** Panel ma być prosty do zrozumienia; tekst wypowiedzi musi dać się poprawić manualnie po montażu, z czytelnym zapisem i podglądem. *(2026-10-08)*
- **Przepływ jak w AnimaFX:** zaczynamy od dodania filmu, następnie wybieramy branding i dostawcę AI oraz wytyczne; AI montuje film na ich podstawie, a potem można poprawić transkrypcję i inne szczegóły. Do pracy nad panelem używamy UI/UX Pro Max, Superpowers i Impeccable. *(2026-10-08)*

## Nowe skille motion design *(2026-10-14)*

- Zainstalować OneTake, lemo-opuscar, ClaudeAnimationBase i gbro-collage-broll globalnie w Codexie i Claude Code. Przy motion design szczególnie korzystać z OneTake: ciągłość ruchu, widoczna przyczyna kolejnej animacji, elementy przechodzące między etapami i spokojna końcowa pauza. Dobierać pozostałe skille do zadania i respektować licencje ich kodu.

## Co oznacza styl OneTake *(2026-10-14)*

- Użytkowniczka oczekuje płynnych najazdów i przejść między sceneriami: zoom na samolot, przejście przez jego okno i wejście w przebitkę plaży. Samo użycie funkcji easing OneTake w animowanym bilecie nie spełnia tej intencji. Motion ma być widoczny w pracy kamery i ciągłości świata, a nie wyłącznie w animowaniu treści karty.


## Hook otwarcia nad głową — 2026-10-15 (obowiązuje przy poprawkach)

- Każda montowana rolka ma wyraźny tekst hooka **nad głową przez pierwsze3 sekundy**. Istniejącego hooka nie usuwać przy zmianie napisów, stylu, trackingiem ani porządkowaniu montażu. Kolizję rozwiązać pozycją, rozmiarem lub kadrem, zachowując tekst. Zmiana/usunięcie tylko na wyraźne polecenie użytkowniczki.
- Formę opracowywać z **Hook Engineer** (`hook-engineer`) i **Silnik Social Media** (`silnik-social-media`): konkret, liczba/kontrast/problem lub uczciwa luka ciekawości, krótki overlay≈5–8 słów czytelny bez dźwięku, obietnica spełniona przez fragment, bez pustego clickbaitu, zmyślonych faktów i guru-hype. Struktura historii: hook → zaciekawienie → konkrety/payoff → domknięcie; bez dopisywania obcego audio lub fikcyjnegoCTA do źródła.
- Skille dostarczają strukturę; głos, kolory i zakazy klienta mają pierwszeństwo. Nie przenosić osobistego tonu Wiktorii do klientów. Przy nowym hooku rozważyć3 różne kąty i wybrać najmocniejszy zgodny z nagraniem; istniejący zaakceptowany hook zachować.
- Hook to osobna warstwa od napisów wypowiedzi. Zachować pełną treść nagrania i wymagane napisy (SkyClass1:1); nie usuwać ich mechanicznie tylko dlatego, że na górze jest hook.


## Aktualizacja położenia hooka — 2026-10-15 (najnowsze polecenie, zastępuje „nad głową”)

- Hook przez pierwsze3s ma być **pod tekstem / pod napisami wypowiedzi**, nie nad głową. Zachować odstęp i nie nakładać warstw. Na te3s podnieść zwykłe napisy pod twarz, a krótki hook umieścić niżej.
- Docelowo całość w bezpiecznej strefie IG/TikTok: dolna krawędź ważnej treści≈0,75, prawa≤930/1080, lewa≥60/1080. Minimalne wejście w safezone tylko jeśli nie da się inaczej; najpierw zmniejszyć/zwęzić hook, skorygować układ i kadr. Twarz odsłonięta.
- Obowiązek zachowania hooka i zasady Hook Engineer + Silnik Social Media pozostają. Aktualne położenie ma pierwszeństwo przed starszą instrukcją „nad głową”.


## Opisy rolek: pierwsza osoba i własne wytyczne — 2026-10-15

- Opis pisać w pierwszej osobie, z perspektywy autora/mówcy (np. „W tej rolce omawiam…”), bez narracji „[nazwa klienta] mówi o…”. Zachować krótki hook, naturalne słowa kluczowe, puentę i5hashtagów.
- Przed generowaniem opisu dostępne pole własnego tekstu/wytycznych. Gotowy opis można od razu poprawić i zapisać w aplikacji; ręczna edycja bez kolejnego kosztu API. Wytyczne obowiązują globalnie dla wszystkich klientów.

## Naprawa pobierania YouTube 4K — 2026-10-15

- Naprawić błąd „Brak oddzielnego obrazu lub oryginalnej ścieżki audio” po wyborze 4K i ponowić rzeczywiste pobieranie wskazanego w projekcie filmu. Zachować przepływ jak w VSKTools: osobny obraz do 4K, osobne oryginalne audio, tytuł YouTube, następnie scalenie FFmpeg bez zbędnej kompresji. Zatrzymać poprzedni proces MontageFrames i uruchomić panel lokalnie ponownie.
- Doprecyzowanie: gdy wybrane 4K jest niedostępne, automatycznie pobrać najlepszą dostępną jakość (dla aktualnego filmu Happy News: 1080p), z informacją o faktycznej rozdzielczości.

## Emotki przy słowach i koszt pojedynczej rolki — 2026-10-15

- Happy News (zakres sprostowany 2026-10-16): subtelna pasująca emotka Apple obok wypowiadanego słowa (np. trzmiele→🐝, skuter→🛵), zsynchronizowana z nim, bez zasłaniania treści/twarzy; pełny dostępny zestaw lokalny. Zachować tekst i czas słowa.
- Pokazywać dla pojedynczego filmu zmierzone tokeny i koszt/kredyty montażu; rozróżniać API i konto terminalowe, poprawki i opis. Nie wymyślać zużycia kredytów ani traktować brakujących danych jako zera. Szczególne układy i oprawa Happy News w pliku klienta.


## Zakres emotek i branding klientów — 2026-10-16 (najnowsze sprostowanie)

- Automatyczne emotki przy wypowiadanych słowach, flagi, duży rozmiar i pop dotyczą wyłącznie klienta Happy News. Wcześniejsze słowo „Globalnie” w sekcji emotek było błędne; nie przenosić tej oprawy na innych klientów. Globalna informacja o kosztach pozostaje.
- Każdy klient ma własny styl i preferencje. Kacper Bisanz: styl bisanz, biel i niebieski #066FED, nigdy pomarańcz persona. Przy poprawkach istniejącego projektu zachować źródło, transkrypcję i wcześniejsze rendery.
- Nie dobierać przypadkowych emotek na podstawie wieloznacznych słów, podobnych rdzeni ani znaków/przycisków z ideogramami CJK. Brak jednoznacznego dopasowania oznacza brak emotki.
## Panel UI/UX: biel, niebieski i prostota — 2026-10-17

- Odświeżenie całego panelu MontageFrames: białe/jasne powierzchnie i niebieski akcent, intuicyjna i prosta obsługa. Główne zadanie oraz wyniki na wierzchu; szczegóły i dodatkowe opcje pod „Szczegóły” / „Więcej ustawień”.
- Kierunek projektowy z pomocą skilla `gpt-taste`, podporządkowany prostocie aplikacji roboczej. Na tym etapie użytkowniczka zamówiła plan do wdrożenia, bez implementacji UI.
- Po akceptacji: najpierw opublikować na GitHub aktualną bazę programu z klientami i preferencjami, bez filmów, sekretów i lokalnych projektów; następnie wdrażać zaakceptowany plan panelu. Zgoda na wdrożenie: 2026-10-17.
- Rozszerzenie 2026-10-17: README ma prowadzić osobę instalującą projekt przez pełne wymagania i konfigurację. Aplikacja ma okresowo sprawdzać przez internet nowe wersje z repo GitHub i umożliwiać aktualizację. Własnych klientów i zmodyfikowanych szablonów nie nadpisywać; aktualizować wyłącznie pliki zarządzane w paczce autora, z zachowaniem lokalnych danych.

## Instalacja na subskrypcji CLI — 2026-10-17

- Osoby pobierające repo mają dostać pełną instrukcję używania Claude Code / Codexa na własnej subskrypcji zamiast API. Dodano jawny tryb account-only oraz wybór operatora opisu publikacji; wcześniejsze API GPT-6 Luna pozostaje domyślne dla dotychczasowej konfiguracji, a tryb konta może generować także opisy przez CLI. Nie przedstawiać limitów subskrypcji jako nieograniczonego użycia. Zwykły panel rolek i Motion Studio obecnie mają operatora Claude Code; Codex jest dostępny w QuickContent/LongForm oraz jako agent terminalowy repo.

## Landing i oferta MontageFrames — 2026-10-17

- Landing dla twórców i małych agencji, ceny w PLN miesięcznie, pakiety liczby rolek i tokenów poprawek. Porównanie z Submagic, Captions i dodatkową konkurencją; aktualne źródła. Akcent na oszczędność ręcznej pracy, proces od wgrania do podglądu i eksportu, wejście do panelu na górze. Właścicielka wybrała budowę bezpośrednio w kodzie i zaakceptowała połączenie osi procesu, demonstracji przed/po oraz kalkulatora czasu.
- Deklaracja właścicielki: 96% trafności polskich napisów przy dźwięku wyraźnym i zrozumiałym dla ludzkich uszu. Nie przedstawiać jako benchmark wykonanego badania. Własne konta Claude Code/Codex bez wymogu API; Hermes, agent głosowy i Dysk Google jako funkcja w przygotowaniu, nie gotowa integracja.

## Panel brandingu klientów — 2026-10-17

- Korekta 2026-10-17: panel ma obejmować rzeczywiste, wcześniej ustalone style klientów i ich PREFERENCJE.md, z zgodnym podglądem oraz wyborem w zwykłych rolkach i QuickContent. Nie podstawiać ogólnego stylu w miejsce Bisanza, SkyClass ani innych uzgodnionych opraw. Przed wdrożeniem tej korekty wysłać bieżące zmiany aplikacji na GitHuba.
- Wdrożyć przygotowany plan brandingu; równolegle przygotować instrukcję publikacji projektu na Vercelu, dopasowaną do importu repo GitHub.
- Potwierdzone: jeden wspólny profil brandingu dla zwykłych rolek i QuickContent; zmiany wyglądu dotyczą nowych montaży, wcześniejsze filmy zachowują swoją wersję.
- Dodać osobny panel do tworzenia i edycji brandingu klienta oraz wyglądu rolek; najpierw research techniczny i projekt funkcji.
- Panel: upload logo, zdjęć i przebitek z opisami, adres strony do pozyskania wiedzy i wyglądu, paleta maksymalnie 4–6 kolorów, pole własnych informacji.
- Fonty: bazowo wybór z lokalnie zainstalowanych, upload własnych oraz wyszukiwarka Google Fonts / pobranie po nazwie.
- Wygląd napisów: zwykłe, kinetic, pop-out; osobne ustawienia wyróżniania/podkreślania słów i emotek; możliwość późniejszego rozwoju stylów.
- Przy projektowaniu używać design-taste-frontend w jego zakresie, Ponytail, UI/UX Pro Max i Impeccable. Projekt otworzyć lokalnie w karcie Codex.
