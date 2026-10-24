# MontageFrames — założenia wersji serwerowej i wspólnej jakości

Data: 2026-10-18. **Stan: projekt wdrożenia. Dostępny jest pierwszy fundament lokalny; usługa serwerowa nie została uruchomiona.**

Dokument prowadzący dla kolejnych sesji: [plan faz](plan-wdrozenia-Serwer.md), [architektura i procedura wdrożenia](docs/server/wdrozenie.md), [rejestr odbioru](docs/server/acceptance.md). Szczegółowe uzasadnienie: [projekt jakości i kosztów](docs/superpowers/specs/2026-10-18-quality-managed-service-design.md), [research](docs/research/2026-10-18-ai-quality-managed-service.md). Stan istniejącej implementacji: [odbiór fundamentu](docs/quality/acceptance.md).

## 1. Cel i granice obietnicy

Użytkownik ma montować, poprawiać i pobierać filmy z przeglądarki. Jego komputer nie ma decydować o fontach, emotkach, kadrowaniu ani końcowym pliku. Słabszy model otrzymuje ograniczone zadanie redakcyjne, a aplikacja egzekwuje chronione zasady klienta i wybranego brandingu.

Ten sam projekt, rewizja i zaakceptowany wynik mają udostępniać wszystkim uprawnionym osobom **ten sam zapisany MP4**. Ponowny render używa zamrożonych danych i zasobów. Nowa generacja AI jest nową propozycją/wersją; nie obiecujemy identycznych odpowiedzi modelu ani bezbłędności AI. Zgodność renderów na workerach mierzymy obrazem i dźwiękiem; nie utożsamiamy jej z identycznością bajtów nowo zakodowanych kontenerów.

Publiczne wydanie obejmuje zwykłe rolki, QuickContent, branding, napisy, kadry, poprawki i eksport, dopiero po odbiorze każdej ścieżki. LongForm, Motion Studio i Premiere zachowują własny zakres oraz stan; nie stają się gotowymi usługami przez samo przeniesienie panelu.

## 2. Dwa wspierane sposoby pracy

| Tryb | Użytkownik i wykonanie | AI i kontrola |
| --- | --- | --- |
| Serwerowy | Odbiorca pracuje w panelu; prywatne media i zadania na zarządzanej infrastrukturze | API dostawcy z budżetem; wspólne kontrakty, walidatory, manifest i kontrola jakości |
| Lokalny / CLI | Właścicielka i zespół wewnętrzny montują, testują, diagnozują i naprawiają lokalnie | Własne konta Codex/Claude albo jawnie wybrane API; te same kontrakty i bramki, brak płatnego fallbacku |

Nie usuwać CLI, Terminala, lokalnego panelu ani trybu account-only. Nie wymagać aktywnej subskrypcji usługi do wewnętrznego testu lokalnego. Publiczny model pakietów nie jest blokadą lokalnego repo. Samodzielnie zmodyfikowany fork może omijać kontrolę; gwarancje usługi dotyczą jej zaakceptowanych wyników.

Kont firmowych/subskrypcyjnych CLI nie traktujemy jako współdzielonego silnika dla płatnego publicznego produktu. Integracja transportu pozostaje oddzielona od kontraktu montażu. Wygaśnięcie sesji, limit konta lub błąd API zatrzymuje zadanie z możliwością wznowienia, bez cichej zmiany sposobu rozliczenia.

## 3. Branding i reguły klienta

- Użytkownik nadal tworzy własnych klientów i wygląd: fonty, kolory, logo, materiały, napisy, wyróżnienia, dekoracje i dostępne presety ruchu. Własny branding jest funkcją odpowiednio wyższego pakietu usługi. Konkretne ceny i limity ustalamy po pomiarze kosztów.
- Niższy pakiet korzysta z udostępnionych szablonów. Panel pokazuje możliwość rozszerzenia; uprawnienia sprawdza również serwer. Profilów rzeczywistych prywatnych klientów nie udostępnia się wszystkim organizacjom.
- Własny styl to zatwierdzone dane i zasoby, bez wykonywania przesłanego JS, JSX, HTML lub komend na workerze. Nowy typ efektu wymagający kodu przechodzi normalne wydanie silnika.
- Zachować istniejący branding store, `styleId`, wersje i snapshoty. Model nie przepisuje profilu przy poprawce. Uprawniony człowiek może utworzyć kolejną wersję i jawnie zastosować ją w projekcie.
- Obecnie źródłem zasad pozostają `PREFERENCJE.md`, z pierwszeństwem klienta. Migracja do wersjonowanego kontraktu wymaga rozstrzygnięcia sprzeczności; model może proponować, nie publikuje reguł sam. Po jawnej migracji panel i eksport Markdown przedstawiają tę samą wersję, zamiast dwóch niezależnych źródeł.
- Kontrakt wskazuje źródło reguły, zakres, wersję, poziom blokowania i sposób sprawdzenia. Reguła oceniana ręcznie ma status `unknown` do przeglądu; nie oznaczamy jej jako automatycznie spełnionej.
- Happy News: szerokie ujęcie zachowuje duo i widoczną przebitkę, zbliżenie pokazuje samą osobę; nie przenosić automatycznych emotek na inne marki bez jawnej konfiguracji. SkyClass: cała wypowiedź i cisza, napisy 1:1. Bisanz: tracking pozycji może pozostać, skala kamery 1. Pozostałe profile zachowują własne zasady.

