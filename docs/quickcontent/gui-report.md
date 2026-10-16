# QuickContent — raport implementacji GUI

Aktualizacja: 2026-10-15. Status: **GUI zintegrowane z API i edytorem, odbiór pełnej funkcji pozostaje otwarty**. Ten raport nie potwierdza całej ścieżki prawdziwego pobierania YouTube, Whispera, operatora i renderu.

## Zakres

`ui/QuickContent.tsx` udostępnia `QuickContent({clients, onOpenReel, onClose})`. Klienci mają `id` i `label`; callback edytora otrzymuje `reelName`, `projectId`, `candidateId`. `ui/App.tsx` dodaje QuickContent do bocznego menu, zachowuje Motion Studio i zwykłe rolki. Adres `#qc/<project>/<candidate>` pozostaje podczas wejścia do istniejącego Playera, Timeline i inspectora; przycisk powrotu otwiera propozycje. Dawne `#<reelname>` nadal działa, a uszkodzony percent-encoding nie wywołuje wyjątku.

GUI obejmuje listę zapisanych projektów, formularz YouTube/pliku lokalnego bez obowiązkowego klienta, oddzielny wybór kompatybilnego szablonu, Auto/wskazówki, wszystkie sześć presetów długości, własny zakres 10–300 s i 1080p/4K. Upload raportuje postęp rzeczywistych bajtów i pozwala anulować wysyłanie. Proces startuje po zapisaniu projektu, a propozycje nie uruchamiają montażu automatycznie.

Propozycje pokazują surowe miniatury, opis, globalny czas źródła, uzasadnioną ocenę i strukturę kompletności. Surowy player korzysta ze wspólnego proxy projektu, ogranicza seek i zatrzymuje na końcu wybranego zakresu. Po utworzeniu rolki adres propozycji otwiera istniejący edytor przez callback. Sortowanie, filtr i scroll zachowują się podczas przejścia do edytora i powrotu w tej samej sesji panelu.

Zaznaczenie jest zapisywane do backendu z `expectedRevision`; niepotwierdzony wybór blokuje montaż i ma retry. Montaż wysyła dokładnie zapisane identyfikatory, rewizję oraz stabilny klucz idempotencji dla wybranego zestawu. Wyszukiwanie dalszych wyników zachowuje stare propozycje i selekcję, raportuje faktycznie dodane ID oraz wyczerpanie. Nowe ustawienia tworzą jawny przebieg analizy.

Zadania mają aktualny etap, mierzalny procent wyłącznie dla dostępnej miary, szczegóły, anulowanie i wznowienie. Partia liczy `aktualne zweryfikowane rendery / zamrożony zestaw candidateIds`; stare pliki po poprawkach nie zwiększają ukończenia. Retry partii wybiera błędne/przerwane zadania, anulowanie wybiera aktywne. Polling czyści timery i abortuje po zmianie projektu, stosuje backoff po utracie połączenia i kończy się dla nieaktywnych zadań.

Błąd działania pozostaje w osobnym stanie od błędu odczytu: poprawne odświeżenie projektu nie usuwa błędu uruchomienia zadania. Formularz zachowuje utworzony projekt oraz rzeczywisty komunikat, jeśli start procesu się nie powiedzie. Ukończenie zadania AI nie jest sztucznym paskiem 100%; aktywna analiza może pokazać zmierzoną liczbę przeanalizowanych części. `blocked` po restarcie pokazuje przyczynę, bez niedostępnego retry. Brak mowy jest osobnym stanem, a jakość pionowego źródła wynika z krótszego boku, więc 1080×1920 nie jest błędnie opisane jako 1920p.

`ui/Inspector.tsx` dodaje „Kadr”: fit/crop, suwaki pozycji i wyśrodkowanie. Zmiana zapisuje istniejący `ReelData.framing`, nie czasy słów. Zakładka Render pokazuje aktualny, zweryfikowany MP4, rewizję oraz „Renderuj poprawki”; wcześniejsze wersje pozostają jawnie dostępne. Archiwum QuickContent ogranicza się do dokładnych wersji wybranej rolki, a zwykły edytor zachowuje całą dotychczasową listę folderu. Ręczna edycja jest blokowana podczas montażu/operatora, a dostępna podczas właściwego renderowania; nieskończony lub błędny zapis blokuje zlecenie renderu.

