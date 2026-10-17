# Branding klientów — dowody i ograniczenia

2026-10-17. **Kod panelu i integracji jest dostępny; pełny odbiór produkcyjnego montażu z AI pozostaje otwarty.** Nie utożsamiać testów danych z rzeczywistą redakcją filmu przez konto.

## Potwierdzone

- Panel `/panel#branding` oraz bezpośredni adres klienta. Sekcje Marka, Materiały, Kolory, Fonty, Napisy; podgląd z tego samego komponentu styli Remotion co render.
- GUI: utworzenie testowego klienta, import rzeczywistego Poppins Medium, upload PNG, opis materiału, włączanie/wyłączanie logo, zapis wersji1–4, zmiana Kinetic→Pop-out i podkreślenie, odczyt po odświeżeniu. Wersja1 zachowała Kinetic po utworzeniu wersji2 Pop-out.
- CoreText: lokalne fonty, poprawne wagi i polskie glify, odrzucenie brakujących glifów oraz jawnie niedostępne TTC/dfont. Rzeczywisty import Google Poppins z licencją, weryfikacja Git blob SHA; szczegóły [spike fontów](spike.md).
- Skan: rzeczywisty publiczny odczyt example.com w Chromium, JavaScript/CSS na testowej stronie, blokada prywatnego podzasobu i przypięcie zatwierdzonego DNS. GUI pokazało propozycje i źródła, zachowało je po przerwaniu skanu restartem oraz pozwoliło ponowić. Kolejny skan zakończył odczyt i raportował błąd semantyki konta jako ograniczenie; bez płatnego fallbacku. [Szczegóły](scan-spike.md).
- Trzy prawdziwe, dwusekundowe MP4: zwykłe, kinetic i pop-out; lokalny Poppins, „Zażółć gęślą jaźń”, podkreślenie; wyjście H.264/AAC 540×960 przy testowej skali0.5. Klatki obejrzane. Źródło syntetyczne z tonem testowym, nie wypowiedź klienta; nie uruchamiano dla niego ASR ani płatnego opisu publikacji.
- Test integracji: zwykły `buildReel` i adapter QC otrzymują tę samą wersję; zmiana aktywnego profilu nie zmienia istniejącego projektu/snapshotu. Testy zachowania segmentów SkyClass oraz zoom1 Bisanza także przy stylu `brand`. Hashowanie nie reaguje na pliki innego brandingu.
- Pełny `npm test` poza sandboxem: 429 testów, 428 zaliczonych, 1 test przeglądarki pominięty w standardowym przebiegu. Osobno `BRANDING_BROWSER_TEST=1 node --test scripts/branding-network.test.mjs scripts/branding-scan.test.mjs`:8/8, w tym rzeczywisty pominięty test Chromium. Sandbox blokuje tożsamość procesów i lokalne porty; jego błędy nie były podstawą deklaracji przejścia testów.
- `npm run lint`, TypeScript, `npm run build:panel`, `npm run build:site` przeszły. Publiczny build zawiera tylko HTML, JS/CSS i jawne dwa fonty, bez filmów klientów i lokalnego App/API. Ostrzeżenie panelu o rozmiarze chunka jest zastane/nieblokujące; build nadal kopiuje lokalne public media i nie jest przeznaczony do wdrożenia publicznego.
- Kontrola1440×1000,1120×987 i390×844: zrzuty w `.impeccable/review/branding/`. Detector Impeccable uruchomiony raz: `[]`. Niezależny reviewer wizualny wskazał replay i mobilne zaznaczenie; replay uruchamia teraz odtwarzanie (AX „Pause video”, postęp do0:03), stan przycisku mobilnego potwierdzono aria-pressed i kolorem obliczonym. Po ponownym zapisie pełnych zrzutów reviewer potwierdził rozwiązanie obu uwag: `disposition: ship`.

## Ograniczenia

- Import fontów walidowany przez CoreText wymaga macOS i Swift. Nie ma ekstrakcji pojedynczych odmian z TTC/dfont. Niedostępność jest jawna; nie udajemy sukcesu na innych systemach.
- Google katalog używa cache oficjalnego endpointu metadanych Google Fonts; pliki/licencje pochodzą z oficjalnego repo Google, pobranie sprawdza blob SHA. To odstępstwo od proponowanego w researchu lokalnego indeksu metadanych repo, ze względu na mniejszą ilość kodu; endpoint może się zmienić i ma błąd/retry bez utraty profilu.
- Skan jest ograniczony do5 dokumentów i kontrolowanego budżetu. SPA zależna od XHR/fetch/workerów/ramek/interakcji może dać niepełny wynik; ograniczenia są przekazywane do panelu. Znaleziona nazwa fontu i kolor to propozycja, nie import/licencja ani kompletna księga marki.
- Nie potwierdzono rzeczywistego semantycznego wyniku konta Codex/Claude w skanerze; rzeczywista próba CLI zakończyła się błędem, zachowując odczyt. Nie wykonano dwóch nowych kompletnych montaży z realną wypowiedzią przez AI oraz pełnego odbioru GUI z nowym YouTube i uploadem. Dotychczasowe testy adaptera/workerów nie zastępują tych prób.
- Emotki nowego presetu mają ograniczony, jawny słownik jednoznacznych słów; nie są dowolnym automatycznym modelem doboru emoji. Nie dopisuje się ich do transkrypcji. Zdjęcia/przebitki są przechowywane z opisami dla operatora; sam upload nie wstawia ich losowo do filmu.
- Profil wersjonuje dane wyglądu i niezmienne pliki; nie archiwizuje wszystkich historycznych wersji kodu Remotion. Wspólna przyszła zmiana silnika może zmienić ponowny render, co musi być widoczne w podpisie.
- Niezależny ogólny reviewer kodu nie zakończył pracy z powodu limitu konta. Główny agent przejrzał integracje i wykonał testy; osobny reviewer Impeccable ocenił UI. Nie przedstawiać tego jako pełnego niezależnego audytu bezpieczeństwa.

## Lokalna obsługa i Vercel

Instrukcje: [PANEL.md](../../PANEL.md), [Vercel](../vercel.md). Utworzone testowe profile `branding-test-2026` i `branding-render-check` oraz renderowe próbki pozostają lokalnie, są ignorowane przez git. MP4 i props testów leżą w `/private/tmp/branding-*.mp4` / `branding-*-props.json`. Nie wykonano commitów, push ani publikacji.
