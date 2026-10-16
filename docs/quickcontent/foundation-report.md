# QuickContent — fundament (2026-10-14)

Zaimplementowano schemat v1, jawny rejestr siedmiu istniejących stylów, trwały magazyn projektów/jobów/zdarzeń oraz jedną kolejkę QuickContent. Ten raport dotyczy fundamentu, nie jest odbiorem całej funkcji ani dowodem działania YouTube/Whisper/renderu produkcyjnego.

## Interfejsy

`createStore(root)` jest synchroniczną fabryką; wszystkie metody zwracają Promise: `createProject(input)`, `getProject(id)`, `listProjects()`, `mutateProject(id, expectedRevision, syncUpdate)`, `updateProject(id, syncUpdate)`, `saveJob(job)`, `getJob(id)`, `listJobs()`, `appendEvent(jobId,event)`, `loadEvents(jobId,after)`, `getTemplates(clientId?)`, `projectDirectory(projectOrId)`, `safePath(path,{mustExist?})`. `root` i `dataDir` są właściwościami. `updateProject` jest wewnętrznym zapisem pod blokadą; interfejs HTTP musi używać wymaganego `expectedRevision` i `mutateProject`. Konflikt ma `statusCode/status = 409`.

Wejście projektu: `sourceKind`, `url` albo `uploadId`, opcjonalny `clientId`, `templateId`, `focus`, `duration`, `resolution`. Domyślnie bez klienta, persona, Auto, 30–60 s, 1080p. Nieznane pola wejścia są odrzucane. Zapisane manifesty zachowują kontrolowane pola boczne pipeline (m.in. transcript, batches, dataDir). Wybór nie może wskazywać obcego kandydata. Projekt zawiera snapshot preferencji ogólnych/klienta, szablonu i hash kodu stylu. Raw ASR nie zawiera brandingu.

`createWorker({root,store,handlers,isBusy?,acquire?})` jest synchroniczną fabryką. Metody: `enqueue(kind,payload,{idempotencyKey?})`, `cancel(id)`, `retry(id)`, `recover()`, `close()`. `payload.projectId` jest wymagany; kandydat/partia są opcjonalne. `acquire(job)` zwraca funkcję release albo null. Null pozostawia job w kolejce, a release następuje również po błędzie/anulowaniu. Serwer łączy ten hook ze wspólnym limitem istniejących zadań.

Handler otrzymuje `ctx = {root,store,jobId,signal,checkpoints,report,checkpoint,runTool}`. `report` obsługuje stage, progress null lub 0–1, completedUnits, totalUnits. `checkpoint(name,artifactPaths)` publikuje etap dopiero po sprawdzeniu plików i hashów SHA-256 liczonych strumieniowo. Przy retry `ctx.checkpoints` zawiera tylko istniejące, niezmienione artefakty.

`runTool(executable,args,{cwd?,env?,maxBuffer?,maxOutputBytes?,onLine?,onStdout?,onStderr?})` używa shell:false. Nie zapisuje argumentów ani środowiska w rejestrze procesów. Bufory i niezamknięte linie mają limit (domyślnie 1 MiB na strumień), a odpowiedź informuje o truncation. Niezerowy exit odrzuca Promise z nazwą programu i ograniczoną końcówką stderr. Kod 0 zwraca exitCode/stdout/stderr/outputTruncated. `onLine(line,stream)` służy pomiarom dostępnym z rzeczywistego narzędzia.

Kanoniczny status sukcesu joba: **completed**. Pozostałe: queued, running, failed, cancelled, interrupted, blocked. AnalysisRun ma własny status, niezależny od Job.

## Trwałość i procesy

Manifesty: `.quickcontent/projects`; kolejka: `.quickcontent/jobs`; zdarzenia z rosnącym kursorem: `.quickcontent/events`. Zapis do nowego pliku tymczasowego, fsync i rename nie czyta pozostawionych `.tmp` po awarii. Rewizje i zdarzenia są serializowane w procesie panelu. Dane prywatne i foldery klientów QuickContent dodano do `.gitignore`.

Kolejka działa w procesie panelu, a każde narzędzie ma osobny nadzorujący subprocess Node z wyłączną grupą procesów. Rozłączenie IPC rodzica zamyka jego grupę (TERM, następnie KILL). Rejestr zapisuje PID, tożsamość startu/komendy z ps, losowy token i właściciela. Recovery nigdy nie zabija procesu tylko na podstawie starego PID. Żywy właściciel wyłącznej blokady nie może być przejęty; brak możliwości sprawdzenia tożsamości zatrzymuje operację. Przeżyły rozpoznany proces blokuje retry zamiast uruchomić duplikat. Master i zakończone inne wyniki pozostają.

Ograniczenia: model jest lokalnym pojedynczym procesem panelu, nie usługą wieloserwerową. Narzędzia nie mogą samodzielnie daemonizować się do obcej sesji/grupy; zatwierdzone CLI FFmpeg/Whisper/Remotion pracują jako dzieci nadzorowanej grupy. Stan blocked wymaga wyjaśnienia poprzedniego żywego procesu i ponownego odzyskania; worker nie oferuje przycisku wymuszającego zabicie dowolnego PID. Zdarzenia zapisujemy jako atomowy JSON; przy wielu godzinach bardzo częstych raportów należy ograniczać raportowanie, a ewentualny dziennik strumieniowy wdrożyć dopiero po pomiarze.

## Dowody

- TDD: pierwsze uruchomienia store i worker zakończyły się ERR_MODULE_NOT_FOUND przed powstaniem modułów; dodatkowe testy ujawniły brak updateProject, hooka acquire, rzucania błędów nonzero exit i flagi truncation. Dodano implementację i sprawdzono ponownie.
- `node --test scripts/quickcontent-store.test.mjs scripts/quickcontent-worker.test.mjs`: **20/20 PASS**. Obejmuje restart store, konflikt rewizji, równoległe zapisy, walidację, symlink/traversal, pozostawiony tmp, trwałe kursory, gotowość/snapshot, idempotency, kolejkę, retry poprawnego/zmienionego checkpointu, cancel całego drzewa narzędzia, obcy PID, żywą blokadę, limit logów, wspólny zasób, heartbeat i zamknięcie.
- Prawdziwe lokalne procesy: SIGKILL rodzica w etapie video/render i SIGTERM podczas transcribe zakończyły narzędzie; recovery ustawiło interrupted, retry wykonało handler dokładnie raz. Testy sprawdzały procesy poza ograniczeniem sandboxa, które blokuje ps.
- Jawny ESLint schema/store/worker i ich testów: **PASS**.
- Pełne `npm test` w trakcie integracji: **129/129 PASS**. To stan sprawdzenia przed dodaniem końcowego testu heartbeat; finalny odbiór repo należy do raportu zbiorczego.
- `npm run lint` w trakcie integracji: **FAIL** typów `ui/App.tsx(403)` — brak właściwości quickContent w Props Inspector. Dodatkowo 24 istniejące ostrzeżenia unused eslint-disable w src/studio/jeep-grand. Nie zmieniano cudzych plików w ramach tego zadania; wynik wymaga sprawdzenia po zakończeniu integracji.

Bez nowych zależności, commitów i publikowania. Pominięto pomiary prawdziwego długiego mastera, prawdziwe pobranie YouTube i ocenę jakości ASR; testy fundamentu tego nie potwierdzają.
