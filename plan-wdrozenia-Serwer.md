# Wersja serwerowa i wspólna jakość — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** uruchomić kontrolowaną usługę montażu i tanich poprawek, z własnym brandingiem oraz zachowanym lokalnym CLI zespołu.

**Architecture:** jeden wspólny silnik/kontrakty dla lokalnych adapterów i usługi. Obecny frontend, samodzielne API Node, PostgreSQL, prywatny storage i osobny worker; najpierw macOS, Linux dopiero po odbiorze zgodności.

**Tech Stack:** React/Vite, Remotion, Node/ESM, Zod, node:test; planowane PostgreSQL, storage S3-compatible i OIDC. Dokładne biblioteki/hostingi wybierać w fazie integracji; nie dodawać kilku równoległych systemów kolejek.

**Spec:** [założenia](zalozenia-funkcji-Serwer.md), [projekt szczegółowy](docs/superpowers/specs/2026-10-18-quality-managed-service-design.md), [wdrożenie/operacje](docs/server/wdrozenie.md).

Aktualizacja zakresu 2026-10-19: użytkowniczka odkłada publikację Vercela, konfigurację backendu i Supabase. Realizujemy lokalne F3/F4; wymagania infrastruktury zapisano [osobno](docs/server/odlozone-uruchomienie.md). F5–F8 pozostają odłożone, bez zakupów/provisioningu.

Data: 2026-10-18. To plan prac, nie zapis wykonanego deployu. Wszystkie wskazane poniżej nowe pliki i interfejsy są **planowane**, dopóki rejestr odbioru nie poda implementacji i dowodu. Komendy nowych testów wykonuje się po dodaniu ich w danej fazie.

## Global Constraints

- Zachować lokalny panel, CLI/Terminal, Codex/Claude na kontach oraz account-only dla właścicielki i zespołu. Brak automatycznego płatnego fallbacku.
- Zachować tworzenie własnego brandingu; wyższy pakiet dotyczy usługi, nie blokuje lokalnego repo. Model nie zmienia przypiętego profilu bez jawnej operacji.
- Jeden kontrakt i renderer dla wszystkich transportów; nie przepisywać Remotion ani obecnego panelu.
- Nie resetować prywatnych projektów i cudzych zmian. Żadnych automatycznych commitów, push, zakupu i deployu w zadaniach z GUI.
- Rewizje/409, historyczne wyniki, wybór QC, 1:1 SkyClass, skala 1 Bisanz i ostatnie zasady Happy News obowiązują w każdej fazie.
- Usage trwale przed walidacją odpowiedzi; retry renderu bez ponownej redakcji. Nieznany koszt lub krytyczna kontrola to `unknown`.
- Publiczny build ma allowlistę zasobów, organizacje są izolowane, użytkownik nie przesyła wykonywalnego kodu stylu.
- Pilot: 1 ciężkie zadanie globalnie, zaproszenia, kontrola człowieka. Równoległość, billing publiczny i automatyzacja dopiero po osobnych bramkach.

## Review Focus

- Stary JSON i brakujące zasoby: migracja jawna, poprzedni MP4 dostępny; brak cichej zmiany fontu lub klienta (F1/F2/F7).
- Jedna poprawka po równoległej edycji: 409 bez utraty draftu i bez opłacenia ponownie identycznego zadania (F3/F5/F6).
- Zmiana klienta na SkyClass po cięciach: odtworzenie z mastera albo jawny brak danych, nigdy pozorna zgodność (F1/F3).
- Utrata lease/odpowiedzi API: stary worker nie publikuje, koszt pozostaje niepewny zamiast zerowania lub nieograniczonego retry (F6/F7).
- Dowolny ID/URL/font/logo z cudzej organizacji: brak dostępu, wycieku przez build/cache ani wykonania kodu (F2/F5/F8).

## Mapa faz i zależności