Zmiana wyglądu bez zmiany reguł treści nie uruchamia redakcji AI. Zmiana klienta może wymagać odzyskania zakresów z mastera, np. ciszy dla SkyClass; brak źródła blokuje migrację zamiast fabrykować zgodny wynik.

## 4. Montaż i poprawki

Zwykła rolka: upload → import/ASR → propozycja redakcji → kompilacja danych → kontrola → podgląd → render i kontrola MP4 → opis. QuickContent: master → ASR → propozycje → **jawny wybór** → montaż → kontrola/render → poprawki. Samo „Przetwarzaj” lub „Znajdź więcej” nadal nie montuje.

AI docelowo zwraca operacje po ID: tekst słowa, grupowanie/klucz, propozycja hooka, zakres po słowach, wybór dozwolonego assetu. Kod wyznacza czasy, geometrię i ścieżki. Nie udostępniać dowolnego JSON Patch ani dostępu modelu treści do systemu plików.

Każda zmiana wskazuje `baseRevision`; konflikt 409 zachowuje draft. Ręczna korekta tekstu zachowuje czasy. Kadr ręczny wyłącza tracking. Zmiana koloru, pozycji, rozdzielczości i dokładnego tekstu wpisanego ręcznie zużywa **0 tokenów LLM**. Może wymagać ponownego renderu, który ma osobny koszt obliczeniowy.

Napisy, hook, grafiki i kamera mają oddzielne zależności. Retry renderu korzysta z zatwierdzonego checkpointu AI. Korekta opisu nie ponawia ASR ani renderu. Kilka poprawek można połączyć przed eksportem. Na początku renderujemy cały film; cache fragmentów finalnego MP4 dopiero po pomiarach synchronizacji i opłacalności.

## 5. Powtarzalny obraz i tracking

Manifest przypina źródła, transkrypcję, rewizję, operacje, kontrakt klienta, branding, fonty, emotki, detektor, bundle, seed, runtime i ustawienia wyjściowe. Render korzysta wyłącznie z tych plików, nie z ruchomych URL ani lokalnych fontów odbiorcy. Brak wymaganego assetu zatrzymuje etap przed API/renderem.

Emotka ma jeden zapis i jeden zatwierdzony asset. Pozycję liczy renderer względem słowa i fontu, również dla skrajnego obrysu animacji. Nie dublować automatycznej emotki i overlayu dla tego samego słowa. Własny branding może jawnie włączyć obsługiwany preset dekoracji.

Tracking działa w granicach rzeczywistych ujęć, z jawną mapą źródła i czasu, bez interpolacji przez zmianę kamery. Niepewność ma bezpieczny fit lub ręczną korektę oraz widoczną flagę; nie uznajemy nieznanego wyniku za zgodny. Zgubiona przebitka w oznaczonym szerokim ujęciu blokuje akceptację tego wymagania.

Do zatwierdzania używamy serwerowego MP4/klatek. Player w przeglądarce pozostaje roboczy. Pierwszy worker to zarządzany macOS, ponieważ obecny kod używa Apple Vision/Swift/CoreText; Linux wymaga osobnego portu i testów zgodności, nie tylko obrazu Docker.

## 6. Serwer, dane i uprawnienia

Jedno repo i obecny React/Vite/Remotion. Oddzielić produkcyjne API Node od wtyczki deweloperskiej Vite. PostgreSQL utrwala organizacje, rewizje, kolejkę, checkpointy i koszty; prywatny storage obiektowy przechowuje źródła i wyniki. Osobny worker uruchamia obecny silnik. Bez Kubernetes, bazy wektorowej i nowego frameworka na start.

