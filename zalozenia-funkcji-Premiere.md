# Założenia funkcji — MontageFrames jako plugin Adobe Premiere Pro

Data: **2026-10-15**. Stan: **plan na przyszłość — nic nie jest zaimplementowane.** Kontrakt wspólny dla Claude Code i Codex.

Powiązane: [plan wdrożenia](plan-wdrozenia-Premiere.md) · [research UXP](docs/premiere/research.md) · [LongForm](zalozenia-funkcji-LongForm.md) · [QuickContent](zalozenia-funkcji-QuickContent.md) · [AGENTS.md](AGENTS.md).

## 1. Efekt dla użytkowniczki

Pracuję w Premiere Pro. Importuję nagrania do projektu jak zwykle. Otwieram panel **MontageFrames** (Okno → Rozszerzenia), zaznaczam klip lub sekwencję i wybieram, co ma się stać: rolka pionowa (styl klienta), film poziomy LongForm, QuickContent z długiego materiału albo sama redakcja (cisza, wtrącenia, dubli, cenzura). MontageFrames przetwarza **pliki, które już są w moim projekcie**, pokazuje przegląd cięć w panelu, a po zatwierdzeniu **buduje montaż w Premiere**: natywne cięcia na osi, markery rozdziałów, keyframy zoomów, napisy, animacje i grafiki jako warstwy na ścieżkach powyżej, SFX na osobnej ścieżce. Wszystko mogę dalej edytować ręcznie w Premiere.

## 2. Zasady nadrzędne

- **Silnik zostaje jeden.** Analiza, redakcja, plan, style klientów, efekty i render animacji zostają w MontageFrames (Node + Remotion + operator AI). Plugin jest cienkim klientem: wybiera media, pokazuje przegląd, stosuje plan w Premiere. Nie przepisujemy logiki do UXP.
- **Ten sam plan danych.** Plugin stosuje ten sam `reel.json` (segmenty, wyciszenia, rozdziały, overlaye), który renderuje Remotion. Każda funkcja silnika ma deterministyczne przełożenie na oś Premiere albo jawny fallback (wyrenderowana warstwa alfa).
- **Media zostają w projekcie.** Źródło nie jest przekodowywane ani kopiowane bez potrzeby; MontageFrames czyta ścieżkę pliku z projektu (proxy do analizy wolno tworzyć w cache). Renderujemy tylko to, czego Premiere nie zrobi natywnie (animacje, grafiki, maski).
- **Nic nie znika bez zgody.** Plugin buduje **nową sekwencję** (`<nazwa> — MontageFrames vNNN`) i nie modyfikuje sekwencji użytkowniczki, chyba że wybierze „Zastosuj w tej sekwencji” (wtedy najpierw kopia zapasowa sekwencji). Operacje w transakcjach, z możliwością Cofnij w Premiere.
- **Lokalnie i prywatnie.** Komunikacja tylko z lokalnym serwerem MontageFrames na tym komputerze. Media nie trafiają do nowych serwerów zewnętrznych — tylko do usług, których silnik już używa (operator AI na koncie, Pexels, opis GPT‑6 Luna zgodnie z PREFERENCJE.md).
- **Uczciwość wobec API.** Deklarujemy tylko funkcje potwierdzone w zainstalowanej wersji Premiere (spike P0). Brak API = fallback przez import OTIO/XML, nie udawanie.

## 3. Wymagania środowiska

- Premiere Pro **≥ 25.6** (oficjalny UXP; import `.otio`). Starsze wersje: tylko pakiet eksportowy z FCP7 XML (etap P1), bez panelu.
- macOS (silnik używa Apple Vision i FFmpeg z Homebrew). Windows — poza zakresem do odwołania.
- Uruchomiony MontageFrames (`npm run ui`) albo — docelowo — serwer startowany jako usługa użytkownika.

## 4. Ścieżka ewolucji (każdy etap daje wartość samodzielnie)

