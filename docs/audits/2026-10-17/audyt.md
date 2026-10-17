# Audyt MontageFrames — 17 października 2026

**Aktualizacja:** zakres poza LongForm został następnie naprawiony na polecenie użytkowniczki. Wyniki i ograniczenia: [raport napraw](fixes.md), [macierz odbioru](../../acceptance-matrix.md). Poniżej zachowano stan i reprodukcje sprzed napraw.

Co robi repozytorium: lokalny panel montażowy React/Vite z silnikiem Remotion. Obsługuje zwykłe rolki, QuickContent, częściowo ukończony LongForm, Motion Studio i aktualizator. Zakładane obciążenie: jedna osoba na Macu, kilka kart panelu i jedno ciężkie zadanie; nie serwis publiczny dla wielu klientów.

Audyt kodu i plan poprawek, bez zmian implementacji, renderowania prywatnych filmów, wywołań AI, commitów i publikacji. Baza: HEAD `f47ae631c16e9a08cb56f1fdd465d8457611fcc1`. Przed audytem istniały zmiana `.env.example` oraz nieśledzone `.claude/skills/apple-design` i `.impeccable/`; zachowane.

Metoda: Ponytail audit/review, Superpowers using-superpowers, writing-plans i verification-before-completion; design-taste-frontend i gpt-taste dla oceny wizualnej. Konflikty reguł rozstrzyga rzeczywisty produkt i PREFERENCJE.md: nie zalecam losowania nowego layoutu, AIDA ani przypinanych sekcji w roboczym panelu. iPhone i jego perspektywa są zamówione przez właścicielkę. Liquid glass w rolkach pozostaje zasadą klienta, nie błędem wynikającym ze skilla stron WWW.

## Dowody i wyniki sprawdzeń

| Sprawdzenie | Wynik |
|---|---|
| `npm test` poza sandboxem | **385/385 PASS**, 0 pominiętych, ok. 11,8 s |
| Pierwsze `npm test` w sandboxie | 348 PASS, 26 FAIL, 11 anulowanych; ograniczenia kontroli procesów. Nie są dowodem błędu aplikacji |
| `npm run lint` (ESLint + TypeScript) | exit 0, **0 błędów / 24 ostrzeżenia** w istniejącym `src/studio/jeep-grand` |
| `npm run build` | Remotion bundle PASS |
| `npx vite build --config vite.config.mjs` | PASS; ostrzeżenia o dyrektywach bibliotek i chunkach >500 kB |
| `git diff --check` | PASS przed dodaniem raportu |
| Inspektor design-taste: 1440 / 768 / 390 px | **13 FAIL / 6 WARN** według reguł skilla; to nie 13 potwierdzonych awarii UX |
| Lint wizualny źródeł | 21 FAIL / 6 WARN; heurystyki wymagają interpretacji |
| Ręczna kontrola | Wszystkie 10 zrzutów inspektora, panel biblioteki, lista/projekt QuickContent, LongForm; mobilny LongForm 390×844 |
| Próby regresji na `/tmp` | Potwierdzone #1, #2, #3; wynik w `reproductions.txt` |

Nie uruchamiano płatnych analiz ani ponownego ASR. Istniejących nagrań i projektów nie edytowano. Build uruchamia istniejący synchronizator Studio; po nim nie pojawił się diff śledzonego kodu.

## Pilne poprawki

1. **[P1] LongForm pokazuje stary film jako aktualny po zmianie cięć** — `ui/longform-server.mjs:422–440, 471–475`.
   - **Co to jest:** zapis rough cut ma unieważniać zależny plan i wynik.
   - **Problem:** unieważnienie działa tylko dla stanu `cuts-approved`. Próba w stanie `done`: PUT zwrócił 200, a GET renders nadal wskazał `out/check-v001.mp4` jako current; `planStale` i `renderStale` pozostały false. Endpoint akceptacji planu też nie sprawdza `planStale`.
   - **Poprawka:** po każdej zmianie zatwierdzonych wcześniej cięć wrócić do przeglądu i unieważnić zależności; odrzucać akceptację starego planu oraz edycję podczas planning/montage. Zabezpieczyć również edycję LongForm przez zwykły edytor.
   - **Jeśli pominiemy:** użytkowniczka pobierze wcześniejszy film przekonana, że zawiera poprawki.

