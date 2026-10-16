# LongForm — specyfikacja GUI

Data: 2026-10-15. Stan: **plan**. Kontrakt: [założenia](../../zalozenia-funkcji-LongForm.md). Panel: obecny `npm run ui` (React/Vite), te same tokeny, komponenty i player co QuickContent ([docs/quickcontent/gui.md](../quickcontent/gui.md)). Zasady: UI/UX Pro Max (kontrast 4,5:1, widoczny fokus, cele ≥ 44 px, kolor nigdy jedynym nośnikiem znaczenia, progressive disclosure, jedna główna akcja na ekran), PREFERENCJE.md („Prosty panel”: główne zadanie i wyniki na wierzchu, opcje techniczne/koszty/historia zwinięte).

## Nawigacja

Nowy moduł w bocznej nawigacji: **„Film poziomy”** (obok QuickContent i Motion Studio). Adresy:

| Adres | Widok |
|---|---|
| `#lf` | lista projektów + „Nowy film” |
| `#lf/<id>` | projekt na aktualnym kroku |
| `#lf/<id>/ciecia` · `/plan` · `/wynik` | konkretny krok (głęboki link, Wstecz działa) |

Stan projektu, decyzje cięć i akceptacje są trwałe na serwerze (nie `localStorage`). Odświeżenie wraca do tego samego kroku i pozycji w transkrypcie.

## Stepper (zawsze widoczny w nagłówku projektu)

`1 Materiał → 2 Cięcia → 3 Plan → 4 Montaż → 5 Wynik`. Krok aktywny wyróżniony wagą i znacznikiem (nie tylko kolorem). Krok niedostępny ma opis dlaczego („Najpierw zatwierdź cięcia”). Prace w tle pokazują prawdziwy etap i procent tam, gdzie narzędzie go mierzy (ASR, segmentacja, render); dla pracy LLM — nazwa etapu i czas, bez fikcyjnego procentu.

## 1. Materiał

Jedna kolumna, kolejność decyzji:
1. Plik z komputera albo „Weź master z QuickContent” (lista projektów QC).
2. Klient lub „Bez klienta”; branding/styl (z oznaczeniem „Styl poziomy wymaga uzupełnienia”, gdy brak `T16`).
3. Intensywność: **Spokojna / Standard / Dynamiczna** (segment control, domyślnie Standard) z jednym zdaniem opisu.
4. Przełączniki z domyślnymi: Cenzura przekleństw ✓, Research i źródła ✓, Cold open (propozycja) ✓.
5. Zwinięte „Zaawansowane”: próg ciszy, oddech na krawędziach, `muteRatio`, głośność kruka, rozdzielczość wyjściowa.
6. Główna akcja **„Przetwarzaj”** + zdanie: „Najpierw dostaniesz pocięty materiał do przejrzenia. Montaż ruszy po Twoim zatwierdzeniu.”

## 2. Cięcia (przegląd rough cut) — najważniejszy ekran

```text
┌──────────────────────────────────────┬────────────────────────────────────┐
│ ▶ Podgląd po cięciach (16:9)         │ Filtr: [Wszystkie] Cisza Wtrącenia  │
│ [Po cięciach | Oryginał]             │ Falstarty Dubli Powtórzenia Cenzura │
│ ── oś z zaznaczonymi cięciami ──     │ ⚠ Do decyzji (4)                    │
│                                      │                                    │
│ Wycięto 3:42 z 14:10 (26%)           │ …i to jest ~~yyy~~ najważniejsze    │
│ 128 cięć · 4 do decyzji              │ [✂ Dubel] ~~Bo w tym roku…~~        │
│                                      │   „zostaje późniejsza, pełna wersja”│
│                                      │   [Przywróć] [▶ Odsłuchaj oba]      │
│                                      │ k***a [Cenzura] [Wyłącz]            │
└──────────────────────────────────────┴────────────────────────────────────┘
                        [Zatwierdź cięcia i przejdź do planu]
```

(Liczby w makiecie są przykładowe.)

- Transkrypt jest głównym narzędziem: usunięte słowa przekreślone + etykieta rodzaju z ikoną i tekstem (np. „✂ Dubel”, „Cisza 0,8 s”). Kliknięcie słowa przewija odtwarzacz.
- Każde cięcie: powód jednym zdaniem, pewność (słownie: pewne / prawdopodobne / do decyzji), „Przywróć”, „Odsłuchaj przed/po”. Dla dubli: „Odsłuchaj oba ujęcia” i „Zostaw tamto ujęcie”.
- „Do decyzji” zebrane w osobnym filtrze z licznikiem; zatwierdzenie nie jest blokowane, ale niezdecydowane = **nie tniemy** (domyślnie zachowujemy).
- Własne cięcie: zaznacz tekst → „Wytnij zaznaczone”. Cofnij/ponów (⌘Z / ⇧⌘Z).
- Skróty: Spacja odtwórz, J/K/L, X przełącz cięcie pod kursorem, N/P następne/poprzednie cięcie, F filtr „do decyzji”. Wszystko dostępne także przyciskami.
- Masowe: „Przywróć wszystkie: Powtórzenia”. Zmiany zapisują się automatycznie z rewizją (409 → zachowaj draft, komunikat).
- Główna akcja: **„Zatwierdź cięcia”**. Po zatwierdzeniu krok 2 pozostaje do podglądu; ponowna edycja cięć unieważnia plan i render (jawny komunikat).

## 3. Plan

- Lewa kolumna: rozdziały (rola, tytuł, czas) — przeciągalna granica wstępu, gdy pewność < 0,7 (ostrzeżenie przy rozdziale).
- Hook: 3 karty wariantów (tekst, typ, jedno zdanie „dlaczego”), wybrany oznaczony; „Własny tekst”.
- Cold open: podgląd 3–8 s fragmentu + „Dodaj” / „Pomiń”.
- Oś efektów: tory Napisy · Kadr/zoom · Grafiki · Przebitki · Efekty z wycięciem · Przejścia · SFX. Klik w blok → karta: typ, `why`, parametry, źródło/licencja, „Usuń”, „Zamień na…”, „Wygeneruj ponownie ten efekt”.
- Licznik intensywności (efekty H we wstępie/rozdziałach) zgodny z regułami; przekroczenie = ostrzeżenie, nie blokada.
- Research: lista źródeł z linkami; liczba bez źródła nie może trafić na oś.
- Główna akcja: **„Akceptuj plan i montuj”**.

## 4. Montaż

Lista zadań z etapami i prawdziwym postępem: pobieranie Pexels (X/Y plików), segmentacja (% klatek), logotypy, render (% klatek). Błąd jednego assetu nie zatrzymuje reszty — efekt dostaje stan „zastąpiony wariantem bez …” z możliwością ponowienia.

## 5. Wynik

- Player wyniku, wersje (`v001…`, wcześniejsze oznaczone), badge „Aktualny” tylko przy zgodnej rewizji.
- Zakładki: Napisy (ręczna korekta tekstu, bez czasów) · Czat poprawek · Opis publikacji (z rozdziałami YouTube, koszt osobno) · Eksport: MP4, „Pakiet do Premiere (.otio + overlaye)”.
- Zwinięte: koszty (analiza / plan / poprawki — rzeczywiste, szacowane, brak danych), historia, log.

## Stany puste i błędy

Każdy błąd: przyczyna + jak naprawić + „Ponów ten krok” (np. „Pexels: limit 200/h — ponowimy automatycznie o …”). Zlecenia z panelu nigdy nie pytają w czacie.
