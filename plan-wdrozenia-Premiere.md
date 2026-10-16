# MontageFrames × Premiere Pro — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MontageFrames działa jako panel Premiere Pro: przetwarza klipy z projektu Premiere i buduje montaż natywnie na osi, z animacjami jako warstwami alfa.

**Architecture:** Silnik zostaje w MontageFrames (Node, Remotion, operator AI). Najpierw eksport pakietu (OTIO + overlaye) bez pluginu, potem cienki panel UXP rozmawiający z lokalnym serwerem i stosujący `reel.json` przez API Premiere. Każda funkcja panelu ma fallback przez pakiet.

**Tech Stack:** Premiere Pro ≥ 25.6, UXP Manifest v5, UXP Developer Tool, TypeScript (bez frameworka w panelu na start), Node ≥ 22 (serwer MontageFrames), OpenTimelineIO JSON, FFmpeg (ProRes 4444 alfa, audio z cenzurą), Remotion (render overlayów z przezroczystością).

**Spec:** [zalozenia-funkcji-Premiere.md](zalozenia-funkcji-Premiere.md) · [research](docs/premiere/research.md). Zależy od: [LongForm](plan-wdrozenia-LongForm.md) etap L2 (`roughcut`, `segments`, `mutes`, Task 8 `longform-otio`).

**Status 2026-10-15:** plan na przyszłość; nic nie zaimplementowano. P1 można zacząć razem z LongForm L2. P2+ dopiero po P0.

## Global Constraints

- Plugin nie zawiera logiki montażu — tylko wybór mediów, przegląd i zastosowanie planu.
- Zawsze nowa sekwencja `… — MontageFrames vNNN`; istniejące sekwencje nienaruszone bez jawnego wyboru i kopii zapasowej.
- Komunikacja tylko z lokalnym serwerem, z tokenem parowania; manifest bez ogólnej sieci.
- Czas: źródłem prawdy są sekundy źródła z `reel.json`; konwersja do klatek/ticków w jednym module (`scripts/premiere-time.mjs` i lustro w panelu), z testami.
- Funkcja bez potwierdzonego API = fallback przez pakiet + komunikat, nigdy częściowy wynik.
- Ponytail: bez bundlera i frameworka UI w panelu, dopóki zwykły TS + HTML wystarcza.

## Etapy

| Etap | Zadania | Odbiór |
|---|---|---|
| **P0 Spike API** | 1 | raport `docs/premiere/api-spike.md`: działające wywołania w wersji użytkowniczki, sygnatury, limity transakcji, wybrany kanał komunikacji |
| **P1 Pakiet do Premiere** | 2–4 | z panelu MontageFrames: `.otio` + `audio-censored.wav` + overlaye alfa + `.srt`; import w Premiere daje poprawny montaż |
| **P2 Panel: import pakietu** | 5–6 | panel w Premiere listuje projekty i importuje pakiet jednym kliknięciem |
| **P3 Montaż na plikach z projektu** | 7–9 | zaznaczony klip → analiza → przegląd → nowa sekwencja zbudowana natywnie |
| **P4 Dwukierunkowość** | 10 | zmiany ręczne odczytane przez OTIO i pokazane jako diff do zatwierdzenia |
| **P5 Dystrybucja** | 11 | `.ccx`, instrukcja instalacji, zgodność wersji panel ↔ serwer |

## Mapa plików

| Plik | Odpowiedzialność | Etap |
|---|---|---|
| `premiere/manifest.json` | Manifest v5, host `premierepro` ≥ 25.6, uprawnienia sieci (lokalny serwer) i plików | P0 |
| `premiere/index.html`, `premiere/main.ts` | panel: Połączenie / Wybór / Przegląd / Zastosuj | P0, P2–P3 |
| `premiere/ppro.ts` | jedyne miejsce wywołań API Premiere | P2–P3 |
| `premiere/time.ts` | lustro `scripts/premiere-time.mjs` | P2 |
| `scripts/premiere-time.mjs` (+ test) | sekundy ↔ klatki/RationalTime | P1 |
| `scripts/longform-otio.mjs` (+ test) | `reel.json` → OTIO (plan LongForm, Task 8) | P1 |
| `scripts/premiere-package.mjs` (+ test) | pakiet: OTIO, FCP7 XML (opcjonalnie), audio z cenzurą, overlaye alfa, `.srt`, opis pakietu | P1 |
| `src/OverlayOnly.tsx` + wpis w `src/Root.tsx` | kompozycja: same napisy/overlaye na przezroczystym tle | P1 |
| `ui/premiere-server.mjs` (+ test) | parowanie, lista pakietów, analiza ścieżki z Premiere, status | P2–P3 |
| `docs/premiere/*.md` | spike, odbiór, instalacja | każdy |