Każdy projekt, profil, asset, job, cache i wynik należy do organizacji. Role organizacji: owner/editor/viewer. Uprawnienie pracownika serwisu do obsługi/przeglądu jest osobnym, audytowanym nadaniem, nie rolą owner we wszystkich organizacjach. Tożsamości organizacji nie przyjmujemy z dowolnego pola JSON bez kontroli sesji.

Duży plik trafia bezpośrednio do prywatnego storage przez upload w częściach, z wznowieniem, limitem i weryfikacją integralności. API operuje na identyfikatorach, nie ścieżkach dysku klienta. Link do pobrania jest krótko ważny i wydawany po autoryzacji. Zamknięcie karty nie zatrzymuje zadania.

Job ma lease i rosnący fencing token. Tylko aktualny posiadacz może zapisać checkpoint i opublikować wynik. Idempotencja obejmuje etap, rewizję i manifest. Pilot: najwyżej **1 ciężkie zadanie globalnie**, dodatkowo limity organizacji. Potem skalowanie na podstawie pamięci, czasu i kosztu, bez wymyślonej przepustowości.

Publiczny frontend zawiera wyłącznie jawnie dozwolone zasoby. Nie publikować katalogów `public/reels`, klientów, transkrypcji ani lokalnego `build:panel`. Istniejący landing na Vercelu nie jest wdrożeniem silnika. Import URL ma kontrolę SSRF/redirectów, dekodowanie mediów limity i izolację procesów, sekrety są poza frontendem oraz logami.

## 7. Koszty i jakość wydania

Budżet rezerwujemy przed requestem, łącznie z dopuszczonym retry i eskalacją. Usage zapisujemy przed walidacją odpowiedzi. Brak rachunku to `unknown`, nie zero. Utrata odpowiedzi po naliczeniu opłaty nie daje gwarancji exactly-once; nie powtarzamy automatycznie bez sprawdzenia zapisanej odpowiedzi i budżetu. Maksymalnie dwie próby podstawowe łącznie oraz jedna silniejszego modelu wyłącznie przy jawnej polityce i rezerwacji.

Cache jest izolowany per organizacja i zależy od treści, reguł oraz wersji zadania. Oddzielnie mierzymy analizę mastera, redakcję, korekty, opis, detekcję, render, storage/transfer i przegląd. Model wybieramy benchmarkiem z uwzględnieniem błędów i retry, nie samym cennikiem tokenów. Wartości cen z researchu są historycznym przykładem; cennik trzeba potwierdzić przed rezerwacją produkcyjną.

Stan danych, renderu, kontroli i przeglądu jest oddzielny. „Zmontowane” wymaga aktualnego, zweryfikowanego MP4 zgodnego z rewizją/podpisem; nie udaje akceptacji człowieka. Krytyczne `fail/unknown` blokuje finalne wydanie. Błąd opisu pozostawia dobry film. Pilot wymaga pełnego obejrzenia i odsłuchu, przed późniejszą automatyzacją danego profilu.

Proponowana bramka automatyzacji: 30 kolejnych pełnych rolek danego profilu po przeglądzie, zero błędów krytycznych, ≥95% bez istotnej poprawki i koszt w ustalonym limicie. To kryterium pilota, nie gwarancja wyniku dla wszystkich przyszłych filmów. Limit kwotowy ustala właścicielka przed odblokowaniem automatyzacji.

## 8. Co już jest i co pozostaje decyzją

Pierwszy fundament lokalny obejmuje wspólny walidator, ochronę JSON zwykłego operatora panelu, małą odpowiedź v2 dla jawnej korekty napisów QC oraz `reel:check`. Pozostały montaż nadal wymaga dalszych typowanych operacji. Testy fundamentu nie potwierdzają naprawy trackingu i identyczności obrazu na serwerze.

Przed zakupem infrastruktury trzeba zapisać budżet, dostawcę/region, limity mediów, retencję/kopie/usuwanie i dostęp serwisu do danych, sprawdzić licencje użytych zasobów oraz silnika i wybrać dostawcę logowania. Przed publiczną sprzedażą także ceny, limity pakietów, płatności i obsługę przekroczeń. Można implementować adaptery oraz testy bez wymyślania tych odpowiedzi.

Ten zapis nie wykonuje zakupu, migracji prywatnych materiałów, publikacji, deployu ani płatnych wywołań. Dalsze fazy mają własne dowody i aktualizowany status w rejestrze odbioru.
