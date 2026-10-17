# Integracja ustalonych stylów — 2026-10-17

Polecenie: po wysłaniu bieżącej bazy na GitHuba połączyć panel z faktycznymi stylami i preferencjami klientów. Baza wysłana: 82b26c8, codex/panel-ui-ux.

Przyczyna: GET brandingu bez zapisanego profilu zwraca ogólny defaultBranding, podgląd zawsze używa Brand, a szablony QuickContent i prep rozpoznają ustalone style osobno.

Kontrakt: optional styleId w profilu/snapshotcie (brak = dotychczasowe brand). Ustalony styl jest pełnym natywnym rendererem, nie przybliżeniem przez ogólny preset. Bez profilu panel pokazuje ustalony styl klienta z rejestru templates.json, metadane jego fontów/kolorów, rzeczywistą treść PREFERENCJE.md i materiały. Istniejące zapisane profile i starsze snapshoty nie są migrowane w ciemno. Jawny wybór „Ustalony styl” / „Własny styl” umożliwia przełączenie draftu, zapis tworzy kolejną wersję. Ustalony styl pokazuje swoje parametry jako odczyt; edytowalne suwaki dotyczą własnego stylu. Informacje marki i materiały można dodawać w obu trybach. Nie edytujemy kodu natywnych stylów przez formularz i nie udajemy takiej możliwości.

Preferencje klienta pozostają plikiem autorytatywnym; panel udostępnia pełną treść i jej źródło. Nowe montaże odczytują ją jak dotąd, QC zamraża prywatny snapshot. Zmiany preferencji nie nadpisują wersji wyglądu. Zapis profilu ustalonego stylu zachowuje jego styleId w zwykłej rolce, QC, podglądzie oraz walidacji korekt. Brak plików jest jawny.

Plan:
1. Dane: katalog ustalonych styli, bezpieczny odczyt preferencji/materiałów, domyślny profil i wersjonowany styleId, test RED→GREEN.
2. Panel/podgląd: wybór ustalonej oprawy, zakładka Preferencje, rzeczywiste fonty/kolory i materiały, zgodny natywny podgląd; zachować draft/409 i responsywność.
3. Integracje: rejestr szablonów, prep, Nowa rolka, QC i walidatory korzystają z wybranego styleId/snapshotu, zachowując kompatybilność.
4. Odbiór: testy integracji, npm test, lint/typy, rzeczywisty podgląd klienta, próbne klatki i niezależny przegląd.

Ruling: obecna gałąź robocza po push pozostaje miejscem pracy; lokalny serwer i prywatne dane pozostają dostępne. Zadania danych i UI mają rozłączne pliki, koordynator integruje renderer/workflow. Nie resetować niezwiązanych lokalnych plików .taste-skill ani .claude.

Pre-flight: (1→2) API zwraca established oraz preferences/materials obok profilu, UI nie zapisuje źródłowych metadanych jako profilu; (1→3) snapshot.styleId określa renderer, starszy brak oznacza brand; (2→3) UI save utrwala styleId, podgląd i montaż wybierają ten sam komponent. Zakresy zadań zgodne; jedyne wspólne typy src/branding/types.ts należą do koordynatora.

## Wynik i sprawdzenia

Zadania 1–4 wykonane w zakresie tej integracji. Panel pokazuje natywne Bisanz, SkyClass, Herod, Ameryka, GlowUp, Vital i Happy News z faktycznymi rendererami napisów. Preferencje i materiały są odczytywane ze źródeł klienta. Własny styl pozostaje jawnym wyborem. Zapisane wcześniej profile nie są automatycznie zmieniane.

- RED→GREEN: styleId, oba adaptery, wymagane fonty, prywatny snapshot QC i niezmienność projektu po zmianie profilu, API i dane natywne, przełączanie stylów bez utraty informacji.
- Niezależny przegląd znalazł błędne linki materiałów i wymóg własnego fontu w natywnym rendererze. Naprawiono oba; ponowny przegląd bez otwartych istotnych uwag. Dedykowany endpoint materiałów sprawdza przynależność i ścieżkę, MIME/nosniff i HEAD/Range; testy obejmują rzeczywiste bajty, obce pliki i dowiązania.
- Pełne `npm test`: 442 testy, 441 pass, 0 fail, 1 test Chromium skanera pominięty standardowo (skaner niezmieniony). `npm run lint` wraz z tsc: exit0. `build:panel`: exit0, ostrzeżenie o dużym chunku.
- Wyrenderowano i obejrzano klatki siedmiu natywnych styli z polskimi znakami: `/private/tmp/native-brand-{bisanz,skyclass,herod,ameryka,glowup,vital,happynews}.png`. Dodatkowy render Bisanz bez primary: przed poprawką błąd fontu, po niej poprawna klatka. Źródło syntetyczne, bez ASR i kosztu AI.
- GUI: Bisanz faktycznie Inter i marker rgb(6,111,237); Herod Libre Baskerville i krem. Pełne preferencje, cztery wcześniejsze przebitki Bisanza, kliknięcie ksiazulo.jpeg otwiera obraz596×335. Zapisano pierwszą natywną wersję Bisanza lokalnie. Nowa rolka domyślnie wybiera wersję1; QC „Kacper Bisanz — wersja1”, styleId bisanz. Formularzy nie wysyłano do montażu.
- Widoki1440×1000,1120×987 i390×844 sprawdzone; dokument mobilny ma szerokość390 bez poziomego przepełnienia. Zrzuty lokalne `.impeccable/review/branding-established/`.

Ograniczenia: parametry ustalonego stylu są odczytem silnika; edycja jego kodu przez formularz nie należy do tej poprawki. Podgląd ilustruje napisy i włączone logo; pełne grafiki zachowują natywne renderery. Wcześniejsze ograniczenia pełnego odbioru AI w acceptance.md pozostają; nie wykonywano nowej redakcji filmu przez AI.
