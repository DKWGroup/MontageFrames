# Oskar Stuglik — profil montażowy

Trener personalny, prowadzenie online: trening, żywienie, badania, przygotowanie do zawodów sylwetkowych. Strona: https://oskar-three.vercel.app/ (podgląd; docelowa domena oskarstuglik.pl jeszcze niepodłączona). Projekt strony: `/Users/wskopek/Documents/Github projekty/Oskar Stuglik`.
Ma pierwszeństwo przed ogólnymi `PREFERENCJE.md` i `frame.md` tam, gdzie się różni. Poprawki dla Oskara dopisuję tutaj, z datą.

## Brief *(2026-11-02)*

- Robimy **VSL i rolki**; na razie tylko **VSL**. Cel: VSL ma być angażujący, estetyczny i czytelny, a jego zadaniem jest umówienie **15-minutowej konsultacji**.
- **Napisy w VSL na dole, po 5–7 słów w jednej linii**, w strefie bezpiecznej. Ważne słowa **podkreślam** (różowa kreska pod kluczem, `hl` w różu).
- **Animacje po prawej części kadru**, żeby nie zasłaniały mówiącego (`side: "right"`; jeśli Oskar stoi po prawej, przenoszę je na lewo i zapisuję powód).
- Przebitki z Pexels, wykresy, porównania i animacje w brandingu. **Research** treści włączony dla tego klienta: dane naukowe tylko ze źródłem („Źródło: …”, linki w `public/reels/<nazwa>/sources.md`).
- **Przemiany podopiecznych** (`klienci/oskar-stuglik/przemiany/`, 13 zdjęć) wykorzystuję wszystkie: na planszach przed/po, w ścianie przemian, w tle plansz i wtedy, gdy nie leci żadna inna animacja.
- **Subtelne efekty dźwiękowe** przy wejściach grafik, przemianach, liczbach i CTA: whoosh, pop, klik. Zawsze co najmniej **10 dB pod oryginalnym głosem** (mnożnik ≤ 0,316 względem poziomu wypowiedzi), z umiarem, bez kasy fiskalnej przy cenach. *(2026-11-02)*

## Wygląd

| token | hex | rola |
|---|---|---|
| krem | `#EFEDE5` | tekst napisów i kart (zamiast bieli) |
| bordo | `#6D1E32` | tło kart/paneli VSL, główny kolor marki |
| granat | `#193548` | druga powierzchnia (chipy, kafle, „przed”) |
| atrament | `#24343B` | cienie, scrim pod napisami |
| róż | `#EFCBD3` | **jedyny akcent**: kreska pod kluczem, `hl`, liczby, przycisk CTA. Nigdy na kremie (1,2:1). Bordo na różu 7,6:1, róż na granacie 9,4:1 |

- Fonty: **Cabinet Grotesk 800** (nagłówki, klucz, liczby) + **Satoshi 400** (treść; 700 tylko w małych etykietach). Pliki z projektu strony (Fontshare, ITF FFL): `public/fonts/CabinetGrotesk-Variable.woff2`, `Satoshi-400.woff2`, `Satoshi-700.woff2`.
- Styl `oskar` (`src/styles/oskar.tsx`): napisy z silnika Bisanza (kreska pod kluczem), grafiki VSL z silnika `vital-vsl` w palecie Oskara (`panel` z `kind`: media, wall, beforeafter, stat, checklist, chips, pillars, hub, process, updown, steps, cta, statement oraz `statement`, `broll`, `endcard`, `scrim`). Prep wykrywa styl po „oskar-stuglik” w ścieżce.
- Kierunek strony: sportowy edytorski, dużo powietrza, subtelne gradienty i cienie, ruch celowy. Radius 24–28 px, przyciski jak pigułki.
- Znak: `public/Brandings/OskarStuglik/znak-os.svg` („os.” na bordo). Zdjęcia Oskara: `oskar-portrait.webp`, `oskar-dzungla.jpg`. Pełnego logo jeszcze nie ma, więc na planszy końcowej daję imię i nazwisko w Cabinet 800.

## Treść i oferta *(ze strony, 2026-11-02; ceny sprawdzam ponownie w dniu renderu)*