| Faza | Rezultat | Stan 18.10.2026 | Warunek następnej fazy |
| --- | --- | --- | --- |
| F0 | Fundament lokalny | ukończona i odebrana w zakresie F0 | nie utożsamiać z pełnym Q0–Q2 |
| F1 | Korpus i kontrakty klientów | kod i inwentaryzacja wdrożone; odbiór mediów otwarty | pełna kodyfikacja i przypisany/odebrany korpus |
| F2 | Fonty/emotki/manifest i powtarzalny render | kod lokalnego QC i próba jednego hosta; odbiór pełny otwarty | brak cichych fallbacków, próby na workerze |
| F3 | Typowane montaże i tanie poprawki | v3/QC oraz ograniczone poprawki zwykłych rolek i kont CLI; pełny etap w toku | chronione dane i koszt mierzone w każdym transporcie |
| F4 | Tracking/przebitki i kontrola obrazu | lokalny przyrost granic ujęć/raportów; pełny odbiór otwarty | zgodność z ręczną referencją, obsługa niepewności |
| F5 | Samodzielne API, organizacje i prywatne media | plan | testy izolacji oraz pełny upload/download |
| F6 | Trwała kolejka, budżet i zdalny worker | plan | restart/przejęcie bez utraty lub podwójnej publikacji |
| F7 | Zamknięty pilot na serwerze | plan | pełny odbiór, odtworzenie kopii i rollback |
| F8 | Pakiety, własny branding i publiczna oferta | plan | autoryzacja pakietów oraz potwierdzona ekonomika |
| F9 | Opcjonalny Linux i skalowanie | poza pierwszym wydaniem | parity per profil i opłacalność |

F1 → F2/F3 → F4 tworzą tor jakości (dawne Q0–Q3). F5 może być przygotowywana po ustaleniu kontraktów F1, ale nie wolno ominąć F2–F4 przy dopuszczeniu profilu do usługi. F5 → F6 → F7 → F8 to tor serwerowy (dawne C0–C2). F9 odpowiada C3. Każda faza kończy się osobnym działającym przyrostem i wpisem do odbioru; nie potrzebuje ukończenia całej usługi, żeby przyjąć jej kod.

## F0 — fundament lokalny, ukończona 2026-10-18

- [x] Wspólny `validateReelEdit`, ochrona JSON operatora panelu, mała odpowiedź v2 dla jawnego zakresu napisów QC i `reel:check`.
- [x] Testy, kontrola panelu, mały syntetyczny test konta Codex; [dowody i ograniczenia](docs/quality/acceptance.md).
- [x] Zapisać niniejsze założenia, fazy i instrukcje AGENTS.

Ponowny odbiór na polecenie wykonania F0: [raport](docs/quality/f0-odbior-2026-10-18.md). Świeże testy: 466 PASS, 1 SKIP, 0 FAIL; lint/build panelu i CLI poprawne, 29/29 istniejących draftów bez mutacji, GUI sprawdzone bez wysyłania poprawki. Nie wymagało ponownego pisania istniejącej implementacji ani nowych wywołań AI.

Nie oznaczać pełnego Q0/Q1/Q2 jako ukończonego: brak pełnych reguł, operacji, paczki zasobów i odbioru obrazu. Podział F0 jest wyłącznie nazwą zakresu pierwszego wdrożonego fundamentu.

## F1 — korpus i wersjonowane kontrakty klientów

**Files:** create `docs/quality/corpus.md`, `scripts/quality/contracts.mjs`, `scripts/quality/contracts.test.mjs`; modify `src/branding/schema.mjs`, `src/branding/types.ts`, `scripts/branding-store.mjs`, `scripts/branding-established.mjs`, `package.json`. Dane prywatnych przykładów poza Git; testy syntetyczne w repo.

**Interfaces:** `compileClientContract({clientId, brandingSnapshot, rules}) -> {version, hash, rules}`. Reguła: `id, scope, value, source, checkKind, severity`; `checkKind=data|geometry|semantic|human`, `severity=critical|advisory`. Nierozstrzygnięty konflikt uniemożliwia publikację. Snapshot kontraktu jest dodatkiem do istniejącego brandingu, nie drugim store wyglądu.

