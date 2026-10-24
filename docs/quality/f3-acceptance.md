# F3 — małe operacje: odbiór przyrostu

2026-10-18. **Wdrożono rdzeń v3 i jawny zakres QC „Tekst i istniejący hook”. Pełne F3 pozostaje w toku.** [Plan](../../plan-wdrozenia-Serwer.md), [co dalej](next-stage.md).

## Co działa

`scripts/quality/edit-operations.mjs` udostępnia ścisły kontrakt v3: zastąpienie tekstu słowa, przegrupowanie, tekst istniejącego hooka oraz operacje zakresu słów i wyboru dostępnego zasobu. Referencje słów i hooków zawierają przestrzeń tożsamości źródła, danych i rewizji; nie są nowymi trwałymi ID mastera. Czasy wylicza kod; model nie wysyła ścieżek, pozycji ani timestampów.

Nowy zakres panelu QC dopuszcza wyłącznie pierwsze trzy operacje. Serwer waliduje ten podzbiór niezależnie od promptu. Pełny montaż i v2 napisów nadal działają. Nieobsługiwane zadanie musi być opisane w podsumowaniu; nowy zakres nie tworzy brakującego hooka ani nie zmienia obrazu.

Odpowiedź AI zapisuje się dopiero po ponownym sprawdzeniu aktualnej rewizji i hasha pliku, w kolejce zapisów rolki. Konflikt zachowuje nowszy plik i kończy zadanie czytelnym błędem, zamiast nadpisywać ręczną pracę. Kontrola ta obejmuje również dotychczasowe v1/v2 QC.

Operacje chronią istniejące negacje/warunki/liczby przed zamianą, kolejność słów, SkyClass 1:1 i pozostałe invariants walidatora. Liczby porównywane są wraz z separatorem i znakiem. To ograniczony walidator danych, nie pełna ocena sensu wypowiedzi.

`planRecompute` wskazuje zależności: tekst zachowanych słów unieważnia opis, zoom/kolor/rozdzielczość go nie unieważniają; zmiana źródła wymaga ponownego przetwarzania. Rdzeń zwraca ten plan, ale nie zastępuje jeszcze wszystkich dotychczasowych checkpointów aplikacji. Ręczne suwaki i napisy nadal działają bez AI.

## Weryfikacja

- Testy RED→GREEN: stara rewizja, obce i powtórzone ID, chronione słowo, zakres SkyClass, hook z innego źródła, „1,5”→„15” i usunięcie minusa; adapter v3 i odmowa operacji poza zakresem.
- Integracja rzeczywistej lokalnej kolejki z kontrolowaną odpowiedzią AI: poprawka tekstu zachowuje czasy/segmenty, nie powtarza ingest/ASR/renderu przy `render=false`; jednoczesna ręczna zmiana pozostaje po odrzuceniu odpowiedzi AI.
- Niezależny reviewer: brak Critical; trzy Important (fonty, referencje hooka, liczby) naprawiono po odtworzeniu testami. Brak odłożonych Minor. Media klientów, prawa zasobów, porównanie workerów i benchmark płatnego API nie zostały ocenione przez review.
- Pełna suite po poprawkach review: 500 testów, 499 PASS, 1 SKIP; lint i build panelu PASS. Po dodaniu ręcznej trasy wykonano kolejny odbiór opisany poniżej.

## Pozostały zakres

Pełny operator zwykłych rolek wymaga jeszcze adaptera v3; dodano ręczny wariant terminalowy opisany poniżej i zachowano dotychczasowego operatora. Operacje zakresu/zasobu są na razie rdzeniem, bez endpointu tych operacji i panelu selekcji. Migracja istniejących szablonów bez kontraktu i odtworzenie po zmianie klienta z mastera wymagają dalszego wdrożenia. Nie wykonano benchmarku płatnego API ani pełnej ścieżki GUI v3 z prawdziwym modelem; fixture kolejki nie jest taką próbą. Nie obiecujemy ceny na podstawie rozmiaru promptu.

