# QuickContent — prosty projekt, profil Bisanz i tracking

2026-10-15. Realizacja bez dalszych pytań, na istniejącym panelu React/Remotion.

1. GUI: na górze projektu zakładki Propozycje / Zmontowane (licznik) / Ustawienia. Gotowe wyniki z odtwarzaczem i przyciskami Obejrzyj i popraw / Pobierz. Ukryć techniczne ustawienia, koszty i zakończone zadania pod właściwymi sekcjami; aktywny postęp nadal widoczny. Zachować selekcję i ścieżki edytora.
2. Profil Bisanz: #066FED/biel, animowany marker wspólnego silnika, różnorodne grupy poniżej twarzy. Zastosować tylko gotową wskazaną rolkę, zachować inne prace i wersje.
3. Tracking: lokalne wykrywanie twarzy z próbek czasu krótkiego źródła, wybór spójnej twarzy, ograniczony i wygładzony ruch. Punkty przechowywane w framing i interpolowane po czasie źródła, również przez cięcia/zoom. Ręczna korekta musi umożliwić wyłączenie trackingu.
4. Testy geometrii/interpolacji i walidacji, testy GUI, rzeczywista detekcja wskazanej rolki, klatki przed renderem, nowy MP4 i kontrola GUI. Świeży review zmian. Bez powtarzania analizy/transkrypcji i bez nowej opłaty AI.


## Wynik implementacji

- Zakładki projektu są na górze: Propozycje / Zmontowane (licznik) / Ustawienia, z klawiaturą. Gotowe karty mają prawdziwy MP4, nazwę, Obejrzyj i popraw oraz Pobierz. Koszty/operator/rozdzielczość/historia zadań są w ustawieniach; opisy propozycji zwijane, aktywny postęp pozostaje widoczny. Techniczne logi edytora zwinięte, przy błędzie otwarte. Nagłówek edytora używa ludzkiego tytułu.
- Profil Bisanza zapisany w `klienci/kacper-bisanz/PREFERENCJE.md`; wspólny silnik markerów ma niebieskie #066FED/białe napisy. Dolna bezpieczna pozycja≈0,70, różne układy/ruch w134 słowach bez zmiany czasów ani wypowiedzi. Dawny hook został przywrócony zgodnie z korektą użytkowniczki; ostateczne ustawienie opisane niżej. Delikatne zoomy1,00–1,06 pozostają.
- AppleVision lokalnie znalazł twarz:45 punktów dla42,55s, poziome object-position0,4204–0,5399; próbki co sekundę, wybór najbliższej twarzy, medianowe i wykładnicze wygładzanie, interpolacja na czasie źródła przez cięcia. Brak detekcji utrzymuje ostatnią pozycję. Detektor wymaga macOS/AppleVision; brak wsparcia daje jawny fallback. Ręczny suwak wyłącza tracking bez usuwania ścieżki.
- Rolka `qc-c310ad37c2e34aed-56c8858e0acc6c3d` ma teraz klientaKacperBisanz i stylbisanz. Historia JSON i poprzedni MP4 zachowane; kopia wcześniejszego MP4 w folderze klienta jestv001. Nowy render jest osobnym zadaniem bezASR/AI. Późniejsze poprawki AI czytają faktyczny profil klienta rolki, nawet gdy oryginalny projekt używałPersona.
- Testy198/198PASS, lint/TypeScript0błędów/24 wcześniejsze ostrzeżenia. Świeży review zmian nie znalazł materialnych błędów. Obejrzana klatka638: niebieski marker pod150, twarz odsłonięta, napisy w bezpiecznej strefie. Trwa odbiór renderu iGUI; pełny odbiór całej aplikacji pozostaje osobny.


## Korekta hooka i domknięcie

