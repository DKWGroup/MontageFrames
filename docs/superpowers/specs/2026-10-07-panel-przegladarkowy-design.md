# Panel MontageFrames w przeglądarce — plan

Data: 2026-10-07 · Status: etapy 0–2 zbudowane (`npm run ui`, instrukcja w `PANEL.md`). Z etapu 3 działają czat z operatorem i cofanie. Pełny montaż przez operatora czeka na zalogowanie Claude Code (`claude auth login`).

## W skrócie

Da się, bez przepisywania silnika. Proponuję **lokalny panel w przeglądarce** (`http://localhost`) w tym samym repo. Korzysta z tego samego silnika (Remotion, komponent `Reel`, pliki `reel.json`) i z tego samego „montażysty”: Claude Code uruchamianego bez okna (`claude -p`), który czyta `CLAUDE.md`, `PREFERENCJE.md` i pliki klientów tak jak teraz.

Panel dokłada to, czego brakuje w pracy na czacie:
- wrzucenie nagrania i wybór klienta zamiast podawania ścieżek,
- jeden przycisk **Zmontuj**,
- podgląd na żywo bez renderu,
- szybkie poprawki kliknięciem,
- czat do poprawek opisowych,
- render prosto do `klienci/<klient>/Render/`.

Z AnimaFX bierzemy układ i wygodę, ale nie bierzemy etapów z zatwierdzaniem (Transkrypcja → Brief → Plan → Studio).

## Stan obecny i ustalenia

| | AnimaFX | MontageFrames |
|---|---|---|
| Co robi | Osobne animacje (z alfą) do wstawienia w Premiere. Pełny montaż rolki jest tam „dalekim etapem” (`docs/POST-APP-REEL-EDITOR.md`, ścieżka A). | Gotową rolkę: cięcia, napisy, grafiki, przebitki, SFX. |
| UI | Next.js 15, lista projektów, 4 etapy odblokowywane po kolei („Najpierw zapisz brief”), Remotion Player, formularze właściwości, kolejka renderów, plugin Premiere. | Brak. Praca przez czat z Claude'em, podgląd w Remotion Studio (`npm run dev`). |
| Inteligencja | Planer OpenAI proponuje animacje, a Ty je akceptujesz. | Claude Code redaguje `reel.json` według zasad i plików klientów, sprawdza klatki i renderuje. |
| Dane | SQLite + JSON w `~/AnimaFX`. | Pliki w repo: `public/reels/<nazwa>/reel.json` i `klienci/<klient>/`. |

Ważne ustalenia z kodu:
- `Reel` (`src/Reel.tsx`) przyjmuje gotowe dane w propsie `data`. Ten sam kod (4 style i wszystkie grafiki) może więc działać w `@remotion/player` w przeglądarce bez kopiowania.
- `loadFonts()` (`src/fonts.ts`) korzysta z `getStaticFiles()`, które w Playerze zwraca pustą listę (sprawdzone w źródle Remotion). Bez małej poprawki podgląd nie załaduje fontów.
- Remotion sam tworzy brakujące foldery wyjściowe (sprawdzone renderem testowym), więc `klienci/<klient>/Render/` nie wymaga osobnego kroku.
- Zainstalowany Claude Code (2.1.266) ma tryb `-p` ze strumieniem zdarzeń (`--output-format stream-json`), kontynuacją sesji (`--resume`) i trybami uprawnień. Serwer panelu może więc prowadzić montaż i pokazywać postęp.
- Foldery rolek ważą do ok. 300 MB. Podgląd w przeglądarce może więc wymagać lżejszej kopii nagrania.

## Podejścia

**A. Remotion Studio z dodatkami.** Najtańsze, ale to narzędzie programisty: nie ma w nim wrzucania plików, klientów ani przycisku „Zmontuj”, a edycja zagnieżdżonych napisów w panelu propsów jest toporna. Zostaje do debugowania.

**B. Własny lekki panel w tym repo — rekomendacja.** Vite + React + `@remotion/player` oraz mały serwer w tym samym procesie (`npm run ui`). Silnik i pliki się nie zmieniają, a montaż robi ten sam Claude co dziś. Szybkość jest taka jak teraz, a poprawki są szybsze.

