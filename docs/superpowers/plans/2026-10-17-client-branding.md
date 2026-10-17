# Branding klientów — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wspólny, wersjonowany branding klienta dla zwykłych rolek i QuickContent, konfigurowany w osobnym panelu z rzeczywistym podglądem Remotion.

**Architecture:** Lokalny profil z walidacją Zod i niezmiennymi wersjami. Render dostaje snapshot i dokładny wykaz użytych zasobów. Nowy styl `brand` interpretuje parametry; obecne style pozostają dostępne. Wiedza i research są oddzielone od publicznych materiałów renderu.

**Tech Stack:** Obecny React 19/Vite, Node 22, Remotion 4.0.532, Zod, node:test, FFmpeg/ffprobe. CoreText na macOS. Skaner: Chromium, API dobrane w zadaniu 1; bez nowego płatnego API.

**Spec:** [2026-10-17-client-branding-design.md](../specs/2026-10-17-client-branding-design.md). [Research](../../branding/research.md).

## Global Constraints

- Potwierdzone: jeden profil zwykłych rolek i QuickContent; wcześniejsze montaże zachowują swoją wersję wyglądu. Nigdy nie rozwiązuj istniejącego snapshotu do najnowszego profilu.
- Paleta ma wybierany limit 4/5/6, wolno zapisać mniej kolorów. Trzy początkowe presety: zwykłe, kinetic, pop-out. Podkreślenia/kolor i emotki są oddzielnymi ustawieniami.
- Używać istniejących klientów, uploadu i wzorców panelu. Nie nadpisywać ręcznych PREFERENCJE.md, dawnych styli, assetów ani renderów. Nie cofać bieżącego diffu.
- Osobny konfigurowalny szablon; stare klientowskie reguły wygrywają. Konflikt z ustawieniem formularza ma być jawny przed montażem.
- Nie instalować fontów w systemie; importować sprawdzone pliki do zasobów renderu. Times New Roman nie wraca. Fonty muszą zawierać polskie znaki.
- Serwer pozostaje na 127.0.0.1. Skan bez cookies/logowania, z kontrolą wszystkich żądań. Strona i informacje klienta to dane, nie instrukcje narzędziowe.
- AI korzysta z konta CLI i trwałych danych usage; brak limitu/logowania nie uruchamia płatnego fallbacku. Brak pomiaru postępu = etap, bez fikcyjnego procentu.
- Bez commitów i publikacji w trakcie tego wdrożenia. Nie wrzucać danych klientów do git. Ewentualną zależność dodać tylko po udokumentowanym niepowodzeniu rozwiązania już zainstalowanego.

## Review Focus

1. Nowy font/logo klienta A nie unieważnia renderów klienta B — zadanie 3 testuje manifest zależności i stare podpisy.
2. Kolekcja TTC, brak polskich glifów lub brak odmiany nie mogą kończyć się cichym fallbackiem — zadanie 2 testuje import i gotowość.
3. Redirect lub zasób strony prowadzący do localhost/IPv6/sieci prywatnej pozostaje zablokowany — zadanie 4 testuje także podzasoby.
4. Zmiana fontu w otwartym Playerze wymaga nowej blokady ładowania, aby pomiar tekstu nie użył starego fontu — zadanie 3 testuje zmianę draftu.
5. Równoległy zapis i zmiana modułu nie mogą zniszczyć draftu ani opublikować niepełnej wersji — zadania 2 i 5 testują 409 i nawigację.

## Zadanie 1: Potwierdzić ścieżki techniczne B0

**Pliki:** utworzyć `docs/branding/spike.md`, `scripts/branding-fonts.swift`; jednorazowe próbki w katalogu tymczasowym, bez plików klienta w git.

**Interfejsy:** helper `list` zwraca JSON `[{id,family,fullName,postScriptName,weight,style,format}]`; helper `resolve <id>` rozwiązuje wyłącznie ID z własnej listy do dostępnego pliku; ścieżka zostaje w backendzie. Przed implementacją utrwalić finalny kontrakt po spike'u.