---

### Task 1 (P0): Spike API UXP

- [ ] Zainstaluj UXP Developer Tool; utwórz `premiere/manifest.json` (Manifest v5, `host: [{ "app": "premierepro", "minVersion": "25.6.0" }]`) i panel „hello”.
- [ ] Na kopii testowego projektu sprawdź po kolei i zapisz wynik (działa / sygnatura / błąd) w `docs/premiere/api-spike.md`:
  1. odczyt zaznaczonego elementu projektu i jego ścieżki pliku;
  2. utworzenie sekwencji z ustawieniami klipu;
  3. wstawienie 3 zakresów in/out tego samego klipu kolejno (insert vs overwrite), dokładność do klatki;
  4. marker sekwencji z nazwą i kolorem;
  5. keyframy Scale/Position efektu Motion; keyframy głośności;
  6. import `.mov` ProRes 4444 i umieszczenie na V2 w czasie T;
  7. import `.otio` przez API importu;
  8. import transkryptu/napisów;
  9. limit akcji w transakcji i zachowanie Cofnij;
  10. sieć: `https://127.0.0.1:<port>` z certyfikatem lokalnym, `wss://`, fallback przez folder.
- [ ] Decyzja kanału komunikacji i lista funkcji natywnych vs fallback. Wpis w AGENTS.md (sekcja Premiere) — tylko potwierdzone fakty.

### Task 2 (P1): Wspólna konwersja czasu

**Files:** Create `scripts/premiere-time.mjs`, `scripts/premiere-time.test.mjs`.

- [ ] Step 1: Test

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { toFrames, toRational } from "./premiere-time.mjs";

