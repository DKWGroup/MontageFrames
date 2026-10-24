# Usługa serwerowa — stan, decyzje i odbiór

Aktualizacja: 2026-10-19. Infrastruktura Vercel/backend/Supabase jest odłożona; [lista późniejszych prac i wariant Mac mini](odlozone-uruchomienie.md). **Usługa serwerowa nie została wdrożona.** Zapisano [założenia](../../zalozenia-funkcji-Serwer.md), [fazy](../../plan-wdrozenia-Serwer.md), [procedurę](wdrozenie.md). To rejestr dowodów, nie lista funkcji marketingowych.

## Stan faz

| Faza | Stan | Dowód / brak |
| --- | --- | --- |
| F0 fundament lokalny | ukończona i odebrana w zakresie F0; cała jakość nieodebrana | [świeży odbiór F0](../quality/f0-odbior-2026-10-18.md): 466 PASS, 1 SKIP, lint/build/CLI/GUI, 29 draftów bez mutacji; [szczegóły fundamentu](../quality/acceptance.md) |
| Dokumentacja serwera | zapisana i sprawdzona | kontrakt, plan, procedura, AGENTS; 61 lokalnych odnośników w 8 dokumentach, fazy F0–F9 i `git diff --check` poprawne; bez zmian kodu w tym kroku |
| F1 korpus/kontrakty | kod i inwentaryzacja wdrożone; odbiór mediów otwarty | [raport F1](../quality/f1-acceptance.md): nowe wersje brandingu z częściowym kontraktem; [90 przypadków](../quality/corpus.md) bez jeszcze przypisanych/odebranych próbek |
| F2 zasoby/manifest | przyrost lokalnego QC wdrożony; pełny odbiór otwarty | [F2](../quality/f2-acceptance.md): zamrożony silnik/zasoby/fonty, syntetyczny render i identyczna powtórzona klatka na jednym hoście; brak paczki przenośnej/dwóch workerów |
| F3 pełne operacje/koszty | rdzeń i zakres QC wdrożone; pełny etap w toku | [F3](../quality/f3-acceptance.md): v3 tekst/istniejący hook i konflikty zapisu; zwykły operator/migracje/benchmark pozostają do wdrożenia |
| F4 tracking/obraz | lokalny przyrost wdrożony; pełny odbiór otwarty | [F4](../quality/f4-acceptance.md): dokładne granice ujęć, raporty, lokalna analiza źródła i kontrola GUI; bez pełnego miernika animacji/odsłuchu |
| F5 API/organizacje/media | plan | brak produkcyjnego API/auth/DB/prywatnego storage |
| F6 zdalna kolejka/budżet | plan | lokalna kolejka nie dowodzi zdalnego lease/fencing i rezerwacji między procesami |
| F7 pilot/deploy/restore | plan | infrastruktura nieuruchomiona, brak odbioru stagingu |
| F8 pakiety/publiczne wydanie | plan | brak pakietów i billing usługi |
| F9 Linux/skala | opcjonalne | brak odebranego zamiennika zależności macOS |

Nie zmieniać na „wdrożone” po samym kodzie lub fixtures. Wpisać release, środowisko i wymagane próby. Prywatne źródła/dowody przechowywać poza publicznym repo; tu ID raportu i podsumowanie.

## Decyzje przed uruchomieniem

| Decyzja | Stan | Kiedy wymagana |
| --- | --- | --- |
| Budżet infrastruktury i API pilota | nieustalony | przed zakupem/płatną próbą |
| Hosting API/Mac/DB/storage i region | nieustalone | przed provisioningiem |
| Dostawca logowania/zaproszenia | nieustalony | przed integracją F5 ze stagingiem |
| Limity wielkości/długości uploadu i przestrzeni | nieustalone | przed uploadem pilota |
| Retencja/usuwanie, backup, RPO/RTO | nieustalone | przed przyjęciem prywatnych materiałów |
| Zakres dostępu pracowników serwisu | nieustalony | przed nadaniem grantów/pilotem |
| Profile i prawa/dostępność fontów/emotek/assetów oraz warunki użycia silnika | do sprawdzenia | przed wydaniem danego profilu |
| Limit kosztu i tolerancje obrazu/audio | do pomiaru i zatwierdzenia | przed oceną parity i automatyzacją wydania |
| Ceny/limity/płatności/downgrade | kierunek: wyższy pakiet brandingu; brak cen | przed F8/publiczną sprzedażą |

