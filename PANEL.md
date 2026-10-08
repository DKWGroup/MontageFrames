# Panel MontageFrames w przeglądarce

Wrzucasz nagranie, operator AI montuje je według zasad klienta, poprawiasz szczegóły w podglądzie i renderujesz do `klienci/<klient>/Render/`.

## Uruchomienie

```bash
npm install
npm run ui
```

Panel działa pod adresem http://127.0.0.1:3100.

Wymagania:
- Node 22 lub nowszy,
- ffmpeg (`brew install ffmpeg`),
- operator AI (opis niżej).

Narzędzie do transkrypcji (Parakeet) pobiera się samo przy pierwszej rolce.

## Operator AI

Panel nie ma własnej sztucznej inteligencji. Montaż wykonuje Claude Code uruchamiany w tle z tymi samymi zasadami co na czacie: `CLAUDE.md`, `PREFERENCJE.md`, `frame.md` i pliki klientów. Operatora wybierasz w **Ustawieniach** panelu.

| Operator | Jak podłączyć | Kto płaci |
|---|---|---|
| Claude Code na koncie (domyślny) | zainstaluj Claude Code i raz w Terminalu wpisz `claude auth login` | montaże liczą się do planu zalogowanego konta (Pro lub Max) |
| Claude z kluczem API | Ustawienia → „Claude z kluczem API” → klucz z console.anthropic.com | właściciel klucza, za zużyte tokeny (koszt każdego montażu widać w logu) |

Klucz API zostaje na tym komputerze w pliku `.panel.json`, który jest poza git, i nie wraca do przeglądarki. Model: Opus (domyślnie, najstaranniejszy) albo Sonnet (szybciej i taniej).

## Co jest gdzie

- **Nowa rolka:** wybierasz klienta (albo zakładasz nowego), dodajesz nagranie, przebitki i nazwę. Panel uruchamia transkrypcję, cięcie ciszy i szkic, potem operator montuje i na życzenie od razu renderuje.
- **Napisy:** kliknij słowo, żeby poprawić tekst albo ustawić słowo-klucz i akcent. Czasy słów zostają bez zmian.
- **Grafiki:** przesuwasz o 0,25 s albo usuwasz.
- **Operator AI:** poprawki opisane słowami („napisy o 10% niżej”) oraz „Pełny montaż”. Operator pamięta rozmowę o danej rolce.
- **Render:** plik trafia do `klienci/<klient>/Render/<nazwa>.mp4`, a rolki bez klienta do `out/`. Gotowe pliki otworzysz w Finderze albo pobierzesz.

Każda zmiana zapisuje się od razu. Cofasz przyciskiem „Cofnij” albo ⌘Z. Kopie zapasowe trafiają do `public/reels/<nazwa>/historia/`. Gdy operator pracuje nad rolką, ręczna edycja tej rolki czeka.

Czat z Claude'em w Claude Code działa jak dotąd, na tych samych plikach.

## Udostępnianie innym

1. **Ktoś dostaje repo** (np. montażystka). Robi kroki z „Uruchomienia” na swoim komputerze i podłącza **własnego** operatora, czyli swoje konto Claude albo swój klucz API, więc płaci za swoje montaże.
   - Nagrania i rendery nie są w git. Każda osoba wrzuca swoje.
   - Zasady i pliki klientów (`klienci/*/PREFERENCJE.md`) są w git. Przed udostępnieniem zdecyduj, czy ta osoba ma je widzieć.
2. **Ktoś dostaje link do Twojego panelu.** Panel słucha tylko na tym komputerze. Udostępnienie go pod linkiem (np. przez Tailscale) wymaga dodania hasła, a to osobny krok (etap 4 w specyfikacji). Plan Claude jest przypisany do jednej osoby, więc gdy montuje ktoś inny, przełącz operatora na klucz API.
3. **Platforma dla wielu osób.** To osobny projekt: konta, transkrypcja i render na serwerze, klucze API użytkowników. Zewnętrzna platforma nie może logować kontem Claude.ai. Szczegóły: `docs/superpowers/specs/2026-10-07-panel-przegladarkowy-design.md`.

## Gdy coś nie działa

- **„Operator nie jest zalogowany”:** w Terminalu wpisz `claude auth login`, potem w panelu kliknij „Sprawdź ponownie”.
- **„Nie znaleziono programu claude” albo „…ffmpeg”:** doinstaluj brakujący program.
- **„Port 3100 is already in use”:** panel już działa w innym oknie Terminala. Zamknij go albo otwórz tamten adres.

## Edycja w Remotion Studio

Bloki ujęć, grafik i napisów pozostają na osi czasu przez całą rolkę. Kliknięcie wybiera konkretny blok i otwiera jego inspektor. Podstawowe ustawienia czasu i wyglądu zapisują się automatycznie; synchronizator przenosi je do sekcji `studio` w `reel.json`, którą uwzględniają również panel i render.

`npm run dev` synchronizuje definicje bloków i uruchamia obserwowanie zmian. `npm run studio:sync` służy do synchronizacji ręcznej. Definicje w `src/studio/<rolka>/` mają osobny plik dla każdego bloku, aby edycja nie zmieniała lokalizacji pozostałych ścieżek. Właściwości domyślne kompozycji zapisuje Studio w `src/Root.tsx`.
