# MontageFrames: jakość klientów, tanie API i centralne wykonanie

Data: 18.10.2026. Status: kierunek przyjęty do etapowego wdrożenia z korektami użytkowniczki; pierwszy fundament lokalny ma [osobny odbiór](../../quality/acceptance.md), usługa nie została uruchomiona. [Research i źródła](../../research/2026-10-18-ai-quality-managed-service.md). Dokumenty wykonawcze: [założenia serwera](../../../zalozenia-funkcji-Serwer.md), [fazy F0–F9](../../../plan-wdrozenia-Serwer.md), [wdrożenie/operacje](../../server/wdrozenie.md), [rejestr odbioru](../../server/acceptance.md). Mapa Q/C poniżej pozostaje projektem zakresów; F0 nie zamyka całych Q0–Q2.

**Aktualizacja 18.10.2026:** użytkowniczka zatwierdziła rozpoczęcie wdrożenia z korektą: lokalne CLI/Terminal i konta subskrypcyjne pozostają obsługiwane do testowania bez płatnego API, także po powstaniu usługi. Ta instrukcja zastępuje poniższe wcześniejsze propozycje wycofania lokalnej ścieżki. Wspólny kontrakt jakości ma działać z każdym dostawcą, bez automatycznego płatnego fallbacku. Pierwszy etap to fundament walidacji i kompaktowy kontrakt redakcji; uruchomienie usług pozostaje osobnym etapem.

**Doprecyzowanie użytkowniczki 18.10.2026:** własny branding i definiowanie wyglądu stylu pozostają funkcją produktu, dostępną w wyższych pakietach. Zespół wewnętrzny firmy zachowuje wspierane CLI do pracy, diagnozy i napraw. Zakazy zmiany brandingu odnoszą się do niezamierzonej zmiany przypiętego profilu przez model; nie blokują tworzenia/edycji kolejnej wersji przez uprawnionego użytkownika. Istniejący panel własnego stylu i fontów pozostaje. Billing/role i konkretne limity pakietów to etap usługi, nie sztuczne ograniczenie lokalnego panelu w pierwszym wdrożeniu.

## 1. Cel i ustalenia

Użytkowniczka chce, żeby słabsze modele rzadziej popełniały błędy, respektowały wytyczne każdego klienta, a praca innych osób nie zmieniała wyglądu i jakości materiałów. Przykłady: tracking, przeskoki obrazu, brak przebitek z ogólnej kamery i przesunięte emotki. Docelowo odbiorcy mają korzystać z centralnej aplikacji, bez instalowania silnika i operatorów CLI. Montaż i poprawki przez API mają być tanie.

**Propozycja autora projektu:** jedna usługa przeglądarkowa, ograniczone zadania AI, wersjonowane reguły klientów, deterministyczne składanie filmu, bramki jakości i kontrola wydania. Zachowujemy React/Remotion, natywne style i istniejące mechanizmy wersji, rewizji i checkpointów. Nie przepisujemy produktu na nowy framework.

Cel nie oznacza identycznej odpowiedzi generatywnej na każde ponowione polecenie. Zatwierdzony montaż jest zapisany; jego odtwarzanie i pobranie nie wywołują AI. Identyczność pobieranego pliku zapewnia przechowywanie tego samego MP4. Nowa generacja jest nową wersją, nigdy cichą podmianą.

Zakres pierwszego wydania usługi: zwykłe rolki, QuickContent, obecny branding, napisy, kadr, poprawki i eksport. Kontrakt jakości stosujemy do wszystkich obecnych klientów oraz Persona i nowych profili. Motion Studio, częściowy LongForm i Premiere zachowują obecny status; nie przedstawiamy ich automatycznie jako gotowych w chmurze. Ich wejścia muszą później korzystać z tych samych bramek, zanim otrzymają status produkcyjny.

## 2. Co przejmuje kod

| Decyzja | Wykonawca | Kontrola |
|---|---|---|
| Font, kolor, safe zone, wysokość napisów, wygląd metki i hooka | Profil klienta + renderer | Wymagane zasoby, geometria i test wizualny |
| Przypisanie emotki do słowa, odstęp, bok, rozmiar i ruch | Zapisane ID słowa + renderer | Granice elementów przez animację, brak kolizji |
| Cięcia kamer, śledzenie, stabilność układu | Detektor + algorytm na osi klatek | Ocena wiarygodności, reguły ujęcia, kontrola klatek |
| Poprawienie tekstu, grupowanie, wybór klucza i hooka | AI w małym kontrakcie albo edycja ręczna | Walidacja operacji, źródła i sensu |
| Wybór samodzielnych historii z długiego filmu | AI na transkrypcji z kontekstem | ID słów, pełny sens, deduplikacja; jawny wybór użytkownika |
| Zapis, kolejka, retry, render, aktualność, koszty | Backend | Rewizje, checkpointy i podpis wejścia |

Model treści nie dostaje prawa do zmiany źródła, układów, współrzędnych, fontów, dowolnych czasów ani uruchamiania poleceń. Wideoanaliza dostarcza obserwacje; też może się mylić i podlega osobnym kontrolom.