- [x] Spisać po minimum 10 oznaczonych przypadków na każdy obecny profil/klienta, oddzielić przykłady promptu/strojenie/zamknięty odbiór; zanotować brak źródła/akceptacji zamiast fabrykować referencję.
- [x] Dodać testy `client overrides general`, `latest same-scope rule wins`, `conflict blocks publication`, `old snapshot stays editable`, `SkyClass migration requires retained master` i zobaczyć FAIL.
- [x] Zaimplementować kontrakt z referencjami do aktualnych PREFERENCJE; migrację źródła prawdy uruchamiać jawnie. Rozszerzyć `npm test` o nowe katalogi testów, zachowując obecne zestawy.
- [x] `node --test scripts/quality/contracts.test.mjs scripts/branding-store.test.mjs scripts/branding-established.test.mjs` → PASS; porównać mapowany zakres zasad wszystkich profili i zapisać stan korpusu.

Wykonanie i ograniczenia: [odbiór F1](docs/quality/f1-acceptance.md), [korpus](docs/quality/corpus.md). 90 przypadków ma ID, zakres i oczekiwanie, lecz przypisanie/przegląd mediów pozostają pending. Nowe wersje zapisanych brandingów przypinają kontrakt; historyczne projekty i szablony bez brandingu nie są automatycznie migrowane. `coverage=partial` nie oznacza automatycznej zgodności ze wszystkimi PREFERENCJE. Dopięcie pozostałych wejść należy do F3; bramka pełnego korpusu pozostaje otwarta.

## F2 — zasoby i manifest renderu

**Files:** create `scripts/quality/manifest.mjs`, `scripts/quality/assets.mjs`, `scripts/quality/manifest.test.mjs`, `scripts/quality/assets.test.mjs`; modify `src/fonts.ts`, `src/branding/fonts.ts`, `src/WordEmoji.tsx`, `scripts/branding-assets.mjs`, `scripts/quickcontent-render.mjs`, `src/Reel.tsx`; add renderer fixtures in `tests/quality/`.

**Interfaces:** `createRenderManifest({orgId, reelRevision, inputs, contract, assets, runtime, output, seed}) -> {manifestVersion:1, signature, ...}`; `verifyManifestAssets(manifest, readAsset) -> {status:pass|fail|unknown, issues}`. Każdy asset: `id, sha256, mime, byteLength`; runtime: build SHA/digest, OS/arch, Node, Remotion, Chromium, FFmpeg i wersja detektora. Nowy manifest uzupełnia dotychczasowy podpis renderu.

- [ ] Dodać RED dla brakującego fontu, różnego hasha, braku polskiego glifu, cudzej ścieżki, podwójnej dekoracji i niezmiennej starej wersji. Dodać klatki długich słów/emotek na krawędzi wiersza.
- [ ] Zaimplementować preflight przed AI/renderem, jeden zapis dekoracji i deterministyczne kotwice; jawny wariant zastępczy wymaga nowego profilu, nie fallbacku systemowego. Nie pobierać ruchomych zasobów w renderze.
- [ ] `node --test scripts/quality/manifest.test.mjs scripts/quality/assets.test.mjs scripts/quickcontent-render.test.mjs` → PASS. Renderować te same klatki poza kolejnością i przy różnych concurrency, porównać obraz/audio na dwóch zatwierdzanych workerach tej samej klasy.
- [ ] Przed porównaniem przypiąć tolerancje obrazu/audio i hash zestawu wzorcowego w `docs/quality/corpus.md`; bez tego nie odblokowywać serwerowego profilu. Zapisać prawa/dostępność zasobów jako warunek dopuszczenia, bez cichej podmiany Happy News.