2. **[P1] LongForm ufa czasom i długości przysłanym przez przeglądarkę** — `ui/longform-server.mjs:426–439`, `src/longform/schema.mjs:35–40`.
   - **Co to jest:** ręczne cięcia trafiają do roughcut.json i segmentów renderu.
   - **Problem:** schemat sprawdza typy, ale nie zgodność z masterem/słowami. Dla 10 s źródła przyjęto `sourceDuration:1000` i cięcie 500–501; po akceptacji serwer utworzył segmenty 0–500 i 501–1000. Nie wywołuje tu `validateCuts`.
   - **Poprawka:** długość brać z projektu, walidować zakresy i ID względem transkryptu przed zapisem i akceptacją; granice słów oraz reguły klienta egzekwować na serwerze. Świadome ręczne decyzje zachować według osobnego, jawnego kontraktu.
   - **Jeśli pominiemy:** wadliwy draft może wygenerować błędny film lub uszkodzić sens wypowiedzi.

3. **[P1] Dwa zapisy tej samej rewizji LongForm oba przechodzą** — `ui/longform-server.mjs:410–440, 450–469`.
   - **Co to jest:** rewizja ma chronić przed nadpisaniem pracy z drugiego okna.
   - **Problem:** odczyt, porównanie i zapis nie są serializowane. Dwa równoczesne PUT z rewizją 5 zwróciły 200 i rewizję 6; jedna zmiana znika. Unikalny plik .tmp chroni przed częściowym JSON, nie przed takim wyścigiem.
   - **Poprawka:** kolejka mutacji per projekt obejmująca ponowny odczyt, sprawdzenie rewizji i cały zapis. Objąć rough cut, plan i akceptacje.
   - **Jeśli pominiemy:** nawet jedna osoba z dwiema kartami straci część pracy.

4. **[P1] Konflikt planu LongForm kasuje lokalny draft** — `ui/LongFormPlan.tsx:119–140, 164–173`.
   - **Co to jest:** edycja hooka, rozdziałów i usuniętych efektów przed montażem.
   - **Problem:** po odpowiedzi 409 `act()` wywołuje `load()`, które nadpisuje `edit` świeżym planem serwera. Ręczny hook i tytuły z bieżącej karty przepadają.
   - **Poprawka:** zachować lokalne `edit`, pokazać konflikt i udostępnić jawne wczytanie serwera/kopię draftu. Nie ponawiać zapisu automatycznie ze świeżą rewizją.
   - **Jeśli pominiemy:** ochrona serwera ratuje cudzy zapis kosztem bieżących poprawek użytkowniczki.

5. **[P1] Upload zwykłych rolek może podstawić wcześniejsze nagranie** — `ui/server.mjs:315–324`.
   - **Co to jest:** ponowne dodanie pliku u klienta.
   - **Problem:** ta sama nazwa i liczba bajtów oznaczają `reused:true`, bez porównania zawartości. Dwa różne nagrania o tym samym rozmiarze są traktowane jako jeden film.
   - **Poprawka:** najmniejsza bezpieczna wersja to 409 dla istniejącej nazwy; jeśli reużycie ma zostać, porównać hash streamowanego pliku tymczasowego. Unikalny plik tymczasowy dla każdego uploadu.
   - **Jeśli pominiemy:** montaż może dotyczyć innej wypowiedzi niż przesłana.

6. **[P1] Zwykłe rolki i Motion nadpisują wcześniejsze eksporty** — `scripts/prep.mjs:133`, `ui/server.mjs:191–205`, `scripts/motion-render.mjs:48–52, 64–86`.
   - **Co to jest:** wyjściowe MP4 i artefakty kontroli.
   - **Problem:** zwykła rolka zawsze zapisuje `<nazwa>.mp4`; Motion używa stałego prefiksu format/tryb i FFmpeg `-y`. Ponowny eksport zastępuje wcześniejszy wynik; historia JSON nie odtwarza poprzedniego MP4.
   - **Poprawka:** wersjonowanie i publikacja sprawdzonego pliku tymczasowego. Wykorzystać istniejące `nextRenderPath` / `publishVerifiedRender`, zachowując ścieżki starych plików.
   - **Jeśli pominiemy:** nie będzie powrotu do poprzedniej zaakceptowanej wersji filmu.

