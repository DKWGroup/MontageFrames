# Wspólna jakość i oszczędna redakcja — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** wdrożyć pierwszy działający etap zgodności montażu niezależny od API/CLI, z mniejszymi odpowiedziami AI i bez utraty czasów słów.

**Architecture:** wydzielić istniejący walidator QC do współdzielonego modułu i użyć w zapisach zwykłych rolek oraz QC. Kontrakt v2 redakcji przenosi tekst i grupowanie przez referencje do słów istniejącej rewizji, bez zwracania timestampów i trackingu; stary format odpowiedzi pozostaje walidowanym adapterem zgodności.

**Tech Stack:** obecny Node/ESM, Zod i node:test; bez nowych zależności.

**Spec:** `docs/superpowers/specs/2026-10-18-quality-managed-service-design.md`, z korektą użytkowniczki z 18.10: zachować lokalne CLI/konta i nie wymuszać API.

## Global Constraints

- Bez płatnych wywołań API i fallbacku, bez usuwania CLI, bez publikacji i commitów.
- Zachować bieżące prywatne projekty i niezacommitowane preferencje Happy News.
- Ten etap wdraża fundament Q1/Q2, nie deklaruje ukończenia centralnej usługi, detektorów i pełnego odbioru opraw.
- Lokalny katalog zawiera prywatne źródła do testów; pracujemy w nim na gałęzi `codex/quality-contracts`, bez resetowania plików.
- UI zachowuje aktualny wygląd; formularz QC otrzymuje tylko selektor zakresu poprawki. Nie zaostrzać dowolnie dozwolonej ręcznej edycji unbranded stylu.
- Tworzenie/edycja własnego brandingu pozostają; wyższy pakiet dla odbiorców jest kierunkiem przyszłego billing. CLI jest wspierane także dla zespołu wewnętrznego firmy. Ten etap nie dodaje fikcyjnego paywalla ani nie ogranicza obecnego lokalnego panelu.

## Review Focus

- Nieznane/powtórzone referencje i niepełne grupowanie mają zostać odrzucone bez zapisu.
- SkyClass zachowuje wszystkie słowa/segmenty, Bisanz wyłączony zoom również przy `style=brand`.
- Zmiana tekstu zachowuje stamp, kolor, koniec i inne metadane; referencje obowiązują tylko dla bieżącej rewizji.
- Brak logowania/limit CLI nie prowadzi do API; wszystkie transporty używają jednego kontraktu.
- Błędna struktura wyniku ani kadru nie zastępuje dobrego draftu, zwykłe i QC zapisy zachowują 409.

### Task 1: wspólny walidator edycji

**Files:** Create `scripts/reel-validation.mjs`, `scripts/reel-validation.test.mjs`; Modify `ui/reel-store.mjs`, `ui/quickcontent-server.mjs`; Test `ui/reel-store.test.mjs`, `ui/quickcontent-server.test.mjs`.

**Interfaces:** `validateReelEdit(before, after, {lockStyle=true}={}) -> void`, błędy z `status=400`. Obejmuje dotychczasowe sprawdzenia QC oraz zoom Bisanza. Ręczna edycja zwykłej rolki bez brandingu dopuszcza zmianę stylu; QC i branding blokują ją jak dotąd.

- [x] Dopisać testy odrzucenia zmienionych czasów, duplikatów, przekroczenia zakresów, SkyClass, Bisanza; test zapisu zwykłej rolki zachowujący plik po błędzie.
- [x] Uruchomić nowe testy; oczekiwany FAIL przed implementacją.
- [x] Wydzielić i wpiąć walidator; unikać zmiany logiki historycznego 409.
- [x] Uruchomić testy walidatora/store oraz istniejące testy QC; oczekiwany PASS.

### Task 2: kompaktowa odpowiedź AI i ochrona danych

**Files:** Modify `scripts/quickcontent-edit.mjs`, `scripts/quickcontent-edit.test.mjs`, `ui/quickcontent-server.mjs`.

