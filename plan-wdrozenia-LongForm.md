# LongForm — plan wdrożenia (montaż poziomy gadającej głowy)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** W obecnym panelu: plik 16:9 → automatyczny rough cut (cisza, wtrącenia, dubli, powtórzenia, cenzura) → przegląd → rozdziały i plan efektów → montaż w brandingu klienta → render, poprawki, eksport do Premiere.

**Architecture:** Moduł LongForm obok QuickContent, na tych samych trwałych jobach, workerze, operatorze AI i edytorze. Rough cut i plan to dane w folderze rolki (`roughcut.json`, `plan.json`, rozszerzony `reel.json`), walidowane deterministycznie przed zapisem. Remotion renderuje 16:9 przez `reel.json.format`; efekty to nowe typy overlayów. Ten sam `reel.json` eksportujemy do OTIO dla Premiere.

**Tech Stack:** React 19.2.3, Vite 8.3.3, Node ≥ 22 (`node --test`), Remotion 4.0.532, Zod 4.5.4, FFmpeg/ffprobe, Whisper/Parakeet, Swift + Apple Vision, Pexels API (klucz w `.env`). Bez nowych zależności npm w etapach L0–L3.

**Spec:** [zalozenia-funkcji-LongForm.md](zalozenia-funkcji-LongForm.md) · [efekty](docs/longform/efekty.md) · [GUI](docs/longform/gui.md) · [research](docs/longform/research.md). Integracja z Premiere: [plan-wdrozenia-Premiere.md](plan-wdrozenia-Premiere.md).

**Status 2026-10-15:** plan; nic nie zaimplementowano. Repo ma inne niezacommitowane prace (QuickContent, Motion Studio, style) — nie cofać ich, nie mieszać commitów.

## Global Constraints

- „Przetwarzaj” kończy się na przeglądzie cięć; montaż efektowy tylko po zatwierdzeniu; render po akceptacji planu.
- Cięcie tylko na granicy słów; kolejność słów nigdy się nie zmienia; walidator przed każdym zapisem `roughcut.json`.
- Czasy w `reel.json` = sekundy pliku `source`; ręczna korekta zmienia tekst, nie czasy.
- Brak `format` w `reel.json` = obecne 1080×1920 — zero regresji rolek 9:16 (`npm test`, klatki istniejących rolek).
- Typy efektów tylko z [katalogu](docs/longform/efekty.md).
- SkyClass: brak cięcia ciszy i wtrąceń; tylko ręcznie zatwierdzone dubli.
- SFX −10 dB względem wypowiedzi; assety tylko z licencją.
- Zlecenia GUI: bez pytań, commitów, wysyłki, publikacji; podsumowanie po polsku w panelu.
- Ponytail: reużywaj `quickcontent-*` (store/worker/ai/progress/costs/ingest/transcribe/face), nie twórz równoległych kopii. Nowy plik tylko, gdy odpowiedzialność jest nowa.

## Etapy i punkty odbioru

| Etap | Zadania | Co można sprawdzić po etapie |
|---|---|---|
| **L0 Fundament 16:9** | 1–2 | dowolny `reel.json` z `format` renderuje się 1920×1080; styl klienta ma `T16` |
| **L1 Rough cut deterministyczny** | 3–5 | cisza + wtrącenia z leksykonu + cenzura; `roughcut.json` z walidatorem; wyciszenia + kruk w renderze |
| **L2 Redakcja AI + przegląd** | 6–8 | dubli/falstarty/powtórzenia od operatora AI; ekran „Cięcia”; zatwierdzenie zapisuje `segments`; pierwszy eksport OTIO (P1) |
| **L3 Rozdziały, hook, plan, efekty bazowe** | 9–13 | rozdziały, hook, plan efektów, Pexels, logotypy, efekty z tabeli „Fundament”, render całości |
| **L4 Wycięcie osoby** | 14–15 | maska Vision + efekty z sekcji „Wycięcie osoby” |
| **L5 Stylizowane, 3D, research** | 16–17 | efekty stylizowane, research ze źródłami, edukacja widza |
| **L6 Odbiór** | 18 | pełny scenariusz z kryteriów §11 założeń na 3 prawdziwych nagraniach |

Zależności: zadania 1→13 po kolei; L4 i L5 mogą iść równolegle po L3. GUI kroku można budować na fixture po zamknięciu kontraktu danych etapu, ale fixture nigdy nie jest pokazywany jako wynik AI. Każdy etap kończy się wpisem w `docs/longform/implementation-progress.md` (co zrobione, jakie dowody, co dalej) — na wypadek limitu sesji.