Wdrożony przyrost i otwarte bramki F2: [raport](docs/quality/f2-acceptance.md). Checkboksy pełnego etapu pozostają otwarte: pojedynczy host nie zastępuje dwóch workerów ani paczki zasobów.

## F3 — wspólne operacje redakcji i oszczędne poprawki

**Files:** create `scripts/quality/edit-operations.mjs`, `scripts/quality/dependencies.mjs`, ich `.test.mjs`, `docs/quality/model-benchmark.md`; modify `scripts/quickcontent-edit.mjs`, `scripts/reel-edit-compact.mjs`, `scripts/quickcontent-ai.mjs`, `scripts/quickcontent-costs.mjs`, `ui/server.mjs`, `ui/quickcontent-server.mjs`, `ui/Inspector.tsx`, `ui/lib.mjs`.

**Interfaces:** `applyEditOperations({before, baseRevision, operations, contract}) -> {data, invalidatedStages}`; `planRecompute(before, after) -> stages[]`. Dozwolone typy v3: `replaceWordText`, `regroupCaptions`, `setHookText`, `selectWordRange`, `selectAsset`. Osobne operacje ręczne wyglądu/kadru bez AI. V2 pozostaje adapterem bieżącej rewizji; trwałe ID wymagają mapy do mastera i short-source. Walidator nadal sprawdza cały wynik.

- [ ] Dodać RED: obce/stare ID i 409, utrata przeczenia, usunięcie chronionego hooka, naruszenie SkyClass, ręczny kolor/kadr/rozdzielczość = 0 LLM, zmiana treści unieważnia opis, zoom nie unieważnia opisu, retry renderu = 0 redakcji.
- [ ] Zaimplementować operacje i zależności, scalić zwykły operator z kontraktami QC bez usuwania transportów kont; zachować walidowany adapter historycznych danych. Nie zamieniać dowolnej prośby o film w pozorny sukces samego tekstu.
- [ ] `node --test scripts/quality/edit-operations.test.mjs scripts/quality/dependencies.test.mjs scripts/quickcontent-edit.test.mjs scripts/quickcontent-ai.test.mjs ui/reel-store.test.mjs` → PASS.
- [ ] Na zamkniętym korpusie mierzyć wszystkie próby modeli minimum 3 razy: jakość, input/output/cache/reasoning, retry, koszt zaakceptowanego materiału. Płatny benchmark dopiero w jawnie ustalonym budżecie. Budżety kontekstu z projektu są celami pomiaru, nie limitem obcinającym sens. Nie ekstrapolować tokenów CLI na cenę API.

Wdrożony przyrost i pozostały zakres F3: [raport](docs/quality/f3-acceptance.md), [benchmark](docs/quality/model-benchmark.md), [konkretny punkt wznowienia](docs/quality/next-stage.md).

## F4 — ujęcia, tracking, przebitki i kontrola obrazu

**Files:** create `scripts/quality/media-check.mjs`, `scripts/quality/geometry-check.mjs`, ich `.test.mjs`; modify `scripts/quickcontent-portrait.mjs`, `scripts/quickcontent-speaker.mjs`, `src/quickcontent/framing.mjs`, `src/quickcontent/layout.mjs`, `src/quickcontent/HappyNewsSource.tsx`, `scripts/quickcontent-render.mjs`; test existing portrait/speaker/render modules.

**Interfaces:** `checkGeometry({manifest, observations, frameBounds}) -> QualityReport`; `checkMedia({manifest, probe, samples}) -> QualityReport`; raport: `checkVersion, manifestSignature, status:pass|fail|unknown, findings:[{ruleId,severity,frameRange,evidence}]`. Obserwacje zawierają shotId i mapę PTS/klatki; granic ujęć nie wyznacza tekstowy model.

