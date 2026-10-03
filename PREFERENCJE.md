# Preferencje montażu — zasady użytkowniczki

Spisane poprawki i życzenia. Mają pierwszeństwo przed domyślnymi ustawieniami.
Każdą nową poprawkę dopisuję tutaj (z datą), zanim zmienię kod.

## Napisy

- **Styl bazowy:** jak u Krzysztofa Persony / Toma Pietrzyka: płynne wjazdy i wyjazdy (lewo/prawo, góra/dół), słowo-klucz duże, reszta mała, estetyczna typografia, która dodaje rolce wartości. *(2026-10-02)*
- **2–6 słów naraz**, napis trzyma się dłużej na ekranie, żeby nie migał. *(2026-10-02)*
- **Zwarte, nie rozrzucone:** słowa stoją blisko siebie, wycentrowane, jako jeden blok. Żadnego rozrzucania słów po kadrze na lewo i prawo (np. „Spróbuj tego w swojej następnej rolce” ma być jednym zgrabnym blokiem). Dozwolone układy: `stack` i `inline`. *(2026-10-02)*
- Linie małych słów łamane równo, bez samotnego słowa w linii. *(2026-10-02)*
- Ma być kreatywnie: zmiana kierunku wjazdu przy nowym zdaniu, akcenty kolorem na liczbach i puentach, pop słowa-klucza. *(2026-10-02)*

## Grafiki i animacje

- **Wykresy, liczniki, listy i karty są na dole, pod napisami.** Napis stoi wtedy tuż nad grafiką. Wyjątki: tytuł-hak (góra kadru) i emoji. *(2026-10-02)*
- Grafiki nie zasłaniają twarzy. *(2026-10-02)*
- **Estetycznie, ale nie ubogo:** czysto i z powietrzem, bez krzykliwych efektów — ale animacje mają życie: sprężyste wejścia, odliczanie liczb, rysowanie linii i pasków, pop znaczników, połysk. Wersja „same cienkie linie bez tła” była za bardzo uproszczona. *(2026-10-02)*
- **Tło grafik: liquid glass.** Każdy wykres/licznik/lista/porównanie stoi na karcie jak dawniej, ale ze szkła: ciemniejsza, półprzezroczysta, z mocnym rozmyciem tego, co jest za nią (wideo w tle zblurowane), z delikatnym połyskiem krawędzi. *(2026-10-02)*
- **Kolor akcentu: pomarańczowy, nie żółty** (grafiki i akcenty w napisach). *(2026-10-02)*

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