**C. Montaż rolek wbudowany w AnimaFX.** AnimaFX ma upload, Player, kolejkę i branding, ale ma inny model danych, etapy z akceptacją i planer OpenAI. Trzeba by przenieść 4 style i ok. 3 tys. linii stylów i grafik albo utrzymywać dwa silniki. Duży koszt i ryzyko rozjazdu. Oba narzędzia można później połączyć przez API, jeśli zajdzie potrzeba.

**D. Od razu w chmurze** (np. Vercel + Remotion Lambda + przechowywanie plików + logowanie + Claude API). Daje dostęp zewsząd i dla klientów, ale wymaga transkrypcji i renderu w chmurze, przesyłania setek MB na każdą rolkę i płatności za tokeny API przy każdym montażu. Ma sens dopiero wtedy, gdy panel ma być produktem dla innych. To osobna decyzja (etap 4).

## Jak to działa (podejście B)

### Ekran

Jedna strona, trzy kolumny. Na telefonie kolumny układają się jedna pod drugą.

- **Lewa: klienci i rolki.**
  - Lista klientów z `klienci/*`, a pod każdym jego rolki i gotowe rendery.
  - **Nowa rolka:** strefa „przeciągnij i upuść” na nagranie (albo kilka klipów) i przebitki.
  - **Nowy klient:** tworzy `klienci/<klient>/` z `PREFERENCJE.md`, `surowe pliki/`, `przebitki/` i `Render/`.
- **Środek: podgląd 9:16.**
  - Remotion Player z tym samym komponentem `Reel`, czyli dokładnie to, co wyjdzie z renderu.
  - Pod nim oś czasu w trzech pasach: ujęcia, napisy, grafiki. Kliknięcie przenosi podgląd w to miejsce.
- **Prawa: zakładki.**
  - *Napisy:* lista grup. Klikasz słowo, poprawiasz tekst, ustawiasz słowo-klucz i akcent.
  - *Grafiki:* lista nakładek. Zmieniasz czas, usuwasz albo ukrywasz.
  - *Czat:* poprawki opisowe do Claude'a, np. „napisy o 10% niżej”, „przy 0:12 logo Żabki”.
  - *Render:* przycisk, postęp i lista plików z `klienci/<klient>/Render/` (pokaż w Finderze, pobierz).

### Przepływ „jednym przyciskiem”

1. **Wrzucenie.** Wybierasz klienta i upuszczasz nagranie. Serwer zapisuje je w `klienci/<klient>/surowe pliki/`, a przebitki w `przebitki/`. Kilka klipów skleja przez `ffmpeg concat`, tak jak dziś.
2. **Szkic.** Serwer uruchamia `npm run reel` (Parakeet, cięcie ciszy, grupy napisów). Styl wykrywa się po ścieżce klienta, jak teraz.
3. **Montaż.** Serwer uruchamia Claude Code bez okna:

   ```
   claude -p "Zmontuj rolkę <nazwa> dla klienta <klient> według CLAUDE.md…" --output-format stream-json --verbose
   ```

   Dozwolone komendy (prep, `remotion still/render`, ffmpeg) są wpisane w `.claude/settings.json`. Komenda spoza tej listy jest odrzucana, więc sesja nie zawiśnie na pytaniu o zgodę. Zdarzenia ze strumienia pokazują się w UI jako kroki: „Transkrypcja”, „Poprawiam napisy”, „Dodaję grafiki”, „Sprawdzam klatki”, „Renderuję”.
4. **Podgląd.** Serwer obserwuje `reel.json`, więc podgląd odświeża się sam, gdy Claude go zmienia. Na koniec Claude renderuje do folderu klienta (przełącznik „Od razu renderuj”, domyślnie włączony, jak dziś).
5. **Poprawki.**
   - Drobne (tekst słowa, usunięcie grafiki, przesunięcie) zapisują się od razu w `reel.json` i są widoczne natychmiast, bez Claude'a i bez renderu.
   - Opisowe trafiają do tej samej sesji Claude'a (`--resume <id>`). Zasady ogólne Claude dalej dopisuje do `PREFERENCJE.md` albo do pliku klienta.
