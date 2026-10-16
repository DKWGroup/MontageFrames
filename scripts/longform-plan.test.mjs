import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG, MASK_TYPES, planToReel, validateChapters, validateColdOpen, validateHooks, validatePlan, youtubeChapters } from "./longform-plan.mjs";
import { outTime } from "../src/longform/cuts.mjs";

// 60 słów co 1 s; segmenty bez cięć, poza wyciętym 20–25 s
const words = Array.from({ length: 60 }, (_, i) => ({ id: `w${i}`, text: i === 40 ? "15%" : i === 30 ? "Netflix" : `s${i}`, start: i, end: i + 0.8 }));
const segments = [{ start: 0, end: 20 }, { start: 25, end: 60 }];
const kept = words.filter((w) => w.start < 20 || w.start >= 25);

test("outTime: czas źródła -> oś po cięciach", () => {
  assert.equal(outTime(10, segments), 10);
  assert.equal(outTime(30, segments), 25);
  assert.equal(outTime(22, segments), 20);
});

test("rozdziały: rosnące, pierwszy od początku, wstęp 5–120 s, czasy na osi wyniku", () => {
  const { chapters, warnings } = validateChapters(
    [
      { role: "intro", startWordId: "w2", title: "Wstęp", confidence: 0.9 },
      { role: "body", startWordId: "w12", title: "Kredyt", confidence: 0.9 },
      { role: "body", startWordId: "w8", title: "Wstecz", confidence: 0.9 },
      { role: "body", startWordId: "w99", title: "Brak", confidence: 0.9 },
      { role: "outro", startWordId: "w45", title: "Podsumowanie", confidence: 0.9 },
    ],
    kept,
    segments,
  );
  assert.deepEqual(chapters.map((c) => [c.startWordId, c.outStart]), [["w0", 0], ["w12", 12], ["w45", 40]]);
  assert.ok(warnings.some((w) => /w8|kolejności/.test(w)));
  assert.ok(warnings.some((w) => /w99|nie istnieje/.test(w)));
});

test("rozdziały: niska pewność granicy wstępu = prośba o wskazanie", () => {
  const { warnings } = validateChapters([{ role: "intro", startWordId: "w0", title: "W", confidence: 0.5 }, { role: "body", startWordId: "w10", title: "B", confidence: 0.6 }], kept, segments);
  assert.ok(warnings.some((w) => /granic/.test(w)));
});

test("rozdziały YouTube: 0:00, ≥ 3 rozdziały, każdy ≥ 10 s", () => {
  const ch = [{ title: "Wstęp", outStart: 0 }, { title: "Kredyt", outStart: 12 }, { title: "Podsumowanie", outStart: 40 }];
  assert.deepEqual(youtubeChapters(ch, 55), { text: "0:00 Wstęp\n0:12 Kredyt\n0:40 Podsumowanie", why: null });
  assert.equal(youtubeChapters(ch.slice(0, 2), 55).text, null);
  assert.match(youtubeChapters([{ title: "A", outStart: 0 }, { title: "B", outStart: 5 }, { title: "C", outStart: 30 }], 55).why, /10 s/);
});

test("hooki: ≤ 8 słów, bez cringe, bez duplikatów, max 3", () => {
  const { hooks, warnings } = validateHooks([
    { text: "Kredyt na konsumpcję to pułapka", type: "contrarian", why: "teza" },
    { text: "Hej kochani, dziś o kredytach", type: "x", why: "y" },
    { text: "To zdanie ma zdecydowanie zbyt wiele słów jak na hook", type: "x", why: "y" },
    { text: "Kredyt na konsumpcję to pułapka", type: "dup", why: "y" },
    { text: "Ile naprawdę kosztuje rata za telefon?", type: "pytanie", why: "luka" },
    { text: "Mieszkanie czy wynajem: liczby", type: "kontrast", why: "" },
  ]);
  assert.deepEqual(hooks.map((h) => h.text), ["Kredyt na konsumpcję to pułapka", "Ile naprawdę kosztuje rata za telefon?"]);
  assert.ok(warnings.length >= 3);
});

test("cold open: 3–8 s, z dalszej części (po wstępie), tylko propozycja", () => {
  const chapters = [{ startWordId: "w0", start: 0 }, { startWordId: "w12", start: 12 }];
  assert.deepEqual(validateColdOpen({ fromWordId: "w40", toWordId: "w44", why: "puenta" }, kept, chapters).coldOpen, { fromWordId: "w40", toWordId: "w44", start: 40, end: 44.8, why: "puenta", accepted: false });
  assert.equal(validateColdOpen({ fromWordId: "w2", toWordId: "w5", why: "x" }, kept, chapters).coldOpen, null);
  assert.equal(validateColdOpen({ fromWordId: "w40", toWordId: "w55", why: "x" }, kept, chapters).coldOpen, null);
  assert.equal(validateColdOpen(null, kept, chapters).coldOpen, null);
});