7. **[P1] Zwykły edytor słabiej chroni zapis niż QuickContent** — `ui/server.mjs:110–126`, `ui/App.tsx:332–365, 410–418`.
   - **Co to jest:** wspólny edytor napisów i uruchamianie renderu.
   - **Problem:** zwykłe rolki nie sprawdzają rewizji; dwa okna mogą nadpisać zmiany. Po błędzie zapisu blokada rozpoczęcia zadania i zachowanie draftu są warunkowane `isQC`, więc zwykła rolka może wyrenderować starsze dane z dysku mimo nowych napisów na ekranie.
   - **Poprawka:** rewizja i serializacja dla wszystkich rolek; wspólny warunek blokady po nieudanym zapisie i zachowanie draftu niezależnie od pochodzenia rolki.
   - **Jeśli pominiemy:** podgląd i pobrany film mogą zawierać inny tekst.

8. **[P1] Zużycie AI LongForm nie jest od razu trwałe** — `ui/longform-server.mjs:198–202, 274–276`.
   - **Co to jest:** rejestr tokenów i operacji na koncie.
   - **Problem:** `recordUsage` zmienia tylko zmienną `p`; zapis następuje przy późniejszym raporcie/zakończeniu. Restart między otrzymaniem odpowiedzi a tym zapisem traci pomiar, choć model już wykonał pracę. QuickContent ma trwalszy kontrakt.
   - **Poprawka:** zapisać receipt przed zwróceniem z callbacka, w tej samej kolejce mutacji co postęp i stan; deduplikować identyfikator operacji przy retry.
   - **Jeśli pominiemy:** raport kosztów/zużycia będzie niepełny; brak danych nie może oznaczać zera.

9. **[P1] Pobranie OTIO uruchamia ciężkie kodowanie poza blokadą** — `ui/longform-server.mjs:477–488`.
   - **Co to jest:** eksport audio z cenzurą do montażu w Premiere.
   - **Problem:** GET uruchamia FFmpeg całego źródła do stałego `audio-censored.wav`, bez `acquire()`. Dwa pobrania równocześnie mogą kodować i nadpisywać ten sam plik, także podczas innego ciężkiego zadania.
   - **Poprawka:** POST tworzy kontrolowane zadanie przygotowania z cache po danych cenzury; GET tylko pobiera gotowy manifest/pakiet. Wyjście publikować atomowo.
   - **Jeśli pominiemy:** eksport omija limit pracy i może dać niekompletny plik audio.

## Następnie poprawić

10. **[P2] Eksport cenzury ignoruje rampę** — `scripts/longform-otio.mjs:54–58`.
    - **Co to jest:** łagodne wejście/wyjście wyciszenia ma usuwać trzaski.
    - **Problem:** `m.ramp` jest pomijane; filtr przełącza `volume` skokowo. Dokument wdrożenia obiecuje dokładną rampę przy eksporcie, której kod nie realizuje.
    - **Poprawka:** policzyć obwiednię gain w FFmpeg z rampą 5 ms, potwierdzić na syntetycznej próbce i odsłuchem; uzupełnić licencjonowany kruk osobno.
    - **Jeśli pominiemy:** część wyciszeń może klikać; to ryzyko dźwiękowe, nie potwierdzony odsłuchem defekt konkretnego filmu.

11. **[P2] Obsługa mediów jest nierówna między modułami** — `ui/server.mjs:481–486`, `ui/motion-server.mjs:280–301`.
    - **Co to jest:** odtwarzanie/pobieranie dużych MP4.
    - **Problem:** zwykły wynik i LongForm przez `/api/file` nie mają Range; Motion dodatkowo ładuje cały MP4/ZIP do RAM przez `readFile`. Dla pliku 500 MB jedno pobranie wymaga bufora około 500 MB, a seek nie ma kontraktu 206.
    - **Poprawka:** wydzielić istniejący sprawdzony serwer mediów z QuickContent (`serveMedia`, `parseRange`), użyć streamów, HEAD i Range we wszystkich modułach.
    - **Jeśli pominiemy:** duże wyniki obciążają pamięć i mogą gorzej przewijać się w odtwarzaczu.