## Ręczne operacje bez modelu — dalszy przyrost

Lokalna trasa `GET /api/quickcontent/reels/:id/operations` zwraca aktualny kontekst referencji. `POST` przyjmuje kontrakt v3 dla tekstu/grupowania/istniejącego hooka; korzysta z tej samej walidacji i kontroli rewizji, historii i blokady aktywnego montażu co zapis edytora. Ochrona host/origin/X-Panel jest taka sama jak reszta lokalnego API. Nie jest to publiczne API usługi.

Test RED→GREEN potwierdza zmianę tekstu, odmowę starej rewizji, zachowanie nowszego pliku, niezmienioną liczbę jobów oraz brak ponownego ingest/ASR/renderu. Nie wywołuje transportu AI. Własne UI dla tych operacji i zwykłe rolki pozostają do integracji; obecne ręczne pola edytora nadal działają.

## Ręczny terminal zwykłych rolek

`npm run reel:ops -- <rolka> context` daje aktualne referencje i `baseRevision`. Po przygotowaniu pliku JSON v3: `npm run reel:ops -- <rolka> apply <operacje.json>`. To dokładne operacje tekst/grupowanie/istniejący hook, bez modelu i bez renderu. Zapis używa istniejącego store, kontroli rewizji i historii. Stary kontekst jest odrzucany. Rolki QC są tu odrzucane i obsługiwane przez lokalną trasę panelu, aby nie obchodzić blokady trwającego zadania.

Test store RED→GREEN sprawdza wynik, zależności opisu, odrzucenie starego kontekstu i odmowę QC. To nie zastępuje migracji pełnego operatora Claude/Codex na v3. Surowe edycje plików przez wewnętrzne CLI nadal są możliwe na odpowiedzialność operatora, jak wcześniej.

## Ostateczny odbiór sesji

Po wszystkich przyrostach i poprawce równoległego zapisu: **503 testy, 502 PASS, 1 SKIP, 0 FAIL**; `npm run lint` (typy i ESLint) PASS; build panelu PASS. Logi lokalne: `/private/tmp/montage-f23-last-tests.log`, `montage-f23-last-lint.log`, `montage-f23-last-panel.log`. Komenda kontekstu CLI wykonana read-only na `pokazowka`: 28 referencji słów, 1 hook, obecna rewizja; bez zmiany rolki.

Osobny review nowej ręcznej trasy: brak ustaleń. Review nowej metody store/CLI znalazł wyścig między osobnymi instancjami: oba zapisy mogły przejść ze starej rewizji. Test odtworzył błąd RED, następnie dodano wspólną blokadę pliku `reel.json.edit.lock` obejmującą sprawdzenie rewizji i zapis, również dla istniejącego guarda operatora. Test dwóch niezależnych instancji GREEN; cała suite po poprawce GREEN. Nie uruchamiano dodatkowego re-review tych samych fixów.

Blokada nie jest automatycznie przejmowana po awarii procesu. Gdy proces zakończy się bez `finally`, trzeba najpierw potwierdzić zakończenie właściciela z PID/czasem w pliku, a dopiero potem ręcznie usunąć osieroconą blokadę. Nie usuwać jej podczas pracy innego operatora. Bezpośrednie edycje pliku poza aplikacją nie używają tej blokady.

Decyzje tego przyrostu: zachować dotychczasowy wygląd i jawnie ograniczyć przenośność (ryzyko: brak parytetu workerów); zachować pełny operator dla nieobsługiwanych poleceń (ryzyko: pełna jednolitość jeszcze niegotowa); nie uznawać odmówionych ocenie mediów/praw/benchmarku za sukces. Brak odłożonych drobnych ustaleń review. CLI/konta i własne brandingi pozostają; brak nowego płatnego wywołania, commitu, publikacji i deployu.
