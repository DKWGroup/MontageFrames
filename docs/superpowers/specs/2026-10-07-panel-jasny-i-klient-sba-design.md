# Jasny, prostszy panel + klient Świeża Bryka Ameryka

Zatwierdzone 2026-10-07. Dwie niezależne części: (A) panel `ui/`, (B) nowy klient i styl napisów.

## Decyzje użytkowniczki (2026-10-07)

1. Projekt jak niżej, bez wyjątków.
2. Telefon: **sam układ mobilny**. Panel dalej słucha tylko na `127.0.0.1`; dostęp z telefonu to etap 4.
3. Zakreślacz w napisach: **klucz złoty, akcent bordo**.
4. Logo pobrane ze strony klienta do `public/Brandings/SwiezaBrykaAmeryka/`.

## A. Panel

**Wygląd.** Biel i niebieski, font Inter (`public/fonts/Inter.ttf`) zamiast Fustat. Tokeny w `:root` w `ui/panel.css`:

| token | kolor | kontrast na bieli |
|---|---|---|
| `--accent` | `#2563EB` (hover `#1D4ED8`) | 5,17:1 (też biały tekst na nim) |
| `--accent-soft` | `#EFF6FF` | tło zaznaczenia; `#1D4ED8` na nim 6,16:1 |
| `--text` | `#0F172A` | 17,85:1 |
| `--muted` | `#475569` | 7,58:1 |
| `--faint` | `#64748B` | 4,76:1 (na `#F8FAFC` 4,55:1), najjaśniejszy dozwolony tekst |
| `--danger` | `#DC2626` | 4,83:1 |
| `--bg` / `--surface` / `--line` | `#F8FAFC` / `#FFFFFF` / `#E2E8F0` | tła i linie |

**Uproszczenia.**
- Render w nagłówku rolki jako jedyny główny przycisk: „Renderuj” → postęp → „Pobierz” / „Pokaż w Finderze” (plik tej rolki).
- Zakładki: Poprawki AI · Napisy · Grafiki (domyślnie Poprawki AI). Zakładka Render znika.
- Oś czasu: pasy Napisy i Grafiki + głowica. Bez pasa „Ujęcia” i bez gęstej podziałki.
- Bez listy wszystkich renderów klienta.

**Telefon (< 768 px).** Dwa ekrany sterowane adresem `#rolka`: lista rolek (duży „Nowa rolka”, wiersze ≥ 48 px) i rolka („‹ Rolki”, podgląd 9:16 na szerokość, przełącznik zakładek, „Renderuj” w nagłówku, log pod spodem). Okna na pełny ekran, pola 16 px, cele dotyku ≥ 44 px, `env(safe-area-inset-*)`, `100dvh`, bez przewijania w poziomie i bez zagnieżdżonych pól przewijania. Oś czasu ukryta. Na telefonie bez „Pokaż w Finderze”.

## B. Świeża Bryka Ameryka

**Profil:** `klienci/swieza-bryka-ameryka/PREFERENCJE.md` (marka ze strony i skilli `swiezabryka-ameryka*`, paleta z kontrastami, typografia, napisy, grafiki, przebitki, zakazy treści). Wpis w `CLAUDE.md`.

**Styl `ameryka`** = silnik ruchu Bisanza z motywem. `src/styles/bisanz.tsx` dostaje motyw (font, kolory, rozmiary, pozycja, tryb `marker`); `src/styles/ameryka.tsx` to sam motyw. Bisanz renderuje się identycznie (porównanie klatek przed/po).

| element | wygląd | kontrast |
|---|---|---|
| małe słowa | Poppins 600, krem `#F6F3EE`, cień `#020203` | 18,74:1 do cienia |
| słowo-klucz | Poppins 900 WERSALIKI, `#020203` na złotym `#B79154` | 7,10:1 |
| akcent `hl` | krem `#F6F3EE` na bordo `#651E1E` | 10,79:1 |
| `stamp` | złoty blok z pełnym słowem wskakuje z przechyłem | 7,10:1 |
| nigdy | biały na złotym, złoto na bordo | 2,92:1 / 4,09:1 |

Zakreślacz obejmuje całe słowo i przejeżdża od lewej; ciemny tekst jest w tej samej warstwie co blok i odsłania się razem z nim (`clip-path`), więc w każdej klatce tekst leży albo na złocie, albo na wideo z cieniem. Wysokość: środek 0,73, przy grafice dolna krawędź 0,63.

**Grafiki** (`AmerykaOverlay`): ciemne karty `#020203` z cienką złotą krawędzią, kremowy tekst, złote liczby (7,1:1), etykiety Poppins 400 wersalikami z rozstrzeleniem, CTA jako złoty przycisk z czarnym tekstem, tytuł-hak z fragmentem `hl` na złotym zakreślaczu.

**Silnik:** prep wykrywa styl po `swieza-bryka-ameryka` / `swiezabryka-ameryka` w ścieżce (`styleOf` w `scripts/prep.mjs` + test). Fonty Poppins 400 i 600 w `public/fonts/` i `src/fonts.ts`.

## Weryfikacja

`npm test`, `npm run lint`; klatki Bisanza przed/po (identyczne); klatki próbnej rolki w stylu `ameryka` (klucz, akcent, karta); panel w przeglądarce na 1280 px i 375 px.
