# MontageFrames — montaż rolek

**Zasady użytkowniczki (zawsze obowiązują, czytaj przed każdą rolką):** @PREFERENCJE.md
**Język wizualny (tokeny kolorów, fontów, ruchu — lustro `C` w `src/overlays.tsx` i `T` w `src/styles/persona.tsx`):** @frame.md
Każdą nową poprawkę od użytkowniczki najpierw dopisz do `PREFERENCJE.md` (z datą), potem zmień kod/rolkę.

**Klienci:** rolka dla klienta → przed montażem przeczytaj `klienci/<klient>/PREFERENCJE.md`. Ma pierwszeństwo przed ogólnymi `PREFERENCJE.md`/`frame.md` tam, gdzie się różnią; poprawki dla klienta dopisuj tam. Logo i assety klienta: `public/Brandings/<Klient>/`. Gotowe rendery klienta: `klienci/<klient>/Render/`.
- `magdalena-herod` — `klienci/magdalena-herod/PREFERENCJE.md`: spokojniejsze kinetic subtitles; Montserrat 400 w treści, Libre Baskerville 400/400 italic w ważnych słowach. Krem, śliwka i złoto; schludne karty i ikony jak na stronie, tematyczne przebitki z ludźmi. Wysokość napisów jak aktualny SkyClass (0,73 / 0,63), animacje bezpośrednio pod napisami. Subtelne SFX 10 dB poniżej oryginalnego filmu lub ciszej. Wiedza o ebooku w pliku klientki. To profil montażowy; przy wdrażaniu stylu w silniku korzystaj z tego pliku.
- `kacper-bisanz` — `klienci/kacper-bisanz/PREFERENCJE.md`, styl `bisanz` (`src/styles/bisanz.tsx`): osobny od SkyClass. Inter 700/600/400 + Menlo 400 (etykiety „boardingowe”), biel `#FFFFFF` + niebieski `#066EED`, kinetic subtitles z dynamiką SkyClass, ale bardziej różnorodne (warianty dobierane do sensu, bez chaosu), białe karty. **Przebitki i wytyczne podane przez użytkowniczkę mają pierwszeństwo**, a do tego dobieraj własne przebitki. Prep wykrywa styl po „bisanz” w ścieżce.
- `swieza-bryka-ameryka` — `klienci/swieza-bryka-ameryka/PREFERENCJE.md`, styl `ameryka` (`src/styles/ameryka.tsx`, motyw silnika Bisanza): import aut z USA (swiezabrykaameryka.pl). Poppins 900/600/400, złoto `#B79154`, czerń `#020203`, bordo `#651E1E`, krem `#F6F3EE`. Kinetic subtitles jak u Bisanza, ale zamiast kreski **zakreślacz na całe słowo**: klucz czarny na złotym (7,1:1), `hl` krem na bordo (10,8:1); ciemne karty ze złotą krawędzią. Zakazy treści: bez liczb o kredycie (RRSO), bez gwarancji ceny i terminu (widełki), prowizja jawna. Logo: `public/Brandings/SwiezaBrykaAmeryka/`. Prep wykrywa styl po „swieza-bryka-ameryka” w ścieżce.
- `glowup-nutrition` — `klienci/glowup-nutrition/PREFERENCJE.md` (brief 2026-10-08, styl `glowup` jeszcze niezbudowany — motyw silnika Bisanza): suplementy, nutriglowup.pl, „PEŁNE DAWKI. JAWNE SKŁADY.”. Bebas Neue 400 (nagłówki, klucz, liczby) + Poppins 600/400; czerń `#0A0A0A`, biel, czerwień `#E63A46` (jedyny akcent, ≤8% kadru), `#2F1A1B`, złoto `#D4AF36` tylko dla cen. Kinetic subtitles jak w Ameryce, grafiki jak sekcje strony (anatomia formuły, dawki, standaryzacja, ceny, wykresy, porównania), radius 4/2 px, płaskie czarne karty. Pełne składy i ceny w pliku klienta. Twarde compliance: zero działania przypisanego produktowi, Omnibus przy promocjach. Przebitki z Pexels; logo: `public/Brandings/GlowUpNutrition/`. **Produkty:** zdjęcia + `produkty.json` w `klienci/glowup-nutrition/produkty/` — prep poprawia przekręcone nazwy i sam dokłada kartę `product`, gdy pada nazwa (trzyma ≥3 s dłużej). Dużo przebitek i wizualizacji procesów; zjawisko/badanie/statystyka → research w internecie, wykres lub animacja (może na cały ekran) z podpisem źródła.
- `vital-hormone` — `klienci/vital-hormone/PREFERENCJE.md` (brief z 2026-10-09; styl `vital` jeszcze niezbudowany, motyw silnika Bisanza): centrum medyczne online, diagnostyka i terapia testosteronem (vital-hormone.pl). Fonty: Montserrat 800/700 i Plus Jakarta Sans 700/400, a 700 italic tylko na cytaty. Kolory: fiolet `#230C4A`/`#2C1651`, papier `#F8F9FA`, atrament `#1A1C1D` i limonka `#D9F99D` jako jedyny akcent (nigdy na jasnym tle, 1,11:1). Kinetic subtitles jak w GlowUp, zaokrąglony zakreślacz, ciemne i jasne karty z radiusem 24 px jak na stronie, ikony Material Symbols. Research, wykresy i procesy są włączone (EAU, Endocrine Society, PubMed). **Rejestr medyczny:** bez reklamy leku na receptę, bez obietnic efektu, zdjęć przed/po i straszenia. Logo trafi później do `public/Brandings/VitalHormone/`.
- `skyclass` — zachowuj ciszę i pełną wypowiedź (napisy 1:1), napisy 6% kadru wyżej niż w Alicante v2, grafiki na pozycji v2, przejścia między kierunkami bez przebłysków prowadzącego. SkyClass (skyclass.pl, tanie podróże): Poppins 500/900, granat `#124F81` + róż `#FF395C`, motywy bilet/lotnisko, kwoty w zielonym neonie, przebitki znanych miejsc.