## Mapa plików

| Plik | Odpowiedzialność | Etap |
|---|---|---|
| `src/Reel.tsx` | `format` → `width/height` w `calculateReelMetadata`; `mutes` w audio | L0/L1 |
| `src/reel-timing.ts` | czysta funkcja `reelDimensions` | L0 |
| `src/styles/*.tsx` | eksport `T16` (wariant tokenów 16:9) obok `T` | L0 |
| `src/longform/schema.mjs` | Zod: RoughCut, Cut, Mute, Chapter, Plan, Effect | L1 |
| `src/longform/profanity-pl.json` | rdzenie przekleństw PL + wyjątki | L1 |
| `src/longform/fillers-pl.json` | leksykon wtrąceń PL (pewne / wieloznaczne) | L1 |
| `scripts/longform-roughcut.mjs` (+ test) | cisza, wtrącenia, cenzura, walidator, zastosowanie decyzji → `segments`/`mutes` | L1–L2 |
| `scripts/longform-ai.mjs` (+ test) | kontrakty: redakcja, rozdziały+hook, plan efektów, research (przez `quickcontent-ai.mjs`) | L2–L5 |
| `scripts/longform-plan.mjs` (+ test) | walidator planu, rytm, przypięcie do słów | L3 |
| `scripts/longform-assets.mjs` (+ test) | Pexels (cache, limity, credits), logotypy, SFX | L3 |
| `scripts/longform-mask.swift` | segmentacja osoby (Vision) → maska alfa | L4 |
| `scripts/longform-otio.mjs` (+ test) | `reel.json` → `.otio` + audio z cenzurą | L2 (P1) |
| `src/longform/effects/*.tsx` | komponenty efektów z katalogu | L3–L5 |
| `src/overlays.tsx` | rejestracja nowych typów | L3 |
| `ui/longform-server.mjs` (+ test), `ui/longform-api.ts` | endpointy, rewizje, joby | L2–L3 |
| `ui/LongForm.tsx`, `ui/longform.css` | stepper, Materiał, Cięcia, Plan, Montaż, Wynik | L2–L3 |
| `ui/App.tsx`, `ui/server.mjs` | nawigacja `#lf`, podłączenie serwera | L2 |
| `public/sfx/kruk.*` + `public/sfx/index.json` | dźwięk cenzury z licencją | L1 |
| `AGENTS.md`, `CLAUDE.md`, `PANEL.md`, `package.json` (lint/test) | instrukcje i skrypty | każdy etap |

---

## L0 — Fundament 16:9

### Task 1: `reel.json.format` → wymiary kompozycji

**Files:** Modify `src/Reel.tsx` (`calculateReelMetadata`, ok. l. 105–116), `src/reel-timing.ts`; Test `scripts/reel-timing.test.mjs`.

- [ ] **Step 1: Test**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { reelDimensions } from "../src/reel-timing.ts";

