# Aktualizacje lokalnej aplikacji — 2026-10-17

Stan: wdrażanie. Źródło: wyłącznie publiczne repo DKWGroup/MontageFrames, oficjalne GitHub Releases. Workflow po push na main buduje paczkę z plików śledzonych w Git, deskryptor wersji (commit i numer rewizji) oraz archiwum do pierwszej instalacji. Bez filmów, .env, projektów, cache i kolejki.

Sprawdzanie przy uruchomieniu i co 6 godzin (wyłącznie metadane), brak internetu nie blokuje pracy. Pobranie i instalacja jawne. Porównanie numeru rewizji, SHA-256 pobranej paczki i skrótów każdego pliku. Źródło GitHub jest granicą zaufania — właściciel repo publikuje kod do wykonania na komputerze użytkownika; żadne dane klientów nie są wysyłane.

Baseline: manifest z paczki, a dla klona Git wpisy drzewa HEAD; nigdy skróty obecnych zmodyfikowanych plików jako rzekoma wersja autora. Brak baseline = instalacja zablokowana, bez zgadywania.

Chronione: profile i assety klientów, src/styles, branding, globalne preferencje/instrukcje i lokalnie zmienione skille. Plik autora niezmieniony lokalnie może być zaktualizowany; lokalnie zmieniony lub własny plik zachowujemy i raportujemy. Plik spoza manifestu nigdy nie jest usuwany. Zmiana lokalnego kodu poza strefą personalizacji blokuje całą instalację, jeśli nowa wersja wymaga jego zmiany.

Instalacja: ciężka blokada współdzielona z montażem/renderem, kopia zapasowa, staging zależności przed podmianą, dziennik transakcji i odtworzenie po niepowodzeniu. Osobny proces instalatora czeka na zamknięcie panelu, stosuje paczkę i restartuje panel na tym samym porcie. Instalacja nie uruchamia AI ani renderu. Po awarii instalatora stan i log pozostają w .updates; następny start odtwarza przerwaną transakcję, jeśli instalator już nie pracuje.

API lokalne: GET /api/updates (cache), POST /api/updates/check, POST /api/updates/download, POST /api/updates/install. POST wymaga istniejącej ochrony X-Panel i localhost. Żadne ścieżki lub adresy repo nie pochodzą z formularza.

Odbiór: fixture kilku wersji: zmieniony szablon, nowy klient, niezmieniony klient autora, własny klient, usunięcie czystego pliku, lokalna zmiana kodu, uszkodzona paczka, symlink, traversal, brak internetu, ten sam numer wersji, równoległe pobranie/instalacja, błąd zależności, rollback po awarii i ponowne uruchomienie. Test fixture nie potwierdza pierwszej publikacji w GitHub Actions.

Referencja protokołu: https://docs.github.com/en/rest/releases/assets — digest SHA-256 i browser_download_url.
