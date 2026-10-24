# FitnessIQ — preferencje montażu klienta

Zapisano: **2026-10-22**. Strona: [fitnessiq.pl/warszawa](https://fitnessiq.pl/warszawa/) (Astro, bilety przez Fever). Zawody fitness „Fitness IQ” — ustandaryzowany test sprawności z indywidualnym wynikiem. **Dedykowanego stylu w silniku jeszcze nie ma.** Profil panelu brandingu: `klienci/fitness-iq/branding/profile.json` (styl ogólny `brand`). Do czasu budowy stylu ten plik jest profilem montażowym.

Ten plik ma pierwszeństwo przed `PREFERENCJE.md` i `frame.md` tam, gdzie się różnią. Pozostałe zasady ogólne obowiązują: hook na starcie (pod napisami, pierwsze 3 s), 2–6 słów w grupie, zwarte bloki, bez wiszących spójników i przyimków, odsłonięta twarz, bez dublowania tekstu, logo przy wzmiance o marce, SFX 10 dB pod oryginałem, strefa bezpieczna IG + TikTok. Research domyślnie **wyłączony**. Emotki przy słowach to oprawa wyłącznie Happy News, tu ich nie dodaję. Każdą poprawkę dla tego klienta dopisuję **tutaj** (z datą), dopiero potem zmieniam kod lub rolkę.

## Wytyczne od użytkowniczki *(2026-10-22)*

- **Kolory:** `#0B0B0D`, `#C8F134`, `#FFFFFF`, `#808080`.
- **Logo:** przesłane w czacie, zapisane w `public/Brandings/FitnessIQ/`.
- **Fonty:** takie jak na stronie (sprawdzone niżej).

## Marka i wydarzenie *(przegląd strony 2026-10-22)*

- **Czym jest:** „nowy standard rywalizacji sportowej”: jedno ustandaryzowane wyzwanie, które mierzy **siłę, dynamikę i wytrzymałość**. Po starcie zawodnik dostaje cyfrową kartę wyników z wynikiem ogólnym, czyli swoim **Fitness IQ**, oraz wynikami w trzech obszarach. Wynik ma być punktem odniesienia do dalszego progresu.
- **Hasła ze strony:** „Wiesz, ile podnosisz. Ale czy wiesz, jaki jest prawdziwy poziom Twojej formy?” · „Kompletny test Twojej sprawności” · „Twoja forma. Twój wynik. Twój benchmark.” · „Trenuj. Sprawdzaj się. Osiągaj więcej.” · „Praca. Krótka przerwa. I jedziesz dalej.” · „Każdy wynik ma znaczenie”. Trzy kroki: Podejmij wyzwanie → Zmierz swoje wyniki → Sprawdź, na czym stoisz.
- **Format:** **14 stacji → 1 km FINISHER run → Twój wynik.** Stacje nieparzyste to **WYCISK** (4 min nieprzerwanej pracy, liczy się suma), parzyste to **POMIAR** (4 min prób, liczy się najlepsza). Między stacjami są 2 minuty przerwy. Na każdej stacji sędzia tłumaczy zasady, mierzy i zapisuje wynik. Można startować solo albo w parze.
- **Stacje:** 1 RowErg (metry) · 2 Box Jump (maks. wysokość) · 3 Push-Pull Sled Shuttle 5 m (odcinki) · 4 Bench Press (maks. ciężar) · 5 JOKER I (do ujawnienia) · 6 Shuttle 10×10 m (czas) · 7 D-Ball Load Sum / Payload (łączna masa) · 8 Standing Broad Jump (odległość) · 9 Farmer Carry (odcinki) · 10 Max Assault Bike 1 min (kalorie) · 11 Dead Hang, maks. 4 min (łączny czas zwisu) · 12 JOKER II (do ujawnienia) · 13 Single-Arm DB Ground to Overhead (powtórzenia) · 14 Deadlift Trap Bar (maks. ciężar) · FINISHER: bieg 1 km (czas). Szczegóły w regulaminie na stronie.
- **Pierwsza edycja (Warszawa):** **6–8 listopada 2026** (piątek–niedziela), strefa FITNESS IQ podczas **FIWE 2026**, Ptak Warsaw Expo, Al. Katowicka 62, 05-830 Nadarzyn. Start trwa około 90 minut, a na miejscu trzeba być 60 minut wcześniej. Parking dla odwiedzających FIWE jest bezpłatny (15 000 miejsc). Minimalny wiek to 16 lat, a osoby w wieku 16–17 lat startują za zgodą opiekuna.
- **Bilety (stan 2026-10-22, early bird):** solo od 349 zł, para od 249 zł/os. (498 zł). Następny próg: solo od 399 zł, para od 299 zł/os. (598 zł). Wejście na targi jest w cenie. Kategorie: SOLO K, SOLO M, DOUBLES K, DOUBLES M, DOUBLES MIX. **Ceny rosną wraz z terminem, więc w dniu renderu sprawdzam je na stronie.**
- **CTA ze strony:** „Kup bilet!”, „Jak dojechać”, „Pokaż FAQ”.
- **Firma:** FITNESS IQ Prosta Spółka Akcyjna, ul. Kaniowska 45, 01-529 Warszawa, KRS 0001265079, NIP 5253105631, kontakt@fitnessiq.pl. Bilety sprzedaje i stronę obsługuje Fever („Powered by Fever”).
- **Grupa:** osoby trenujące (siłownia, crossfit, hyrox, bieganie), które chcą porównać się z innymi i zmierzyć swoją formę.
- **Ton:** bezpośredni, na „ty”, sportowy i motywujący, krótkie zdania z kropką. Bez guru-hype'u i obietnic efektów.

## Czego pilnuję w treści

- Daty, adres, ceny i liczby stacji podaję tylko zgodnie ze stroną z dnia renderu. Przy cenie zawsze piszę „od”, a progi cenowe nazywam tak, jak na stronie.
- Stacje JOKER pozostają tajemnicą. Nie zgaduję, co to będzie.
- Nie wymyślam wyników, rekordów, liczby zawodników ani opinii uczestników.
- Logo Fever albo FIWE dodaję tylko wtedy, gdy ktoś wymieni je w nagraniu, i biorę je z oficjalnych materiałów.

## Paleta i kontrast (WCAG)

| token | hex | rola |
|---|---|---|
| `ink` | `#0B0B0D` | tło kart i pełnoekranowych grafik, tekst na limonce. Strona ma prawie identyczny `#0A0B0D`, obowiązuje wartość od użytkowniczki |
| `lime` | `#C8F134` | **jedyny akcent:** zakreślacz lub kolor słowa-klucza, liczby-bohaterowie, przyciski CTA, aktywny pasek. Strona ma `#C8F135`, a sygnet w SVG `#B2F100`. Obowiązuje wartość od użytkowniczki |
| `white` | `#FFFFFF` | tekst na ciemnym, małe słowa napisów. Czysta biel jest wyjątkiem od `frame.md`, bo to kolor marki |
| `gray` | `#808080` | etykiety, opisy drugiego planu, nieaktywne elementy, linie podziału |

| para | kontrast | gdzie |
|---|---|---|
| `#FFFFFF` na `#0B0B0D` | 19,66:1 | treść kart, napisy na bloku |
| `#C8F134` na `#0B0B0D` | 15,06:1 | akcent, liczby, klucz |
| `#0B0B0D` na `#C8F134` | 15,06:1 | słowo na limonkowym zakreślaczu, tekst CTA |
| `#808080` na `#0B0B0D` | 4,98:1 | tylko drobne etykiety i podpisy, nie główna treść |

**Zakazane:** limonka na bieli (1,31:1), szary na bieli jako tekst (3,95:1), biały tekst na szarym (3,95:1). Limonkowego tekstu nie kładę bezpośrednio na jasnym wideo, tylko na czerni albo z cieniem `#0B0B0D`.

## Typografia *(sprawdzone w przeglądarce 2026-10-22)*

Strona ładuje dwa fonty Google: **Nunito Sans** jako „Primary” (treść, przyciski, etykiety) i **Roboto 700** w nagłówkach (`h1`–`h3` w „Secondary”). Kit Adobe Fonts z IBM Plex Mono jest podpięty, ale żaden element go nie używa. Logotyp to osobny, pochyły rysunek, nie font.

- **Roboto 700/800, WERSALIKI** — nagłówki grafik, hook, słowo-klucz w napisach. Na stronie: „ZMIERZ SIĘ W FITNESS IQ”, „BILETY NA WYDARZENIE”.
- **Nunito Sans 800, wersaliki, rozstrzelenie ~0,12–0,2 em** — eyebrow, małe etykiety („WYDARZENIE”, „DATA”, „14 STACJI → 1 KM FINISHER RUN → TWÓJ WYNIK”) i przyciski („KUP BILET!”).
- **Nunito Sans 700** — małe słowa w napisach, wyróżnienia w tekście.
- **Nunito Sans 400/300** — opisy i podpisy.
- Pliki: `public/fonts/NunitoSans.ttf` i `public/fonts/Roboto.ttf` (zmienne, z google/fonts, licencja OFL obok). Polskie znaki sprawdzam na klatce.

## Logo i assety

`public/Brandings/FitnessIQ/`:
- `FitnessIQ-logo-pion-bialy-limonka.png` — główne logo (700×324, przezroczyste): białe „F” i napis FITNESS IQ, limonkowe „IQ”. **Tylko na ciemnym tle**, bo na białym widać samo IQ.
- `FitnessIQ-logo-poziom-bialy-limonka.png` — wersja pozioma ze strony (169×50, mała). Nadaje się na niewielkie elementy.
- `FitnessIQ-sygnet-IQ-czarne-tlo.svg` — kwadratowy sygnet IQ na czarnym tle ze strony (favicon).

## Napisy i grafiki *(zatwierdzone przez użytkowniczkę 2026-10-22)*

Kierunek opiera się na stronie klienta i obowiązuje w rolkach FitnessIQ. Dopóki nie powstanie dedykowany styl, realizuję go w silniku Bisanza.

- Kinetic subtitles z silnika Bisanza (dynamika i warianty jak w Ameryce i Vital). Słowo-klucz w Roboto 700 wersalikami, czarne na limonkowym zakreślaczu. Małe słowa w Nunito Sans 700, białe, z cieniem `#0B0B0D`.
- Karty płaskie i ciemne `#0B0B0D`, ostre lub lekko zaokrąglone jak przyciski strony, z cienkim szarym obrysem i limonkowym akcentem. Bez liquid glass i bez pomarańczowego akcentu z `frame.md`.
- Grafiki pasujące do treści: numer i nazwa stacji („STACJA 4 — BENCH PRESS”) z typem WYCISK/POMIAR, odliczanie 4:00, schemat 14 → 1 km → wynik, karta wyników z trzema obszarami (siła, dynamika, wytrzymałość), karta ceny „od 349 zł” i data, CTA „KUP BILET!” na limonce.
- Przebitki: zdjęcia i wideo z wydarzenia oraz materiały klienta (`klienci/fitness-iq/przebitki/`), potem Pexels (siłownia, wioślarz, sanki, martwy ciąg, bieg).
