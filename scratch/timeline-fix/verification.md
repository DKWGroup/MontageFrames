# Weryfikacja osi czasu i inspektora — 2026-10-08

Studio: Remotion 4.0.532.

Poprawka utrzymuje wszystkie ścieżki montażu, niezależnie od pozycji głowicy. Wewnętrzne obrazki i kontenery nie dodają znikających ścieżek. Każdy blok ma własny statyczny węzeł JSX w src/studio/<rolka>/<blok>.tsx; zmiana formatowania jednego bloku nie przesuwa lokalizacji pozostałych. Interaktywność jest włączona.

Zmiany pól inspektora są synchronizowane z reel.json (studio). Panel i render korzystają z tych nadpisań. Synchronizacja rozróżnia edycje Studio od nowych danych JSON, nie wykonuje kodu z atrybutów i zachowuje źródło, gdy wartości są identyczne. Pliki zapisuje atomowo, z nazwą tymczasową osobną dla procesu.

Kompozycje mają literalne identyfikatory i jawne defaultProps. W Studio faktycznie zmieniono właściwość reel na demo, potwierdzono zapis w Root.tsx i przywrócono alicante. Ostrzeżenie o braku defaultProps nie występuje.

Sprawdzenia przeglądarkowe w Codex In-app Browser:
- Alicante: kliknięcie Ujęcia 3 otwiera aktywny inspektor.
- Skala 1 → 1.01 zapisuje się jako studio.s2.style.scale w danych rolki.
- Po odświeżeniu inspektor odczytuje 1.01; wartość przywrócono do 1.
- Po rozdzieleniu plików bloków lista nazw jest identyczna przed i po edycji, bez ukrytych duplikatów.
- Klatki 0, 80, 410, 600, 1100, 1325: identyczna lista nazw i kolejność widocznych ścieżek. Studio wirtualizuje długą listę w pionie.
- Poprzedni sprawdzony przypadek Magdalena Herod 1: klatki 0 i 1103, wszystkie paski w bieżącym zakresie przewijania pozostają stałe.

31 testów logiki i integracji parsera Remotion. ESLint, TypeScript i budowanie bundle zaliczone. Detektor Impeccable nie zgłosił problemów w zmienionych komponentach.

Sprawdzono podstawowe pola transformacji i zapis kompozycji; nie testowano wszystkich natywnych operacji typu podział, duplikacja i klatki kluczowe. Nie wykonano pełnego eksportu wideo.

Aktualny podgląd: inspector.jpg.