- [ ] Dodać RED i ręczne referencje: duo/ekran, zbliżenie, zmiana zdjęcia, krótka utrata twarzy, VFR, skok przez cięcie, Bisanz skala 1, SkyClass wycinek od mastera >0, brak audio/uszkodzony plik.
- [ ] Ograniczyć tracking do ujęcia; zastosować wygładzenie/martwą strefę i limit ruchu ustalony na korpusie. Niepewność oznaczać do przeglądu; ręczny kadr wyłącza tracking. Sprawdzać safezone i obrys całej animacji.
- [ ] `node --test scripts/quality/media-check.test.mjs scripts/quality/geometry-check.test.mjs scripts/quickcontent-portrait.test.mjs scripts/quickcontent-speaker.test.mjs scripts/quickcontent-render.test.mjs` → PASS.
- [ ] Obejrzeć i odsłuchać prawdziwe filmy; granice ujęć sprawdzić co najmniej ±2 klatki, ekstremalne pozycje i wejścia dekoracji. `unknown` w krytycznej regule nie dostaje automatycznego wydania. Wpisać wyniki do korpusu i rejestru profili.

Lokalny przyrost 2026-10-19: [odbiór F4](docs/quality/f4-acceptance.md), [zwykłe rolki F3](docs/quality/f3-local-2026-10-19.md). Pełny miernik animacji i odbiór mediów nadal otwarte.

## F5 — produkcyjne API, organizacje i prywatne media

**Files:** create `server/index.mjs`, `server/api.mjs`, `server/auth.mjs`, `server/store.mjs`, `server/storage.mjs`, `server/migrations/001_core.sql`, `server/auth.test.mjs`, `server/storage.test.mjs`, `vite.service.config.mjs`; modify `ui/api.ts`, `ui/quickcontent-api.ts`, `ui/branding-api.ts`, `package.json`. Zachować lokalną wtyczkę `ui/server.mjs` jako adapter, wydzielając wspólne usługi zamiast kopiowania reguł.

**Interfaces:** `createServiceApi({store, storage, authenticate, engine}) -> Node request handler`; `authorize(actor,{orgId,resource,action}) -> void`; `beginUpload(actor,{projectId,bytes,checksum,mime}) -> {assetId,parts,expiresAt}`; `completeUpload(actor,{assetId,parts}) -> asset`. OIDC walidowany na serwerze, sesja w bezpiecznym cookie; ochrona CSRF dla mutacji.

- [ ] RED: użytkownik organizacji A nie odczytuje/zmienia ID projektu/profilu/jobu/assetu B; to samo dla cache i podpisanego linku; viewer nie edytuje; ograniczony pracownik serwisu nie uzyskuje globalnego dostępu.
- [ ] Wydzielić API bez Vite, wdrożyć migrację według modelu z runbooka, sesje/role i upload w częściach z checksum/limitem. Kontrola SSRF dotyczy każdego przekierowania i adresu importu. Dla istniejącego lokalnego API zachować adapter zgodności.
- [ ] Dodać RED i implementację bezpiecznego builda usługi: `npm run build:service` musi tworzyć `dist-service` z allowlistą bez prywatnego `public/`. Prywatne media renderować ze storage do workspace joba, nie wystawiać statycznego dysku.
- [ ] `node --test server/auth.test.mjs server/storage.test.mjs` → PASS, `npm run build:service` bez wycieku. Prawdziwy upload/pobranie w dwóch sesjach organizacji; wygaśnięty link i niepełny multipart odrzucone.

## F6 — trwałe joby, budżety i zarządzany worker

**Files:** create `server/jobs.mjs`, `server/budgets.mjs`, `server/worker.mjs`, `server/migrations/002_jobs_budget.sql`, `server/jobs.test.mjs`, `server/budgets.test.mjs`; modify `scripts/quickcontent-worker.mjs`, `scripts/quickcontent-ai.mjs`, `scripts/quickcontent-costs.mjs`, `scripts/quickcontent-render.mjs`, `scripts/quickcontent-cli.mjs`. Wydzielić wspólny executor, nie utrzymywać dwóch wersji pipeline'u.

