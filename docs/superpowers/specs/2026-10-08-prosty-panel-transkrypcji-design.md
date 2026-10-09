# Prosty panel: od filmu do korekty transkrypcji

Status: projekt do akceptacji, bez wdrożenia. Data: 2026-10-08.

## Cel i kryterium sukcesu

Użytkowniczka dodaje film, wybiera branding i dostawcę AI, uruchamia montaż według wytycznych, a następnie ręcznie poprawia transkrypcję przy podglądzie. Korekta tekstu jest głównym zadaniem edytora. Zapisane poprawki pozostają po ponownym otwarciu rolki i trafiają do renderu.

Zachowujemy Remotion oraz `reel.json` jako źródło prawdy. Korzystamy z istniejących profili klientów, materiałów i zasad montażu. Komunikacja w interfejsie jest po polsku.

## Ustalenia i dowody

- Nowe wymagania zapisano w `PREFERENCJE.md` przed zmianami produktu.
- W uruchomionym panelu `ui/` sprawdzono ręczną zmianę pojedynczego słowa w rolce `demo`: podgląd pokazał zmianę, zapis przetrwał odświeżenie. Po próbie przywrócono oryginalne słowo.
- Inspektor Remotion Studio udostępnia właściwości Sequence. Tekst jest dostarczany ze słów w `reel.json`, więc inspektor bloku nie jest edytorem transkrypcji.
- Nie potwierdzono jeszcze, w którym edytorze i na której rolce wystąpił zgłoszony błąd. Nie uznajemy udanej próby `demo` za dowód, że zgłoszony problem nie istnieje.
- Lokalny projekt referencyjny znajduje się w sąsiednim katalogu `AnimaFX`. Jego panel transkrypcji udostępnia edycję segmentów, jawny zapis i informację o niezapisanych zmianach.
- Projekt panelu z 2026-10-07 zawiera zatwierdzoną jasną paletę i uproszczenia, których bieżące `ui/` jeszcze nie realizuje. Ta paleta pozostaje kierunkiem wizualnym.

## Proponowany przepływ

### 1. Film

Strona główna pokazuje główny przycisk „Dodaj film” i listę istniejących rolek. Kreator otwiera się w głównym obszarze strony. W pierwszym kroku można przeciągnąć film lub wybrać plik. Nazwa projektu jest podpowiadana z nazwy pliku, ale można ją poprawić. Przy błędnym formacie komunikat znajduje się przy pliku.

### 2. Branding

Wybór istniejącej marki/klienta albo utworzenie nowego profilu. Wybrana marka wiąże projekt z jej `PREFERENCJE.md`, stylem i katalogiem materiałów. Dostępna jest krótka informacja, które wytyczne zostaną zastosowane. Dla nowej marki trzeba określić wytyczne; samo nadanie nazwy nie może sugerować, że branding jest już gotowy.

### 3. AI i wytyczne

Wybór operatora i modelu w kreatorze, przed rozpoczęciem montażu. Bieżący backend obsługuje Claude Code na koncie i Claude z kluczem API; tylko te integracje można prezentować jako działające. Inni dostawcy wymagają osobnej integracji, a ich zakres pozostaje decyzją otwartą.

Pole „Dodatkowe wytyczne do tej rolki” trafia do faktycznego zlecenia montażu. Materiały dodatkowe i ustawienia zaawansowane są rozwijane opcjonalnie. Przed uruchomieniem sprawdzamy gotowość wybranego operatora; w razie braku konfiguracji użytkowniczka dostaje instrukcję naprawy bez utraty wyborów kreatora.

### 4. Montaż

Podsumowanie wybranego filmu, brandingu i operatora oraz jeden przycisk „Zmontuj film”. Status opisuje wykonywany etap: transkrypcja, przygotowanie, montaż, gotowe lub błąd. Szczegółowy log jest rozwijany. Można zatrzymać pracę; błąd nie jest traktowany jak gotowy film. Domyślnie montaż kończy się podglądem do korekty, przed eksportem.