12. **[P2] Obcy fragment silnika unieważnia gotowe rolki QuickContent** — `scripts/quickcontent-render.mjs:44–92`.
    - **Co to jest:** podpis wejścia rozstrzygający aktualność MP4.
    - **Problem:** podpis obejmuje prawie całe `src`, łącznie z `src/motion` i innymi stylami. Zmiana wyłącznie Motion unieważnia np. gotowy film SkyClass, mimo braku zmiany jego obrazu; prowadzi do niepotrzebnego ponownego renderu.
    - **Poprawka:** jawny zestaw wspólnych zależności renderu i zależności wybranego stylu; test niepowiązanej oraz rzeczywiście powiązanej zmiany. Nie usuwać podpisów i walidacji.
    - **Jeśli pominiemy:** dalszy rozwój silnika stale zamienia gotową bibliotekę w wyniki wymagające aktualizacji.

13. **[P2] Mobilny nagłówek LongForm łamie pojedyncze słowo** — `ui/LongForm.tsx`, `ui/longform.css` (nagłówek widoku).
    - **Co to jest:** orientacja w module na telefonie.
    - **Problem:** przy 390×844 nagłówek „Film poziomy” dostał tylko 53,32 px szerokości i 168 px wysokości. Zrzut pokazał „Film / pozi / om / y” między linkami powrotu.
    - **Poprawka:** mobilny nagłówek w osobnym wierszu, linki powrotu niżej lub jeden link; zapewnić `min-width`/właściwy grid zamiast maskowania overflow.
    - **Jeśli pominiemy:** początek najważniejszego ekranu edycji jest trudny do odczytania.

14. **[P2] Biblioteka pokazuje techniczne identyfikatory zamiast treści** — `ui/server.mjs:76–95`, `ui/App.tsx:851–876`.
    - **Co to jest:** wybór istniejącej rolki.
    - **Problem:** na żywo widać pozycje typu `qc-bcf526f4a6fe12de-0e9b4d28d3f4f096`, jedynie z czasem. Ta sama wypowiedź w QuickContent ma czytelny tytuł; w bibliotece nie da się jej rozpoznać bez otwierania. Równe karty klientów zostawiają dużo pustego miejsca przy jednym filmie.
    - **Poprawka:** zwrócić w library tytuł z origin/propozycji, moduł i stan wyniku; ID zostawić w szczegółach. Zwarta lista z miniaturą i filtrem klienta/stanu.
    - **Jeśli pominiemy:** rosnąca biblioteka będzie coraz wolniejsza w codziennej obsłudze.

15. **[P2] Landing ma czytelny hero, ale za mało dowodów produktu i za drobną treść dalej** — `ui/Landing.tsx`, `ui/landing.css`.
    - **Co to jest:** publiczne wejście do narzędzia.
    - **Problem:** inspektor zmierzył 17 bloków poniżej 13 px i 28 rozmiarów tekstu. Przy 768 px sekcja agenta łamie nagłówek na 4 wiersze, mobilna tabela cen przewija się poziomo; brak rzeczywistego filmu przed/po. Obecne demo jest jawnie schematem, a nie dowodem jakości renderu.
    - **Poprawka:** najpierw powiększyć treść i uprościć skalę, ułożyć tabelę mobilnie, skrócić lokalne nagłówki; dodać jeden legalny, sprawdzony przykład rzeczywistego wyniku. Zachować zamówiony iPhone i nie dodawać losowych zdjęć tylko dla licznika skilla.
    - **Jeśli pominiemy:** landing nadal obiecuje więcej, niż potrafi pokazać odwiedzającej osobie.

16. **[P2] Dokumenty mieszają „plan”, działający kod i odbiór** — `AGENTS.md`, `docs/longform/implementation-progress.md`, `docs/motion-studio-acceptance.md`.
    - **Co to jest:** instrukcje dla kolejnych prac i informacja o gotowości.
    - **Problem:** AGENTS nadal mówi „LongForm: brak kodu”, mimo obecnego GUI i rendererów. Ledger nadal wymienia jako brakujące kontekstową detekcję przekleństw i koszty GUI, choć `extraProfanity` i „Zużycie AI” już istnieją. Linki `docs/longform/benchmark.md` i `docs/premiere/acceptance.md` prowadzą do nieistniejących plików; lista odbioru Motion nie jest raportem wyników.
    - **Poprawka:** jedna aktualna macierz funkcja/kod/test/prawdziwy odbiór/otwarte, z linkami do dowodów; przestarzałe wpisy oznaczyć historycznie. Nie uznawać 385 testów za odbiór całych przepływów.
    - **Jeśli pominiemy:** kolejne prace powtórzą zrobione zadania albo pominą niezrobione.