**Interfaces:** `enqueueStage({actor,projectId,revision,stage,inputSignature,idempotencyKey}) -> job`; `claimJob(workerId) -> {job,leaseUntil,fencingToken}|null`; `checkpointJob({jobId,fencingToken,checkpoint})`; `publishResult({jobId,fencingToken,manifestSignature,assetId})`; `reserveBudget({orgId,jobId,attemptId,maxCost}) -> reservation`; `recordAttempt({reservation,responseId,usage,status})` przed walidacją wyniku. Kwoty w integer microUSD, nie float; `unknown` oddzielnie od 0.

- [ ] RED: dwa równoległe enqueue jednego etapu tworzą jeden job, globalny limit 1 działa między procesami, wygasły token nie zapisuje wyniku, restart po checkpoint nie ponawia AI, niepewna opłata nie zwalnia rezerwacji do zera.
- [ ] Wdrożyć transakcyjny outbox/lease/fencing w PostgreSQL, unikalność etapów i deduplikację usage. Heartbeat odnawia tylko aktualną dzierżawę. Oddzielić retry opisu/renderu/redakcji oraz anulowanie własnych procesów.
- [ ] Uruchomić engine w prywatnym katalogu roboczym joba na zarządzanym Macu, z ograniczeniami procesu/dysku/czasu. Worker pobiera tylko potrzebne pliki i nie korzysta z prywatnego repo operatora. Publiczny SaaS używa API, lokalny CLI konta pozostają bez fallbacku.
- [ ] `node --test server/jobs.test.mjs server/budgets.test.mjs scripts/quickcontent-worker.test.mjs scripts/quickcontent-costs.test.mjs scripts/quickcontent-cli.test.mjs` → PASS. Na rzeczywistym stagingu zabić worker przed/po zapisie odpowiedzi i MP4, przejąć job, potwierdzić jeden aktualny wynik i jawne naliczenie prób.

## F7 — zamknięty pilot, przegląd i operacje

**Files:** create `server/review.mjs`, `server/review.test.mjs`, `scripts/service-migrate.mjs`, `scripts/service-migrate.test.mjs`, `ops/service.env.example`, `ops/worker-macos.plist.example`, `ops/release-manifest.json`; extend `ui/Inspector.tsx`, existing project/reel views, `docs/server/wdrozenie.md`, `docs/server/acceptance.md`.

**Interfaces:** `reviewRevision({actor,projectId,revision,manifestSignature,decision,evidence}) -> review`; `importLocalProject({actor,archive,dryRun}) -> {mapping,missingAssets,conflicts}`. Decyzja dotyczy dokładnej rewizji/manifestu i traci aktualność po zmianie.

- [ ] RED: akceptacja poprzedniej rewizji nie wydaje nowej, krytyczne fail/unknown blokuje finalny eksport, przegląd ma aktora i dowód, import nie nadpisuje istniejących profili/MP4 ani nie uznaje brakującego mastera za obecny.
- [ ] Wdrożyć kolejkę przeglądu, osobny stan renderu i kontroli, metryki kosztu/czasu/eskalacji oraz audyt dostępu serwisu. Import najpierw dry-run, potem kopia i mapowanie lokalnych ID na organizację; źródła zostają lokalnie.
- [ ] Wykonać staging według runbooka: TLS, allowlista builda, osobne sekrety/DB/storage, rzeczywisty Mac preflight, minimalny zakres ról. Przed zakupem uzupełnić decyzje z rejestru.
- [ ] `node --test server/review.test.mjs scripts/service-migrate.test.mjs` → PASS; następnie `npm test`, `npm run lint`, oba publiczne buildy i build lokalnego panelu. Przejść pełne GUI: upload, prawdziwy YouTube, wybór QC, montaż, korekta, render, opis/pobranie i powrót po zamknięciu karty.
- [ ] Odtworzyć DB i powiązane assety z kopii w oddzielnym środowisku, przetestować wycofanie runtime i klienta. Na Mac/Windows/Linux jako przeglądarkach pobrać ten sam zapisany MP4; checksum identyczny. Sprawdzić też lokalny account-only po zmianach serwerowych.
- [ ] Dopuścić wyłącznie profile z odbiorem; pilot na zaproszenia i z pełnym przeglądem filmów. Wpisać dowody, koszty p50/p95 i otwarte ograniczenia, bez ogłaszania całej usługi za gotową na podstawie fixtures.