test("sekundy → klatki przy 25 fps (najbliższa klatka)", () => {
  assert.equal(toFrames(1.02, 25), 26);
});
test("NTSC 30000/1001: 1 s = 30 klatek, rate 29.97", () => {
  assert.deepEqual(toRational(1, { num: 30000, den: 1001 }), { value: 30, rate: 30000 / 1001 });
});
```

- [ ] Step 2: `npm test` → FAIL.
- [ ] Step 3: Implementacja

```js
const rateOf = (fps) => (typeof fps === "number" ? fps : fps.num / fps.den);
export const toFrames = (sec, fps) => Math.round(sec * rateOf(fps));
export const toRational = (sec, fps) => ({ value: toFrames(sec, fps), rate: rateOf(fps) });
```

- [ ] Step 4: PASS. Commit.

### Task 3 (P1): Kompozycja samych overlayów

**Files:** Create `src/OverlayOnly.tsx`; Modify `src/Root.tsx` (rejestracja z `calculateReelMetadata`), `scripts/studio-sync.mjs` (zachowanie wpisu przy regeneracji Root).

- [ ] Kompozycja renderuje `captions` i `overlays` rolki bez warstwy wideo źródła, tło przezroczyste, oś wyniku jak w `Reel`.
- [ ] Render testowy: `npx remotion render OverlayOnly out/ov.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --props='{"reel":"<rolka>"}'`; ffprobe pokazuje `pix_fmt` z alfą; klatka na szachownicy.
- [ ] Render tylko zakresów z treścią (osobny plik na zakres) zamiast całej osi. Commit.

### Task 4 (P1): Pakiet do Premiere

**Files:** Create `scripts/premiere-package.mjs` (+ test); Modify `ui/longform-server.mjs` i `ui/quickcontent-server.mjs` (przycisk „Pakiet do Premiere” w Wyniku).

- [ ] Wyjście `klienci/<klient>/Premiere/<nazwa>-vNNN/` (bez klienta `out/premiere/…`): `timeline.otio`, `timeline.xml` (gdy dostępny `otioconvert`), `audio-censored.wav`, `overlays/*.mov`, `captions.srt`, `sfx/*`, `package.json` (wersja schematu, fps, ścieżka źródła, lista plików, sumy kontrolne).
- [ ] OTIO: V1 klipy źródła (`segments`), V2+ overlaye w czasie wyniku, A1 `audio-censored.wav`, A2 SFX; markery = rozdziały. Ścieżka źródła absolutna (Premiere: Link Media, gdy offline).
- [ ] Test: struktura pakietu, długość OTIO = `reelFrames`, overlaye w czasie wyniku (`toOut()`).
- [ ] Ręczny odbiór w Premiere ≥ 25.6 (cięcia, cenzura, overlaye co do klatki) → `docs/premiere/acceptance.md`. Commit.

### Task 5 (P2): Serwer dla panelu + parowanie

**Files:** Create `ui/premiere-server.mjs` (+ test); Modify `ui/server.mjs`.

- [ ] Kanał z P0. Parowanie: panel pokazuje kod, użytkowniczka potwierdza go w panelu MontageFrames → token po obu stronach; każde żądanie z tokenem, bez tokenu 401.
- [ ] Endpointy: `GET /api/premiere/projects`, `GET /api/premiere/package/:id`, `GET /api/premiere/health` (wersje schematu). Testy: brak tokenu, zła wersja schematu.

### Task 6 (P2): Panel — import pakietu

**Files:** `premiere/index.html`, `premiere/main.ts`, `premiere/ppro.ts`.

- [ ] Widok Połączenie (status, parowanie) i lista pakietów; „Importuj” = import `.otio` (lub budowa sekwencji wywołaniami z P0), bin `MontageFrames/<nazwa>-vNNN` z overlayami i SFX.
- [ ] Błąd w połowie → wycofanie lub usunięcie częściowej sekwencji + komunikat z „Ponów”. Odbiór ręczny na 2 pakietach.

### Task 7 (P3): Analiza pliku z projektu Premiere

- [ ] Panel: zaznaczony klip → ścieżka z projektu → `POST /api/premiere/analyze { mediaPath, mode, client, intensity }` → serwer tworzy projekt LongForm/QuickContent/rolki z **odwołaniem do pliku** (bez kopiowania; proxy do analizy w cache) → status w panelu.
- [ ] Walidacja ścieżki (istnieje, plik wideo, dozwolone rozszerzenia); procesy przez `spawn` z tablicą argumentów, nigdy przez powłokę.

### Task 8 (P3): Przegląd cięć w panelu

- [ ] Uproszczona lista cięć (rodzaj, powód, czas, przełącznik) zsynchronizowana z `roughcut.json` przez API z rewizją; „Otwórz w MontageFrames” do pełnego przeglądu; „Zatwierdź” = to samo co w panelu przeglądarkowym.

### Task 9 (P3): Natywne zastosowanie planu

**Files:** `premiere/ppro.ts`, `premiere/time.ts`.

- [ ] W transakcjach (limit z P0): nowa sekwencja → `segments` jako klipy źródła (in/out) → keyframy Motion dla `zoom/zoomTo/tracking` → keyframy głośności dla `mutes` + klip kruka → markery rozdziałów → overlaye alfa (Task 3) na V2+ → B-roll Pexels jako natywne klipy → SFX.
- [ ] Raport: co natywnie, co fallbackiem. Odbiór: kryteria §8 założeń.

### Task 10 (P4): Odczyt ręcznych zmian

- [ ] Panel eksportuje sekwencję przez `ProjectConverter` do OTIO → serwer porównuje z planem (cięcia przesunięte, usunięte, dodane) → diff w MontageFrames do zatwierdzenia → nowa wersja `reel.json`; efekty stosowane do **nowej** sekwencji `vNNN+1`.

### Task 11 (P5): Dystrybucja

- [ ] Pakowanie `.ccx` z UDT, instrukcja `docs/premiere/instalacja.md`, kontrola zgodności panel ↔ serwer (`/health`), lista znanych ograniczeń. Publikacja w Adobe Exchange tylko na osobne polecenie.

## Review Focus

1. Dryf czasu: fps źródła ≠ fps sekwencji, NTSC, VFR — Task 2/9.
2. Częściowo zbudowana sekwencja po błędzie — Task 6/9.
3. Bezpieczeństwo kanału panel ↔ serwer (token, manifest bez ogólnej sieci, ścieżki jako dane) — Task 5/7.
4. Rozmiar overlayów ProRes 4444 — Task 3.