- Najnowsze polecenie: hook POD napisami, nie nad głową. Przywrócono „Auto za150 tysięcy?” (normalne odstępy wJSON),0–3s; titley0,72/58px, zwykłe napisy w tym czasiey0,60. Kontrolna klatka35: obie warstwy mają odstęp, nie zasłaniają twarzy, dolna krawędź hooka poniżej0,75. Preferencje globalne i klienta zawierają chronologiczne poprawki z jawnym pierwszeństwem najnowszej.
- Zastosowano Hook Engineer i Silnik Social Media: krótki konkret/liczba/pytanie z payoffem w nagraniu, bez clickbaitu i wymyślonych faktów. Zachowanie zaakceptowanego hooka wpisane w prompt montażu; JSONschema udostępnia pozycję napisów i pozycję/rozmiar/akcent tytułu, więc operator może wykonać układ.
- Silny closeup w źródle: lokalna adaptacyjna skala i rozmyte tło pozostawiają miejsce na głowę i napisy. Punkt skali jest opcjonalny; dawny trackingXY zachowuje dawny środek zoomu (regresja zreview naprawiona i sprawdzona).
- Zmontowane pokazuje też ostatni sprawdzony wcześniejszy MP4 po poprawkach, wyraźnie opisany jako wcześniejszy; aktualny badge i procent nadal wymagają aktualnego sprawdzonego pliku. Użytkowniczka ma obecnie8 zapisanych zaznaczeń — ich nie zmieniano podczas tej poprawki.


## Kontrola końcowa

- Regresja202/202PASS i lint/TypeScript0błędów/24 wcześniejsze ostrzeżenia po poprawce zgodności starszego trackingu. Późniejsze równoległe zmiany w silniku dodają wykrywanie cięć/fit; zachowano je, nie cofano. Ukierunkowane testy geometrii5/5 oraz lint/TypeScript przechodzą także z tymi zmianami.
- Dwa eksporty przerwało anulowanie procesu w czasie zmian plików silnika. Użytkowniczka potwierdziła, że nie anulowała ich ręcznie. Eksport wznowiony z istniejących poprawek, bezAI/ASR. Stare renderowane pliki pozostają.
- Kontrolny układ hooka: [klatka35](assets/bisanz-hook-layout.png). OstatecznyMP4 i aktualność mają osobny pomiar `usability-tracking-proof.json` po ukończeniu; nie traktować wcześniejszegov002 jako wersji z przywróconym hookiem.


## Konflikt równoległego procesu

Po trzecim przerwaniu zweryfikowano osobnyClaudeCodePID4641 z cwdMontageFrames (`lsof`, bez czytania argumentów/sekretów). Nie jest to subagent tego zadania; inneClaudePID67595 pracuje wMarketingMAX i pozostaje poza zakresem. ŹródłaReel/framing zmieniały się w tym samym czasie co anulowania. Wysłano użytkowniczce prośbę o zgodę na zatrzymanie wyłącznieClaude wMontageFrames; do odpowiedzi nie przerywać tego procesu i nie ponawiać kolejnych eksportów na zmiennym silniku. Hook/napisy zapisane, klatka kontrolna gotowa; pełnyMP4 z przywróconym hookiem jeszcze nieukończony.


### Ukończony eksport Bisanza i prostszy dostęp — 2026-10-15

Użytkowniczka poleciła poczekać naClaude, potem potwierdziła zakończenie jego pracy. Nie przerywano obcego procesu. Po tej informacji eksport ukończył się poprawnie: `klienci/kacper-bisanz/Render/qc-c310ad37c2e34aed-56c8858e0acc6c3d-v003.mp4`,1080×1920,H264/AAC,42,581s. Job `job-c88f72b9-8f5c-465f-ae4f-508a0045a001` completed, rewizja7, serwerisCurrent=true, pobieranieHTTP200/46414764bajty. Bez nowych wywołańAI/ASR. Poprzednie wersje zachowane.

Hook „Auto za150 tysięcy?” jest pod napisami przez0–3s; klatka gotowegoMP4 potwierdza odstęp i bezpieczną pozycję. Sprawdzono także kadr zbliżenia i środek filmu oraz odtwarzanie wGUI; pełnego odsłuchu nie wykonano. ZakładkaZmontowane pokazuje aktualny film, Obejrzyj i popraw i Pobierz. Panel pozostawiono na tej zakładce. [Pomiar](usability-tracking-proof.json), [hook](assets/bisanz-hook.png), [GUI](assets/finished-bisanz-project.png).

Regresja tej zmiany przed późniejszymi równoległymi dodatkami silnika:202/202PASS,lint/TypeScript0błędów/24 wcześniejsze ostrzeżenia. Po zakończeniuClaude:9/9 ukierunkowanych testów geometrii/kontraktuAI iTypeScriptPASS. `git diff --check`PASS. Pełny odbiór całej aplikacji i wcześniejsze otwarte uwagi pozostają osobnym zakresem.