**Interfaces:** `montageRequest(data, template, message, {scope="full"}={})` generuje v2 tylko przy jawnym `scope="captions"`. Domyślny pierwszy montaż i zwykły czat zachowują obecne funkcje. `applyEditResult(before, result)` przyjmuje v2 i starsze odpowiedzi. v2: `version:2`, `summary`, `wordEdits:[{wordId,text}]`, `groups:null|[{wordIds,keyWordId}]`; nie dopuszcza modyfikacji innych danych. Referencje `wN` obowiązują wyłącznie w tej rewizji. Nowy plik `scripts/reel-edit-compact.mjs` zawiera schemat, kontekst i adapter. `editScope` przechodzi z formularza QC przez typy API i trwały payload do montażu, niezależnie od dostawcy. Pełne wytyczne pozostają w wejściu do czasu ręcznej kodyfikacji. Cały montaż pozostaje domyślnym zakresem, żeby polecenia dotyczące kadru/grafik nie stały się pozornie udanymi zmianami samego tekstu.

- [x] Testy: poprawka jednego słowa, pełność/kolejność grup, duplikaty/obce ID, metadane, brak timestampów/framing/dużego JSON w żądaniu, zgodność legacy i błąd null.
- [x] Uruchomić testy i zobaczyć FAIL dla v2.
- [x] Zaimplementować schemat v2 i adapter do niezmienionego draftu; zweryfikować przez wspólny walidator.
- [x] Uruchomić testy edycji, transportów kont/API i usług QC; oczekiwany PASS bez rzeczywistych requestów.

### Task 3: lokalna kontrola i odbiór etapu

**Files:** Create `scripts/reel-check.mjs`, `scripts/reel-check.test.mjs`, `docs/quality/acceptance.md`; Modify `package.json`, `PANEL.md`.

**Interfaces:** `npm run reel:check -- <nazwa>` sprawdza strukturę istniejącego draftu przez wspólną walidację bez AI i zmian plików; opcjonalne `--before <ścieżka>` sprawdza zgodność edycji z wcześniejszym JSON. Nie deklaruje oceny wizualnej/pełnej zgodności z Markdown.

- [x] Testy procesu CLI: sukces, błędne dane, porównanie ze wcześniejszą wersją, brak mutacji. Oczekiwany FAIL przed dodaniem entrypointu.
- [x] Dodać minimalny CLI i instrukcję zachowania trybów kont; bez importowania serwera i kluczy.
- [x] `npm test`, `npm run lint`, build panelu; oczekiwany PASS. Testy procesów/portów wymagają odpowiednich uprawnień środowiska.
- [x] Osobny review diffu, poprawki ważnych uwag i dokumentacja rzeczywistych dowodów/ograniczeń.

## Postęp i decyzje

- Wykonanie w tej sesji: użytkowniczka poleciła zacząć; nie żądamy ponownej zgody na ten sam odwracalny zakres.
- Baseline w sandboxie blokuje porty i odczyt procesów; ponowiono te same testy z wymaganym dostępem. Wynik w raporcie odbioru.
- Przyszłe etapy: profile reguł i fonty/emotki, wspólny operator zwykłych rolek, kontrola obrazu oraz usługa. Nie są oznaczane jako wdrożone tym etapem.
- Ruling: v2 najpierw dla jawnej korekty napisów, pełny montaż i pozostały czat nadal v1 — zachowujemy funkcje istniejących poleceń kadrowania/grafik do czasu wdrożenia ich typowanych operacji i odbioru wizualnego. Koszt: pozostałe zadania nadal mają większy kontrakt.

- Odbiór tego etapu: `docs/quality/acceptance.md`. 467 testów (466 PASS, 1 SKIP), lint/build PASS, 29/29 lokalnych draftów. Mały rzeczywisty test Codex PASS bez API; duży narzut wejścia CLI jawnie opisany w odbiorze.
