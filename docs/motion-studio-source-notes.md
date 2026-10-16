# Źródło i zakres Motion Studio

Źródło: dostarczony przez Wiktorię 15-stronicowy PDF „Kopia How to Build a Motion Design Studio With Opus 5.5.pdf.pdf”, odczyt tekstu przez PyMuPDF. Polecenie: dodatkowa funkcja w MontageFrames, wykorzystująca istniejące narzędzia. Ta notatka ustala zakres; nie jest dowodem wykonania funkcji ani testów.

## Mapowanie poradnika na istniejący produkt
- Str. 2, 4–5: deterministyczna klatka jako funkcja czasu. Remotion jest już obecny i renderuje po klatkach: wykorzystać useCurrentFrame + czyste funkcje animacji, nie dodawać drugiego silnika HTML/Playwright tylko po to, by literalnie nazwać API window.seek(t).
- Str. 6–8: prawdziwe assets, brief produktu, referencje i lista stanów/ujęć. Oddzielić materiały własne lub dopuszczone przez użytkowniczkę od wymyślonych danych. URL nie jest dowodem dostępności/licencji zasobów.
- Str. 8–9: sprężyny w postaci jawnej funkcji i tor wielu zmian. Ruch nie może zależeć od odtworzenia poprzednich klatek, zegara, losowości bez seeda czy CSS transition. Render tej samej klatki po skoku w osi powinien być identyczny.
- Str. 9–10: beat grid i synchronizacja. BPM ustawiony ręcznie tworzy **szacowaną siatkę**, nie analizę utworu. Algorytm PDF beats[::4] nie rozpoznaje rzeczywistych downbeatów/metrum. Nie nazywać go pomiarem muzyki.
- Str. 10–12: contact sheet, podgląd w rozmiarze telefonu, poster i pętla jakości. Oceny nie mogą być automatycznie zmyślone, próg 8/10 i 3 rundy są kontrolą gotowości produkcyjnej; preview/draft mogą powstać wcześniej jako jawne szkice. Sam fakt zapisania 8 w JSON nie dowodzi estetyki.
- Str. 12–13: plan → stills → rough cut → final, dokumenty i handoff. Skończone kodowanie modułu nie jest ukończeniem filmu klienta.
- Str. 14–15: rozdzielenie szablonu, oferty i użytkowania. Cennik, obietnice wyników ani budżet klienta nie wynikają z PDF i nie są wprowadzane automatycznie.

## Zasady adaptacji
- Nie wymuszać literalnego `claude-opus-5-5` ani poziomów xhigh/max — ich dostępność i zgodność CLI nie zostały tu zweryfikowane. Korzystać z aktualnej konfiguracji istniejącego operatora.
- Nie wykonywać poleceń globalnego `pip`/`brew` z PDF: FFmpeg/FFprobe/Node/Remotion już są. Nie instalować globalnych hooków/skilli w tym zakresie.
- Zakazy efektów PDF dotyczą nowego języka motion, nie uprawniają do usunięcia zatwierdzonych glass/glow w obecnych rolkach. PREFERENCJE.md i profil konkretnego klienta nadrzędne.
- Muzyka -14 LUFS dotyczy nowego miksu motion. Materiał mówiony i SFX respektują ustalone relacje głośności (-10 dB względnie do wypowiedzi), nie mechaniczne normalizowanie każdej ścieżki osobno.
- Model jakości, storyboard i asset paths muszą być walidowanymi danymi, nie dowolnym wykonywalnym kodem z zewnętrznego URL. Zachować ochronę CSRF istniejącego panelu, ścieżki w dozwolonych katalogach, limity długości/złożoności i brak automatycznego spendu.
- Wersja funkcji powinna działać bez AI i z własnymi materiałami; przycisk AI, jeżeli obecny, dopiero po jawnej akcji i przez skonfigurowanego operatora. Niedostępny operator to jawny błąd, nie fałszywy plan „od AI”.

## Stan przed pracami
Main z lokalnymi zmianami użytkowniczki. Snapshot binarnego diffu istnieje w /tmp/montageframes-before-motion.patch. Baseline npm test: 34 passed, 0 failed. Core montażu i public/reels/vital-hormone-17 nie są zakresem refaktoru nowej funkcji.
