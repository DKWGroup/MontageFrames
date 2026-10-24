# Fundament jakości — odbiór etapu 2026-10-18

**Stan: wdrożony i sprawdzony pierwszy etap lokalny. Cała usługa oraz pełna zgodność wizualna pozostają do wdrożenia i odbioru.**

Fundament odpowiada fazie F0 późniejszego planu serwera. Na polecenie wykonania F0 przeprowadzono [ponowny odbiór 2026-10-18](f0-odbior-2026-10-18.md): świeża suite, lint/build, CLI i GUI; zakres F0 zamknięty. Poniżej pozostają szczegóły pierwotnej implementacji i jej ograniczenia.

Projekt: [kierunek usługi](../superpowers/specs/2026-10-18-quality-managed-service-design.md), [plan etapu](../superpowers/plans/2026-10-18-quality-foundation.md). Korekty użytkowniczki mają pierwszeństwo: zachować CLI/konta dla właścicielki i zespołu wewnętrznego oraz tworzenie własnych brandingów. Wyższy pakiet brandingu dotyczy przyszłej oferty; ten etap nie wdraża billing/paywalla.

## Co działa

- Wspólny walidator przy zapisie zwykłej rolki i QuickContent sprawdza tożsamość źródła/klienta/brandingu, klatkaż, zakresy cięć, strukturę kadru, czasy/kolejność słów i ścieżki grafik. SkyClass zachowuje wszystkie słowa i segmenty. Bisanz odrzuca nowy zoom; niezmienione historyczne zoomy ignorowane przez renderer nie blokują korekty tekstu.
- Zwykły operator terminalowy uruchamiany z panelu przywraca wcześniejszy `reel.json`, gdy operacja kończy się błędem lub zapisuje niepoprawne dane. Nie jest to transakcja wszystkich plików repo ani blokada dowolnej ręcznej edycji przez terminal.
- W asystencie QuickContent można jawnie wybrać **Tylko tekst napisów**. Odpowiedź v2 zawiera zmienione teksty i opcjonalne grupowanie/klucze przez referencje bieżącej rewizji. Kod zachowuje czasy, kadr, tracking, hook, grafiki i pozostałe metadane. Nieznane/duplikowane ID oraz niepełne grupowanie są odrzucane przed zapisem. Referencje nie są trwałymi identyfikatorami mastera.
- **Cały montaż** pozostaje domyślny i zachowuje dotychczasowe polecenia. Pełne montaże i pozostały czat nadal korzystają ze starszej, walidowanej odpowiedzi. Nowy mały kontrakt nie obejmuje jeszcze zmian grafik, hooka, cięć i kamery.
- `npm run reel:check -- <nazwa> [--before <plik.json>]` działa bez AI i zmian plików. Bez wcześniejszej wersji kontroluje strukturę; porównanie z konkretną wersją sprawdza także niezmienność chronionych danych.
- Własne brandingi i ustawienia stylów pozostają dostępne. Wcześniejszy snapshot rolki jest chroniony przy korekcie, a nowy branding wybiera się istniejącą ścieżką tworzenia montażu.

## Dowody

| Sprawdzenie | Wynik |
| --- | --- |
| Baseline przed zmianą, poza ograniczeniami sandboxa dla portów/procesów | 450 testów: 449 zaliczonych, 1 pominięty, 0 błędów |
| Końcowe `npm test` | 467 testów: 466 zaliczonych, 1 pominięty, 0 błędów |
| `npm run lint` (ESLint i TypeScript) | zaliczone |
| `npm run build:panel` | zaliczone; istniejące ostrzeżenie wielkości paczek |
| Bieżąca prywatna biblioteka | 29/29 draftów przechodzi walidację bez modyfikacji |
| GUI prawdziwego lokalnego panelu, istniejąca rolka QC | wybór pełnego zakresu i napisów, właściwa pomoc oraz operator konta; bez wysłania poprawki do prywatnej rolki |
| Rzeczywiste konto Codex/ChatGPT, sztuczne jedno słowo | v2: `test` → `Test`, czasy zachowane, bez API/fallbacku |
| Niezależny review | naprawiony przypadek historycznego zaokrąglenia końca grafiki; dodany test regresji |