`ui/api.ts` odczytuje `X-Edit-Revision` razem z danymi rolki i wysyła ten nagłówek przy QC PUT, bez dopisywania metadanych do `reel.json`. Kolejka zapisów bierze bazę wyłącznie z odczytanego stanu i potwierdzonych odpowiedzi; polling aktualności MP4 nie podnosi po cichu bazy edycji. Konflikt 409 zachowuje szkic, wstrzymuje następne zapisy i pozwala jawnie odczytać nowszą wersję. Niezapisany szkic pozostaje także po przejściu do projektu i powrocie w tej samej sesji; po odczycie można do niego wrócić przez Cofnij. Błąd połączenia ma osobny retry, nadal względem tej samej bazy. Powrót async od starej rolki oraz odświeżenie po renderze nie nadpisują nowszej ręcznej korekty.

## Kontrakt i wygląd

`ui/quickcontent-api.ts` używa ścieżek określonych w specyfikacji, nie przesyła dowolnych ścieżek do proxy. Upload to strumień z `?file=<nazwa>`, `X-Panel: 1`. API projektów i szablonów zwraca tablice. GUI akceptuje szablony `label/clientIds/reason` oraz faktyczny rejestr `name/clientId/missing`, a stany zadań `completed` i `succeeded`.

`ui/quickcontent.css` dziedziczy Fustat i zmienne `panel.css`. Karty mają zarezerwowane miejsce na miniaturę; wideo pojawia się po otwarciu propozycji, bez autoplay. Pola mają widoczne etykiety, cele dotykowe co najmniej 44 px, focus, błędy przy polach i czytelne statusy. Lista ma układ 1/2/3 kolumn zależnie od dostępnego miejsca, formularz krótkie pola w jednej lub dwóch kolumnach. Mobilna nawigacja QuickContent jest rozwijana przyciskiem Menu, zamiast zajmować pół ekranu listą rolek. Wysokość dolnego paska jest mierzona przez `ResizeObserver` i uwzględniana w zapasie oraz przewijaniu. Dostępne jest ograniczenie ruchu.

## Sprawdzenia

- `node --test ui/quickcontent-ui.test.mjs ui/quickcontent-editor.test.mjs`: **26/26 przechodzi**. Obejmuje granice playera, stabilne sortowanie, ustawienia, strukturę ocen, aktualność postępu i pobrania, fit/crop/reset bez zmiany czasów, poprawkę słowa, pełną listę zwykłego folderu, dokładne payloady i optimistic revision, blokadę kolejki po konflikcie oraz zapisany projekt z błędem startu.
- Globalne `npm run lint`, rozszerzone na QC oraz App/Inspector/api: **przechodzi**, również TypeScript. Pozostały 24 wcześniejsze ostrzeżenia o nieużytych dyrektywach ESLint w wygenerowanych plikach `src/studio/jeep-grand/`. Pliki tego GUI nie mają błędów ani ostrzeżeń.
- Globalne `npx tsc --noEmit`: **przechodzi**.
- Końcowe globalne `npm test` należy odczytać z raportu całego wdrożenia, ponieważ backend jest równolegle rozwijany i odbierany.

## Rzeczywista kontrola przeglądarki — 2026-10-15

W Chrome przez CUA otwarto istniejący lokalny projekt, nie tworzono dodatkowego projektu do tych kontroli. Klik „Przetwarzaj” pokazał błąd backendu „Inny worker QuickContent nadal pracuje.” oraz informację o zachowanym projekcie; komunikat przetrwał odświeżenie projektu. Sprawdzono formularz importu, przejście Tab z własnych wskazówek do textarea oraz błędy pustego linku i pustych wskazówek, bez uruchomienia pracy.

Narzędzia Responsive potwierdziły widoki formularza w szerokościach **375/768/1024/1440 px**. Kontrola wykryła zbyt obszerną mobilną nawigację oraz nierówne położenie pól klienta/szablonu; obie poprawki zostały zastosowane i obejrzane. Formularz mieści się w dostępnej szerokości, pola układają się w jedną lub dwie kolumny. Przy **200% powiększenia** tekst i kontrolki mieszczą się w kadrze; Tab przewija do pola Klient, którego cały fokus pozostaje widoczny. Po sprawdzeniu przywrócono powiększenie 100% i zamknięto DevTools.

## Otwarty odbiór

Kontrola przeglądarki obejmuje formularz i projekt bez propozycji, nie pełną listę gotowych kandydatów ani aktywną partię z aktualnym MP4. Kompletny przebieg import → propozycje → selekcja → montaż → edytor → aktualny download z prawdziwym YouTube i plikiem lokalnym nadal wymaga odbioru backendu. Testy SSR i kolejki potwierdzają zachowanie edytora na strukturach danych; nie zastępują rzeczywistego odsłuchu, kontroli klatek, surowego podglądu i korekt po renderze. Status pełnej funkcji nie jest tutaj zmieniony na „wdrożone”.