Te decyzje nie blokują lokalnych implementacji kontraktów. Nie wybierać abonamentów i parametrów danych w imieniu właścicielki bez podstaw w sesji.

## Odbiór F7

- [ ] Release/manifest przypięte; publiczne buildy nie zawierają klientów, źródeł, transkrypcji ani sekretów.
- [ ] Dwie organizacje i role: brak dostępu przez ID/URL/cache/podpis/API; audytowany dostęp serwisu.
- [ ] Upload ze wznowieniem/checksum, prawdziwy YouTube i lokalny plik przez przeglądarkę; niepełny plik nie uruchamia AI.
- [ ] Zwykła rolka i QC z jawnym wyborem, korekta tekstu/hooka/kadru, 409 z zachowanym draftem, wcześniejsze wersje dostępne.
- [ ] Własny branding/fonty/logo nie zmieniają historycznej rolki; brak assetu blokuje wynik z jasną informacją.
- [ ] Rzeczywiste filmy dopuszczonych profili obejrzane/odsłuchane: Happy News duo/przebitka/zbliżenie, SkyClass wycinek mastera >0, Bisanz bez zoomu.
- [ ] Zamknięcie karty, restart API/workera, przejęcie lease, odrzucona publikacja starego procesu, jeden aktualny wynik.
- [ ] Awaria po odpowiedzi API/MP4: trwałe usage, brak niekontrolowanego retry/redakcji, nieznany koszt nie zeruje się.
- [ ] Mac/Windows/Linux jako przeglądarki pobierają ten sam MP4; rendery workerów przechodzą ustalone tolerancje.
- [ ] Opis i osobny retry, powrót/pobranie; badge zgodny z rewizją/podpisem, niezależny stan przeglądu.
- [ ] Restore DB wraz z mediami w osobnym środowisku oraz rollback runtime/profilu przećwiczone.
- [ ] Koszty AI/renderu/transferu/przeglądu i p50/p95 zmierzone; limit działa także równolegle.
- [ ] Lokalny CLI/panel i konta zespołu działają bez wymuszenia API.

## Wpis zamykający fazę

Podać datę, fazę/zakres, Git SHA, środowisko/runtime, wersje kontraktów, ID korpusu, testy/wyniki, próby GUI/media, koszty lub `unknown`, ograniczenia, dopuszczenie i następny krok. Przy kontroli człowieka także kto, którą rewizję/manifest i jaki zakres obejrzał/odsłuchał.

Publiczne wydanie wymaga dodatkowo odbioru F8 (uprawnienia API, aktywacja/downgrade, płatności w środowisku testowym) i uzgodnionych zasad danych/kosztów. Wygenerowanie MP4 nie kończy przeglądu człowieka.

Przyrost F3 2026-10-19: [zwykłe rolki i konta CLI](../quality/f3-local-2026-10-19.md). Mały zakres/tekst hooka, trwałe próby/usage i ochrona hasha źródła; pełny operator nadal historyczny dla pozostałych zadań.

Przyrost F4 2026-10-20: [lokalny skan układu](../quality/f4-geometry-2026-10-20.md), 536 PASS/1 SKIP, lint/build PASS, częściowy dowód rzeczywistej rolki. Pełny obrys pikseli/twarze i odbiór F4 nadal otwarte; infrastruktura pozostaje odłożona.

Przyrost F4 raster 2026-10-20: [maski pojedynczych warstw](../quality/f4-pixels-2026-10-20.md), 543 PASS/1 SKIP. Bez automatycznej akceptacji całej rolki; nadal brak pełnej projekcji twarzy i odbioru F4.
