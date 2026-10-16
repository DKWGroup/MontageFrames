# LongForm — katalog efektów

Stan 2026-10-15: **plan**. Ten katalog jest jedynym słownikiem typów, z których operator AI może budować plan montażu ([założenia §6](../../zalozenia-funkcji-LongForm.md)). Typ spoza katalogu = odrzucony przez walidator. Nowy efekt dopisuje się tu (definicja, kiedy, wymagania, wykonanie, etap), zanim powstanie kod.

Wygląd każdego efektu bierze tokeny z motywu klienta (`T16`, `C`); nazwy poniżej opisują mechanikę ruchu, nie gotową estetykę. Ruch zgodnie z OneTake (PREFERENCJE.md 2026-10-14): ciągłość, widoczna przyczyna kolejnej animacji, spokojna pauza na końcu.

**Legenda:** Waga: L (lekki, można często) · M (średni) · H (ciężki, limit z §6 założeń). Wymaga: `face` (śledzenie twarzy), `mask` (maska osoby), `asset` (plik zewnętrzny), `research` (źródło). Wykonanie: `R` = komponent Remotion w `src/longform/effects/`, `HF` = render HyperFrames do przezroczystego pliku + overlay `media`, `PR` = odpowiednik natywny w Premiere (plugin, etap P3).

## Fundament (etap L3)

| Typ | Co widać | Kiedy w treści | Waga | Wymaga | Wykonanie |
|---|---|---|---|---|---|
| `face-track` | kadr płynnie trzyma twarz (centrum w poziomie, lekki headroom) | zawsze przy punch-in/zoomie | L | face | R (istniejące `framing.tracking`); PR: keyframy Motion |
| `digital-zoom` | punch-in 1,08–1,3 na twarz lub szczegół, ease, bez wobble | akcent, puenta, maskowanie jump cutu | L | face | R (`segments[].zoom/zoomTo`); PR: keyframy Scale/Position |
| `kinetic-captions` | napisy z globalnych presetów kinetic klienta (warianty `motion` silnika Bisanza: rise, drop, slide, color, bounce, wiggle, letters, pop) w wersji 16:9 | cały film albo tylko słowa-klucze w rozdziałach (decyzja per klient) | L | — | R (style klienta + `T16`); PR: track napisów z importu transkryptu albo MOGRT |
| `typography` | duże hasło/termin pełnoekranowo lub obok twarzy, hierarchia wagą | definicja pojęcia, teza, nazwa rozdziału | L–M | — | R |
| `chapter-card` | plansza rozdziału z numerem i tytułem | granica rozdziału | M | — | R; PR: MOGRT + marker |
| `numbers` (`counter`) | liczba odliczana | pada liczba-bohater | L | — | R (istniejący `counter`) |
| `chart-grow` | wykres rośnie/rysuje się (paski, linia, pierścień) z podpisem źródła | statystyka, trend, porównanie wartości | M | research | R (istniejące `bars/line/ring` + `source`) |
| `compare` | dwie karty „było/jest”, „X vs Y” | „zamiast X — Y”, porównanie opcji | M | — | R (istniejący `compare`) |
| `list` | punkty pojawiają się, gdy padają | wyliczanka, kroki | L–M | — | R (istniejący `list` z `at`) |
| `logo` | oficjalne logo marki obok twarzy lub w karcie, pop + cień | pada nazwa firmy/aplikacji | L | asset | R (`media`, cache `public/Brandings/_logos`) |
| `broll` | przebitka Pexels pełnoekranowa (głos trwa, L-cut) lub w karcie | ilustracja zjawiska, miejsca, czynności; maskowanie szwu | M | asset | R (`media fit: full|card`) |
| `transition-cut` | punch-in/out na cięciu, crossfade audio 8–15 ms | każde cięcie w ciągłym ujęciu | L | face | R (z cięć rough cut) |
| `zoom-through-cut` | najazd w element (słowo, oko, ekran) i wyjście już w kolejnym ujęciu/scenie | granica rozdziału, zmiana tematu | M | — | R (Z-scale + blur; wzór: `.claude/skills/faceless-explainer/references/cut-catalog.md`) |

## Wycięcie osoby (etap L4, wymaga `mask`)

Segmentacja tylko dla potrzebnych fragmentów; wynik w `assets/masks/`. Bez maski efekt degraduje się do wariantu w nawiasie.

