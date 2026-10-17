# Branding klientów — zgodność wizualna rozszerzenia

Sprawdzenie źródłowe: 2026-10-17. Zakres: `ui/Branding.tsx`, `ui/branding.css`, `src/branding/BrandPreview.tsx`, porównane z `ui/panel.css`, `PRODUCT.md` i `.impeccable/surfaces/ui-branding-tsx.md`. To zapis dowodów dotyczących jednej powierzchni, nie nowy system wizualny całego produktu. Nie zmieniono istniejących plików systemu ani landing page.

## Zachowane podstawy panelu

- **Paleta:** rozszerzenie odwołuje się do istniejących zmiennych: tło `--bg: #f5f8fc`, biała powierzchnia `--surface: #ffffff`, warstwa `--raised: #edf3fc`, tekst `--text: #17243b`, tekst pomocniczy `--muted: #52627a`. Akcje i wybór korzystają z `--accent: #1d4ed8`, `--accent-hover: #1e40af`, `--accent-soft: #eff6ff` i `--accent-ink: #ffffff`; błędy z `--danger: #b42318`. Kolory wybrane dla klienta są danymi podglądu filmu i nie zastępują palety panelu.
- **Typografia:** Fustat z lokalnego pliku, baza 400 16px/1.5, odziedziczona przez formularze i przyciski. Nagłówek brandingu ma 32px/1.2 (28px na telefonie), nagłówek sekcji 23px/1.25, podsekcja 18px, wskazówki i metadane 14px. Są to zaobserwowane role tej powierzchni, nie nowa globalna skala.
- **Reguła wspólnej akcji:** zapis używa istniejącego `.btn.primary`; inne akcje istniejącego `.btn`. Panel dostarcza minimalną wysokość 44px, promień 10px, zmianę kolorów 150ms ease oraz widoczny fokus 2px z odstępem 2px. Sekcje i pola rozszerzenia również mają wysokość co najmniej 44px.
- **Reguła spokojnych warstw:** biel i jasne tonalne tła oddzielają edytor, sekcje oraz statusy; branding nie dodaje własnych cieni. Pola i przełączniki mają promień 8px, większe kontenery i podgląd 14px; są to lokalne warianty istniejącej zaokrąglonej geometrii panelu.
- **Reguła edycji z podglądem:** desktop ma dwie kolumny, lewą na edytor i prawą na przyklejony podgląd 9:16. Odstęp wynosi 32px, 20px poniżej 1050px i 48px powyżej 1500px. Do 760px przełączniki wybierają edytor albo podgląd. Wejście sekcji trwa 200ms z przesunięciem 4px; preferencja ograniczonego ruchu usuwa tę animację.

## Dowody w komponentach

`Branding.tsx` używa rodzimego etykietowania pól, jawnego przycisku zapisu, regionów `status` i `alert`, oddzielnej sekcji sugestii oraz podpisanego podglądu. `BrandPreview.tsx` odtwarza próbkę 1080×1920, 30fps, 120 klatek przez Remotion Player; napisy i logo korzystają z tych samych komponentów co film. Automatyczne odtwarzanie zaczyna się dopiero po ręcznym ponownym uruchomieniu. Neutralne tło próbki ma lokalny kolor `#26364D`; etykieta próbki białą czcionkę sans-serif 34px. Te wartości opisują wyłącznie planszę przykładową.

## Niekanonizowane odstępstwa i ograniczenia

Istniejący znak panelu (`.brand i`) ma twardy przesunięty cień; nie zapisano go jako wzorca dla nowych powierzchni, ponieważ przegląd rozszerzenia nie upoważnia do globalnej korekty tego detalu. Lokalny kolor tła błędu `#fff0ed`, promień 14px oraz techniczna etykieta sans-serif podglądu pozostają lokalnymi wartościami, a nie nowymi tokenami produktu. Przegląd źródłowy nie potwierdza kontrastu każdej możliwej palety klienta ani pełnego odbioru działania w przeglądarce. Nie tworzono rootowego `DESIGN.md` ani sidecara: zadanie rozszerza istniejący panel i nie ustanawia nowego świata wizualnego.