## 3. Aktualny kontrakt klienta

Rozszerzamy istniejący snapshot brandingu o wersjonowany kontrakt reguł i manifest zasobów, zamiast tworzyć drugi niezależny system stylów. Każda reguła ma ID, zakres, wersję, źródło, wartość, poziom blokowania i sposób sprawdzenia. Każda ma jawny status: sprawdzana kodem, oceniana przez obraz/treść lub wymagająca przeglądu człowieka. Reguły nieprzetłumaczonej do kodu nie oznaczamy jako automatycznie zagwarantowanej.

Punktem wejścia obecnie są autorytatywne `PREFERENCJE.md`. Migracja polega na ręcznym rozstrzygnięciu aktualnych zasad, z referencją do historycznych poprawek. Model może przygotować propozycję ekstrakcji, ale nie publikuje jej sam. Po przejściu na usługę właściciel edytuje wersję kontraktu w panelu; dokument Markdown jest generowanym zapisem tej samej wersji. Zmiana źródła prawdy następuje przy migracji, nie w tym researchu. Brak dwukierunkowej synchronizacji dwóch edytowanych niezależnie źródeł.

Pierwszeństwo: jawne polecenie uprawnionego użytkownika dla danego zakresu → aktualne reguły tego klienta → ogólne reguły → bazowy styl. Zmiana odstępu w jednej rolce nie zmienia automatycznie przyszłych montaży. Chronione reguły i zaakceptowane elementy mogą zmienić się tylko przez wyraźne polecenie obejmujące ten element. Zasada nowej daty zastępuje starszą tylko w tym samym zakresie; nierozstrzygnięta sprzeczność blokuje publikację kontraktu. Serwer egzekwuje prawa użytkownika niezależnie od treści polecenia.

Przykłady: automatyczne emotki tylko Happy News; Bisanz bez skalowania kamery; SkyClass bez cięcia ciszy i z napisami 1:1; dla Happy News ostatnia korekta z 17.10 wygrywa ze starszym utrzymywaniem zdjęć w zbliżeniach. Zbliżenie ma samą osobę, szerokie ujęcie z ekranem zachowuje duo i przebitkę. Metka Happy News ma własne wycentrowanie. Pozostałych kolorów i fontów nie ujednolicamy do Happy News.

Każdy projekt przypina `styleId`, wersję brandingu, reguł, prompta, schematu, modelu, detektora i runtime. Aktualizacja profilu dotyczy nowych montaży; istniejące projekty przechodzą na nową wersję tylko jawnie, z podglądem różnic. Wszystkie ścieżki — zwykła rolka, QC, poprawka i ponowny render — odczytują ten sam przypięty kontrakt.

## 4. Montaż przez małe zadania API

Przebieg: import → ASR i analiza obrazu → wybór treści → edycja → kompilacja danych → kontrola → podgląd → render → kontrola MP4 → opis publikacji. QC nadal wymaga jawnego wyboru propozycji przed montażem. Odrębność przeglądu cięć LongForm pozostaje.

Zamiast całego `reel.json` model zwraca operacje po stabilnych ID, np. popraw tekst słowa, przypisz klucz grupie, zaproponuj tekst hooka, wybierz zakres po `wordIds`, zasugeruj zatwierdzony zasób. Czasy, kolejność, geometria i ścieżki powstają w kodzie. Operacje są typowane i zależne od etapu; brak arbitralnego JSON Patch do dowolnego pola. Granice segmentów i napisy zostają lokalne względem krótkiego źródła, z mapą do mastera.

Pakiet wejściowy: reguły potrzebne temu zadaniu, treść właściwego fragmentu, konieczny kontekst przed/po i aktualne ID. Brak historii wszystkich czatów, całej listy klientów i trackingu. Krytyczne zasady klienta wchodzą zawsze. Dla długich źródeł najpierw analiza okien z zakładką kontekstu, następnie mała synteza propozycji i sprawdzenie wybranego zakresu w oryginalnej transkrypcji. Podział nie może usuwać przeczenia ani payoffu; konflikt wymusza poszerzenie kontekstu.

Prompty obejmują kilka zaakceptowanych przykładów i kontrprzykłady. Dane transkrypcji, tytuły, strony i opisy assetów są treścią, nie poleceniami do wykonania. Model zwraca krótki powód decyzji i ID dowodów, nie wielostronicowe rozumowanie.

Domyślny model wybiera benchmark danego zadania. Startowy kandydat kosztowy to obecny w repo GPT-6 Luna; nie ma jeszcze dowodu, że wystarcza dla wszystkich klientów. Trudna redakcja może dostać lepszy model w ramach zarezerwowanego budżetu. Nie wysyłamy każdej udanej prostej operacji do drugiego LLM.

