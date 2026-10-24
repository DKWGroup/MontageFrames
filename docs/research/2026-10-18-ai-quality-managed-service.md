# Research: zgodność klientów i powtarzalna usługa MontageFrames

Data: 18.10.2026. Zakres: wszyscy klienci, zwykłe rolki i QuickContent; wspólny kierunek dla pozostałych modułów. To analiza kodu, dokumentów, dostępnej historii rozmów i źródeł zewnętrznych. Nie wykonano nowych montaży ani benchmarku modeli. [Projekt i kolejność wdrożenia](../superpowers/specs/2026-10-18-quality-managed-service-design.md).

## Wniosek

Największą poprawę da ograniczenie decyzji pozostawionych modelowi i przeniesienie produkcji do jednej zarządzanej usługi. Mniejszy model powinien wybierać treść w wąskim kontrakcie, a aplikacja powinna egzekwować wygląd, czas, pozycje, układy i dopuszczalne operacje. Centralizacja usuwa rozbieżności środowisk użytkowników, ale nie naprawia automatycznie błędnego detektora ani nie gwarantuje jakości redakcyjnej.

Użytkowniczka wskazała tracking, przeskoki obrazu, brak przebitek z kamery ogólnej i emotki w innych miejscach; doprecyzowała, że problem dotyczy również innych klientów po pobraniu repo. Nie ma podstaw, by wszystkie te objawy przypisać słabszemu LLM.

## Co potwierdza obecny projekt

| Obserwacja w repo | Znaczenie dla jakości |
|---|---|
| `ui/lib.mjs: montagePrompt()` poleca operatorowi przeczytać pliki i wykonać redakcję oraz kontrolę klatek. Zwykły operator jest procesem Claude Code. | Część wykonania procedury nadal zależy od zachowania agenta, jego ustawień i dostępnych narzędzi. |
| `scripts/quickcontent-ai.mjs` obsługuje zamknięty JSON, zapis usage przed parsowaniem i izolowane wywołania kont. `scripts/quickcontent-edit.mjs` ogranicza wynik i scala go z istniejącymi metadanymi. | Są gotowe fundamenty do ponownego użycia. Nie potrzeba budować wszystkiego od początku. |
| Kontrakt edycji QC nadal dopuszcza zwracanie całej listy napisów z czasami oraz `y`, `size`, `zoom`, czasami overlayów i indeksami usuwania. | Spory obszar, w którym model może popełnić błąd zgodny ze schematem. Docelowo operacje po ID i geometria wyliczana przez kod. |
| Branding ma wersje, `styleId`, hashe zasobów, snapshoty i natywne renderery. `docs/branding/acceptance.md` jawnie zaznacza, że sam snapshot wyglądu nie zamraża historycznego kodu silnika. | Rozszerzyć istniejący mechanizm o wersję wykonawczą; zachować obecne oprawy. |
| `src/WordEmoji.tsx` renderuje znak w font-family `Apple Color Emoji`, `Apple Emoji Local`; pozycja zależy od `em`, linii i szerokości otaczającego tekstu. | Metryki fontów i łamanie wierszy wpływają na pozycję. To konkretna zależność, nie dowód odtworzenia błędu na Windows. |
| `.gitignore` pomija `public/fonts/AppleColorEmoji.ttc`, profile `klienci/*/branding/` i importowane assety/fonty. | Klon repo nie jest kompletną kopią lokalnego środowiska produkcyjnego. Sam plik preferencji nie przenosi całej oprawy. |
| `src/fonts.ts` pomija nieobecne pliki, a w Playerze ignoruje błędy ładowania; Bisanz używa też systemowego Menlo. | Możliwy podgląd z innym fontem, szerokością i pozycją elementów. Produkcja powinna blokować brak wymaganej odmiany. |
| `scripts/quickcontent-portrait.mjs` analizuje twarze przez ścieżkę `darwin`; `quickcontent-face.swift` używa Vision. Import lokalnych fontów używa Swift/CoreText. | Linux nie zapewni tej samej funkcji przez samo skopiowanie projektu do Dockera. |
| `src/quickcontent/layout.mjs` wykrywa ekran studia przez zestaw progów geometrycznych i wygładza próbki. Detektor ma domyślnie 4 próbki/s, z limitem próbek. | Nietypowy ekran, ujęcie i krótki fragment mogą wymagać korekty lub innego detektora. Mocniejszy model tekstowy nie odzyska brakującej detekcji. |
| Audyt Happy News opisuje przełączenie układu w 0,25 s przy cięciu źródła w 0,40 s oraz mylenie zmiany mówcy z cięciem kamery. | Potwierdzony historycznie błąd synchronizacji silnika. Testy i kontrola są potrzebne na granicach klatek. |
| Publiczny build Vercel obejmuje landing. Lokalny panel ma API w pluginie Vite i obsługuje lokalne pliki/procesy. | Wdrożenie landingu nie tworzy usługi montażowej. Nie publikować `dist` lokalnego panelu z mediami. |

