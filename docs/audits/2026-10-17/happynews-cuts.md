# Happy News: audyt skoków kadru — 2026-10-17

Zakres: lokalny panel, ścieżka QuickContent → framing → HappyNewsSource → render. Obciążenie: jeden operator i jedna kolejka ciężkich zadań. Audyt dotyczy zgłoszonego błędu, nie całego repo.

## Wymagało naprawy

1. **Układ przełączał się przed cięciem obrazu.** Próbki detektora mają odstęp 0,25 s. Rolka o trzmielach zmienia kamerę w 0,40 s, ale układ przełączał się już w 0,25 s. Dodatkowo tracking oznacza jako `cut` zarówno cięcie źródła, jak i zmianę mówcy; nie nadaje się na jedyne źródło dokładnego czasu cięcia kamery. Poprawka: osobne `framing.cameraCuts` z istniejącego pomiaru FFmpeg; rozdzielenie przedziału układu na dokładnej granicy. Przed granicą zostaje geometria poprzedniej kamery. Bez poprawki widz ogląda przez kilka klatek zły crop.

2. **Zmiana mówcy resetowała spokojny kadr.** Fałszywa granica ujęcia ponownie inicjalizowała okno i medianę skali. Poprawka: przy dostępnych czasach źródła reset tylko przy prawdziwym cięciu. Zdjęcia zachowują swój czas i kolejność, ręczny kadr nadal wyłącza automat. Brak metadanych w starszych projektach zachowuje dotychczasowy fallback.

## Sprawdzenia

- Testy regresji napisane przed zmianą: wcześniejsze przełączenie układu, reset okna przy zmianie mówcy i granica kamery podczas zdjęcia. Wszystkie trzy odtworzyły błędy przed poprawką i przeszły po niej.
- Walidacja czasów kamery: odrzucenie wartości niefinitywnych, ujemnych, poza źródłem, duplikatów i złej kolejności.
- Pełny zestaw: 446 PASS, 1 SKIP; lint i TypeScript bez błędów. Pierwszy przebieg w sandboxie był blokowany przez ograniczenia lokalnych portów i odczytu procesów; pełny przebieg poza sandboxem przeszedł.
- Czasy rzeczywistych cięć sprawdzone FFmpeg dla czterech lokalnych rolek Happy News. Uzupełniono tylko lokalne dane; kopie sprzed zmiany w `historia/before-camera-sync-2026-10-17.json`.
- Dodatkowy test renderu wykrył brak prostokąta wcześniejszej przebitki w opóźnionej granicy; poprawiono kopiowanie geometrii i dodano test regresji.
- Analiza klatka po klatce geometrii dwóch ostatnich rolek: zmiany kamer odpowiadają rzeczywistym cięciom; osobne zmiany ekspozycji zdjęć pozostają zgodne z zapisanym montażem.

Nie sprawdzano: pozostałych funkcji aplikacji w pełnym GUI, nowego pobierania YouTube i nowej analizy AI. Prywatne filmy, projekty i historia nie są częścią commita.