Limit propozycji autora: najwyżej dwie próby taniego modelu łącznie, następnie jedna próba mocniejszego wyłącznie przy dozwolonym limicie. Schematyczne naruszenie, np. nieistniejące ID, może otrzymać jedną małą korektę z konkretnym błędem. Błąd fontu/trackingu trafia do kodu lub przeglądu, nie do pętli redakcyjnej AI. Odmowa, brak danych lub wyczerpanie budżetu kończą etap jawnym stanem wymagającym działania. Oświadczenie modelu „jestem pewien” nie kwalifikuje wyniku.

## 5. Emotki, napisy i zgodność obrazu

Jedna emotka ma jeden zapis: `wordId`, zatwierdzone `assetId`, wersję zestawu i preset ruchu. Nie ma osobno automatycznej emotki słownikowej i drugiego overlayu dla tego samego słowa. Dobór do niejednoznacznego słowa pomijamy. Ręcznie wskazana emotka nie jest ponownie losowana przy renderze.

Docelowo zatwierdzone pliki obrazów z manifestem, proporcjami i hashami zastępują zależność od systemowego znaku Unicode. Układ rezerwuje miejsce od początku grupy; pojawienie nie zmienia szerokości wiersza. Emotka ma kotwicę po właściwym słowie, oddzieloną od zakreślacza. Szerokości są liczone po załadowaniu konkretnych fontów. Sprawdzamy też maksymalny obrys przy popie i przechyle, nie tylko pozycję końcową. Jeśli nie mieści się: zatwierdzony wariant skali/grupowania, a gdy nadal źle — brak opcjonalnej dekoracji i jawny raport.

Wymagany font lub asset nie może po cichu zmienić się na systemowy fallback. Produkcyjny preflight blokuje brak pliku, złe glify lub hash. Każdy font, łącznie z etykietami typu Menlo, ma przypiętą wersję lub osobno zaakceptowany zamiennik. W profilu Persona wybór Nunito zamiast MADE Tommy jest jawnym wariantem, a nie zależnością od instalacji użytkownika.

Wygląd Apple zachowujemy wyłącznie w wariancie, dla którego potwierdzono prawa i działanie. Publiczny pilot może najpierw objąć profile bez tej zależności. Nie publikujemy Happy News z cichą podmianą oprawy; nie trzeba też blokować z tego powodu wszystkich pozostałych klientów. Brak potwierdzonych praw do konkretnego assetu blokuje tę funkcję/profil w usłudze, nie usuwa lokalnych filmów.

## 6. Tracking i przebitki

Analiza tworzy ujęcia z granicami w klatkach/PTS, obserwacje twarzy, paneli i mówców oraz jawne braki. Zmiana mówcy nie staje się automatycznie cięciem źródła. Materiał VFR ma jawne mapowanie do roboczej osi czasu; nigdzie nie porównujemy przypadkowo zaokrąglonych sekund z numerem klatki. Wszystkie adaptery używają tej samej mapy.

Reguły klienta wybierają układ na całe ujęcie. W Happy News szerokie ujęcie z ekranem utrzymuje obie osoby i cały wykryty obszar przebitki; pojedyncza kamera nie dziedziczy panelu. Track ma stałą skalę w ujęciu, martwą strefę, ograniczenie prędkości i wygładzenie. Nie interpolujemy twarzy ani układu przez cięcie kamery. Wewnętrzny pan nie porusza ramką panelu. Zmiana zdjęcia ma źródło i czas, a nie swobodną interpretację modelu.

Brak krótkiej detekcji może utrzymać poprzednie położenie tylko w tym samym ujęciu i przez zmierzony limit. Przy dłuższej niepewności bezpieczny fit z rozmyciem zachowuje treść, otrzymuje znacznik do przeglądu i nie udaje poprawnego automatycznego cropu. Ręczny kadr wyłącza tracking. Całkowity brak wykrytej przebitki w oznaczonym szerokim ujęciu blokuje uznanie zgodności, zamiast podstawiać przypadkowy obraz.

Kontrola: wszystkie granice ujęć w oknie co najmniej dwóch klatek z obu stron, wszystkie zmiany układu, skrajne pozycje trackingu, pierwsza klatka hooka i momenty dekoracji. Porównujemy przewidywany prostokąt z niezależnie oznaczonymi klatkami. Sam test „układ zmienia się tylko na wykrytych cięciach” nie wykryje błędnie wykrytego cięcia. Potrzebny korpus z ręczną referencją.

## 7. Bramki jakości i nadzór

| Bramka | Wymagany dowód | Reakcja na błąd |
|---|---|---|
| Zasoby i wersje | Kompletność fontów, assetów, modeli, kontraktu i runtime | Zatrzymanie przed API/renderem |
| Dane AI | Schemat, referencje, dozwolone operacje, nienaruszone czasy i chronione elementy | Odrzucenie propozycji, zachowanie ostatniej wersji |
| Semantyka | Zgodność tekstu/hooka z wypowiedzią, pełny sens historii | Ograniczona poprawka lub przegląd |
| Geometria i czas | Safe zone, tekst, dekoracje, twarz, źródłowe cięcia i układy | Korekta algorytmu/preseta albo ręczna |
| Media | ffprobe, oczekiwana długość/format, obecność i synchronizacja audio, wykryte błędy/nieoczekiwane czarne klatki | Render nie otrzymuje aktualnego statusu |
| Odbiór wizualny | Raport sprawdzonych fragmentów; w pilocie pełne obejrzenie i odsłuch | Powrót do poprawki |