Testy obejmują błędne ID, czasy, grupowanie, metadane, odmowę zapisu i przywracanie JSON po błędzie operatora, trwały zakres joba, kontrolę CLI oraz istniejące ścieżki transportów. Nowe przypadki sprawdzono jako RED→GREEN. Dodatkowa kontrola biblioteki wykryła historyczne zoomy Bisanza; dodano test regresji i zachowano kompatybilność. Po końcowym przywróceniu niezmienionej instrukcji pełnego montażu ponownie zaliczono testy redakcji.

Lokalne logi sesji: `/private/tmp/montage-quality-final-tests.log`, `/private/tmp/montage-quality-lint.log`, `/private/tmp/montage-quality-panel.log`. Kadr GUI: `/private/tmp/montage-quality-caption-scope.png`. Prywatny raport małego testu konta: `.quickcontent/quality-smoke-closed-stdin-2026-10-18.json` (ignorowany przez git).

## Koszt: zmierzone dane i granice

Mały test konta Codex zaraportował **25 383 tokeny wejścia, 48 wyjścia**, billing `subscription`. Nie użyto płatnego API. Nie oznacza to darmowego ani nieograniczonego użycia konta. Dane wskazują duży narzut tej ścieżki CLI; sam krótki wynik nie gwarantuje niskiego wejścia. Pierwsze dwie próby przez pomocniczy `execFile` czekały na niezamknięte stdin i wygasły; poprawiony test użył zamkniętego stdin jak worker produkcyjny. Nie zmieniano z tego powodu dostawcy ani nie uruchamiano API.

Porównanie lokalnego tekstu żądania dla `pokazowka`, z pustym szablonem i tą samą prośbą: pełny zakres **5535 znaków**, napisy **2191 znaków**. To pomiar znaków przykładu, nie benchmark tokenów/ceny dla rzeczywistego klienta. Pełne wytyczne klienta nadal są wysyłane. Transporty Claude i API sprawdzono testami, bez rzeczywistego requestu w tym etapie. Dalsze oszczędności wymagają typowanych operacji, reużycia danych i osobnego pomiaru docelowego API.

## Czego ten odbiór nie potwierdza

Nie wykonano nowego pełnego montażu/renderu z odsłuchem i odbiorem obrazu. Walidator nie ocenia sensu wypowiedzi, jakości trackingu, skoków kamery, obecności przebitek ani pozycji emotek. Nie koduje wszystkich instrukcji Markdown. Zmiany nie gwarantują identycznego wyniku kreatywnego ani identycznych pikseli na różnych komputerach.

Nie wdrożono centralnego renderera, kontroli ról i pakietów, kompletu deterministycznych reguł klientów, paczkowania fontów/emotek, testów obrazu, typowanych korekt pełnego montażu ani nowego detektora trackingowego. Obsługa dowolnego ręcznego zapisu pliku z CLI nie może być wymuszona samym serwerowym walidatorem.

## Następna kolejność

1. Przenieść uzgodnione reguły klientów do wersjonowanych kontraktów: kadry/przebitki, pozycje, hook, emoji i rozstrzyganie konfliktów z własnym brandingiem. Uzgadniane profile są edytowalne; sprawdzamy wybrany profil, nie narzucamy jednej oprawy.
2. Dodać typowane operacje pełnego montażu i korekt, z ID słów/segmentów i przeliczaniem czasów przez kod. Ujednolicić transport zwykłych rolek z QC przy zachowaniu kont CLI.
3. Wersjonować wszystkie zasoby renderu i środowisko, dodać testy klatek/ruchu oraz odbiór rzeczywistych przykładów Happy News i innych klientów.
4. Udostępnić tę samą logikę w centralnej kolejce/renderze, z rolami firmowymi, wyższym pakietem własnego brandingu oraz limitami kosztów i pomiarem docelowego API. Zachować wspierany lokalny tryb zespołu.