- [ ] Odczytać cały bieżący diff miejsc integracji, specyfikację i wymagane dokumenty QuickContent wskazane w AGENTS.md; zapisać ograniczenia nowych i istniejących ścieżek.
- [ ] Uruchomić odczyt CoreText i sprawdzić jedną rodzinę użytkownika, jedną systemową oraz kolekcję TTC; nie próbować kopiować całego katalogu fontów. Udokumentować faktyczne ograniczenia i bezpieczny fallback uploadu.
- [ ] Przetestować import jednej rodziny z oficjalnego `google/fonts` z licencją i konkretną rewizją; ustalić format lokalnego indeksu `[{family,path,revision,variants,license}]` i sposób aktualizacji bez pobierania całego repo.
- [ ] Sprawdzić API obecnego Chromium Remotion na własnej lokalnej stronie HTML i JS: widoczny tekst, computed styles, screenshot, blokada żądań. Jeżeli nie obsługuje pełnej kontroli ruchu, wybrać Playwright; dowód i uzasadnienie zapisać w spike.md.
- [ ] Wygenerować krótką klatkę z importowanym fontem; porównać „Zażółć gęślą jaźń” z wybraną odmianą. Wynik B0 to działające wywołania i ograniczenia, nie deklaracja pełnego odbioru.

## Zadanie 2: Dane profilu, wersje, materiały i fonty

**Pliki nowe:** `src/branding/schema.mjs`, `src/branding/schema.d.mts`, `scripts/branding-store.mjs`, `scripts/branding-fonts.mjs`, `scripts/branding-assets.mjs`, `ui/branding-server.mjs`, odpowiadające `scripts/branding-*.test.mjs`, `ui/branding-server.test.mjs`.
**Zmienić:** `ui/server.mjs` — wyłącznie integracja tras; `scripts/branding-fonts.swift` z B0.

**Interfejsy:** `createBrandingStore(root)` z `get(clientId)`, `save(clientId, profile, expectedRevision)`, `version(clientId, revision)`; `snapshotBranding(root, clientId, revision)` zwraca sprawdzony snapshot bez wiedzy i ścieżek systemowych. `importBrandAsset(root, clientId, kind, stream, metadata)` zwraca `AssetRef` zgodny ze schematem spec. `listFonts({source,query})`, `importFont(root,clientId,{source,id,variant})`.

Trasy pod `/api/branding`: GET `/clients/:id`, PUT `/clients/:id` (rewizja w `If-Match`, odpowiedź `ETag`), POST `/clients/:id/assets`, GET `/fonts?source=&q=`, POST `/clients/:id/fonts`. Tworzenie tożsamości klienta zostaje w istniejącym POST `/api/client`; nie wprowadzać drugiego rejestru klientów. Wiedza nie trafia do katalogu publicznego.

- [ ] Napisać testy: zapis i odczyt wersji; odrzucenie siódmego koloru i złego HEX; 409 przy starej rewizji; brak nadpisania PREFERENCJE; odmowa obcego assetId/ścieżki/symlinka; dwa konkurencyjne zapisy publikują jedną poprawną wersję.
- [ ] Uruchomić `node --test scripts/branding-*.test.mjs ui/branding-server.test.mjs` i potwierdzić błąd braku implementacji.
- [ ] Zaimplementować ścisłe schematy z ograniczonym tekstem (notes 12000 znaków, opisy materiałów 2000, nazwa 120), ID i typami ze spec. Zapis serializowany per klient, atomowy, wersja niezmienna; profil może być draftem, `ready` wymaga dostępnego fontu i wszystkich referencji. Finalny manifest snapshotu obejmuje wyłącznie użyte zasoby.
- [ ] Rozwinąć wzorzec uploadu z `ui/upload.mjs`: limit strumienia 20 MiB obrazy/fonty, 2 GiB przebitki; sprawdzanie zawartości obrazu, fontu i ffprobe wideo. Na początek PNG/JPEG/WebP, TTF/OTF/WOFF/WOFF2, MP4/MOV/WebM; SVG konwertować bez sieci do PNG albo jawnie odrzucać, nigdy serwować nieoczyszczonego. Usuń `.part` po błędzie, nie nadpisuj pliku o istniejącym hashu.
- [ ] Dodać testy przerwanego/przekraczającego limit uploadu, mylącego rozszerzenia, niedostępnego fontu, braku glifów/wagi i nieznanej rodziny Google. Przy importowaniu zachowywać licencję, pochodzenie i hash, nie instalować systemowo.
- [ ] Uruchomić testy modułu ponownie; wszystkie asercje mają przejść. Brak helpera Maca daje polski komunikat i upload, nie blokadę całego panelu.