test("brak format = pion 1080x1920", () => {
  assert.deepEqual(reelDimensions({}), { width: 1080, height: 1920 });
});
test("format 16:9", () => {
  assert.deepEqual(reelDimensions({ format: { width: 1920, height: 1080 } }), { width: 1920, height: 1080 });
});
test("odrzuca nieparzyste i zerowe wymiary", () => {
  assert.throws(() => reelDimensions({ format: { width: 1919, height: 1080 } }));
  assert.throws(() => reelDimensions({ format: { width: 0, height: 1080 } }));
});
```

(`scripts/reel-timing.test.mjs` nie importuje `.ts` bezpośrednio — czyta `src/reel-timing.ts` i transpiluje go pakietem `typescript`. Dopisz testy do tego pliku i pobierz `reelDimensions` z tak załadowanego modułu, zamiast `import … from "../src/reel-timing.ts"`.)

- [ ] **Step 2:** `npm test` → FAIL (`reelDimensions` nie istnieje).
- [ ] **Step 3: Implementacja**

```ts
export function reelDimensions(data: { format?: { width: number; height: number } }) {
  const f = data.format;
  if (!f) return { width: 1080, height: 1920 };
  const ok = (n: number) => Number.isInteger(n) && n > 0 && n % 2 === 0;
  if (!ok(f.width) || !ok(f.height)) throw new Error(`Nieprawidłowy format: ${f.width}x${f.height}`);
  return { width: f.width, height: f.height };
}
```

W `calculateReelMetadata`: `return { fps: data.fps ?? 30, durationInFrames: reelFrames(data), ...reelDimensions(data), props: { ...props, data } };`

- [ ] **Step 4:** `npm test` i `npm run lint` → PASS.
- [ ] **Step 5:** Still istniejącej rolki 9:16 (`npx remotion still pokazowka $TMPDIR/p.png --frame=30 --scale=0.4`) bez zmian; testowa kopia z `"format":{"width":1920,"height":1080}` daje still 16:9 (kadrowanie w Task 2).
- [ ] **Step 6:** Commit `feat(longform): format kompozycji z reel.json`.

### Task 2: Kadr i tokeny 16:9 w stylach

**Files:** Modify `src/Reel.tsx` (warstwa wideo: źródło 16:9 w kompozycji 16:9 = `cover` bez pionowego kadrowania; `framing` dalej działa), `src/styles/bisanz.tsx` (silnik) i motywy: eksport `T16`.

- [ ] Step 1: Test czystej funkcji `tokensFor(style, dims)` → `T16`, gdy `width > height` i styl go ma; inaczej `T` + `missing16x9: true`.
- [ ] Step 2–4: FAIL → implementacja → PASS.
- [ ] Step 5: `T16` dla `bisanz` i `persona`: środek bloku napisów y ≈ 0,80, klucz ≈ 5% wysokości, szerokość bloku ≤ 0,6, karty w kolumnie po stronie przeciwnej do twarzy (z `face`). Pozostałe style: `missing16x9` → GUI „Styl poziomy wymaga uzupełnienia”.
- [ ] Step 6: Klatki: 3 kadry z napisem i kartą dla obu stylów na nagraniu poziomym; twarz, title-safe 90%, brak kolizji. Commit.

## L1 — Rough cut deterministyczny

### Task 3: Schemat i leksykony

**Files:** Create `src/longform/schema.mjs`, `src/longform/fillers-pl.json`, `src/longform/profanity-pl.json`; Test `scripts/longform-roughcut.test.mjs`.

- [ ] Step 1: Test

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { RoughCut } from "../src/longform/schema.mjs";

const cut = { id: "c1", start: 1.2, end: 1.9, wordIds: ["w4"], kind: "filler", reason: "yyy", confidence: 0.95, auto: true, decision: "cut" };
test("roughcut: poprawny dokument", () => {
  RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [cut], mutes: [] });
});
test("roughcut: kind spoza listy odrzucony", () => {
  assert.throws(() => RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [{ ...cut, kind: "inne" }], mutes: [] }));
});
test("roughcut: start >= end odrzucony", () => {
  assert.throws(() => RoughCut.parse({ version: 1, sourceDuration: 60, cuts: [{ ...cut, start: 2, end: 2 }], mutes: [] }));
});
```

- [ ] Step 2–4: FAIL → Zod (`kind ∈ silence|filler|false-start|retake|repetition|offtopic`, `decision ∈ cut|keep|undecided`, `start < end`, `confidence ∈ [0,1]`) → PASS.
- [ ] Step 5: `fillers-pl.json`: `{ "sure": ["yyy","yy","eee","ee","aaa","mmm"], "ambiguous": ["no","znaczy","wiesz","tak","jakby","w sensie"] }`. `profanity-pl.json`: `{ "stems": [...], "except": [...] }` budowane testami: 20 pozytywów (odmiany, zdrobnienia, zbitki) i 20 negatywów (np. „kurek”, „kurs”, nazwy własne). Commit.

### Task 4: Cisza, wtrącenia, cenzura → propozycje

**Files:** Create `scripts/longform-roughcut.mjs`; Modify `scripts/prep.mjs` (wydziel `detectSilences(file, noiseDb, minSilence)` i używaj jej w obu miejscach — bez zmiany zachowania prep; `npm test` przed i po).

Czyste funkcje (testy bez FFmpeg):
- `silenceCuts(silences, words, { minGap = 0.45, breath = 0.15 })` → cięcia `silence` skrócone o `breath` z każdej strony, nigdy nie zachodzą na słowo.
- `fillerCuts(words, lexicon, voicedGaps)` → `filler`: pewne `auto: true, decision: "cut"`; wieloznaczne `decision: "undecided"`; dźwięczne dziury bez słowa ≥ 0,25 s → `confidence: 0.6, decision: "undecided"`.
- `censorMutes(words, profanity, { muteRatio = 0.8, tail = 0.03, ramp = 0.005 })` → `{ wordId, start: w.start + (1 - muteRatio) * (w.end - w.start), end: w.end + tail, ramp, sfx: "kruk" }`.
- `speechRms(rmsFrames, start, end)` → poziom wypowiedzi wokół wyciszenia (do miksu −10 dB).