Ruchomy obraz i estetyka nie mają stuprocentowej automatycznej oceny. Vision/LLM może pomagać w selekcji fragmentów do kontroli, ale nie zastępuje dowodu i kalibracji. Nie oznaczamy materiału jako obejrzanego przez człowieka, jeżeli wykonał się tylko skrypt.

Wewnętrzne statusy rozdzielają: technicznie wyrenderowany, automatycznie sprawdzony, oczekuje na przegląd, zatwierdzony. W pilocie finalny eksport wymaga przeglądu operatora; draft do oceny ma jawny status. Po spełnieniu kryteriów automatyzacji dany profil może przejść na automatyczne wydawanie z kontrolą próbek. Otwarty krytyczny błąd lub niepewność trackingu zawsze zatrzymuje wydanie. Właściciel ma kolejkę wyjątków, porównanie wersji, koszt i możliwość wyłączenia wadliwej wersji profilu/modelu.

Badge „Zmontowane” nadal wymaga aktualnego, sprawdzonego MP4 zgodnego z rewizją i podpisem wejścia. Osobno pokazujemy stan przeglądu. Błąd opisu publikacji nie unieważnia dobrego MP4; retry dotyczy opisu. Wszystkie kontrole też mają wersje i wynik `pass/fail/unknown`, bez zamieniania braku pomiaru w sukces.

## 8. Centralna usługa: mała architektura

Rekomendowane cztery części: istniejący frontend React/Vite; jeden backend Node z logowaniem i API; PostgreSQL na stan/rewizje/kolejkę; prywatny storage obiektowy na media. Worker jest osobnym procesem tego samego backendu, z tym samym silnikiem i kontraktami. Na start jedna kolejka ciężkich zadań, limity na organizację, bez Kubernetes i oddzielnego systemu agentowego. Frontend może pozostać na Vercelu; backend i worker wymagają środowiska dobranego do rzeczywistych zależności.

Najpierw worker macOS zarządzany przez właściciela usługi, odseparowany od publicznej sieci i prywatnego środowiska operatora, przetwarzający dane w osobnym workspace każdego joba, z przypiętym buildem i API dostawcy. To etap migracyjny zachowujący Vision/CoreText; nie instalacja u odbiorcy ani współdzielenie osobistego konta CLI. Hosted Mac, jego konfigurację, licencje i koszt trzeba zweryfikować przed wyborem dostawcy. Nie udajemy, że Linux ma tę samą jakość trackingu.

Cel skalowania: worker Linux w niezmiennym obrazie dopiero po zastąpieniu zależności macOS i przejściu identycznego korpusu dla każdego dopuszczonego profilu. Decyzja o zmianie detektora/fontów to nowa wersja, porównanie i akceptacja. Pierwszy pilot może pozostać na zarządzanym Macu, jeśli pomiar kosztu i przepustowości to uzasadnia.

Użytkownik wysyła duży film bezpośrednio do prywatnego storage przez krótkotrwały podpis, z multipart/retry i weryfikacją sumy. API przyjmuje identyfikatory, nie dowolne ścieżki. Zamknięcie karty nie przerywa zlecenia. Backend zapisuje stan, manifest i outbox w transakcji; worker pobiera zlecenie z lease i rosnącym fencing tokenem. Stary proces nie może opublikować wyniku po przejęciu zadania. Idempotencja jest na etapie i rewizji, nie tylko na kliknięciu przycisku.

API opłacone przed utratą odpowiedzi to stan niepewny kosztowo. Najpierw odczyt zapisanych odpowiedzi/identyfikatora i mechanizmów dostawcy, jeżeli dostępne; brak dowodu nie uprawnia do obietnicy exactly-once ani automatycznego nieograniczonego retry. Przekroczenie limitu wymaga jawnego wznowienia w ramach nowej rezerwacji.

Bezpieczeństwo wymagane dla samej centralizacji: identyfikator organizacji i autoryzacja każdego projektu/assetu/jobu; klient i szablon nie są tożsamością właściciela. Prywatne prefiksy storage, czasowe linki, brak cudzych danych w cache, ograniczone uprawnienia workerów, sekrety tylko na serwerze, limity plików/czasu/CPU i izolacja procesów dekodujących media. Import stron/YouTube ma ochronę SSRF i kontroli ruchu. Profile prawdziwych klientów są prywatne; publiczny użytkownik nie otrzymuje ich z automatu. Role owner/editor/viewer; właściciel usługi ma audytowany dostęp do przeglądu w uprawnionym zakresie.