### 5. Transkrypcja i podgląd

Po montażu domyślnie otwiera się zakładka „Transkrypcja”. Desktop: czytelne fragmenty tekstu i podgląd 9:16 obok siebie. Telefon: podgląd, a pod nim tekst. Kliknięcie czasu odtwarza odpowiedni fragment po montażu.

Każdy fragment ma zwykłe pole tekstowe i widoczny przycisk zapisania poprawki. Użytkowniczka nie musi klikać osobno każdego słowa ani znać pojęć „key”, „hl” lub „stack”. Akcenty i słowa-klucze są w opcjach zaawansowanych.

Zapis nie zmienia czasów istniejących słów. Pierwszy etap bezpiecznie obsługuje korektę ich tekstu; rozdzielanie, dodawanie i usuwanie słów wymaga jawnej reguły dopasowania do czasów i grup. Takie operacje nie mogą po cichu zepsuć synchronizacji lub skasować wypowiedzi. Edytor musi jasno informować, co można zmienić, i umożliwiać korektę literówek, nazw i liczb.

Stan zapisu: „Niezapisane zmiany”, „Zapisuję…”, „Zapisano” albo błąd z możliwością ponowienia. Nie pokazujemy „Zapisano” po nieudanej operacji. Zmiana rolki nie może przenieść szkicu tekstu do innego projektu. Podczas pracy AI edycja jest blokowana z przyciskiem zatrzymania operatora. Zapis musi zakończyć się przed ponownym montażem i renderem. Cofnięcie przywraca tekst oraz związane z nim ustawienia.

### 6. Gotowy film

Główny przycisk eksportu w nagłówku: „Przygotuj film” → postęp → „Pobierz film”. Eksport wykorzystuje poprawioną transkrypcję. Rolka klienta trafia do jego katalogu `Render/`. Grafiki i poprawki AI są dodatkowymi zakładkami; oś czasu pozostaje dostępna w widoku zaawansowanym.

## Podział odpowiedzialności w kodzie

- `ui/App.tsx`: wybór projektu, stan edycji, kolejka zapisu, podgląd, stan zadań i główne akcje.
- Kreator jako osobny komponent: film → marka → AI → podsumowanie, z zachowaniem wartości przy cofnięciu kroku.
- Edytor transkrypcji jako osobny komponent: szkice zmian, zapis, przejście do czasu i opcjonalne formatowanie.
- `ui/server.mjs` oraz `ui/lib.mjs`: konfiguracja operatora, wytyczne przekazywane do montażu i walidacja zleceń.
- `ui/panel.css`: jasne tokeny z zatwierdzonego projektu; widoczny fokus, cele dotykowe co najmniej 44 px, responsywność i ograniczenie ruchu.
- `PANEL.md`: rzeczywisty nowy przepływ i zakres obsługiwanych dostawców.

## Weryfikacja wdrożenia

1. Odtworzenie wskazanego problemu w konkretnym edytorze i rolce przed uznaniem go za naprawiony.
2. Korekta tekstu widoczna w podglądzie, po odświeżeniu i w kontrolnej klatce renderu; oryginalne czasy słów bez zmian.
3. Szybkie kolejne poprawki, cofnięcie, przełączenie rolki i błąd zapisu nie gubią danych ani nie pokazują fałszywego sukcesu.
4. Kreator przekazuje rzeczywisty branding, operatora i dodatkowe wytyczne do backendu; brak konfiguracji AI nie uruchamia kosztownego zlecenia.
5. Sprawdzenie całego przepływu na desktopie i telefonie, klawiatury oraz pustych, zajętych i błędnych stanów.
6. `npm test`, `npm run lint` i kontrola produkcyjnego pakietu panelu.

## Decyzje do potwierdzenia

- Akceptacja opisanego układu.
- Czy „dostawca AI” obejmuje na tym etapie istniejące tryby Claude, czy także inne konkretne integracje.
- Miejsce zgłoszonego błędu: panel przeglądarkowy czy Remotion Studio.