## Zadanie 3: Snapshot, styl `brand` i rzeczywisty render

**Pliki nowe:** `src/styles/brand.tsx`, `src/branding/preview.ts`, `src/branding/BrandLogo.tsx`, `src/branding/fonts.ts`, `src/branding/appearance.mjs`, jego `.d.mts`, `scripts/branding-render.test.mjs`.
**Zmienić:** `src/Reel.tsx`, `src/fonts.ts`, `scripts/quickcontent-render.mjs`, `scripts/quickcontent-render.test.mjs`, `ui/reel-publication-state.mjs`, testy stanu publikacji.

**Interfejsy:** `ReelData.branding?: BrandingSnapshot`; `StyleProps.branding?: BrandingSnapshot`; `loadBrandFonts(snapshot): Promise<void>`; `brandAppearance(snapshot, group)` liczy jawne, sprawdzalne parametry trzech presetów. `brandingRenderFiles(snapshot): string[]` daje zamknięty wykaz plików do hashowania. `Brand` dostaje te same słowa i czasy co inne style.

- [ ] Napisać testy snapshotu: zmiana aktywnego profilu nie zmienia parametrów istniejącej rolki; odrzucenie brakującego pliku; manifest A nie zawiera B; dodanie pliku klienta B nie zmienia podpisu A; zmiana użytego fontu zmienia podpis A. Sprawdzić także dotychczasowe rendery przy przejściu algorytmu hashowania.
- [ ] Uruchomić `node --test scripts/branding-render.test.mjs scripts/quickcontent-render.test.mjs ui/reel-publication-state.test.mjs`, oczekując błędu nowych testów.
- [ ] Dodać `brand` do rejestru styli; jawne przełączniki preset/emphasis/emojiEnabled; logo opcjonalne. Rozmiary i pozycje liczone w odniesieniu do kadru i safe zone, z unikaniem twarzy przez istniejące minTop. Grupy i timingi pozostają bez zmian. Nie modyfikować ośmiu dawnych styli.
- [ ] Ładować dokładne fonty snapshotu przed renderem/pomiarem, z blokadą odnawianą po zmianie manifestu draftu. Błąd = `cancelRender`, nie cichy fallback. Oddzielić cache obietnic po hashu fontu od gotowości konkretnego podglądu.
- [ ] Zawęzić podpisy nowych profili do jawnych zależności. Starych podpisów nie przeliczać po cichu: kompatybilny odczyt poprzedniej wersji lub kontrolowana migracja z porównaniem niezmienionych wejść; brak dowodu oznacza jawny brak aktualnego podpisu, nigdy fałszywe „Zmontowane”.
- [ ] Ponowić testy; zrobić krótki MP4 i klatki każdego presetu z podkreśleniem, emotką i logo. Porównać podgląd, font i safe zone. Nie naliczać ASR/AI dla samego podglądu wyglądu.

## Zadanie 4: Trwały, izolowany skan strony

**Pliki nowe:** `scripts/branding-scan.mjs`, `scripts/branding-network.mjs`, `scripts/branding-scan.test.mjs`, `scripts/branding-network.test.mjs`; integracja `ui/branding-server.mjs`.
**Reużycie:** mechanizmy trwałych jobów/operatora QC po odczytaniu ich kontraktów; skaner nie zajmuje kluczy jobów montażowych i nie zapisuje ich struktur poza publicznym API.

**Interfejsy:** `startBrandScan(root,clientId,{url,aiProvider})` zwraca job ID; `getBrandScan(root,clientId,scanId)` i `cancelBrandScan(...)`; wynik `{status,stage,suggestions,sources,error,usage}`. Propozycja pola zawiera `{value,sourceRefs}`. POST `/clients/:id/scans`, GET i DELETE `/clients/:id/scans/:scanId`. Zastosowanie wyników następuje w draftcie UI i normalnym PUT profilu, nie przez skaner.