6. **Render.** Przycisk „Renderuj” uruchamia `npx remotion render <nazwa> "klienci/<klient>/Render/<nazwa>.mp4"`, a pasek postępu czyta wyjście CLI.

Czat z Claude'em w Claude Code działa dalej. Panel i czat pracują na tych samych plikach, z jedną zasadą: przy jednej rolce pisze naraz tylko jedna strona.

### Technika

- **Kod.**
  - Panel w `ui/` (React).
  - `vite.config.ts` z małym API: lista klientów i rolek, odczyt i zapis `reel.json`, upload, montaż i render ze strumieniem postępu.
  - Pliki z `public/` są serwowane pod tymi samymi ścieżkami, więc `staticFile()` działa bez zmian.
- **Nowe zależności (tylko deweloperskie).**
  - `vite`, `@vitejs/plugin-react` i `@remotion/player` w wersji 4.0.532, tej samej co reszta Remotion.
  - Bez bazy danych: źródłem prawdy zostają pliki.
- **Drobne zmiany w silniku.**
  - `loadFonts()` bez `getStaticFiles()`: próbuje załadować każdy font z `FONTS` i pomija brakujące.
  - Długość rolki liczona jedną wspólną funkcją dla Studia i panelu.
  - Prep zapisuje w `reel.json` pole `client`, więc panel i Claude znają folder renderu bez zgadywania.
  - Istniejące rolki przypiszę raz: alicante i lot-na-cypr → skyclass, bisanz-ksiazulo → kacper-bisanz, magdalena-herod-* → magdalena-herod.