- [ ] Step 1: Testy

```js
test("cenzura: 80% słowa wyciszone, początek słyszalny", () => {
  const [m] = censorMutes([{ id: "w1", text: "kurwa", start: 10, end: 10.5 }], lex, {});
  assert.ok(Math.abs(m.start - 10.1) < 1e-6);
  assert.ok(Math.abs(m.end - 10.53) < 1e-6);
  assert.equal(m.sfx, "kruk");
});
test("cisza: zostawia oddech i nie tnie słowa", () => {
  const cuts = silenceCuts([{ start: 5, end: 6.2 }],
    [{ id: "w1", start: 4.2, end: 5.05 }, { id: "w2", start: 6.2, end: 6.6 }], {});
  assert.deepEqual(cuts.map((c) => [c.start, c.end]), [[5.2, 6.05]]);
});
test("kurek nie jest cenzurowany", () => {
  assert.equal(censorMutes([{ id: "w1", text: "kurek", start: 1, end: 1.4 }], lex, {}).length, 0);
});
```

- [ ] Step 2–4: FAIL → implementacja (zaokrąglenie do ms) → PASS.
- [ ] Step 5: CLI `node scripts/longform-roughcut.mjs propose <rolka>` zapisuje `public/reels/<rolka>/roughcut.json` atomowo (`.tmp` + rename) i nie nadpisuje decyzji użytkowniczki (merge po `id`). Commit.

### Task 5: Walidator, zastosowanie decyzji, wyciszenia w renderze

**Files:** `scripts/longform-roughcut.mjs` (`validateCuts`, `applyDecisions`), `src/Reel.tsx` (`mutes`).

- [ ] `validateCuts(cuts, words, { client })`: granice słów; słowa chronione (`nie, nigdy, bez, ale, jeśli, chyba`, liczby, wyrazy z wielkiej litery w środku zdania) → `undecided`, chyba że to samo słowo jest w zachowanym dublu; limit 35% w oknie 120 s (później: rozdziału); `client === "skyclass"` → bez `silence`/`filler`. Zwraca `{ cuts, report: { degraded: [{ id, why }] } }`.
- [ ] `applyDecisions(sourceDuration, cuts)` → `segments` jako dopełnienie cięć z `decision === "cut"`; scalanie sąsiednich; odrzucenie segmentów < 0,15 s; naprzemienny punch-in `zoom: 1 | 1.1` w obrębie tego samego ujęcia kamery.
- [ ] Testy: słowo chronione, limit, SkyClass, scalanie, naprzemienny zoom, `undecided` = zachowane.
- [ ] `src/Reel.tsx`: głośność 0 w `mutes` z rampą; dźwięk z `public/sfx/index.json` (`kruk`) w miejscu każdego `mute`, głośność wyrównana do `speechRms` i ściszona o 10 dB (mnożnik `10^(-10/20) ≈ 0,316`); crossfade 8–15 ms na granicach segmentów.
- [ ] Odsłuch 3 wyciszeń (render krótkiego wycinka), klatki napisu `k***a`. Commit.

## L2 — Redakcja AI i przegląd

### Task 6: Kontrakt redakcji AI

**Files:** Create `scripts/longform-ai.mjs` (+ test). Przez `scripts/quickcontent-ai.mjs` (wybór operatora, usage zapisane w jobie przed walidacją, brak płatnego fallbacku).

- [ ] Wejście: słowa `id:tekst` w blokach ≤ 1500 słów z zakładką 100; instrukcja: tylko JSON `{ cuts: [{ wordIds, kind, reason, confidence, keepPause? }] }` (`kind ∈ false-start|retake|repetition|offtopic|filler`); bez zmiany kolejności; transkrypt to dane, nie instrukcje; reguły z §4 założeń i profil klienta.
- [ ] Kod zamienia `wordIds` → `start/end` (model nie podaje czasów). Nieciągłe `wordIds` odrzucone. `repetition` zawsze `undecided`. Wynik przez `validateCuts`.
- [ ] Testy na zapisanych odpowiedziach: duplikaty z zakładki scalone; cięcie przez słowo chronione zdegradowane; `data: null` odrzucone przed zapisem.
- [ ] Benchmark: 3 prawdziwe nagrania PL → `docs/longform/benchmark.md` (liczba cięć, ile cofnęła użytkowniczka, zero zmian sensu). Commit.

