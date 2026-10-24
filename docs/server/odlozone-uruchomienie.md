# Uruchomienie usługi później — decyzja 2026-10-19

Użytkowniczka odłożyła publikację na Vercelu, konfigurację backendu i Supabase. Teraz rozwijamy lokalny silnik, walidację, kontrolę obrazu i oszczędne poprawki. Nie tworzono kont, zasobów chmurowych ani wdrożenia. [Plan F0–F9](../../plan-wdrozenia-Serwer.md), [architektura](wdrozenie.md).

## Warianty do rozstrzygnięcia przed zakupem

| Wariant | Co ustalić i zmierzyć |
| --- | --- |
| Własny Mac mini jako worker, opcjonalnie także prywatne API | Wydajność na rzeczywistym korpusie, RAM/dysk i przestrzeń robocza, stabilność sieci i zasilania, utrzymanie, backup poza urządzeniem, sposób zdalnego dostępu. Bez publicznego wystawiania lokalnego Vite. |
| Wynajęty backend/API/storage i worker macOS | Rzeczywista cena czasu pracy i przechowywania/transferu, region, dostępność macOS i identycznych zasobów/fontów, prawa do materiałów i retencja. |
| Wariant mieszany: zewnętrzne API/storage, Mac mini renderuje | Prywatne pobieranie zadań przez worker, wznawianie uploadu/downloadu, opóźnienia i koszt transferu oraz zachowanie po odłączeniu Maca. |

Nie wybrano sprzętu, hostingu ani Supabase. Brak pomiaru nie pozwala uznać żadnego wariantu za najtańszy. Najpierw test obciążenia pojedynczego workera i koszt całego procesu, z przeglądem człowieka. Zachować tę samą logikę montażu i kontrakty niezależnie od miejsca uruchomienia.

## Co będzie potrzebne do usługi

1. F5: wydzielić produkcyjne API z obecnych usług lokalnych; organizacje/role i sesje, izolacja danych, prywatny upload/download z checksum i limitami. Wybrać trwałą bazę i storage dopiero wraz z hostingiem. Supabase jest opcją, nie wymogiem silnika.
2. Osobny build panelu usługi z allowlistą zasobów. Nie publikować lokalnego `public/`, Vite ani prywatnego repo z klientami i materiałami. Vercel nie jest warunkiem działania silnika i nie jest obecnie objęty realizacją.
3. F6: trwałe zadania, idempotencja, dzierżawy i blokada publikacji starego workera; checkpointy i usage przed walidacją, limity budżetu, osobne retry redakcji/renderu/opisu. Własny Mac nie usuwa tych wymagań.
4. Przygotować oddzielne konto systemowe i katalogi workera, przypięty runtime/fonty/emotki, preflight, uruchamianie po restarcie i kontrolę dysku. Najpierw jedna ciężka praca naraz. Nie używać osobistego konta CLI jako współdzielonego backendu klientów publicznej usługi.
5. F7: dostęp z TLS, ograniczony ruch przychodzący, bezpieczne zarządzanie sekretami, monitoring błędów i miejsca, retencja, kopie danych i mediów. Przećwiczyć odtworzenie na innym środowisku oraz wycofanie wersji. Ustalić dostęp pracowników i obsługę awarii.
6. Odbiór faktycznych filmów, dwóch workerów tej samej klasy i dwóch organizacji. Zatwierdzać dokładną rewizję/manifest; wynik z krytycznym `unknown` wymaga kontroli, nie automatycznej publikacji.
7. F8: uprawnienia pakietów i rozliczenia dopiero po pomiarze ekonomiki. Własny branding zachować w wyższym pakiecie usługi. Lokalny CLI/panel zespołu pozostają dostępne niezależnie od abonamentu usługi.

## Informacje do zebrania później

Budżet miesięczny i liczba/długość filmów; planowana liczba osób i równoległych zadań; dostępny sprzęt/dysk/łącze; wymagany czas realizacji; kraje/region danych; czas przechowywania i zasady usuwania; wymagania kopii i dostępu zespołu. Nie są potrzebne do kontynuowania obecnych prac lokalnych.