- Hasło: „Pomogłem już setkom podopiecznych zmienić sylwetkę. Teraz porozmawiajmy o Tobie.” Dokładnej liczby podopiecznych nie ma, więc piszę „setki”, bez konkretnej liczby.
- **CTA:** „Umów konsultację” / „Porozmawiajmy o Twoim celu”: 15 minut, wybór terminu w kalendarzu (Cal.com) pod filmem. W VSL: „Umów 15-minutową konsultację ↓” + „termin wybierzesz poniżej”. Nie piszę „darmowa”, dopóki strona tego nie mówi.
- **Trening i forma na co dzień:** badania i analiza zdrowia · indywidualny plan żywieniowy (makro, zamienniki) · plan treningowy · profilaktyka zdrowotna · stały kontakt pn–pt, odpowiedź w 24 h roboczych · cotygodniowe raporty i modyfikacje planu.
- **Przygotowanie sportowe i startowe:** zawody sylwetkowe (forma sceniczna, pozowanie, strategia startowa) · biohacking, neurohacking, high-performance · indywidualna suplementacja · optymalizacja hormonalna.
- **Ceny (za cały okres):** Natural 500 / 1200 / 2000 zł (1 / 3 / 6 mies.) · Doping 700 / 1500 / 2600 zł. „Ostateczny zakres i cenę ustalamy po konsultacji.”
- Przemiany na stronie: „To nie są obietnice. To są ludzie.” · „Każda przemiana ma własne tempo.” · „Kolejna historia może być Twoja.”

## Compliance

- Pod każdą przemianą przed/po: **„Efekty są indywidualne i zależą m.in. od punktu wyjścia i zaangażowania.”** (dopisek ze strony). Bez obietnic kilogramów, terminów i „gwarantowanych efektów”.
- HTZ, SAA, peptydy i hormony tylko jako **edukacja i ograniczanie ryzyka**. Bez nazw preparatów, dawek, strzykawek i zachęty do stosowania. Gdy padają w VSL, dodaję „Ma charakter edukacyjny. Nie zastępuje opieki lekarskiej.” Nie przypisuję Oskarowi kwalifikacji medycznych.
- Twarze na przemianach zostawiam tak, jak je dostałam (część jest zamazana). Nie odkrywam ich i nie podpisuję imionami.

## Przemiany *(13 plików `IMG_4822`–`IMG_4834`)*

Większość to pary przed/po (redukcja i budowa sylwetki, część twarzy zamazana). Trzy zdjęcia pokazują Oskara z podopiecznym (dżungla, studio na czarnym tle, mural w Katowicach): z nich robię przebitki „praca razem” i tło planszy końcowej. Dokładne przypisanie numerów robię przy montażu na arkuszu klatek.

## Research VSL *(2026-11-02)*

- Struktura: **hook (≤10–20 s) → problem → wgląd/mechanizm → rozwiązanie (prowadzenie) → dowód (przemiany, możliwie wcześnie) → oferta → zastrzeżenia → jedno CTA**. Jedno wezwanie, powtórzone na końcu, bez fałszywej presji czasu i liczników ([Digistore24](https://www.digistore24.com/blog/video-sales-letter/), [LeadHaste](https://leadhaste.com/prompts/video-sales-letter-script)). Dźwięk ważniejszy od obrazu.
- Dane do wykresów (tylko gdy padają w wypowiedzi; przed grafiką sprawdzam w pełnym tekście):
  - białko: w metaanalizie 49 RCT (1863 osoby) zysk beztłuszczowej masy przy treningu siłowym przestaje rosnąć powyżej ok. **1,62 g/kg/dzień** (Morton i in., Br J Sports Med 2018; [BJSM](https://bjsm.bmj.com/content/52/6/376.abstract));
  - coaching zdalny vs na miejscu: 2-letnie RCT w Baltimore (Appel i in., NEJM 2011): **−5,1 kg wsparcie osobiste, −4,6 kg zdalne, −0,8 kg kontrola** (11,2 / 9,9 / 1,8 lb), czyli zdalne prowadzenie działa prawie jak osobiste;
  - telemedycyna a redukcja: metaanaliza 30 badań ([PubMed 39370913](https://pubmed.ncbi.nlm.nih.gov/39370913/)), efekt zbiorczy do sprawdzenia.
- Przebitki Pexels (licencja Pexels, pliki do `klienci/oskar-stuglik/przebitki/`, źródła w `sources.md`): moody siłownia (`gym moody man`, `deadlift dark`), posiłki i ważenie (`meal prep`, `food scale`), wideorozmowa/telefon (`video call coach`, `phone message`), badania krwi (`blood test tubes`, bez igły), sen i regeneracja, scena zawodów (`bodybuilding stage`). Ciepłe, ciemne światło, które da się podciągnąć w stronę bordo. Bez stockowego kiczu, bez strzykawek i tabletek.

## Pliki klienta

- `klienci/oskar-stuglik/surowe pliki/` — nagrania · `przemiany/` — przed/po · `przebitki/` — B-roll · `Render/` — gotowe filmy.
- Overlay `media` czyta pliki z folderu rolki, więc przemiany, przebitki i znak kopiuję do `public/reels/<nazwa>/`.