| Typ | Co widać | Kiedy | Waga | Wykonanie |
|---|---|---|---|---|
| `cutout` | osoba wycięta z tła, z delikatnym obrysem/cieniem marki | baza dla reszty sekcji | M | R (wideo + maska alfa) |
| `text-behind` | duże słowo stoi za głową, przed tłem | teza, słowo-klucz wstępu | H | R (warstwy: tło → tekst → osoba); wzór: skill `embedded-captions` (bez maski: tekst obok twarzy) |
| `background-swap` | tło zastąpione kolorem marki, gradientem lub B-rollem | zmiana nastroju, rozdział „w innym miejscu” | H | R (bez maski: pełnoekranowy B-roll + głos) |
| `greenscreen` | osoba (mniejsza, w rogu/dole) przed pełnoekranową grafiką, artykułem, wykresem | omawianie źródła, ekranu, danych | H | R (bez maski: obraz w obrazie z twarzą) |
| `frame-break` | wideo w ramce/karcie; ręka lub głowa „wychodzi” poza ramkę | puenta, mocny akcent wstępu | H | R (ramka między warstwą tła a maską) |
| `cover-story` | kadr jak okładka magazynu: masthead za głową, nagłówek i dopiski obok | hook/teza wstępu, temat odcinka | H | R (bez maski: masthead nad głową) |
| `headline-wall` | ściana prawdziwych nagłówków/artykułów z researchu, osoba przed nią | „wszyscy o tym piszą”, news, kontrowersja | H | R (nagłówki tylko z `sources.md`, nigdy zmyślone; bez maski: ściana pełnoekranowo + głos) |
| `couch-wall` *(nazwa do potwierdzenia)* | robocza interpretacja: ściana ekranów/kafelków (video wall) za osobą, z przebitkami lub przykładami | wiele przykładów naraz | H | R |
| `vertigo` | dolly zoom: osoba stoi w miejscu, tło odjeżdża/najeżdża | moment olśnienia, zwrot akcji | H | R (osoba skala ↑, tło skala ↓; bez maski: wolny push-in + winieta) |

## Stylizowane i 3D (etap L5)

| Typ | Co widać | Kiedy | Waga | Wymaga | Wykonanie |
|---|---|---|---|---|---|
| `tilt-3d` | płaszczyzna wideo lub karta lekko obraca się w perspektywie | przejście do grafiki, „spójrzmy z boku” | M | — | R (CSS `perspective` + `rotateY`) |
| `orbit` *(„orgit” w zleceniu)* | kamera okrąża kartę/wycięcie/obiekt 3D | prezentacja produktu, narzędzia, tezy | H | opc. mask | R CSS 3D; złożone: HF (`orbit-card`, `frost-sequence-camera-orbit`) |
| `phone-mockup` | telefon/laptop z treścią (nagranie ekranu, przebitka, UI) | aplikacja, social media, „na ekranie widzisz…” | M | asset | R (mockup SVG/PNG + `media` w ekranie) |
| `ui-world` | przestrzeń z elementów interfejsu: okna przeglądarki, powiadomienia, kursor, czat | narzędzia AI, proces w aplikacji, kroki online | H | — | R lub HF (`cursor-ui-demo`, `device-surface-showcase`) |
| `pull-back-reveal` | kadr oddala się i okazuje się ekranem/kartą w większej scenie | zmiana perspektywy, podsumowanie | H | — | R (skala 1 → 0,4 + scena wokół; wzór `zoom-out-workspace-reveal`) |
| `paper-cut` | warstwy „wyciętego papieru” z teksturą i lekkim stop-motion | proces, historia, „krok po kroku” | M | opc. mask | R (tekstura + skok co 2–3 klatki) |
| `doodle-boil` | odręczne strzałki, podkreślenia, kółka „gotujące się” (przerysowanie co 2–3 klatki) | wskazanie, ironia, podkreślenie słowa | L–M | — | R (SVG path z jitterem; kolor akcentu klienta) |
| `glass-type` | typografia na liquid glass / ze szklanym połyskiem | teza, cytat, statystyka | M | — | R (komponent `Glass` z `src/overlays.tsx`) |
| `emoji` | naklejka ze sprężystym popem | emocja (oszczędnie; nie u klientów z rejestrem formalnym) | L | — | R (istniejący `emoji`) |

## Edukacja widza (research, etap L5)

| Typ | Co | Zasada |
|---|---|---|
| `explainer` | animowany proces (kroki, przyczyna → skutek), może pełnoekranowo | tylko fakty ze źródła; podpis „Źródło: …” |
| `definition` | karta pojęcia: termin + 1 zdanie | definicja ze źródła albo z wypowiedzi autora (wtedy bez „Źródło”) |
| `fact-check` | karta „dane mówią…” przy tezie autora | gdy źródło potwierdza lub doprecyzowuje; przy sprzeczności tylko propozycja w GUI — decyduje użytkowniczka; nigdy nie przypisuje autorowi słów |

## Zasady wspólne

- Każdy efekt ma `why` i jest przypięty do słów; wyjście szybsze niż wejście; bez ciągłego migania.
- Efekt nie zasłania twarzy (poza świadomym pełnym ekranem) i mieści się w title-safe 90%.
- Kolory tylko z motywu klienta; `frame.md` obowiązuje tam, gdzie klient nie mówi inaczej.
- Każdy efekt ma kontrolę klatek: start, środek, koniec (`npx remotion still … --frame=N`).
- Mapowanie na Premiere (etap P3): `face-track`/`digital-zoom` → keyframy Motion; `chapter-card`/`typography` → MOGRT; reszta → przezroczysty ProRes 4444 z Remotion na ścieżce V2+.