Propozycja pilota: zaproszenia, brak publicznej rejestracji i checkoutu; roboczy limit 1 aktywnego ciężkiego joba globalnie i limity przestrzeni per organizacja. Retencja robocza: materiały zachowane przez pilota do jawnego usunięcia właściciela, z małą kwotą przestrzeni blokującą kolejny upload zamiast automatycznego kasowania. Przed publicznym uruchomieniem potrzebne są potwierdzone zasady retencji, kopii, usuwania i regionu danych. Nie są automatycznie ustalone tym dokumentem.

## 9. Powtarzalny render i podgląd

Manifest renderu przypina master i krótkie źródło, transkrypcję, zaakceptowane operacje, branding/reguły, pliki fontów i dekoracji, detektor, bundle, wersję Node/Remotion/Chromium/FFmpeg, OS/architekturę i ustawienia wyjściowe. Na Macu archiwizujemy build i identyfikator obrazu/systemu; nie nazywamy tego Dockerem. Po migracji Linux przypinamy konkretny obraz digest i architekturę. Render nie czyta ruchomych plików roboczych ani zdalnych zasobów, które mogą zmienić się podczas pracy.

Wszystkie animacje zależą od klatki i ziarna zapisanego w projekcie. Testy obejmują render klatek poza kolejnością i różne concurrency. Zgodność ponownych renderów mierzymy obrazem i dźwiękiem z tolerancją określoną przed porównaniem; równość kontenera MP4 nie jest wymagana. Archiwalny MP4 pozostaje najpewniejszym sposobem odtworzenia zaakceptowanego wyniku.

Player w przeglądarce jest roboczym podglądem. Podgląd do zatwierdzenia to serwerowy MP4 lub klatki z tego samego manifestu, pokazywane wszystkim użytkownikom. Niska rozdzielczość próby skaluje cały logiczny kadr, nie przelicza innego łamania napisów. Finalny render podlega własnej kontroli. Nie obiecujemy identyczności domowego Playera i serwera na podstawie tego samego JSX.

## 10. Koszt pierwszego montażu

Tanie działanie oznacza mało wywołań i krótkie odpowiedzi, a nie najtańszy model za każdą cenę. Domyślnie ASR i detekcja na własnym workerze. Transkrypcja mastera i propozycje QC są kosztem projektu; wybrane rolki wykorzystują je ponownie. Wybór 10 rolek nie uruchamia 10 analiz całego odcinka. Koszt wspólny pokazujemy osobno, bez arbitralnego rozdzielania po równo.

Docelowy prosty montaż: jeden request zgrupowany dla tekstu, kluczy i hooka; opis publikacji osobno, z cache na treść. Oddzielne podzadania są logicznymi kontraktami, nie nakazem wykonywania 5 requestów, gdy jeden mały wynik wystarcza. Brak odsyłania wszystkich czasów i metadanych zmniejsza szczególnie koszt wyjścia. Pełne wideo nie trafia do LLM przy każdej rolce; punktowa ocena obrazu dopiero dla flag, w ramach osobnego limitu.

Budżety startowe do benchmarku, nie obietnica jakości ani twarde ucinanie kontekstu:

| Zadanie | Docelowe wejście | Docelowa odpowiedź | Gdy za mało |
|---|---|---|---|
| Redakcja krótkiej rolki | 2–5 tys. tokenów | 300–1200 tokenów | Poszerzenie w limicie albo przegląd |
| Punktowa poprawka tekstu/hooka | 500–1500 tokenów | 100–400 tokenów | Celowo szerszy fragment, bez całej historii |
| Opis publikacji | Tylko wybrane teksty i reguły opisu | Krótki opis | Osobny retry, bez renderu/ASR |
| Długi master QC | Zależnie od rzeczywistej długości, okna z kontekstem | Zakresy po ID i krótkie powody | Pomiar oddzielny od krótkiej rolki |

Stałe instrukcje i schemat można cache'ować u dostawcy zgodnie z jego regułami prefiksów. Własny cache jest ważniejszy: hash treści/ASR, reguł i wersji zadania → zaakceptowany wynik. Ten sam wynik nie musi w ogóle ponownie pytać modelu. Cache zawsze izolowany per organizacja, także gdy dwóch klientów ma identyczny tekst.

### Przykład arytmetyczny ceny AI

