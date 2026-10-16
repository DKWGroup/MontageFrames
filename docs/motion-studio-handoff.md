# Motion Studio — stan i przekazanie

Data weryfikacji: 2026-10-13 (CEST). Stan lokalny, bez commita/pusha/deployu. Motion Studio jest dodatkowym widokiem obok istniejącego montażu; pliki klientów nie są zakresem refaktoru.

## Co sprawdzono

- `npm test`: 57 testów, 57 passed, 0 failed, 0 skipped.
- `npm run lint`: exit 0; TypeScript bez błędów; 24 wcześniejsze ostrzeżenia unused eslint-disable w `src/studio/jeep-grand/` pozostały bez zmian.
- `npx --no-install vite build`: exit 0. Pozostają ostrzeżenia dotyczące `use client` w Remotion Player i rozmiaru chunka. To nie jest audyt wydajności ani test wdrożenia produkcyjnego.
- Rzeczywiste rendery `motion-proof` w 9:16, 16:9 i 1:1: H264, yuv420p, zakres tv, 30 fps, 270 klatek = 9 s obrazu. Kontener 9.002 s z powodu długości strumienia AAC, nie dodatkowej klatki wideo.
- Wymiary: 1080×1920, 1920×1080, 1080×1080. Audio jest obecne. Pomiar gotowego MP4: -14.00 LUFS, true peak -5.23 dBTP we wszystkich trzech formatach. Źródło audio to testowy pulse.wav, nie dowód analizy komercyjnego utworu. Beat grid jest szacowany.
- Obejrzano contact sheets wszystkich trzech formatów: tekst nie jest ucięty, marginesy zachowane. To wizualny przegląd neutralnego demo, nie zatwierdzenie materiału klienta ani trzy recenzje produkcyjne.
- Determinizm: renderStill w tej samej instancji przeglądarki dla klatek 135 → 225 → 135; oba obrazy klatki 135 mają identyczny SHA256. Dowód: `out/motion-studio/motion-proof/seek-verification.json`.
- Panel lokalny odpowiada na 127.0.0.1:3100. Sprawdzono wejście do Motion Studio, otwarcie projektu i render przez przycisk; endpoint zadania zwrócił done wraz z plikami. Samo otwarcie widoku nie uruchamia płatnego AI. Powrót do biblioteki rolek nie usuwa widoku starego montażu.
- Ponowne obliczenie SHA256: 11 chronionych plików identycznych z `/tmp/montageframes-motion-protected-sha256.json` oraz snapshotem początku kontynuacji. Nie resetowano istniejących zmian użytkowniczki.

## Poprawki wykonane w tej kontynuacji

1. **Origin nowych endpointów.** `ui/motion-server.mjs`: mutacje z podanym Origin innym niż dokładny HTTP origin panelu otrzymują 403 przed odczytem danych/uruchomieniem pracy. Istniejący X-Panel nadal wymagany. Dodano `tests/motion-origin.test.mjs`: obcy origin, null, inny localhost i prawidłowy origin. RED: trzy przypadki nie przechodziły; GREEN: wszystkie cztery przechodzą. Sprawdzono również realne HTTP 403 w uruchomionym panelu. Nie zmieniano zabezpieczeń starych endpointów poza zakresem Motion Studio.
2. **Samodzielne źródła ZIP.** `scripts/motion-source.mjs`: paczka zawiera teraz `src/index.css` i deklarację zależności tailwindcss, wymagane przez wejście kompozycji. Rozszerzono `tests/motion-source.test.mjs`; test najpierw wykazał brak CSS, a po poprawce przeszedł. Przepakowano ZIP-y wszystkich trzech formatów.
3. **Rzeczywisty test ZIP.** Pionową paczkę rozpakowano do osobnego katalogu tymczasowego i uruchomiono `remotion still ... --props=project.props.json --frame=135 --scale=0.4` z jej źródeł. Exit 0, obraz `source-archive-check.png` obejrzany. Użyto już zainstalowanych zależności repo przez symlink; nie sprawdzono instalacji od zera na innym komputerze. Nie twierdzić, że obrazy z różnych konfiguracji bundlera są bitowo identyczne; zgodność pojedynczej klatki w obrębie tego samego renderera sprawdzono osobno.

## Używanie

1. Otwórz http://127.0.0.1:3100/ i kliknij **Motion Studio**.
2. Wybierz `motion-proof`, aby zobaczyć test z muzyką, albo `motion-demo`, aby zobaczyć neutralny przykład bez audio. Nowy film tworzy osobny storyboard; nie używaj sluga istniejącego projektu do przypadkowego nadpisania.
3. Uzupełnij brief i prawdziwe materiały: logo, lokalny font, zdjęcia/screenshots, muzykę z prawami. Edytuj tekst i czas w storyboardzie/JSON, zapisz projekt.
4. Render szkicu MP4 działa bez ocen produkcyjnych. Poster/contact sheet to kontrola klatek, nie MP4.
5. Final jest zablokowany do trzech rzeczywistych recenzji ≥8/10. Zmiana treści/źródeł/assetów unieważnia wcześniejsze zgody. Nie wpisywać fikcyjnych ocen dla odblokowania.
6. Opcjonalny przycisk AI korzysta z operatora skonfigurowanego w Ustawieniach. Nie wykonywano płatnego wywołania podczas tej weryfikacji; testy granic/odpowiedzi używają kontrolowanego runnera. Niedostępne konto lub model to ograniczenie, nie dowód działającej integracji.

CLI bez zmiany rolek klienta:

```sh
node scripts/motion-render.mjs motion-proof 9:16 draft
node scripts/motion-render.mjs motion-proof 16:9 draft
node scripts/motion-render.mjs motion-proof 1:1 draft
node out/motion-studio/motion-proof/verify-seek.mjs
```

## Artefakty i ograniczenia

`out/motion-studio/motion-proof/`: MP4, poster, phone preview, contact sheet, source JSON, audio measurement, evidence/review JSON i clean-source.zip dla każdego formatu. `verification-continuation.json` zawiera ffprobe/pomiary audio trzech plików; `seek-verification.json` wynik skoku w czasie.

- Demo nie zawiera rzeczywistych produktów klienta; pokazuje działanie osi, typografii, formatów i audio.
- Nie zapisano sztucznych recenzji; nadal draft/niezatwierdzony.
- Stan zadań panelu jest przechowywany w pamięci procesu: restart/HMR może wyczyścić log/status, choć pliki pozostają na dysku. Trwała historia zadań to osobny następny etap, nie funkcja potwierdzona w tej wersji.
- Nie testowano instalacji od zera, każdego uploadu na realnym materiale klienta, zatrzymania serwera w połowie renderu ani całej ścieżki płatnego operatora. Nie deklarować pełnej gotowości produkcyjnej.
- Biblioteka Remotion może wymagać licencji zależnie od zastosowania/firmy; samo pomyślne zbudowanie nie potwierdza uprawnień licencyjnych.

## Następny dozwolony etap

Po wyborze materiału/marki przez Wiktorię przygotować rzeczywisty film, sprawdzić branding i wszystkie potrzebne formaty, przejść uczciwe rundy review. Oddzielne prace produktowe: trwała historia eksportów i stanu zadań, testy browser E2E w izolowanej instancji oraz sprawdzenie wybranego operatora. Publikacja/deploy/push wymagają aktualnego polecenia; nie wynikają z akceptacji demo.