- [ ] Napisać testy odrzucenia credentials, protokołów file/data, prywatnych IP v4/v6, DNS rebinding i redirectu; te same reguły dla skryptów/obrazów/ramek/workerów/WebSocket. Wymusić adres sprawdzonego DNS także na połączeniu, nie tylko sprawdzać nazwę przed zwykłym fetch.
- [ ] Uruchomić `node --test scripts/branding-network.test.mjs scripts/branding-scan.test.mjs` i potwierdzić brak nowej implementacji.
- [ ] Zaimplementować izolację bez cookies i profilu użytkowniczki; maks. 5 stron tej samej domeny, 30 s na stronę, limit 5 MiB dokumentu i 50 MiB zasobów na stronę. Kontrola każdego połączenia zgodna ze sprawdzonym mechanizmem B0; anulowanie zamyka wyłącznie własny proces. Research zapisuje tylko ograniczoną, potrzebną treść.
- [ ] Wyciągać tekst i próbki stylów oraz źródła; operator konta porządkuje je do walidowanego JSON. Nie pobierać automatycznie fontów/zdjęć strony do aktywnego profilu. Zapis usage przed walidacją odpowiedzi. Błąd AI zachowuje wynik deterministycznego skanu.
- [ ] Dodać testy prompt injection jako danych, błędnego JSON, restartu, retry, anulowania, braku konta i limitu, bez wywołania API fallbacku. Ręczne pola pozostają nietknięte.
- [ ] Ponowić testy i wykonać realny odczyt publicznej strony statycznej oraz JS; blokada/challenge musi być raportowana, bez obchodzenia logowania. Test fixture jest dowodem izolacji, nie dowodem zewnętrznej dostępności.

## Zadanie 5: Panel i podgląd

**Pliki nowe:** `ui/Branding.tsx`, `ui/branding.css`, `ui/branding-api.ts`, `ui/branding-view.mjs`, jego `.d.mts` i `ui/branding-view.test.mjs`.
**Zmienić:** `ui/App.tsx`, `ui/panel-navigation.mjs`, jego `.d.mts` i testy; `ui/page-route.test.mjs` tylko jeśli trasy wymagają zmiany.

**Interfejsy:** `Branding({clients,onClientsChanged})`; wrappery tras zadania 2/4; `parseBrandingHash(hash)` zwraca klienta lub listę; stan draftu i bazowa rewizja należą do edytora, nie do aktywnego profilu serwera. Podgląd używa `Reel` i `BrandingSnapshot` z zadania 3, nie osobnej implementacji napisów.

- [ ] Napisać testy bezpośredniego adresu, Wstecz, nazw kolidujących z prefiksem, braku klienta, zachowania draftu przy 409 oraz selektywnego zastosowania researchu bez nadpisania ręcznych pól. Uruchomić testy i potwierdzić brak implementacji nowych zachowań.
- [ ] Przed UI odczytać `impeccable/reference/craft-floor.md` oraz incumbent panel; utrwalić brief powierzchni Operate z zachowaniem tokenów `ui/panel.css`. Nie stosować generatora kierunków marketingowych Design Taste do ekranu aplikacji.
- [ ] Zbudować listę klientów i formularz sekcji ze spec. Akcja Zapisz branding, status zapisów, walidacja przy polu, potwierdzanie odrzucenia zmian; bez zapisu podczas każdej zmiany suwaka. Paleta 4/5/6 i fonty z podglądem polskich znaków, jawna gotowość importu.
- [ ] Dodać uploady z postępem i opisami; research z etapami, źródłami, wyborem danych do zastosowania, cancel/retry. Draft nie zależy od powodzenia skanu; zdjęcia/logo mogą być puste.
- [ ] Podgląd 9:16 z odtwarzaniem/restartem po prawej; przy wąskim ekranie osobna zakładka. Neutralne tło i jawnie przykładowy tekst, opcjonalnie własny klip; bez pobierania filmu klienta jako domyślnego demo.
- [ ] Ponowić testy; sprawdzić zapis/odświeżenie/konflikt i nawigację z klawiatury. Jedna partia zrzutów desktop/mobile, naprawa w jednej partii, maksymalnie jedno potwierdzenie; detector Impeccable raz po ukończeniu, następnie wymagany reviewer i dokumenter zgodnie ze skillem.