17. **[P2] Refaktoryzacja powinna oddzielić mutacje projektu i render od HTTP/UI** — `ui/longform-server.mjs`, `ui/server.mjs`, `ui/QuickContent.tsx`, `package.json`, `.github/workflows/release.yml`.
    - **Co to jest:** koszt i bezpieczeństwo kolejnych poprawek.
    - **Problem:** walidacja, rewizje, stan i wykonywanie zadań są utrzymywane różnie w zwykłych rolkach/QC/LF, co już dało błędy #1–#9. QuickContent ma 2605 linii w jednym komponencie; rozszerzanie ekranu dotyka wielu niezależnych stanów. Lista lint pomija m.in. `ui/server.mjs`, Motion i część Dialogs; release nie wykonuje buildów.
    - **Poprawka:** najpierw testy wykrytych usterek, potem wyciągnąć kolejkę mutacji LF, współdzielone media i zapis wersji. UI dzielić według zadań (import/propozycje/wyniki/ustawienia), zachowując API. Lint objąć źródłami według katalogów i kontrolowanych wyłączeń; w CI dodać oba buildy.
    - **Jeśli pominiemy:** każda nowa funkcja nadal będzie miała inne reguły zapisu i wyników, a paczka może przejść testy mimo zepsutego bundlowania.

## Co faktycznie działa, a co pozostało

| Obszar | Stan potwierdzony kodem / istniejącymi dowodami | Pozostało / ograniczenia |
|---|---|---|
| Zwykłe rolki | Prep, ASR Parakeet, style, edytor, operator Claude, render, opisy | Ochrona zapisu i wersji #5–#7; pełny test świeżej instalacji |
| QuickContent | Import YouTube/pliku, Whisper, propozycje, wybór, klient, trwała kolejka/checkpointy, koszty, kadrowanie, wersje, poprawki, opisy | Pełny odbiór całej ścieżki nadal otwarty; SkyClass z czasu >0 z odsłuchem, anulowanie/restart, więcej/wyczerpanie, realny lokalny plik, HDR/VFR/multi-speaker według planu. Podpis #12 jest zbyt szeroki |
| LongForm L0–L3 | Format, rough cut, przegląd/akceptacja, AI CLI, przekleństwa z kontekstu, plan/hook/rozdziały, Pexels/logo, wersjonowany render; GUI pokazuje zużycie AI | Krytyczne #1–#4, #8–#9. Upload z komputera i master QC, odsłuchy przed/po, J/K/L, powrót do pozycji, rozbudowana oś efektów/„zamień”/regeneracja pojedynczego efektu; wynik: napisy/czat/opis z rozdziałami |
| LongForm L4 | Są maska Vision, cutout/text-behind/background-swap/vertigo z fallbackami | Istnienie kodu nie jest odbiorem jakości maski na realnych długich nagraniach |
| LongForm L5/L6 | Tylko część efektów i bazowy eksport OTIO | Pełny research ze źródłami, efekty stylizowane z katalogu, benchmark 3 materiałów i odbiór; sam URL w params nie potwierdza treści źródła |
| Cenzura | Leksykon + kontekst AI, wyciszenie, dane o SFX | Brak kruka (`public/sfx/index.json` puste), rampa eksportu #10, odsłuch |
| Premiere | Kod podstawowego OTIO z cięciami i osobnym audio | P0 spike UXP, pełny P1 pakiet z alfą/SRT/markerami, import na rzeczywistym Premiere; P2–P5 panel/edycja/powrót/.ccx. Obecny link nie oznacza gotowego pluginu |
| Motion Studio | Brief, assety, plan AI, preview/draft/final, podpisy i bramka ocen, paczka źródeł | Wersjonowanie #6, strumieniowanie #11, realny odbiór formatów/audio i restartu; brak raportu zamykającego całą checklistę |
| Aktualizator | Manifest, porównanie hashy, zachowanie plików, transakcja/backup, UI, release workflow | Rzeczywiste wydanie i instalacja/rollback na drugiej kopii, brak internetu, zmieniony klient i szablon; fixture nie zastępuje dystrybucji |
| Oferta i integracje | Landing i kalkulator, plany cenowe oznaczone jako planowane | Billing/pakiety/limity nie są aktywną funkcją; Hermes/głos/Dysk Google zapowiedziane, nie gotowe |

