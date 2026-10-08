# Jasny panel + klient Świeża Bryka Ameryka — plan wdrożenia

> **Dla wykonawcy:** realizuj zadania po kolei (superpowers:executing-plans), odhaczając `- [ ]`. Spec: `docs/superpowers/specs/2026-10-07-panel-jasny-i-klient-sba-design.md`. Bez commitów, dopóki użytkowniczka o nie nie poprosi.

**Cel:** prostszy, jasny (biel + niebieski) panel z układem na telefon oraz nowy klient Świeża Bryka Ameryka ze stylem `ameryka` (zakreślacz na całe słowo, kontrast ≥ 7:1).

**Architektura:** styl `ameryka` to motyw silnika ruchu Bisanza: `src/styles/bisanz.tsx` eksportuje fabryki `kineticCaptions(T)` i `kineticOverlay(T)`, a Bisanz i Ameryka to dwa motywy. Panel zostaje na tych samych komponentach (`ui/*.tsx`), zmienia się CSS, nagłówek (render) i układ mobilny.

**Stos:** Remotion 4 (React 19), Vite 8, czysty CSS, `node --test`.

---

### Zadanie 1: Zdjęcie stanu Bisanza (przed refaktorem)

**Pliki:** tymczasowo `public/reels/zz-bisanz-ov/` (reel.json + dowiązanie `source.mp4` → `../bisanz-ksiazulo/source.mp4`), wyniki w scratchpadzie.

- [ ] Rolka testowa `zz-bisanz-ov`: styl `bisanz`, 3 grupy napisów (klucz, `hl`, `stamp`) i grafiki `title` (z `hl`), `counter`, `list`, `cta`, `media` full z `text` w osobnych przedziałach czasu.
- [ ] `npx remotion still` dla `bisanz-ksiazulo` (klatki 20, 60, 360, 560, 1910) i `zz-bisanz-ov` (po jednej klatce na grafikę) → `before-*.png`.

### Zadanie 2: Fonty i logo

**Pliki:** `public/fonts/Poppins-Regular.ttf`, `public/fonts/Poppins-SemiBold.ttf` (kopie z `~/Library/Fonts`), `src/fonts.ts` (wpisy `400` i `600`), `public/Brandings/SwiezaBrykaAmeryka/logo-swieza-bryka.png`.

- [ ] Skopiuj fonty, dopisz dwa wpisy `Poppins` w `FONTS`.
- [ ] Pobierz logo (zgoda 2026-10-07), sprawdź kanał alfa (`ffprobe` → `pix_fmt`).

### Zadanie 3: Profil klienta

**Pliki:** `klienci/swieza-bryka-ameryka/PREFERENCJE.md`, `CLAUDE.md` (lista klientów + style napisów).

- [ ] Profil: nagłówek `# Świeża Bryka Ameryka — preferencje montażu klienta` (panel bierze z niego nazwę), marka, ton, paleta z kontrastami, typografia, napisy, grafiki, przebitki, zakazy treści, logo.
- [ ] Wpis w `CLAUDE.md` przy `kacper-bisanz` i w „Style napisów”.

### Zadanie 4: Prep wykrywa styl (TDD)

**Pliki:** `scripts/prep.mjs` (eksport `styleOf(input)`, użycie w `main()`), `scripts/prep.test.mjs`.

- [ ] Test: `styleOf` dla ścieżek skyclass / kacper-bisanz / magdalena-herod / swieza-bryka-ameryka / swiezabryka-ameryka / inbox → `skyclass`, `bisanz`, `herod`, `ameryka`, `ameryka`, `persona`.
- [ ] `npm test` → FAIL (`styleOf` nie istnieje).
- [ ] Wydziel `styleOf` z `main()`, dodaj `/swieza-?bryka-?ameryka/i` → `ameryka`.
- [ ] `npm test` → PASS.

### Zadanie 5: Motyw w silniku Bisanza

**Pliki:** `src/styles/bisanz.tsx`.