## Zadanie 6: Zwykłe rolki i QuickContent

**Zmienić:** `scripts/prep.mjs`, `ui/Dialogs.tsx`, `ui/api.ts`, `ui/server.mjs`, `scripts/quickcontent-store.mjs`, `scripts/quickcontent-adapter.mjs`, `scripts/quickcontent-edit.mjs`, `src/quickcontent/schema.mjs`, `ui/QuickContent.tsx`; odpowiadające istniejące testy oraz `scripts/branding-integration.test.mjs`.

**Interfejsy:** `templateSnapshot.branding` zawiera ten sam zatwierdzony snapshot co `reel.json.branding`. Katalog szablonów łączy stare wpisy i sprawdzone profile, z jawnym `styleId: brand`. Zlecenie zwykłej rolki przyjmuje `brandingRevision`; backend zamraża snapshot przed zleceniem pracy. Prep dostaje sprawdzony snapshot przez parametr/plik joba, bez dowolnej ścieżki z GUI. Snapshot wiedzy do AI jest oddzielny od publicznego snapshotu wyglądu.

- [ ] Napisać testy: nowy klient z gotowym brandingiem jest dostępny dla obu przepływów; draft z brakującym fontem nie jest gotowy; istniejący projekt po zmianie profilu nadal ma starą wersję; retry nie wywołuje ponownie opłaconej redakcji; stary SkyClass nadal zachowuje pełne audio i napisy, Bisanz nadal ma cameraScale 1.
- [ ] Uruchomić `node --test scripts/branding-integration.test.mjs scripts/quickcontent-store.test.mjs scripts/quickcontent-adapter.test.mjs` i potwierdzić błąd nowych asercji.
- [ ] Włączyć wybór brandingu w Nowej rolce i QC; rozdzielić szablon klienta od jego tożsamości. Nie zmieniać istniejących styli automatycznie. Operator otrzymuje snapshot wiedzy i ręczne preferencje z jawną hierarchią.
- [ ] Zabezpieczyć kontrakt edycji AI: nie pozwalać usunąć/podmienić snapshotu przez dowolną odpowiedź; zmiana wyglądu ma osobną, walidowaną operację. W tej wersji zmiana aktywnego profilu dotyczy nowych montaży; użycie innej wersji w starym projekcie wymaga jawnej akcji. Nie dodawać automatycznej migracji całej biblioteki.
- [ ] Ponowić testy integracji i `npm test`, `npm run lint`, `npm run build:panel`. Błędy wcześniejszych zmian raportować osobno, nie cofać cudzej pracy.
- [ ] Wykonać pełną nową rolkę i wybraną propozycję QC z tą samą wersją; zmienić profil, sprawdzić stary i nowy montaż, retry i render bez sieci z zapisanych assetów. Obejrzeć klatki i odsłuchać wynik, w tym SkyClass z czasu źródła >0.
- [ ] Uaktualnić `PANEL.md`, `docs/branding/acceptance.md`, status research/specyfikacji i ograniczenia. Odbiór oznaczyć „wdrożone” wyłącznie po rzeczywistym ukończeniu tych sprawdzeń; fixture nie zastępuje importu i skanu.

## Samokontrola planu

Sprawdzono pokrycie briefu i specyfikacji: uploady/opisy, strona/wiedza, paleta, trzy źródła fontów, trzy style i przełączniki, dodatkowe informacje, podgląd, wspólny profil i wersje są przypisane do zadań. Nazwy snapshotów i interfejsy są wspólne; pięć ryzyk Review Focus ma testy u właściciela zmiany. B0 rozstrzyga wyłącznie API i ograniczenia techniczne, nie obcina zakresu bez zgłoszenia. Testy i wykonanie zadań pozostają nieodhaczone — niniejszy dokument nie jest dowodem wdrożenia.
