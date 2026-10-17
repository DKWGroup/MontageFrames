# Poprawki po audycie — 17.10.2026

Zrealizowano zakres poza LongForm po poleceniu „pomiń na razie temat funkcji long form — ogarnij resztę”. Audyt bazowy pozostaje zapisem stanu sprzed napraw: [audyt.md](audyt.md). Nie zmieniano projektów, nagrań ani gotowych filmów klientów. Bez commitów, publikacji i płatnych wywołań AI.

## Wykonane

| Wniosek | Zmiana i dowód |
|---|---|
| #5 Upload podmieniający źródło | Istniejąca nazwa zawsze daje 409; rozmiar nie jest tożsamością. Unikalny plik tymczasowy, publikacja bez nadpisania i sprzątanie po przerwaniu. `ui/upload.test.mjs`: kolizja, równoległość, zerwany strumień. |
| #6 Wersje zwykłych rolek | Panel renderuje ze snapshotu do kolejnego `-vNNN.mp4`, sprawdza film przez ffprobe i zapisuje podpis wejścia. Operator kończy redakcję, a render wykonuje kontrolowany krok serwera. Starszy film pozostaje dostępny. |
| #6 Wersje Motion | Osobna rezerwacja numeru dla preview/draft/final, wersjonowane MP4, klatki, recenzje i ZIP; wynik zadania zawiera tylko nowe artefakty. Brak audio jest poprawny dla projektu bez muzyki. |
| #7 Zapis edytora | Wszystkie zwykłe rolki mają rewizję odczytu, serializowany zapis i konflikt 409. Draft pozostaje po błędzie, a niezapisana poprawka blokuje montaż/render. Rewizja treści wykrywa także zmiany operatora terminalowego. QC zachowuje swój kontrakt rewizji. |
| #11 Media | Jeden streaming GET/HEAD/Range dla QC, zwykłych plików i Motion. Testy 206/416, suffix Range, HEAD i pobierania. |
| #12 Podpis renderu | Zmiana nieużywanego stylu lub Motion nie unieważnia rolki. Zależności stylów są jawne, w tym współdzielone helpery SkyClass używane przez Bisanz. |
| #14 Biblioteka | Tytuły propozycji, miniatury QC, wyszukiwanie filmu/klienta i filtr aktualności. Po edycji QC dostępny jest ostatni sprawdzony film archiwalny, oznaczony jako wymagający aktualnego renderu. |
| #15 Czytelność | Większa treść pomocnicza, krótsze lokalne nagłówki, mobilna tabela w postaci rekordów. Zachowany obecny język wizualny i jawnie podpisana symulacja; nie dodano publicznie prywatnego filmu klienta. |
| #16 Dokumentacja | [Macierz odbioru](../../acceptance-matrix.md) oddziela kod, testy i odbiór na realnym materiale. Dokumentacja LongForm pozostaje poza tym zakresem. |
| #17 Refaktoryzacja i CI | Wydzielono store rolek, upload, media, metadane biblioteki oraz widok kosztów QC. Lint obejmuje src/ui/scripts z jawnymi wyłączeniami generowanego Studio i historycznych generatorów. Release uruchamia oba buildy. |

Końcowy niezależny przegląd wykrył i doprowadził do naprawy: zależności SkyClass w podpisie Bisanz, anulowania podczas kopiowania snapshotu, wyboru archiwalnego MP4 w bibliotece oraz ochrony HEAD w Motion. Każdy przypadek ma test regresji, uruchomiony najpierw z wynikiem negatywnym. Anulowanie zwykłego joba jest propagowane przez AbortSignal do kroków renderu i generowania opisu; nie uruchamia kolejnego procesu po zatrzymaniu przygotowania.

## Sprawdzenia

- `npm test`: **400/400 PASS**, 0 pominiętych; końcowa regresja około 9,9 s poza ograniczeniami sandboxa.
- `npm run lint`: PASS, ESLint i TypeScript bez błędów.
- `npm run build`: PASS; `npm run build:panel`: PASS. Vite nadal zgłasza dyrektywy bibliotek i chunk >500 kB; nie blokuje to builda.
- Rzeczywisty render na neutralnym, wygenerowanym źródle: zwykła rolka 720×1280, 1,003 s, H.264 + AAC. Dwa kolejne MP4 v001/v002; hash pierwszego nie zmienił się po drugim. Obejrzano klatkę z polskimi napisami.
- Rzeczywisty Motion: dwa osobne preview v001/v002 z evidence, contact sheet i paczką źródeł oraz draft 1080×1080, 6 s, H.264 yuv420p bez audio. Obejrzano contact sheet. Próba wykryła nadmierny wymóg audio w nowym sprawdzeniu; poprawiono i powtórzono draft z sukcesem. To test techniczny, bez twierdzenia o odbiorze jakości miksu muzyki.
- Przeglądarka: biblioteka, wyszukiwanie i pusty wynik filtra aktualnych filmów; landing 390/768/1440 px, scrollWidth równy viewportowi. [Mobilny hero](fixes/landing-390.png), [tabela mobilna](fixes/comparison-390.png), [tablet](fixes/landing-768.png), [desktop](fixes/landing-1440.png). Nie zmieniano prywatnych projektów przez GUI.
- Detektor źródeł zmienionego UI: 0 wskazań. Zrzuty obejrzane; zachowano zamówiony mockup telefonu, istniejące fonty i kolory.
- `git diff --check`: PASS.

## Otwarte po tym zakresie

LongForm #1–#4, #8–#10 i #13 odłożono na wyraźne polecenie użytkowniczki. Nie wdrażano Premiere, billingów ani zapowiedzianych integracji głos/Dysk/Hermes. Pełne ścieżki QC z prawdziwym YouTube, ASR i operatorem AI, odsłuch SkyClass z czasu >0, wszystkie formaty Motion z muzyką oraz aktualizacja/rollback drugiej instalacji nadal wymagają osobnego rzeczywistego odbioru. Testy fixture i neutralny render nie zastępują tych dowodów.

Ograniczenie: nowe gwarancje wersjonowania zwykłych rolek dotyczą panelu. Ręczne `npx remotion render <nazwa> <ścieżka>` zapisuje w ścieżce podanej przez osobę uruchamiającą. Stare receipty bez podpisu zachowują dotychczasową kontrolę zgodności; nowy render tworzy podpis. Zmiana mechanizmu podpisu może jednorazowo oznaczyć wcześniejszy render QC jako nieaktualny; istniejący MP4 pozostaje dostępny bez ponawiania AI.