## F8 — pakiety i publiczne udostępnienie

**Files:** create `server/entitlements.mjs`, `server/billing.mjs`, `server/migrations/003_entitlements.sql`, `server/entitlements.test.mjs`, `server/billing.test.mjs`; modify `ui/branding-server.mjs`, UI brandingu i oferty, `docs/business/` oraz runbook. Dostawcę płatności wybrać dopiero po ustaleniu ceny, kraju rozliczenia i obsługi faktur.

**Interfaces:** `canUseFeature({actor,orgId,feature}) -> {allowed,reason}` z `feature=customBranding`; `applyBillingEvent({provider,eventId,payload})` idempotentnie ustala wersję uprawnień. Uprawnienia pracownika i lokalnego repo są oddzielone od zakupionego planu organizacji.

- [ ] RED: odmowa customBranding po API mimo zmienionego UI, dostęp po aktywacji wyższego planu, duplikat/out-of-order webhook nie cofa uprawnień, downgrade nie kasuje profili/projektów/MP4, viewer nie zyskuje prawa edycji przez zakup ownera.
- [ ] Wdrożyć serwerowe uprawnienia i limity; ekran własnego stylu zachowuje fonty/logo/materiały/presety, bez uploadu wykonywalnego kodu. Przy obniżeniu planu zachować historyczne pobrania, blokować nowe montaże wymagające niedostępnej funkcji, jasno podać przyczynę.
- [ ] `node --test server/entitlements.test.mjs server/billing.test.mjs` → PASS; odbiór płatności w środowisku testowym i ponowny sprawdzian braku wpływu na lokalny CLI. Nie uruchamiać rzeczywistych obciążeń w ramach testu.
- [ ] Potwierdzić ceny i limity z rzeczywistym kosztem przeglądu/renderu/transferu, zasady danych, dostępność profili i obsługę incydentów. Dopiero wtedy przełączyć główną ofertę na usługę; instalację wewnętrzną nadal dokumentować.

## F9 — opcjonalny Linux i większa skala

Osobny plan po F7: zastąpić zależności Vision/CoreText, przypiąć obraz/architekturę, wykonać ten sam zamknięty korpus per profil i pomiar ekonomiczny. Dopiero po zgodności dodać workery i zwiększyć limity. Nie deklarować parytetu na podstawie samego uruchomienia FFmpeg/Remotion. Nie blokuje pilota na zarządzanym macOS.

## Zasada zamknięcia fazy

Aktualizować [rejestr odbioru](docs/server/acceptance.md): co jest wdrożone, testy i rzeczywiste próby, znane ograniczenia, następny krok. W trakcie implementacji stosować RED→GREEN dla nowej logiki, odpowiednie testy i review. Checkboksy zaznaczać wyłącznie po wykonaniu; commit/push/deploy zależą od autoryzacji w danej sesji, nie od samego istnienia planu.

Przyrost F4 2026-10-20: [skan geometrii w rzeczywistym rendererze](docs/quality/f4-geometry-2026-10-20.md), jawnie oddzielony od szybkiej kontroli źródła. Obrys układu, inwentarz i powiązanie z wersją wdrożone; pełne piksele/twarze nadal otwarte. [Kolejny lokalny etap](docs/quality/next-stage.md).

Przyrost F4 raster 2026-10-20: [opcjonalny pomiar alfa](docs/quality/f4-pixels-2026-10-20.md) zamiast estymacji glifów z układu. Dwa Important review odtworzone i poprawione. Pełne mapowanie twarzy/PTS, odbiór profili i infrastruktura pozostają otwarte.