Użytkowniczka wrzuca surowe nagranie rolki (9:16, mówiona do kamery, po polsku), a Claude ją montuje: wycina ciszę i dubli, dodaje animowane napisy w zdefiniowanym stylu, zoomy. Silnik: Remotion (React). Komunikacja po polsku.

## Workflow jednej rolki

1. Nagranie leży w `inbox/` (albo pod ścieżką, którą poda użytkowniczka). Może być surowe albo wstępnie pocięte — cięcie ciszy działa dla innych stylów; dla SkyClass jest wyłączone. Kilka klipów → najpierw skleić ffmpeg-iem (concat) w jeden plik.
2. `npm run reel -- inbox/<plik> <nazwa>` → `public/reels/<nazwa>/`:
   - `source.*` (kopia), `transcript.json` (Parakeet, słowa z czasami w s),
   - `reel.json` — szkic montażu: cięcie ciszy (ffmpeg silencedetect; wyłączone dla SkyClass), grupy 2–6 słów (cięte na końcu zdania, przecinku i pauzie; sieroty doklejane), słowo-klucz, układ (`stack`/`inline`), kierunki wjazdu, zoom co drugie ujęcie, puste `overlays`.
   - Istniejący `reel.json` nie zostanie nadpisany bez `--force` (może mieć ręczne poprawki).