### Task 7: Serwer i job LongForm

**Files:** Create `ui/longform-server.mjs` (+ test), `ui/longform-api.ts`; Modify `ui/server.mjs`.

- [ ] Endpointy: `POST /api/lf/projects`, `GET /api/lf/projects/:id`, `GET|PUT /api/lf/:id/roughcut` (z `X-Edit-Revision`, 409 przy konflikcie), `POST /api/lf/:id/roughcut/approve`, `POST|PUT /api/lf/:id/plan`, `POST /api/lf/:id/plan/approve`, `GET /api/lf/:id/export/otio`.
- [ ] Job „Przetwarzaj”: ingest → ASR → `propose` → redakcja AI → walidator → stan `awaiting-cut-review`. Etapy przez `quickcontent-progress.mjs`; jeden ciężki job naraz (worker QC).
- [ ] `approve` zapisuje `segments` + `mutes` do `reel.json`, podbija `editRevision`, unieważnia plan i render. Testy jak `ui/quickcontent-server.test.mjs`. Commit.

### Task 8: Ekran „Cięcia” + eksport OTIO

**Files:** Create `ui/LongForm.tsx`, `ui/longform.css`, `scripts/longform-otio.mjs` (+ test); Modify `ui/App.tsx` (`#lf`).

- [ ] Ekran wg [gui.md §2](docs/longform/gui.md): podgląd „po cięciach” istniejącym playerem (same `segments` + `mutes`), transkrypt, filtry, przełączniki, skróty, własne cięcie, licznik, „Zatwierdź cięcia”. Test jak `ui/quickcontent-ui.test.mjs`.
- [ ] `toOtio(reel, { mediaPath, fps })`: tor wideo i audio, klipy = `segments` (zakres źródła w `RationalTime` przy fps źródła), markery = rozdziały (gdy są). Wyciszenia: FFmpeg renderuje `audio-censored.wav` (`volume=enable='between(t,a,b)':volume=0` + kruk) i to audio trafia do toru audio zamiast oryginału. Test: liczba klipów = liczba segmentów, suma długości = długość wyniku, pierwszy klip od 0.
- [ ] Ręczny dowód: import `.otio` w Premiere ≥ 25.6, cięcia zgodne z podglądem → `docs/premiere/acceptance.md`. Commit.

## L3 — Rozdziały, hook, plan, efekty bazowe

### Task 9: Rozdziały i hook

- [ ] `chapters()` (kontrakt §5; `startWordId` istnieje i rośnie; wstęp 5–120 s; pewność) i `hooks()` (3 warianty ≤ 8 słów, typ z Hook Engineer, `why`; anti-cringe; rejestr klienta z jego PREFERENCJE.md). Opcjonalny `coldOpen` (3–8 s z dalszej części, tylko propozycja).
- [ ] Testy walidatora rozdziałów (rosnące, pokrycie całości, ≥ 3 dla YouTube lub komunikat). Rozdziały w `scripts/reel-description.mjs` (bez ponownej opłaty, gdy treść bez zmian).

### Task 10: Plan efektów i walidator

**Files:** `scripts/longform-plan.mjs` (+ test).
- [ ] `validatePlan(plan, { words, chapters, catalog, maskReady, intensity })`: typ z katalogu, `fromWord < toWord`, bez dwóch takich samych pod rząd, H ≤ 2 na typ, rytm wg §6 (ostrzeżenia), `why` niepuste, efekt `mask` bez gotowej maski → wariant bez maski z adnotacją, liczby wymagają `source`.
- [ ] `planToOverlays(plan, words)` → `overlays` w `reel.json` (czasy z `wordId`). Testy.

### Task 11: Assety — Pexels, logotypy, SFX

**Files:** `scripts/longform-assets.mjs` (+ test).
- [ ] Pexels: `GET https://api.pexels.com/videos/search?query=…&orientation=landscape&per_page=15`, nagłówek `Authorization: <PEXELS_API_KEY>`; plik ≥ 1920 px szer. i ≥ potrzebnej długości; cache 24 h w `.longform/cache/pexels/`; `X-Ratelimit-Remaining` = 0 lub 429 → job czeka do `X-Ratelimit-Reset`; zapis `assets/pexels/` + wiersz w `credits.md`. Klucz nigdy w logach. Test z wstrzykniętym `fetch`.
- [ ] Logotypy: tylko z oficjalnych materiałów marki, plik + URL źródła w `public/Brandings/_logos/`; brak pewnego źródła → efekt usunięty z planu z adnotacją.
- [ ] SFX: `public/sfx/index.json` (`{ id, file, license, source }`); brak pliku → efekt bez dźwięku + ostrzeżenie.

