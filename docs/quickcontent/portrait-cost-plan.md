# QuickContent — pion i koszty, 2026-10-15

Autoryzacja: bieżąca instrukcja użytkowniczki. Rozwijamy obecny pipeline i GUI, bez zmiany źródła ani ponawiania zakończonej analizy.

1. Wyjście zawsze9:16, domyślnie1080×1920, wybór720×1280/1080×1920/2160×3840. Rozdzielczość pobrania pozostaje osobnym ustawieniem. Style projektowane na1080×1920 skalujemy przy renderze.
2. Propozycje to zakresy mastera i lekki podgląd. Dopiero kliknięcie montażu po selekcji materializuje, kadruje i renderuje wybrane pozycje. Domyślny crop wypełnia pion; lokalna detekcja twarzy naMac ustala pozycję, z jawnym fallbackiem i ręczną korektą w istniejącym edytorze.
3. Rejestr użyciaAI zapisuje każdą otrzymaną odpowiedź (także nieudaną redakcję) w trwałym jobie z modelem/tokenami/kosztemUSD według jawnego cennika. Osobne podsumowanie analizy, montażu, czatu; brak danych nie oznacza0. Render/Whisper/kadrowanie lokalne:0USD opłatyAPI, z wyjaśnieniem kosztu pracy komputera. Dawnych tokenów nie rekonstruujemy.
4. Koszt przed montażem to jawne przybliżenie na podstawie podobnych zmierzonych zadań, jeśli są dostępne; inaczej brak pomiaru. Nie naliczamy montażu na samo zaznaczenie.
5. Sprawdzenia: walidacja ustawień i starych projektów, arytmetyka cache/tokenów/cen, trwałość rejestru po błędzie/retry, brak obróbki przed kliknięciem, render9:16 w wybranej rozdzielczości, GUI; pełne testy i lint.

## Wynik

Kod i GUI wdrożone.179/179 testów PASS, lint i TypeScript bez błędów (24 wcześniejsze ostrzeżenia). Rzeczywiste krótkie eksporty720×1280 i2160×3840 oraz pomiar kosztu API potwierdzone. Dowody w [acceptance.md](acceptance.md). Koszt historycznej analizy pozostaje nieznany; pełne zaznaczone rolki powstaną po kliknięciu użytkowniczki.