3. **Redakcja `reel.json` (praca Claude'a):**
   - popraw błędy ASR w `captions[].words[].text`, NIE ruszaj `start`/`end`;
   - wybierz sensowne `key` (słowo niosące sens, liczby, puenta);
   - dla innych stylów wytnij dubli, przejęzyczenia i powtórzone zdania, skracając/dzieląc `segments` (napisy z wyciętych fragmentów znikają same);
   - przegrupuj napisy, gdy automat podzielił myśl źle (spłaszcz słowa i zbuduj grupy na nowo — liczy się sens, 2–6 słów);
   - opcjonalnie: `layout`, `hl` (słowa w akcencie), `color` (akcent klucza), `align`, `from`; per ujęcie `zoom` / `zoomTo` (najazd);
   - **hook na start każdej rolki:** `title` 2–5 słów w pierwszych ~2–3 s, dobrany skillem `hook-engineer` (PREFERENCJE.md → „Hook na początku rolki”);
   - dodaj `overlays` tam, gdzie treść o to prosi: liczby → `counter`/`bars`/`ring`/`line`, wyliczanki → `list`, „zamiast X — Y” → `compare`, hak → `title`, emocja → `emoji`, ilustracja → `media`;
   - **SkyClass: pełne napisy 1:1 również przy cenach/listach/CTA; żadnego wycinania ciszy, zawahań ani urwanych słów.**
   - **bez dublowania** (PREFERENCJE.md, inne style): usuń z napisów słowa, które pokazuje grafika (liczby, punkty listy, porównania, tytuł); nad liczbą-bohaterem napis bez klucza (`key: -1`).
4. Kontrola: `npx remotion still <nazwa> $TMPDIR/f.png --frame=<N> --scale=0.4`, potem obejrzyj PNG (Read). Sprawdź kilka klatek przed renderem.
5. Render: rolka klienta → `npx remotion render <nazwa> "klienci/<klient>/Render/<nazwa>.mp4"` (Remotion sam tworzy brakujący folder); rolka bez klienta → `out/<nazwa>.mp4`. Wynik wyślij użytkowniczce (SendUserFile).
6. Podgląd na żywo: `npm run dev` (Remotion Studio, każda rolka = osobna kompozycja; po edycji JSON odśwież stronę).

## reel.json

Czasy w sekundach **surowego nagrania**; mapowanie na oś po montażu robi `toOut()` w `src/Reel.tsx`.

```json
{
  "source": "source.mp4",
  "style": "persona",
  "fps": 30,
  "segments": [{ "start": 0.42, "end": 3.31, "zoom": 1 }, { "start": 4.65, "end": 7.27, "zoom": 1.1 }],
  "captions": [
    { "words": [{ "text": "w", "start": 1.92, "end": 2.0 }, { "text": "3", "start": 2.4, "end": 2.72 }],
      "key": 1, "from": "right", "align": "center", "hl": [1] }
  ]
}
```

`from`: `right|left|top|bottom` (skąd wjeżdża; wyjeżdża na przeciwną stronę). Prep zmienia kierunek przy każdym nowym zdaniu.
`client`: folder klienta w `klienci/` — prep wpisuje go sam, gdy nagranie leży w `klienci/<klient>/…`; render idzie wtedy do `klienci/<client>/Render/`.
`layout`: `stack` (małe nad/pod dużym kluczem) · `inline` (słowa w linii, klucz większy). Prep rotuje je automatycznie. Słowa zawsze zwarte i wycentrowane.
`key`: indeks słowa-klucza; `-1` = bez klucza (same małe słowa).
`hl`: indeksy słów w kolorze akcentu. `y` (style `bisanz`/`ameryka`): środek bloku napisu, np. żeby ominąć tekst wypalony w nagraniu. Napis trzyma się ≥1 s po ostatnim słowie albo do startu następnej grupy.

## Grafiki (`overlays`, `src/overlays.tsx`)

Każda: `{ "type", "start", "end" }` w sekundach źródła + opcjonalnie `y`, `x`, `dim` (przyciemnij wideo).
**Tło:** licznik, paski, pierścień, wykres, lista, porównanie i `media: card` stoją na karcie liquid glass (komponent `Glass` w `src/overlays.tsx`).
**Pozycja:** bez `y` wykresy/karty/licznik siedzą **na dole** (dolna krawędź `C.bottom` = 0.79), a napisy w tym czasie stoją tuż nad nimi (`T.yRaised` w stylu). `title` stoi u góry (0.17), `emoji` na 0.3. Podanie `y` odpina grafikę od dołu (środek na tej wysokości). Elementy list mogą mieć `at` (czas słowa z transkryptu) → pojawiają się, gdy padają.

| type | pola | do czego |
|---|---|---|
| `title` | `text`, `hl`, `size` | hak u góry, fragment `hl` na pomarańczowym markerze |
| `counter` | `to`, `from`, `prefix`, `suffix`, `decimals`, `label` | duża liczba odliczana w górę |
| `bars` | `title`, `data:[{label,value}]`, `suffix`, `highlight`, `max` | porównanie wartości (przed/po) |
| `ring` | `value` (%), `label`, `title` | procent |
| `line` | `title`, `points:[…]`, `labels:[start,koniec]`, `suffix` | wzrost w czasie |
| `list` | `title`, `items:[tekst \| {text,at}]`, `mark: num\|check\|x\|dot` (domyślnie `num`) | wyliczanki, kroki |
| `compare` | `left/right: {title, items}` | dwie szklane karty: „było” (przygaszone, przekreślane) vs „jest” (akcent) |
| `emoji` | `emoji`, `x`, `y`, `size` | naklejka ze sprężystym popem |
| `product` | `src`, `text`, `label` | tylko styl `glowup`: karta produktu przy wzmiance (prep dodaje ją z `klienci/<klient>/produkty/produkty.json`) |
| `media` | `src` (plik w folderze rolki), `fit: full\|card\|overlay`, `aspect`, `volume`, `trim` | B-roll, zdjęcie, przezroczysta animacja (np. z HyperFrames) |

Wzorcowy przykład: `public/reels/pokazowka/reel.json`. Wygląd grafik: tokeny `C` na górze `src/overlays.tsx` — zmieniając je, zaktualizuj `frame.md`. Przy pracy nad wyglądem korzystaj ze skilli designu (frontend-design, hyperframes-creative, ui-ux-pro-max, dataviz).

## Style napisów

- `skyclass` — `src/styles/skyclass.tsx`: Poppins 500/900, różowe pieczątki, start/odlot po skosie. Grafiki w `src/skyclass-overlays.tsx`: `money` (kwota `to`, opcjonalnie `upper`, `oldPrice`, `prefix`, banknoty wystrzeliwujące z cyfr), `ticket` (kierunek, `country`, opcjonalny `code`, kwota `to`, czas odliczania `priceAt`), `travel` (plik `src`, metka `text`/`country`, przejście okna), `list`, `counter` i `cta`. Przykład: rolka `alicante`. Napisy mogą mieć `effect: "stamp"` i jawny `end` w czasie źródła, aby kontrolować ich czas; w SkyClass grafika nie zastępuje wypowiadanych słów w napisach.
- `bisanz` i `ameryka` — jeden silnik ruchu w `src/styles/bisanz.tsx` (`kineticCaptions(T)`, `kineticOverlay(T)`), dwa motywy: `BISANZ` (kreska pod kluczem) i `AMERYKA` w `src/styles/ameryka.tsx` (`marker`: zakreślacz na całe słowo). Zmiana wyglądu jednego klienta = tokeny jego motywu; zmiana w silniku dotyka obu (sprawdź klatki obu stylów).
- Styl = jeden plik w `src/styles/` + wpis w `STYLES` w `src/Reel.tsx`; w `reel.json` wybiera się go przez `"style"`.
- Nowy styl od użytkowniczki: skopiuj `src/styles/persona.tsx`, zmień tokeny `T` (font, rozmiary, kolory, pozycja `y`, `travel`, `drift`, `stairWidth`) i/lub ruch.
- `persona` — wzorowany na rolkach Krzysztofa Persony / Toma Pietrzyka (kurs „Lepsze Rolki", presety „Persona Presets 2.0" do Premiere: Slide Bounce, Wobble, Scribble, Camera Shake, Glitch). Font marki to **MADE Tommy Soft** (Bold/ExtraBold/Black); dopóki plików nie ma w `public/fonts/`, styl używa Nunito (zbliżony, zaokrąglony, pełne polskie znaki).
- Fonty: plik do `public/fonts/` + wpis w `FONTS` w `src/fonts.ts`. W bazie: Nunito, Fustat (200–800). Times New Roman usunięty na życzenie — nie wracać.
- Strefa bezpieczna Instagram + TikTok (1080×1920): tekst między y≈250 a y≈1440 (0,75; sam Instagram do ~1520), x od ~60 do ~930 px. Szczegóły: `PREFERENCJE.md` → „Strefa bezpieczna”.

## Narzędzia

- Panel w przeglądarce: `npm run ui` → http://127.0.0.1:3100 (`PANEL.md`). Edytuje te same `reel.json`; „operator AI” to Claude Code bez okna (`claude -p`) z tymi instrukcjami. Zlecenie z panelu przychodzi bez czatu: nie zadawaj pytań, nie wysyłaj plików, nie commituj, na końcu krótko podsumuj po polsku.
- Transkrypcja: `npx hyperframes transcribe <plik> -d <dir> -l pl --json` (Parakeet TDT 0.6B v3, lokalnie, ~3 s na klip). Końce słów u Parakeeta „rozlewają się" na pauzy — dlatego cięcie ciszy idzie z audio, nie z transkryptu. Głośne tło → `NOISE_DB` w `scripts/prep.mjs` na -30.
- Skille HyperFrames w `.claude/skills/` (osobny silnik HTML+GSAP), przydatne do efektów spoza tego silnika: `embedded-captions` (napisy za postacią, z maską), `talking-head-recut` (plansze, lower-thirdy, callouty), `motion-graphics` (krótkie animacje, mapy, logo), `hyperframes-registry` (~400 gotowych bloków). Animację z HyperFrames renderuj jako przezroczysty plik i wstaw przez overlay `media` z `fit: "overlay"`.
- Testy logiki prep: `npm test`. Typy + lint: `npm run lint`.
