# Bez zoomów Bisanza i opisy publikacyjne

2026-10-15. Zlecenie obejmuje wykonanie i sprawdzenie wGUI.

1. Profil Bisanz wyłącza skalowanie kamery w renderze i w przygotowaniu danych; zachować przesunięcie trackingu, napisy i hook. Poprawić istniejącą rolkę i wyrenderować nową wersję.
2. Wspólny generator opisu dla ukończonych rolek, także starszej ścieżki renderu: gpt-6-lunaAPI, tylko faktyczne słowa w wybranych segmentach, ton klienta, hook+puenta+5hashtagów. Klucz z istniejącego.env, bez ujawniania. Walidacja i trwałyJSON/TXT, hashowany tekst wejścia dla reużycia po zmianach samego kadru. Błąd nie unieważniaMP4.
3. GUI przy gotowym filmie i w edytorze: opis, kopiowanie, status/błąd i ponowienie samego opisu. Osobne koszty i trwałyusage. Brak ponownego renderu/ASR przyretryopisu.
4. Testy kontraktu/dedup i błędu, integracja zakończenia renderu, realneAPI dla tej jednej rolki, nowyMP4 i sprawdzonyGUI. Nie generować samoczynnie opisów całej archiwalnej biblioteki.


## Weryfikacja implementacji

- cameraScale zwraca1 dlaBisanza niezależnie od wpisanego zoomu i ścieżki skali. W poprawianej rolce6segmentówzoom/zoomTo1;45punktówtrackinguXY zachowane, skalowaniepunktów usunięte. Hookpodnapisami bez zmian.
- Wspólny generator używa dokładnego modelu `gpt-6-luna` przezResponsesAPI ([oficjalny model](https://developers.openai.com/api/docs/models/gpt-6-luna), sprawdzono2026-10-15). Rawtranscript + poprawki ASR + wybrane segmenty, bez utraty słów usuniętych z napisów dla grafik. Dokładnie5różnychhashtagów, cachetreści,JSON/TXT, trwałeusageprzedwalidacją, deduplikacja równoległych żądań.
- Wykryte przez review problemy domknięte: statusgenerating wtrakcie API; snapshottreści plus kontrola aktualnościQC; podpisywejścia iMP4 dla zwykłych renderów; POST przekazujezweryfikowanysnapshot; osobnykoszt również w zwykłym edytorze. Gotowy film pozostajeprzybłędzieopisu. Brakmasowego płatnegobackfillu.
- Testy220/220PASS; lint/TypeScript0błędów/24 wcześniejsze ostrzeżenia; gitdiffcheckPASS. Rzeczywisty render iAPI wtrakcie; wynik pomiaru będzie w `nozoom-description-proof.json`.

## Korekta czytelności napisów — 2026-10-15

- Preferencje klienta zapisane przed zmianami. Bisanz otrzymał wejście całej grupy w4klatkach i wyjście w2klatkach. Tekst jest widoczny w całości; czas słowa steruje markerem, nie ukrywaniem liter. Pozostałe motywy korzystające z kineticCaptions zachowują dotychczasowy ruch.
- Grupy w prep Bisanza: max6słów, max42znaki, miękka granica od4słów. Istniejąca rolka:29grup zamiast33,134/134słów, niezmienione czasyASR,6segmentów bez zoomów i45próbek trackingu.
- Ekspozycja celuje w1s, ale opóźnienie jest ograniczone do0,35s oraz następnej grupy/końca filmu. Testy szybkich końcowych zdań zabezpieczają przed utratą napisów.
- Naprawa rzeczywistego400API opisów: schemat dostawcy bez nieobsługiwanego wzorcaUnicode; lokalna walidacja nadal wymaga poprawnych, unikalnych5hashtagów.
- Kontrola niezależnego review: zgłoszone kolizje końcowych grup zamknięte; potwierdzono29/29grup i134słowa. Dowód eksportu: `readable-captions-proof.json` po ukończeniu renderu.

## Korekta po odbiorze użytkowniczki — 2026-10-15

- Statyczne pełne bloki odrzucone. Przywrócono rise/slide/drop/pop/letters/color według wcześniejszych grup. Intensywność i droga ruchu zmniejszone ookoło15%; wejścia mają limit czasu, aby tekst i każda litera były odsłonięte przed wyjściem. Wyprzedzenie tekstu do0,25s, maksymalnie do poprzedniego słowa. To zastępuje opis pełnych statycznych bloków powyżej.
- Sprawdzenie actualcomponent testami React/Remotion: późne25-literowe słowo i efekt koloru kończą wejście przed wyjściem; osiem wariantów nadal daje różny ruch; inne motywy nie dziedziczą tej korekty.
- Opisy: globalny promptv2 w pierwszej osobie. Trwałe wytyczne projektu przed pierwszym montażem, opcjonalne nadpisanie dla rolki; tekst gotowego opisu edytowalny i zapisywany bezAI i bez renderu. Wytyczne mają wpływ na cache/hash, ręczna edycja zachowuje pomiar kosztu.
- API: `PUT /api/description/:name` osobno `{instructions}` lub `{text}`. Projekt: `PUT /api/quickcontent/projects/:id/description` zrewizją. GET nie wywołuje płatnego API.

### Odbiór końcowy

Gotowa wersja `qc-c310ad37c2e34aed-56c8858e0acc6c3d-v006.mp4`:1080×1920,H264/AAC,42,581s; pobieranie200,aktualna rewizja10. Obejrzano zestaw klatek29/29grup,134słowa. OpisGPT‑6Lunav2 gotowy w pierwszej osobie i5hashtagach. PrzezGUI zapisano wskazówki, poprawiono zdanie opisu i skopiowano tekst; liczba wywołańAPI po ręcznej poprawce bez zmian. Zrzut: `assets/description-edit-ready.png`. Pełny dowód: `animated-captions-description-proof.json`.