- **Historia.** Przed każdym zapisem (z panelu albo przed sesją Claude'a) kopia trafia do `public/reels/<nazwa>/historia/`. Przycisk „Cofnij” ją przywraca.
- **Kolejka.**
  - Jeden montaż na rolkę i jeden render naraz, bo render obciąża procesor.
  - Kolejka żyje w pamięci serwera. Restart przerywa zadanie, ale pliki zostają.
- **Podgląd ciężkich plików.** Jeśli Player będzie się zacinał na cięciach przy źródłach 4K, ffmpeg zrobi lekką kopię 720p tylko do podglądu. Render zawsze idzie z oryginału.
- **Bezpieczeństwo.**
  - Serwer słucha tylko na `127.0.0.1`.
  - Nazwy rolek i klientów przechodzą przez ten sam „slug” co w prepie, więc ścieżki typu `../` nie przejdą.
- **Koszt.**
  - `claude -p` używa tego samego logowania co Twój Claude Code, więc zużycie liczy się do tego samego planu co dziś.
  - Wersja w chmurze (D) wymagałaby klucza API i płatności za tokeny.

## Etapy

Każdy etap daje coś, czego można od razu używać.

| Etap | Zakres | Wielkość |
|---|---|---|
| 0 ✅ | Rendery klientów w `klienci/<klient>/Render/` | zrobione |
| 1 ✅ | **Podgląd i render bez AI:** klienci i rolki, Player z tym samym `Reel`, edycja tekstu napisów, usuwanie i przesuwanie grafik, render do folderu klienta z paskiem postępu | mały |
| 2 ✅ | **Wrzuć i zmontuj:** przeciągnij i upuść, prep, automontaż przez Claude Code z postępem na żywo | średni |
| 3 (częściowo) | **Poprawki:** czat z sesją Claude'a, historia i „Cofnij”, suwaki stylu (wysokość i wielkość napisów, pozycja przebitek) jako nadpisania w `reel.json`, które Claude może potem przenieść do pliku klienta | średni |
| 4 (opcja) | **Dostęp spoza Maca:** prywatnie przez Tailscale (Mac musi być włączony) albo pełna chmura (podejście D) | mały / duży |

**Kontrola etapu 1:** ta sama klatka w panelu i w `npx remotion still` wygląda identycznie (fonty, pozycje).
**Kontrola etapu 2:** pełny automontaż krótkiego klipu testowego i porównanie z montażem z czatu.

## Udostępnianie innym i „operator AI” (dopisane 2026-10-07)

**Operator AI** to program, który wykonuje montaż: redaguje `reel.json`, sprawdza klatki i renderuje. Panel nie ma wbudowanej sztucznej inteligencji. Wywołuje operatora, którego osoba korzystająca z panelu wybiera w Ustawieniach:

| Operator | Kto płaci | Kiedy |
|---|---|---|
| Claude Code, własne konto | właściciel konta (plan Pro/Max) | praca na własnym komputerze |
| Claude, klucz API | właściciel klucza, za zużyte tokeny (console.anthropic.com) | gdy z panelu korzysta ktoś inny niż właściciel konta, na serwerze, na platformie |
| później: Codex lub inny CLI | właściciel tamtego konta | gdy ktoś pracuje w Codexie (`AGENTS.md` już jest) |

### 1. Ktoś dostaje repo (np. montażystka lub asystentka)

- **Start:** klonuje repo, uruchamia `npm install` i `npm run ui`.
- **Wymagania:** Node 22, ffmpeg oraz własny zalogowany Claude Code albo własny klucz API. Montuje więc jej operator, na jej koszt.
- **Zasady:** `CLAUDE.md`, `AGENTS.md`, `PREFERENCJE.md`, `frame.md` i style przychodzą z repo, więc montuje według tych samych reguł.
- **Pliki klientów:** `klienci/*/PREFERENCJE.md` są w repo. Przed udostępnieniem osobie z zewnątrz trzeba zdecydować, czy ma je widzieć (można dać repo bez folderów klientów).
- **Nagrania i rendery:** nie trafiają do git (`.gitignore`), więc każda osoba pracuje na swoich plikach.
- **Instrukcja:** `PANEL.md`.

### 2. Ktoś dostaje link do Twojego panelu (pracuje Twój Mac)

- **Dostęp:** prywatnie przez Tailscale (tylko zaproszone osoby) albo przez Cloudflare Tunnel z logowaniem e-mailem. Panel wymaga wtedy hasła.
- **Dane:** wszystko dzieje się na Twoim Macu i na Twoich plikach.
- **AI:** plan Claude jest przypisany do jednej osoby. Jeśli montuje ktoś inny, trzeba przełączyć operatora na klucz API.
- **Do czego:** akceptacja rolki przez klienta albo praca asystentki. Nie dla wielu osób naraz.

### 3. Platforma pod linkiem dla wielu osób (produkt)

- **Konta:** każdy ma własne konto i własny „warsztat” (klienci, pliki).
- **Serwer:** transkrypcja i render na serwerze (np. Remotion Lambda albo serwer z kolejką), pliki w chmurze.
- **Operator:** Claude Agent SDK, czyli ten sam silnik co Claude Code, z **kluczem API**. Klucz może należeć do użytkownika (BYOK, przechowywany zaszyfrowany) albo do Ciebie, wtedy użytkownicy płacą Ci abonament.
- **Bez logowania kontem Claude.ai:** według dokumentacji Agent SDK zewnętrzna platforma nie może oferować logowania kontem Claude.ai bez zgody Anthropic, więc zostają klucze API.
- **Izolacja:** agent z dostępem do komend musi działać w osobnym kontenerze dla każdego zadania, inaczej jeden użytkownik mógłby dostać się do plików drugiego.
- **Nazwa:** w nazwie produktu nie wolno używać „Claude Code”. Dozwolone jest np. „Powered by Claude”.

### Co z tego wynika dla kodu już teraz

- Operator jest ustawieniem (krótka tabela komend), a nie czymś wpiętym na sztywno.
- Klucz API leży lokalnie w `.panel.json` (poza git) i nigdy nie wraca w całości do przeglądarki.
- Panel domyślnie słucha tylko na `127.0.0.1`. Wystawienie go pod linkiem to świadoma zmiana z hasłem (etap 4).
- Ścieżki w kodzie biorą się z jednego miejsca (korzeń repo), żeby w wersji serwerowej dało się je podmienić na katalog użytkownika.

## Decyzje (2026-10-07)

1. **Najpierw lokalnie** — przyjęte („zacznij działać”). Udostępnianie: repo od razu (`PANEL.md`), link w etapie 4, platforma jako osobny projekt.
2. **Operator wybierany w panelu**, domyślnie Claude Code na koncie zalogowanej osoby.
3. **Wygląd domyślnie jak AnimaFX** (ciemny, Fustat, niebieski akcent), do zmiany na życzenie.