LongForm przy imporcie zachowuje proporcje pliku i nie odrzuca pionowych materiałów (`create`, linie 151–167); formularz pokazuje też pionowe nagrania klientów. W odbiorze materiału 16:9 trzeba jawnie ustalić: odrzucenie innych formatów z komunikatem albo świadomy wybór kadru. Nie zakładam samoczynnej konwersji pionu na poziom.

## Ocena wizualna — jedna runda, bez przeprojektowywania

ROUND 1

- Pierwsza sekunda: duże „Ty nagrywasz” i niebieska obietnica montażu. Hero jest czytelny i ma 2 wiersze we wszystkich trzech szerokościach.
- Idea: ten sam materiał przechodzi z ręcznej osi do prostego montażu. To właściwy temat, choć obecne ilustracje są schematyczne.
- Żywy element: edycja przykładowego słowa i kalkulator własnych założeń; symulacja uczciwie opisana, bez obietnicy czasu renderu.
- Układy: hero=centralny / montaż=telefon+edytor / czas=kolorowe pole / kalkulator=split / polski=metryka / operatorzy=split / porównanie=tabela / oferta=karty / FAQ=split / zakończenie=centralne.
- Oceny subiektywne: design 6,5 · usability 7 · creativity 6 · content 7 → 6,6; **limit skilla przy FAIL: 6,0**. To wynik według restrykcyjnej rubryki landingu, nie ocena całej aplikacji ani niezależne badanie użytkowników.
- Trzy problemy: drobne teksty i brak rzeczywistego klipu (desktop-page-02); 4-wierszowy nagłówek agenta przy 768 px (tablet-page-01); mobilna tabela oraz powtarzające się duże karty (mobile-page-01/02).
- Osobno rzeczywisty błąd panelu: #13, zmierzony w przeglądarce. Biblioteka #14 wymaga poprawy informacji, nie ozdobników.

Nie kopiować automatycznie całego wyniku inspektora do backlogu: etykieta pola kalkulatora została rozpoznana jako eyebrow, kreski w `data-ui` i tabela są uzasadnioną częścią interfejsu, a telefon 3D wynika z preferencji. Zakaz gradientów/cieni skilla nie unieważnia zamówionego mockupu. Nie dodawać czterech przypadkowych zdjęć do narzędzia wideo wyłącznie dla wyniku metryki. Priorytet mają czytelność, faktyczny wynik i wygoda.

## Review bieżącej zmiany

`ponytail-review` obejmuje istniejący diff `.env.example`: bezpieczniejsze domyślne konto CLI, Codex dla QC/opisu i jawne ostrzeżenie, że zwykłe rolki/Motion korzystają z Claude. Czytany z `readAccountPolicy`, wyborem providerów i README; nie znalazłem w tym diffie potwierdzonego błędu. To nie ocena całej historii commitów. Nieśledzone pliki narzędziowe nie były oceniane jako implementacja produktu.

**Werdykt:** najpierw #1–#9, ze szczególnym priorytetem #1–#7. Bazowa regresja jest zielona, ale nie dowodzi gotowości całego produktu. Nie rozpoczynać dużego redesignu ani pluginu Premiere przed zabezpieczeniem zapisów i wyników.

**Lean:** brak potrzeby nowych zależności; reużyć istniejące wersjonowanie, walidację i media. Nie podaję liczby usuniętych linii bez wykonania refaktoryzacji i porównania zachowania.

**Nie sprawdzono:** nowego pobrania YouTube, prawdziwego ASR/LLM, pełnego renderu i odsłuchu wszystkich stylów, rzeczywistego Premiere, wszystkich efektów katalogu, aktualizacji na drugiej instalacji ani zewnętrznych cenników. Nie czytano w całości każdego presetu stylu, historycznego skryptu `build_reel_*`, wygenerowanego `src/studio`, assetów i każdego testu; pogłębiono ścieżki zapisu, rewizji, renderu i eksportu. Nie jest to pełny audyt zależności ani penetracyjny audyt bezpieczeństwa.