const chapters = [{ role: "intro", startWordId: "w0", start: 0, outStart: 0, title: "Wstęp" }, { role: "body", startWordId: "w12", start: 12, outStart: 12, title: "Kredyt" }];
const E = (type, from, to, extra = {}) => ({ type, fromWordId: from, toWordId: to, why: "powód", params: {}, ...extra });

test("plan: typ z katalogu, słowa w kolejności, niepuste why, liczby ze źródła albo z wypowiedzi", () => {
  const { effects, rejected } = validatePlan(
    [
      E("headline-wall", "w1", "w3"),
      E("typography", "w5", "w4"),
      E("typography", "w2", "w3", { why: "" }),
      E("chart-grow", "w40", "w42", { params: { kind: "bars", data: [] } }),
      E("chart-grow", "w40", "w42", { params: { kind: "ring", value: 15, source: "https://stat.gov.pl/x" } }),
      E("numbers", "w39", "w41", { params: { to: 15, suffix: "%" } }),
      E("numbers", "w5", "w6", { params: { to: 99 } }),
      E("logo", "w30", "w30", { params: { brand: "Netflix" } }),
      E("typography", "w2", "w3", { params: { text: "Teza" } }),
    ],
    { words: kept, chapters },
  );
  assert.deepEqual(effects.map((e) => e.type), ["typography", "logo", "numbers", "chart-grow"]);
  assert.equal(rejected.length, 5);
  assert.ok(rejected.some((r) => /katalog/.test(r.why)));
  assert.ok(rejected.some((r) => /źródł/.test(r.why)));
});

test("plan: dwa takie same pod rząd -> drugi odrzucony; intensywność daje ostrzeżenia rytmu, nie blokadę", () => {
  const { effects, rejected, warnings } = validatePlan([E("typography", "w2", "w3", { params: { text: "A" } }), E("typography", "w4", "w5", { params: { text: "B" } })], { words: kept, chapters });
  assert.equal(effects.length, 1);
  assert.match(rejected[0].why, /pod rząd/);
  assert.ok(warnings.some((w) => /rytm|bez zmiany obrazu/.test(w)));
});

test("katalog: Fundament L3 + Wycięcie osoby L4, bez efektów L5", () => {
  assert.ok(CATALOG.broll && CATALOG["chapter-card"] && CATALOG.cutout && !CATALOG["tilt-3d"]);
});

test("planToReel: hook, plansze rozdziałów, efekty jako overlays z lf, zoom w segmentach, stare overlaye LongForm zastąpione", () => {
  const reel = { segments: segments.map((s) => ({ ...s, zoom: 1 })), overlays: [{ type: "emoji", start: 1, end: 2 }, { type: "typography", start: 3, end: 4, lf: true }] };
  const plan = {
    hooks: [{ text: "Kredyt to pułapka", type: "contrarian", why: "" }],
    hook: 0,
    chapters,
    effects: [
      { id: "e1", ...E("numbers", "w39", "w41", { params: { to: 15, suffix: "%" } }) },
      { id: "e2", ...E("digital-zoom", "w5", "w8", { params: { scale: 1.2 } }) },
      { id: "e3", ...E("broll", "w45", "w48", { params: { query: "city", src: "assets/pexels/1.mp4" } }) },
      { id: "e4", ...E("broll", "w50", "w52", { params: { query: "x" } }) },
    ],
  };
  const out = planToReel(reel, plan, kept);
  const types = out.overlays.map((o) => `${o.type}${o.role ? ":" + o.role : ""}`);
  assert.deepEqual(types, ["emoji", "typography:hook", "chapter-card", "counter", "media"]);
  const hook = out.overlays[1];
  assert.equal(hook.text, "Kredyt to pułapka");
  assert.ok(hook.end - hook.start >= 3);
  assert.equal(out.overlays[2].title, "Kredyt");
  assert.deepEqual([out.overlays[3].to, out.overlays[3].suffix, out.overlays[3].start], [15, "%", 39]);
  assert.equal(out.overlays[4].src, "assets/pexels/1.mp4");
  assert.equal(out.segments[0].zoomTo, 1.2);
  assert.ok(out.skipped.some((s) => s.id === "e4"));
});