| Etap | Co dostaje użytkowniczka | Wymaga pluginu |
|---|---|---|
| **P0 Spike** | potwierdzona lista działających API UXP w jej Premiere | panel testowy (dev) |
| **P1 Pakiet do Premiere** | w panelu MontageFrames przycisk „Pakiet do Premiere”: `.otio` (+ FCP7 XML), audio z cenzurą, overlaye ProRes 4444 alfa, SFX, markery rozdziałów, napisy `.srt` | nie |
| **P2 Panel „import jednym kliknięciem”** | panel w Premiere listuje gotowe projekty MontageFrames i importuje pakiet do projektu, linkując media | tak |
| **P3 Montaż na plikach z projektu** | zaznaczam klip w Premiere → MontageFrames analizuje → przegląd cięć w panelu → montaż budowany natywnie w nowej sekwencji | tak |
| **P4 Dwukierunkowość** | ręczne zmiany w Premiere (np. przesunięte cięcie) wracają do MontageFrames jako korekta planu; ponowne zastosowanie efektów bez nadpisania ręcznej pracy | tak |
| **P5 Dystrybucja** | instalator `.ccx`, aktualizacje, wersjonowanie zgodne z silnikiem | tak |

## 5. Mapowanie planu na Premiere

| Element `reel.json` | W Premiere | Fallback |
|---|---|---|
| `segments` | klipy źródła wstawione kolejno (insert/overwrite), in/out w czasie źródła | import `.otio` |
| `segments[].zoom/zoomTo`, `framing.tracking` | keyframy efektu Motion (Scale/Position) na klipie | warstwa wideo wyrenderowana z kadrowaniem |
| `mutes` + kruk | keyframy głośności (0) z rampami + klip SFX na A2 | `audio-censored.wav` z FFmpeg |
| `chapters` | markery sekwencji (nazwa = tytuł, kolor wg roli) | markery w `.otio` |
| `captions` (kinetic klienta) | warstwa alfa ProRes 4444 z Remotion na V3 (wygląd 1:1) **oraz** opcjonalnie track napisów z transkryptu (edytowalny tekst, prosty styl) | `.srt` |
| `overlays` (grafiki, efekty, B-roll) | B-roll Pexels: natywny klip na V2; grafiki/animacje: ProRes 4444 alfa na V2+; proste plansze: MOGRT, gdy klient ma szablon | warstwy alfa w `.otio` |
| efekty z maską | warstwa osoby (alfa) + tło/tekst jako osobne warstwy (edytowalna kolejność) | jedna spłaszczona warstwa |
| SFX | klipy audio na A2/A3, −10 dB względem wypowiedzi | stem audio |

## 6. Panel (UX)

Panel UXP w stylu Premiere (ciemny, natywne kontrolki Spectrum), cztery widoki: **Połączenie** (status serwera, wersje) → **Wybór** (zaznaczony klip/sekwencja, tryb: Rolka / Film poziomy / QuickContent / Tylko redakcja, klient, intensywność) → **Przegląd cięć** (uproszczona lista cięć z powodami i przełącznikami; pełny przegląd: „Otwórz w MontageFrames”) → **Zastosuj** (postęp etapów; wynik: nowa sekwencja, raport fallbacków). Błędy z przyczyną i „Ponów”.

## 7. Bezpieczeństwo i ograniczenia

- Manifest UXP deklaruje wyłącznie lokalny adres serwera MontageFrames i dostęp do plików wybranych przez użytkowniczkę. Bez ogólnego dostępu do sieci.
- Token parowania panel ↔ serwer (losowy, przechowywany lokalnie), żeby inny program na komputerze nie sterował montażem.
- Ścieżki mediów z projektu są danymi: walidowane, bez wykonywania poleceń z nazw plików.
- macOS ogranicza niezaszyfrowane HTTP w UXP — połączenie przez HTTPS z lokalnym certyfikatem albo wymiana plików we wspólnym folderze (decyzja w P0).

## 8. Kryteria odbioru (całość)

1. Klip zaimportowany do Premiere → nowa sekwencja z cięciami identycznymi jak w podglądzie MontageFrames (różnica ≤ 1 klatka).
2. Cenzura słyszalna jak w renderze MontageFrames; zoomy jako edytowalne keyframy.
3. Warstwy animacji wyglądają 1:1 jak render Remotion i są wyrównane w czasie do klatki.
4. Sekwencja użytkowniczki nienaruszona; Cofnij w Premiere cofa operację.
5. Brak serwera / brak API → czytelny komunikat i fallback przez pakiet, bez częściowo zepsutej sekwencji.