- [ ] `T` → `BISANZ` (eksport, typ `Theme`) + tokeny dotąd wpisane w kod: kolor kart, tekst na kartach, krawędź, etykieta (font/rozmiar/rozstrzelenie), pigułka metki, cień kart, rozmiar tytułu.
- [ ] `export const kineticCaptions = (T: Theme): React.FC<StyleProps>` i `kineticOverlay = (T: Theme)`; `Bisanz = kineticCaptions(BISANZ)`, `BisanzOverlay = kineticOverlay(BISANZ)`.
- [ ] Klatki z zadania 1 po zmianie → `after-*.png`; `ffmpeg … -lavfi psnr` = `inf` (identyczne) dla każdej pary.

### Zadanie 6: Tryb zakreślacza + styl `ameryka`

**Pliki:** `src/styles/bisanz.tsx` (gałąź `T.marker`), `src/styles/ameryka.tsx` (motyw), `src/Reel.tsx` (`STYLES.ameryka`, nakładki `AmerykaOverlay`).

- [ ] `T.marker`: słowo-klucz i `hl` w dwóch warstwach — dolna z kremowym tekstem i cieniem, górna z blokiem (`mark`/`mark2`) i tekstem `onMark`/`onMark2`, odsłaniana `clip-path: inset(0 X% 0 0)` od lewej; `stamp` = blok od razu pełny, wskakuje ze skalą i przechyłem. Tytuł-hak: fragment `hl` na złotym bloku.
- [ ] Motyw `AMERYKA` (Poppins 900/600/400, krem `#F6F3EE`, złoto `#B79154`, czerń `#020203`, bordo `#651E1E`, karty `#020203` ze złotą krawędzią, y 0,73 / 0,63).
- [ ] Rolka testowa `zz-ameryka` (to samo źródło, styl `ameryka`, klucz/`hl`/`stamp`, `counter`, `list`, `title`, `cta`) → klatki w połowie przejazdu zakreślacza i po nim; obejrzeć (Read).
- [ ] Ponownie klatki Bisanza → nadal `inf`.

### Zadanie 7: Panel — motyw jasny

**Pliki:** `ui/panel.css`, `ui/index.html` (favicon w niebieskim).

- [ ] Tokeny ze spec, `@font-face` Inter, bazowy font 15 px (16 px na telefonie), przyciski 40 px (44 px na telefonie), zakładki jako przełącznik segmentowy, kropki statusu (praca = niebieska pulsująca, błąd = czerwona, gotowe = zielona z napisem obok), toast, okna.

### Zadanie 8: Panel — uproszczenia

**Pliki:** `ui/App.tsx`, `ui/Inspector.tsx`, `ui/Timeline.tsx`.

- [ ] Nagłówek rolki: „Renderuj” (primary) / postęp / „Pobierz” + „Pokaż w Finderze”, gdy plik rolki istnieje. Komponent `RenderBar` w `App.tsx` na danych `job`, `out` i pliku z `lib`.
- [ ] Inspector: zakładki `ai` | `napisy` | `grafiki`, domyślnie `ai`; usuń `RenderTab`; log renderu pokazuje się w zakładce `ai` jako `JobPanel` (wspólny log zadań).
- [ ] Timeline: bez pasa „Ujęcia”, podziałka co 10 s.

### Zadanie 9: Panel — telefon

**Pliki:** `ui/App.tsx` (klasa `has-reel` na `.app`, przycisk „‹ Rolki”), `ui/panel.css` (`@media (max-width: 767px)`), `ui/Dialogs.tsx` (bez zmian logiki).

- [ ] < 768 px: bez rolki widać tylko listę; z rolką tylko rolkę (nagłówek z „‹ Rolki”, podgląd na szerokość, zakładki, treść), oś czasu ukryta, „Pokaż w Finderze” ukryte, okna na pełny ekran, `100dvh`, `env(safe-area-inset-*)`.

### Zadanie 10: Dokumentacja i weryfikacja

**Pliki:** `PANEL.md`, usunięcie `public/reels/zz-*`.

- [ ] `PANEL.md`: render w nagłówku, trzy zakładki, telefon = układ (dostęp z sieci to etap 4).
- [ ] `npm test`, `npm run lint` → zielone.
- [ ] Panel w przeglądarce: 1280 px i 375 px (lista, rolka, okno „Nowa rolka”), konsola bez błędów; zrzuty ekranu.
- [ ] Usuń rolki testowe `zz-*`.