test("planToReel: napis typography nie nachodzi na hook ani planszę rozdziału (ten sam slot)", () => {
  const reel = { segments: segments.map((s) => ({ ...s, zoom: 1 })), overlays: [] };
  const plan = {
    hooks: [{ text: "Kredyt to pułapka", type: "contrarian", why: "" }],
    hook: 0,
    chapters,
    effects: [
      { id: "t1", ...E("typography", "w0", "w2", { params: { text: "Na start" } }) },
      { id: "t2", ...E("typography", "w39", "w41", { params: { text: "Później" } }) },
    ],
  };
  const out = planToReel(reel, plan, kept);
  const texts = out.overlays.filter((o) => o.type === "typography").map((o) => o.text);
  assert.deepEqual(texts, ["Kredyt to pułapka", "Później"]);
  assert.ok(out.skipped.some((s) => s.id === "t1" && /nachodzi/.test(s.why)));
});

test("L4: efekty z maską w katalogu; background-swap wymaga poprawnego tła", () => {
  assert.deepEqual(MASK_TYPES, ["cutout", "text-behind", "background-swap", "vertigo"]);
  const { effects, rejected } = validatePlan(
    [E("background-swap", "w30", "w33", { params: { bg: "broll" } }), E("background-swap", "w35", "w38", { params: { bg: "color" } })],
    { words: kept, chapters },
  );
  assert.equal(effects.length, 1);
  assert.match(rejected[0].why, /tło/);
});

test("L4: maska gotowa → warstwy z maską; brak maski → wariant bez maski albo pominięcie, zawsze z adnotacją", () => {
  const reel = { segments: segments.map((s) => ({ ...s, zoom: 1 })), overlays: [] };
  const mask = { src: "assets/masks/0.90-4.90/cutout.webm", from: 0.9 };
  const plan = {
    chapters,
    effects: [
      { id: "m1", ...E("text-behind", "w1", "w3", { params: { text: "Kredyt", mask } }) },
      { id: "m2", ...E("background-swap", "w5", "w7", { params: { bg: "broll", query: "x", mask } }) },
      { id: "m3", ...E("text-behind", "w30", "w33", { params: { text: "Rata", maskError: "brak macOS" } }) },
      { id: "m4", ...E("cutout", "w35", "w37", { params: {} }) },
      { id: "m5", ...E("vertigo", "w40", "w41", { params: {} }) },
    ],
  };
  const out = planToReel(reel, plan, kept);
  const o = Object.fromEntries(out.overlays.map((x) => [x.effectId, x]));
  assert.deepEqual([o.m1.type, o.m1.mask, o.m1.text], ["text-behind", mask, "Kredyt"]);
  assert.equal(o.m2.bg, "blur"); // B-roll się nie pobrał → rozmyte tło
  assert.deepEqual([o.m3.type, o.m3.noMask], ["typography", true]);
  assert.equal(o.m4, undefined);
  assert.deepEqual([o.m5.type, o.m5.noMask], ["vertigo", true]);
  const why = Object.fromEntries(out.skipped.map((s) => [s.id, s.why]));
  assert.match(why.m2, /rozmyte/);
  assert.match(why.m3, /bez maski osoby \(brak macOS\) — wariant: tekst obok twarzy/);
  assert.match(why.m4, /pominięty/);
  assert.match(why.m5, /najazd/);
});

test("napisy poza wstępem ukryte, chyba że plan ma tam kinetic-captions (PREFERENCJE 2026-10-17)", () => {
  const g = (a, b) => ({ words: [{ text: "a", start: a, end: a + 0.5 }, { text: "b", start: b, end: b + 0.5 }] });
  const reel = { segments, overlays: [], captions: [g(1, 2), g(30, 31), { ...g(40, 41), hidden: true }, g(50, 51)] };
  const plan = { chapters, effects: [{ id: "k", ...E("kinetic-captions", "w40", "w41") }] };
  const out = planToReel(reel, plan, kept);
  assert.deepEqual(out.captions.map((c) => Boolean(c.hidden)), [false, true, false, true]);
});

test("planToReel: napis przed planszą rozdziału zostaje skrócony do jej początku (≥ 1,2 s), a nie wycięty", () => {
  const reel = { segments: segments.map((s) => ({ ...s, zoom: 1 })), overlays: [] };
  const plan = { chapters, effects: [{ id: "t", ...E("text-behind", "w10", "w10", { params: { text: "Rata", mask: { src: "m.webm", from: 9.9 } } }) }] };
  const out = planToReel(reel, plan, kept);
  const tb = out.overlays.find((o) => o.type === "text-behind");
  assert.deepEqual([tb.start, tb.end], [10, 12]); // bez skrócenia: 10 + 2,5 s
});