### Task 12: Komponenty efektów „Fundament”

**Files:** `src/longform/effects/*.tsx`, `src/overlays.tsx`.
- [ ] Kolejno: `typography`, `chapter-card`, `logo`, `broll` (L-cut), `zoom-through-cut`, `chart-grow` z podpisem źródła; istniejące `counter/bars/line/ring/list/compare/emoji` z pozycjami `T16`. Każdy: tokeny motywu, klatki start/środek/koniec dla 2 stylów, wyjście szybsze niż wejście.

### Task 13: Ekrany „Plan”, „Montaż”, „Wynik”

- [ ] Wg [gui.md §3–5](docs/longform/gui.md); render ze snapshotu jak `QuickContentRender` (wersje `-vNNN`, badge aktualności, ffprobe po renderze). Opis publikacji z rozdziałami. Test pełnej ścieżki GUI na 1 prawdziwym nagraniu.

## L4 — Wycięcie osoby

### Task 14: Maska (spike → implementacja)

- [ ] Spike (≤ 1 dzień): `scripts/longform-mask.swift` — `VNGeneratePersonSegmentationRequest` (`qualityLevel = .accurate`) na 300 klatkach; PNG alfa; EMA maski (α = 0,6), dylatacja 1–2 px. Pomiar IoU vs 50 ręcznie poprawionych klatek i czas na minutę 1080p → `docs/longform/benchmark.md`. Próg: IoU ≥ 0,92 i brak widocznego migotania krawędzi w 100%.
- [ ] Próg spełniony: maska jako WebM VP9 alfa lub sekwencja PNG w `assets/masks/<from>-<to>/`, liczona tylko dla zakresów efektów `mask`; postęp % klatek w GUI.
- [ ] Niespełniony: decyzja użytkowniczki (RVM lokalnie, GPL vs efekty bez maski) zapisana w PREFERENCJE.md.

### Task 15: Efekty z maską

- [ ] `cutout`, `text-behind`, `background-swap`, `greenscreen`, `frame-break`, `cover-story`, `headline-wall` (nagłówki tylko z `sources.md`), `vertigo`; `couch-wall` dopiero po potwierdzeniu znaczenia nazwy. Każdy z wariantem bez maski i klatkami kontrolnymi.

## L5 — Stylizowane, 3D, research

### Task 16: Efekty stylizowane

- [ ] `tilt-3d`, `orbit`, `phone-mockup`, `ui-world`, `pull-back-reveal`, `paper-cut`, `doodle-boil`, `glass-type`. Złożone sceny: HF → przezroczysty plik → `media fit: overlay` (skille `hyperframes-animation`, `orbit-card`, `onetake`); licencje kodu skilli respektowane.

### Task 17: Research i edukacja widza

- [ ] `research(chapters)` → kandydaci (teza, liczba, zjawisko) + zapytania; operator AI z wyszukiwaniem; wynik `{ claim, finding, url, quote ≤ 25 słów }` → `sources.md`. Bez źródła = brak grafiki. Klient z rejestrem: whitelist źródeł z jego pliku. `fact-check` przy sprzeczności → tylko propozycja w GUI.
- [ ] Efekty `explainer`, `definition`, `fact-check`.

## L6 — Odbiór

### Task 18

- [ ] 3 prawdziwe nagrania (bez klienta + 2 różnych klientów, w tym jedno z przekleństwami i dublami): kryteria §11 założeń, `npm test`, `npm run lint`, klatki i odsłuch, eksport OTIO do Premiere. Raport `docs/longform/acceptance.md` (co sprawdzono, czego nie). Status „wdrożone” dopiero po odbiorze.

## Review Focus

1. Cięcie zmieniające sens (przeczenie, warunek, liczba) — Task 5/6.
2. Wyciszenie i kruk zsynchronizowane po cięciach (czas źródła vs oś wyniku, `toOut()`) — Task 5.
3. Edycja cięć po akceptacji planu: plan i render tracą aktualność, efekty przypięte do usuniętych słów znikają lub są przenoszone z ostrzeżeniem — Task 7/10.
4. Rolki 9:16 bez `format` zachowują się identycznie — Task 1/2.
5. Limity Pexels i brak sieci nie wieszają joba — Task 11.