Dowody lokalne: [audyt cięć](../audits/2026-10-17/happynews-cuts.md), [branding](../branding/acceptance.md), [integracja opraw](../branding/established-integration.md), [macierz odbioru](../acceptance-matrix.md), [QuickContent](../quickcontent/acceptance.md), [Vercel](../vercel.md). Liczby testów w tych dokumentach dotyczą wcześniejszych zmian, nie niniejszego researchu.

Przejrzano dostępną rozmowę „Wygładź kadry Happy News” oraz listę powiązanych rozmów. Odczyt „Happy News screen flicker fix” nie dostarczył użytecznego zapisu, dlatego nie jest dowodem. Uwzględniono także niezacommitowaną najnowszą korektę klienta z 17.10: stałe duo z przebitką w ujęciu ogólnym, sam mówca bez przebitki w zbliżeniu. Nie cofnięto tej zmiany.

## Co wynika z badań i dokumentacji

### Długi prompt nie jest mechanizmem egzekwowania

Badanie „Lost in the Middle” pokazało w badanych zadaniach zależność wyniku od położenia informacji w długim kontekście. Nie jest benchmarkiem obecnych modeli MontageFrames. Uzasadnia sprawdzenie krótkich, zadaniowych pakietów reguł zamiast przesyłania każdemu etapowi całej historii. [Publikacja](https://arxiv.org/abs/2307.03172).

Wniosek projektowy: dla klienta utrzymywać aktualny, rozstrzygnięty zestaw zasad; historia poprawek pozostaje do audytu. Model hooka dostaje reguły hooka i treść, a nie całą instrukcję wdrażania aplikacji. Krytycznych reguł nie wyszukiwać wyłącznie przez podobieństwo w bazie wektorowej: muszą wejść zawsze.

### Schemat zapewnia strukturę, nie poprawność filmu

Structured Outputs ogranicza odpowiedź do schematu, ale dokumentacja wyraźnie dopuszcza błędy w treści. Zaleca przykłady i prostsze podzadania. [Dokumentacja OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs).

Wniosek projektowy: po schemacie potrzebne są walidatory znaczenia operacji: istnienie słów, zachowanie czasów, dozwolone usunięcia, klient, wersja i obietnica hooka. Poprawny JSON z błędną twarzą nadal jest błędnym montażem.

### Zdefiniowany proces jest lepszym punktem startowym niż swobodny agent

Anthropic rozróżnia z góry ustalone przepływy i autonomicznych agentów oraz zaleca prostotę, dopasowanie narzędzi i sprawdzalne kryteria. [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).

Wniosek projektowy: serwer prowadzi etapy; model proponuje wynik jednego etapu. Model nie decyduje, czy odczytać wytyczne, jak uruchomić render, ani czy własny rezultat uznać za sprawdzony. Nie potrzeba na start wielu agentów rozmawiających między sobą.

### Zgodność trzeba mierzyć na naszych zadaniach

IFEval jest przykładem sprawdzania instrukcji przez weryfikowalne ograniczenia. Nie mierzy trackingu ani estetyki rolek. [Publikacja](https://arxiv.org/abs/2311.07911). Praktyczne zalecenia ewaluacji obejmują dane z rzeczywistego użycia, pomiary etapów i kalibrację automatycznych ocen z ludźmi. [OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices).

Wniosek projektowy: benchmark modeli prowadzić lokalnym, przenośnym harness'em i własnym korpusem. Nie wiązać go z pojedynczym produktem Evals dostawcy. Utrzymywać oddzielny zbiór testowy, którego nie wkłada się jako przykłady do prompta. Raportować błędy per klient i typ materiału, również po odrzuceniu wyniku przez bramkę.

### Renderer też musi być powtarzalny

Remotion opisuje migotanie związane z niezależnym stanem kart, animacjami niezależnymi od numeru klatki oraz nieoczekiwaniem na dane/fonty. Zaleca funkcję obrazu zależną od klatki i poprawne oczekiwanie na zasoby. [Flickering](https://www.remotion.dev/docs/flickering).

Wniosek projektowy: przypięty runtime i zasoby, testy renderu poza kolejnością i przy różnej współbieżności. Nie twierdzimy, że to diagnoza wszystkich obecnych skoków; Happy News ma osobny dowód błędu detekcji/osi czasu.

Docker pozwala wskazać niezmienny digest obrazu. Sam tag oraz sam Dockerfile nie zamrażają środowiska. [Docker](https://docs.docker.com/reference/cli/docker/image/pull/). Remotion dokumentuje serwerowe renderowanie w kontenerach. [Dockerizing Remotion](https://www.remotion.dev/docs/docker).

Wniosek projektowy: przechowywać gotowy obraz, konkretną architekturę CPU, bundle, fonty, detektory i ustawienia renderu. macOS/Vision to osobny wariant wykonawczy; nie uruchomi się w linuksowym kontenerze.

### Vercel może obsługiwać interfejs, a ciężka praca potrzebuje własnego procesu

Dokumentacja Functions wskazuje limit payloadu 4,5 MB i limity czasu zależne od planu/runtime. Dostępność dłuższych funkcji nie zapewnia zgodności obecnego workera z macOS ani trwałości lokalnej kolejki. [Limity](https://vercel.com/docs/functions/limitations).

Rekomendacja architektoniczna: Vercel pozostawić dla interfejsu; trwały backend i worker uruchomić osobno. Duże pliki wysyłać bezpośrednio do prywatnego storage. S3 opisuje upload przez czasowe podpisane adresy oraz multipart z ponawianiem części. [Podpisane adresy](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html), [multipart](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html).

### Konta CLI nie są gotową podstawą rozliczania SaaS

Aktualna dokumentacja Claude Code rozróżnia zwykłą integrację produktu przez API od hostowania niezmienionego Claude Code, które ma osobne warunki i uwierzytelnienie każdego użytkownika. Nie uzasadnia budowania wspólnego automatu dla klientów na jednej osobistej subskrypcji. [Warunki i uwierzytelnienie](https://code.claude.com/docs/en/legal-and-compliance).

Rekomendacja: docelowa usługa używa jawnej integracji API i kontrolowanego budżetu, bez przenoszenia tokenów kont użytkowników. Nie uruchamiano API ani nie zmieniano obecnego account-only. Dokładne warunki komercyjne wybranego dostawcy sprawdzić przed uruchomieniem.

Osobno sprawdzić licencję Remotion dla modelu działalności i prawa do fontów, logo, audio oraz grafiki emotek. [Remotion License](https://www.remotion.dev/docs/license). Obecność Apple Emoji na lokalnym Macu nie jest w tym researchu dowodem prawa do umieszczenia tego pliku w publicznym repo lub obrazie serwera. Nie wyciągamy tu rozstrzygnięcia prawnego. Noto Emoji jest przykładem alternatywy z publicznie opisanymi licencjami; nie zastępuje automatycznie zaakceptowanego wyglądu klienta. [Repo i licencje](https://github.com/googlefonts/noto-emoji).

## Porównanie dróg

| Podejście | Korzyść | Ograniczenie | Ocena |
|---|---|---|---|
| Mocniejszy prompt i dopisanie kolejnych zasad | Szybka zmiana | Nie usuwa fontów systemowych, błędów trackingu i niekontrolowanych instalacji | Pomocniczo |
| Mocny model do każdej operacji | Często lepsza redakcja; wymaga pomiaru | Nadal może się mylić, wyższy koszt, brak naprawy runtime | Tylko dla zadań, gdzie benchmark uzasadnia |
| Wersjonowana lokalna paczka/kontener | Mniej różnic instalacji | Użytkownik nadal kontroluje maszynę, wersję i obejście bramek; Mac/Linux różnią się | Narzędzie developerskie/przejściowe |
| Centralna usługa + kontrakty + bramki jakości | Wspólne wykonanie, koszty, rollout i nadzór | Hosting, transfer, prywatność i utrzymanie; potrzebna migracja | Rekomendowane |

Fine-tuning rozważyć dopiero po zebraniu zatwierdzonych przykładów i pomiarze luki, której nie rozwiązuje ograniczenie zadania. Nie naprawi systemowych fontów ani błędnej osi czasu.

## Koszt API: montaż i poprawki

Największa oszczędność to niewysyłanie do modelu pracy, którą wykonuje kod. Pełna transkrypcja jest analizowana na poziomie projektu, wybrany fragment redagowany raz, a poprawka dotyczy wskazanego obiektu. Model nie odsyła całego `reel.json`, czasów słów ani ścieżki trackingu. Samodzielnie hostowany ASR, tracking i render nie zużywają tokenów LLM, ale zużywają zasoby serwera.

Cache aplikacji przechowuje gotowe wyniki według treści i wersji. Cache dostawcy jedynie zmniejsza opłatę za powtórzony, kwalifikujący się prefiks; zależy od modelu, ustawień i dopasowania granic. Nie obiecywać trafienia cache ani nie dopisywać pustych tokenów bez pomiaru opłacalności. [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching). Mniejsze modele, mniejsze odpowiedzi i ograniczenie wywołań są także kierunkami opisanymi w [zaleceniach kosztowych](https://developers.openai.com/api/docs/guides/cost-optimization).

Szczegółowe budżety, obliczenia i unieważnianie etapów opisuje projekt. Wartość do optymalizacji: całkowity koszt zaakceptowanej rolki wraz z poprawkami i błędnymi próbami, nie sam koszt jednego requestu.

## Co znaczy „100% tak samo”

Można kontrolować wersję usługi, reguły, zasoby, zapisane decyzje i udostępnianie tego samego finalnego MP4. Można wymagać, aby każdy obsługiwany projekt przeszedł te same bramki. Nie można uczciwie obiecać identycznych nowych odpowiedzi LLM, bezbłędnej detekcji dowolnego wideo ani identycznego obrazu na każdym fizycznym ekranie.

Najsilniejsza praktyczna gwarancja: raz zatwierdzony wynik jest zachowany; kolejne pobranie zwraca te same bajty. Ponowny render zamrożonych danych podlega porównaniu, a nowa generacja AI tworzy nową wersję. Każdy niepewny przypadek może trafić do korekty zamiast otrzymać fałszywy status gotowości.

## Niewiadome do pomiaru

- Nie odtworzono przesunięcia emotek na drugiej instalacji. Stwierdzono zależności i braki przenośności, nie pełną przyczynę każdej zgłoszonej sytuacji.
- Nie porównano jakości i kosztów konkretnych modeli na prywatnych materiałach. Nazwy „słabszy” i „mocniejszy” oznaczają wynik pomiaru danego zadania, nie marketingową klasę modelu.
- Nie sprawdzono świeżego importu YouTube z centrum danych; ochrona/limity dostawcy mogą różnić się od lokalnego pobierania. Upload pliku musi pozostać działającą ścieżką produktu.
- Nie ustalono liczby jednoczesnych użytkowników, wolumenu i kosztu maszyn. Projekt zakłada mały pilot, pomiar, potem limitowaną rozbudowę; brak obietnicy ceny lub czasu montażu.
- Pełny odbiór obecnej aplikacji pozostaje otwarty według macierzy. Ten dokument go nie zamyka.
