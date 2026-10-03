# Preferencje montażu — zasady użytkowniczki

Spisane poprawki i życzenia. Mają pierwszeństwo przed domyślnymi ustawieniami.
Każdą nową poprawkę dopisuję tutaj (z datą), zanim zmienię kod.

## Napisy

- **Bez „samosiek” (wiszących krótkich słów).** Nigdy nie zostawiaj „i”, „a”, „o”, „u”, „w”, „z” ani innych krótkich spójników i przyimków (np. „do”, „na”, „od”, „po”, „za”, „ze”, „we”) samotnie w osobnej linii ani na końcu linii, akapitu lub grupy napisów, gdy dalszy ciąg trafia do następnej. Łącz je z następującym słowem w tej samej linii i grupie (np. „w SkyClass”, „z tego”, „i rezerwujesz”); przy łamaniu tekstu przenoś cały taki fragment razem, używając spacji nierozdzielającej. Dotyczy też podziału wokół dużego słowa-klucza oraz animacji: krótkie słowo nie może przez moment wisieć samo — pokaż je razem z następnym słowem, zachowując pełny tekst wypowiedzi. *(2026-10-03)*

- **Styl bazowy:** jak u Krzysztofa Persony / Toma Pietrzyka: płynne wjazdy i wyjazdy (lewo/prawo, góra/dół), słowo-klucz duże, reszta mała, estetyczna typografia, która dodaje rolce wartości. *(2026-10-02)*
- **2–6 słów naraz**, napis trzyma się dłużej na ekranie, żeby nie migał. *(2026-10-02)*
- **Zwarte, nie rozrzucone:** słowa stoją blisko siebie, wycentrowane, jako jeden blok. Żadnego rozrzucania słów po kadrze na lewo i prawo (np. „Spróbuj tego w swojej następnej rolce” ma być jednym zgrabnym blokiem). Dozwolone układy: `stack` i `inline`. *(2026-10-02)*
- Linie małych słów łamane równo, bez samotnego słowa w linii. *(2026-10-02)*
- Ma być kreatywnie: zmiana kierunku wjazdu przy nowym zdaniu, akcenty kolorem na liczbach i puentach, pop słowa-klucza. *(2026-10-02)*

## Grafiki i animacje

- **Logo przy wzmiance o firmie lub platformie.** Gdy w wypowiedzi pada nazwa marki, firmy, aplikacji lub platformy (np. Facebook, Instagram, WhatsApp, XTB), pobierz jej właściwe logo **bez tła** (przezroczysty PNG lub SVG), najlepiej z oficjalnych materiałów marki. Dodaj je do animacji albo jako osobny element graficzny pojawiający się w rolce w momencie wzmianki. Logo ma być czytelne, zachowywać oryginalne proporcje i nie zasłaniać twarzy ani napisów. **Zasada obowiązuje w kolejnych montażach; nie poprawiaj aktualnej rolki bez osobnego polecenia.** *(2026-10-03)*

- **Wykresy, liczniki, listy i karty są na dole, pod napisami.** Napis stoi wtedy tuż nad grafiką. Wyjątki: tytuł-hak (góra kadru) i emoji. *(2026-10-02)*
- Grafiki nie zasłaniają twarzy. *(2026-10-02)*
- **Estetycznie, ale nie ubogo:** czysto i z powietrzem, bez krzykliwych efektów — ale animacje mają życie: sprężyste wejścia, odliczanie liczb, rysowanie linii i pasków, pop znaczników, połysk. Wersja „same cienkie linie bez tła” była za bardzo uproszczona. *(2026-10-02)*
- **Tło grafik: liquid glass.** Każdy wykres/licznik/lista/porównanie stoi na karcie jak dawniej, ale ze szkła: ciemniejsza, półprzezroczysta, z mocnym rozmyciem tego, co jest za nią (wideo w tle zblurowane), z delikatnym połyskiem krawędzi. *(2026-10-02)*
- **Kolor akcentu: pomarańczowy, nie żółty** (grafiki i akcenty w napisach). *(2026-10-02)*

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