18.10.2026 sprawdzono [cennik Standard, krótki kontekst](https://developers.openai.com/api/docs/pricing): GPT-6 Luna wejście 0,10 USD / mln, wyjście 0,50 USD / mln; GPT-6.1 Sol 2 USD / mln i 10 USD / mln. Poniżej zwykłe niecache'owane tokeny tekstowe, bez cache-write, vision, researchu, ASR, renderu, podatków i dopłat regionalnych. To scenariusze ilości tokenów, nie pomiar pracy aplikacji.

| Scenariusz | Luna | Sol |
|---|---:|---:|
| Redakcja: 4000 wejścia + 800 wyjścia | 0,0008 USD | 0,016 USD |
| Mała poprawka: 1200 wejścia + 200 wyjścia | 0,00022 USD | 0,0044 USD |
| Większe wywołanie: 20000 wejścia + 3000 wyjścia | 0,0035 USD | 0,07 USD |

Koszt = wejście × cena wejścia / 1 mln + rozliczane wyjście × cena wyjścia / 1 mln. Liczymy całe rozliczane wyjście, również reasoning, jeśli dostawca je tak ujmuje. Sama niewielka redakcja tekstowa może być tania; nie wynika stąd cena gotowego filmu. Budżety uwzględniają próby nieudane, escalation, aktualny cennik, dopłaty i opis. Bez aktualnej taryfy pomiar ceny jest `unknown`, nie zero.

## 11. Tanie poprawki i zależności

Poprawka jest zmianą istniejącego planu z `baseRevision`, zakresem i ID. Użytkownik widzi podsumowanie zmiany i podgląd. Ręczna korekta tekstu nie rusza czasów; zmiana czasu to osobna operacja. Brak zgody rewizji zwraca 409 i zachowuje draft. Nie ma przepisywania całego filmu przez czat.

| Poprawka | AI | Co przeliczamy | Co reużywamy |
|---|---|---|---|
| Dokładny tekst wpisany ręcznie, kolor, pozycja, usunięcie dekoracji | 0 tokenów LLM | Geometria, kontrola, preview/finalny render według potrzeby | ASR, wybór historii, obraz/track, redakcja |
| „Zmień hook” | Mały kontrakt tekstowy | Hook i jego układ; kontrola, render | Źródło, ASR, kadry, reszta treści |
| „Skróć końcówkę” | 0 AI przy ręcznym zaznaczeniu; inaczej mały fragment z kontekstem | Segmenty, mapowanie na oś, powiązane napisy, kontrola i render | Master i wyniki analizy obrazu w osi źródła |
| Ręczny kadr | 0 LLM | Kadr danego ujęcia, tracking wyłączony, kontrola i render | ASR i redakcja |
| Korekta błędnego trackingu | Bez tekstowej redakcji | Detekcja/track wskazanego ujęcia albo ręczny kadr, kontrola i render | Napisy, hook, ASR i pozostałe ujęcia |
| Wariant wyglądu lub rozdzielczość przy zachowanym kontrakcie treści | 0 LLM | Kompilacja wyglądu, walidacja i render | Treść, analiza i checkpoint AI |
| Zmiana klienta/profilu z innymi zasadami treści | Tylko jeśli wymagają tego unieważnione etapy | Porównanie kontraktów, potrzebne źródło/segmenty, napisy, kontrola i render | Wyniki zgodne z nowym kontraktem i podpisem |
| Błąd opisu publikacji | Tylko sam opis | Publikacja/opis | Gotowy MP4 |
| Nowe źródło | Zależnie od zadania | Etapy zależne od nowego źródła | Tylko wyniki o zgodnym podpisie |

Zmiana treści unieważnia cache opisu; zmiana samego zoomu/koloru nie. Usunięcie słowa usuwa jego dekorację, a nie przypina jej do kolejnego tekstu. Zmiana grupy przelicza kotwicę dekoracji deterministycznie, nie pyta AI ponownie o jej znaczenie.

Zmiana klienta nie jest wyłącznie zmianą wyglądu. Przykład: przejście na SkyClass po wcześniejszym usunięciu ciszy wymaga odtworzenia pełnego zakresu wypowiedzi i ciszy z mastera oraz zapisanej transkrypcji, a w QC ponownego utworzenia krótkiego źródła od lokalnego czasu 0. Zapisana mapa do mastera określa pochodzenie. Jeżeli master lub potrzebna transkrypcja nie istnieją, migracja zatrzymuje się i wskazuje brak danych; nie generuje brakującego audio ani nie oznacza starego montażu jako zgodnego. Ponowne ASR/AI uruchamia się tylko wtedy, gdy brakuje wymaganego wyniku i użytkownik zleci etap w budżecie. Samo przywrócenie znanego zakresu może wykonać kod bez LLM.

Pierwsze wydanie może renderować cały finalny film po akceptacji poprawek. To prostsze i bezpieczniejsze dla synchronizacji; nadal nie zużywa tokenów LLM. Podczas pracy pokazujemy krótki podgląd zmienionego zakresu i łączymy kilka zmian przed eksportem. Anulujemy zastąpione rendery, a tego samego podpisu nie kolejkujemy drugi raz. Nie budujemy od razu składania finalnego MP4 z cache'owanych fragmentów: to późniejsza optymalizacja wymagająca pomiaru i testów audio/przejść.

## 12. Budżet usługi i opłacalność

Koszt gotowej rolki obejmuje: udział infrastruktury stałej, import/ASR, analizę projektu, AI redakcji/poprawek/opisu, detekcję, rendery i preview, storage, transfer, licencje oraz pracę przeglądu. Koszt GPU/CPU nie jest kosztem tokenów. Czas idle drogiego Maca przy małym ruchu może dominować nad tekstowym API.

Rezerwacja kosztu przed requestem obejmuje oszacowane wejście, maksymalne rozliczane wyjście i dopuszczone ponowienia. Limit joba/organizacji sprawdzany transakcyjnie, również przy równoległych żądaniach. Usage jest trwałe przed walidacją odpowiedzi, z rozróżnieniem cache, reasoning, prób i etapów. Nieznany rachunek zostaje do rozliczenia, nie zeruje limitu. Powtórzone identyfikatory odpowiedzi nie dublują ledgeru. Nie ma automatycznego przejścia na drogi model poza zarezerwowanym limitem.

Mierzymy koszt zaakceptowanej rolki i p50/p95 osobno dla klientów, długości, rozdzielczości i rodzaju poprawki; udział odrzuconych wyników, odsetek eskalacji, liczbę renderów i minuty przeglądu. Przed publiczną ceną wykonujemy pomiar na reprezentatywnym korpusie i ofertach hostingu. Właściciel widzi panel kosztów; odbiorca prosty limit pozostałych eksportów/poprawek, z ujawnionym kosztem rozszerzonego zadania. Pakiet nie powinien obiecywać nielimitowanych pełnych regeneracji ani dowolnych masterów. Konkretne kwoty pakietów i marża pozostają decyzją biznesową po pomiarze, nie blokują ograniczonego pilota.

## 13. Minimalny panel produktu

Zachowujemy jasne powierzchnie i niebieski akcent z zaakceptowanego kierunku. Główne zadanie to wgranie, klient, podgląd i poprawka. Szczegóły techniczne pod rozwinięciem. Użytkownik widzi wersję klienta, rzeczywisty etap pracy i stan kontroli, nie surowy prompt ani wybór przypadkowego operatora. Ręczna korekta napisów pozostaje na wierzchu. Przy dekoracji dostępne proste „usuń/zmień”; przy kadrze wybór ujęcia i ręczna korekta. Nie wymuszamy czatu dla korekty koloru/pozycji.

GPT Taste stosujemy do czytelności, odstępów, kontrastu i dyscypliny wizualnej, w granicach roboczej aplikacji. Landing z przypiętymi sekcjami i losowanym hero nie jest przedmiotem tego projektu. Ten projekt nie wprowadza redesignu UI; w fundamencie dodano jedynie selektor zakresu poprawki QC. Interakcje respektują ograniczenie ruchu i klawiaturę.

## 14. Kolejność wdrożenia i warunki zakończenia

| Etap | Praca i miejsca integracji | Warunek wyjścia |
|---|---|---|
| Q0: materiał referencyjny | Spis wszystkich klientów, aktualne preferencje i assety; przypadki z lokalnej instalacji, świeżego klonu i MP4; `src/fonts.ts`, `WordEmoji.tsx`, obecne acceptance | Każdy objaw rozdzielony na AI, środowisko, detekcję lub render; zatwierdzone przykłady, lista brakujących praw/zasobów |
| Q1: reguły i geometria | Rozszerzyć branding store/schema/snapshot, uszczelnić fonty, jeden zapis dekoracji, adaptery `prep`, zwykłych rolek i QC | Brak cichego fallbacku; wszystkie klienty zachowują własny styl; skrajne przypadki napisów/emotek przechodzą |
| Q2: ograniczone AI i tanie poprawki | Reużyć QC AI/edit/costs; zwykłe rolki i czat przeprowadzić przez ten sam kontrakt; operacje po ID i macierz zależności | Ręczne/geometryczne poprawki wywołują 0 LLM; mała poprawka nie wysyła całego filmu; brak regresji 1:1 SkyClass i Bisanza |
| Q3: ujęcia i bramki mediów | `quickcontent-portrait`, speaker, layout/framing, HappyNewsSource i render; jawna mapa czasu i kontrola obrazu | Prawdziwe cięcia bez dodatkowych błysków; duo/przebitka/zbliżenie zgodne z referencją; niepewność trafia do korekty |
| C0: pilot centralny | API wyodrębnione z Vite bez przepisywania UI, auth, Postgres, storage, lease/fencing, worker zarządzany, import prywatnych projektów | Dwie izolowane organizacje; zamknięcie karty/restart nie kasują pracy; brak dostępu do cudzych materiałów |
| C1: koszty i kontrolowane wydania | Manifest runtime, archiwalne MP4, metryki, budżety, kolejka review, flagi wersji i rollback | Pomiar kosztów AI/renderów/poprawek; błędny model/runtime można wyłączyć bez kasowania wyników |
| C2: przejście użytkowników | Eksport/import klientów i historii z walidacją, pilot na różnych komputerach, aktualizacja instrukcji/landingu | Pełna ścieżka działa bez lokalnego CLI; dopiero wtedy usunięcie lokalnej instalacji z głównej oferty |
| C3: opcjonalny Linux i skala | Zamiana zależności macOS, parity testy, potem dodatkowe workery | Zero zaakceptowanych regresji per dopuszczony klient; ekonomika uzasadnia zmianę |

Etapy Q0–Q3 naprawiają jakość niezależnie od hostingu, C0–C2 eliminują różnice instalacji. Realizacja musi zachować bieżące niezwiązane zmiany. Zgodnie z korektą użytkowniczki lokalne CLI pozostaje wspieranym sposobem pracy i testowania właścicielki oraz zespołu wewnętrznego firmy, także po uruchomieniu usługi. Konta subskrypcyjne nie wymagają API. Główna oferta dla odbiorców może prowadzić do centralnego panelu, z własnym brandingiem w wyższych pakietach. Stary samodzielnie zmodyfikowany fork może działać poza kontrolą usługi; nie obiecujemy blokowania pobranego kodu.

Pierwsze wydanie nie wymaga automatycznego systemu abonamentów, wielochmurowości, bazy wektorowej, fine-tuningu, wielu agentów, migracji Next.js ani nowego systemu animacji. Liczba maszyn i terminy zależą od Q0/pomiaru; nie obiecujemy dat ani konkretnej przepustowości bez testu.

## 15. Odbiór

Proponowany korpus początkowy: minimum 10 oznaczonych przypadków na każdy obecny profil/klienta, w tym prawdziwe materiały i przypadki brzegowe. To minimum startowe, nie dowód statystyczny niezawodności. Oddzielić przykłady prompta, zbiór strojenia i zamknięty test. Dla modeli generatywnych powtórzyć każdy test co najmniej trzy razy, raportując wszystkie próby. Ujęcia, cropy i słowa referencyjne oznacza człowiek; nie generuje ich sam oceniany algorytm.

Wymagane sprawdzenia: Happy News z ekranem/bez, pojedynczy/duo, krótkie cięcia, braki twarzy; długie polskie słowa, odmiany fontów i dekoracje na końcu wiersza; SkyClass z zakresu mastera >0 i pełnym odsłuchem; Bisanz bez zoomu; wszystkie inne oprawy z logo i bez. Lokalne 9:16, poziome źródło, HDR/VFR, brak mowy i uszkodzone media. Rozdzielczości 720/1080/2160, kadry ręczne i korekty treści.

Odbiór techniczny: odpowiednie testy integracji, `npm test`, `npm run lint`, buildy, prawdziwy import YouTube z workera i lokalny upload przez przeglądarkę, pełna ścieżka edycji/pobrania. Awaria po płatnej odpowiedzi, po zapisie MP4 i podczas przejęcia joba; równoległe poprawki i 409; brak assetu; wycofanie runtime i odzyskanie bazy z kopii. Testy autoryzacji dwóch organizacji, podpisanych linków i wycieku przez build/cache.

Mac/Windows/Linux i różne przeglądarki testujemy jako klientów usługi: ten sam projekt i rewizja mają zwracać ten sam finalny MP4 i podpis. Surowy Player nie jest wzorcem odbioru. Osobno porównujemy dwie maszyny backendu tej samej zatwierdzonej klasy.

Progi proponowane przez autora: 100% przejścia twardych walidatorów dla wydawanego materiału, zero znanych krytycznych naruszeń na zamkniętym korpusie; każdy `unknown` w krytycznej regule trafia do przeglądu. Przed odblokowaniem automatycznego wydawania profilu minimum 30 kolejnych pełnych rolek zatwierdzonych po obejrzeniu i odsłuchu, brak krytycznej poprawki, co najmniej 95% bez poprawki istotnej dla odbiorcy oraz zmierzony koszt mieszczący się w ustalonym limicie. To bramka pilota, nie obietnica 95% w całej przyszłej populacji. Kryteria kosztu w walucie ustala właściciel przed takim odblokowaniem; do tego czasu wydawanie ręczne i twardy limit wydatków pilota.

## 16. Decyzje autora i kwestie do późniejszego potwierdzenia

Własne propozycje autora: pilot na zaproszenia, jeden worker, obecny frontend, zamknięte API tekstowe, macOS jako pierwszy backend zgodny z obecnym silnikiem, późniejszy Linux, ograniczone retry i przegląd pilota. Nie są przedstawiane jako wcześniejsze zgody użytkowniczki.

Przed zakupem usług: budżet pilota, region i retencja danych, prawa do assetów/Apple Emoji, warunki dostawcy API oraz licencja Remotion. Przed publiczną sprzedażą: wolumen, ceny pakietów, limit przestrzeni i zasady dostępu operatora do materiałów. Można zaplanować i przetestować architekturę bez wymyślania tych odpowiedzi; publiczne uruchomienie pozostaje od nich zależne.

Ten dokument obejmuje research i projekt z mapą wdrożenia. Nie zamyka odbioru obecnego programu, nie zmienia domyślnego API/account-only, nie wyłącza instalacji i nie tworzy kosztów usług.

## 17. Przegląd projektu

18.10.2026 osobny recenzent wykonał builder check obu dokumentów. Wskazał jedną istotną niespójność: utożsamienie zmiany stylu ze zmianą kontraktu redakcyjnego. Poprawiono §11: bezkosztowa względem LLM zmiana wyglądu zachowuje zasady treści; zmiana klienta najpierw porównuje kontrakty i dostępność źródła. Pozostałe obszary recenzent uznał za wystarczające do przygotowania planu etapowego. Przegląd dokumentu nie jest testem aplikacji ani audytem bezpieczeństwa.
