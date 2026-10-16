// LongForm L3: walidatory rozdziałów, hooka, cold openu i planu efektów + zamiana planu na reel.json.
// Kontrakt: zalozenia-funkcji-LongForm.md §5–6, katalog: docs/longform/efekty.md (Fundament + Wycięcie osoby L4).
import { outTime, sourceTime } from "../src/longform/cuts.mjs";

const r2 = (n) => Math.round(n * 100) / 100;

// Fundament L3. overlay: false = efekt zmienia kadr/napisy, nie dokłada warstwy.
export const CATALOG = {
  "face-track": { weight: "L", overlay: false },
  "digital-zoom": { weight: "L", overlay: false },
  "kinetic-captions": { weight: "L", overlay: false },
  "transition-cut": { weight: "L", overlay: false },
  typography: { weight: "L", needs: "text" },
  "chapter-card": { weight: "M" },
  numbers: { weight: "L" },
  "chart-grow": { weight: "M", research: true },
  compare: { weight: "M" },
  list: { weight: "L" },
  logo: { weight: "L", needs: "brand" },
  broll: { weight: "M", needs: "query" },
  "zoom-through-cut": { weight: "M" },
  // L4 — wymagają maski osoby (scripts/longform-mask.mjs); bez gotowej maski: wariant `fallback` z adnotacją.
  cutout: { weight: "M", mask: true, fallback: null },
  "text-behind": { weight: "H", mask: true, needs: "text", fallback: "tekst obok twarzy" },
  "background-swap": { weight: "H", mask: true, fallback: "pełnoekranowa przebitka + głos" },
  vertigo: { weight: "H", mask: true, fallback: "wolny najazd + winieta" },
};
export const MASK_TYPES = Object.keys(CATALOG).filter((t) => CATALOG[t].mask);
const BG = new Set(["blur", "color", "broll"]);

export function validateChapters(raw, words, segments) {
  const warnings = [];
  const index = new Map(words.map((w, i) => [w.id, i]));
  const chapters = [];
  for (const c of raw ?? []) {
    const i = index.get(c.startWordId);
    if (i == null) {
      warnings.push(`Rozdział „${c.title}”: słowo ${c.startWordId} nie istnieje po cięciach — pominięty.`);
      continue;
    }
    if (chapters.length && i <= index.get(chapters.at(-1).startWordId)) {
      warnings.push(`Rozdział „${c.title}” (${c.startWordId}) nie zachowuje kolejności — pominięty.`);
      continue;
    }
    chapters.push({ ...c, startWordId: c.startWordId });
  }
  if (!chapters.length) return { chapters: [], warnings: [...warnings, "Brak poprawnych rozdziałów."] };
  if (chapters[0].startWordId !== words[0].id) {
    warnings.push("Pierwszy rozdział przesunięty na początek filmu.");
    chapters[0] = { ...chapters[0], startWordId: words[0].id };
  }
  chapters[0].role = "intro";
  const out = chapters.map((c) => {
    const w = words[index.get(c.startWordId)];
    return { ...c, start: w.start, outStart: r2(index.get(c.startWordId) === 0 ? 0 : outTime(w.start, segments)) };
  });
  const introLen = (out[1]?.outStart ?? outTime(words.at(-1).end, segments)) - out[0].outStart;
  if (introLen < 5 || introLen > 120) warnings.push(`Wstęp trwa ${Math.round(introLen)} s (oczekiwane 5–120 s) — sprawdź granicę wstępu.`);
  if (Math.min(out[0].confidence ?? 1, out[1]?.confidence ?? 1) < 0.7) warnings.push("Niepewna granica wstępu — wskaż ją ręcznie w planie.");
  return { chapters: out, warnings };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function youtubeChapters(chapters, totalOut) {
  if (chapters.length < 3) return { text: null, why: "YouTube wymaga co najmniej 3 rozdziałów." };
  const short = chapters.find((c, i) => (chapters[i + 1]?.outStart ?? totalOut) - c.outStart < 10);
  if (short) return { text: null, why: `Rozdział „${short.title}” trwa krócej niż 10 s — YouTube go nie przyjmie.` };
  return { text: chapters.map((c, i) => `${mmss(i ? c.outStart : 0)} ${c.title}`).join("\n"), why: null };
}

// Anti-cringe (Hook Engineer): bez etykietek „szoku”, powitań i wykrzykników; overlay ≤ 8 słów.
const CRINGE = /(hej kochani|hey guys|witajcie|serio|szok|nie uwierzysz|mówię poważnie|zaskakując|a gdybym ci powiedział|nie wiem, komu to potrzebne|!!)/i;
export function validateHooks(raw) {
  const hooks = [];
  const warnings = [];
  for (const h of raw ?? []) {
    const text = String(h?.text ?? "").trim();
    const n = text.split(/\s+/).filter(Boolean).length;
    const why =
      !n ? "pusty" : n > 8 ? "ponad 8 słów" : CRINGE.test(text) ? "cringe/etykietka" : !String(h.why ?? "").trim() ? "brak uzasadnienia" : hooks.some((x) => x.text.toLowerCase() === text.toLowerCase()) ? "duplikat" : null;
    if (why) warnings.push(`Hook „${text}” odrzucony: ${why}.`);
    else if (hooks.length < 3) hooks.push({ text, type: String(h.type ?? ""), why: String(h.why) });
  }
  if (!hooks.length) warnings.push("Brak poprawnego hooka — wpisz własny tekst.");
  return { hooks, warnings };
}

export function validateColdOpen(co, words, chapters) {
  if (!co) return { coldOpen: null, warning: null };
  const index = new Map(words.map((w, i) => [w.id, i]));
  const a = index.get(co.fromWordId);
  const b = index.get(co.toWordId);
  const introEnd = chapters[1]?.start ?? Infinity;
  const reject = (why) => ({ coldOpen: null, warning: `Cold open pominięty: ${why}.` });
  if (a == null || b == null || a > b) return reject("niepoprawne słowa");
  const start = words[a].start;
  const end = words[b].end;
  if (end - start < 3 || end - start > 8) return reject(`trwa ${r2(end - start)} s (3–8 s)`);
  if (start < introEnd) return reject("musi pochodzić z dalszej części, nie ze wstępu");
  return { coldOpen: { fromWordId: co.fromWordId, toWordId: co.toWordId, start, end, why: String(co.why ?? ""), accepted: false }, warning: null };
}

const isUrl = (s) => typeof s === "string" && /^https?:\/\/\S+$/.test(s);
const INTENSITY = { spokojna: 1.5, standard: 1, dynamiczna: 0.7 };

export function validatePlan(raw, { words, chapters, intensity = "standard" }) {
  const index = new Map(words.map((w, i) => [w.id, i]));
  const rejected = [];
  const ok = [];
  for (const e of raw ?? []) {
    const def = CATALOG[e?.type];
    const a = index.get(e?.fromWordId);
    const b = index.get(e?.toWordId);
    const p = e?.params ?? {};
    const span = a != null && b != null ? words.slice(a, b + 1).map((w) => w.text).join(" ") : "";
    const why = !def
      ? `typ „${e?.type}” spoza katalogu`
      : a == null || b == null || a > b
        ? "słowa poza transkryptem po cięciach albo w złej kolejności"
        : !String(e.why ?? "").trim()
          ? "brak powodu w treści (why)"
          : def.needs && !String(p[def.needs] ?? "").trim()
            ? `brak parametru ${def.needs}`
            : e.type === "background-swap" && (!BG.has(p.bg) || (p.bg === "broll" && !String(p.query ?? "").trim()))
              ? "tło: bg = blur | color | broll (broll z query)"
              : def.research && !isUrl(p.source)
              ? "wykres bez źródła (URL)"
              : e.type === "numbers" && !isUrl(p.source) && !span.includes(String(p.to))
                ? "liczba ani nie pada w wypowiedzi, ani nie ma źródła"
                : null;
    if (why) rejected.push({ effect: e, why });
    else ok.push({ ...e, params: p, start: words[a].start, end: words[b].end });
  }
  ok.sort((x, y) => x.start - y.start);
  const effects = [];
  const heavy = {};
  for (const e of ok) {
    if (effects.at(-1)?.type === e.type) {
      rejected.push({ effect: e, why: "dwa takie same efekty pod rząd" });
      continue;
    }
    if (CATALOG[e.type].weight === "H" && (heavy[e.type] = (heavy[e.type] ?? 0) + 1) > 2) {
      rejected.push({ effect: e, why: "efekt ciężki więcej niż 2 razy" });
      continue;
    }
    effects.push({ ...e, id: e.id ?? `e${effects.length + 1}` });
  }
  // Rytm (§6): ostrzeżenia, nie blokada. Wstęp: zmiana obrazu co ~3 s, rozdziały co ~10 s.
  const k = INTENSITY[intensity] ?? 1;
  const warnings = [];
  const lastEnd = words.at(-1).end;
  chapters.forEach((c, i) => {
    const end = chapters[i + 1]?.start ?? lastEnd;
    const limit = (c.role === "intro" ? 3 : c.role === "outro" ? 20 : 10) * k;
    const marks = [c.start, ...effects.filter((e) => e.start >= c.start && e.start < end).map((e) => e.start), end];
    const gap = Math.max(...marks.slice(1).map((t, j) => t - marks[j]));
    if (gap > limit * 2) warnings.push(`Rytm: „${c.title}” ma ${Math.round(gap)} s bez zmiany obrazu (cel ≈ ${Math.round(limit)} s).`);
  });
  return { effects, rejected, warnings };
}

// Czas efektu w źródle: od pierwszego słowa do końca ostatniego, ale min. `min` s na osi wyniku.
// Ten sam zakres dostaje maska osoby (montaż liczy ją przed planToReel).
export function effectSpan(segments, words, from, to, min = 0) {
  const at = (id) => words.find((w) => w.id === id);
  const start = at(from).start;
  return { start, end: Math.round(Math.max(at(to).end, sourceTime(outTime(start, segments) + min, segments)) * 1000) / 1000 };
}
export const minDuration = (type) => MIN_DUR[type] ?? 0;

const MIN_DUR = { cutout: 2, "text-behind": 2.5, "background-swap": 2.5, vertigo: 1.5, typography: 2.5, "chapter-card": 2.5, numbers: 2.5, "chart-grow": 4, compare: 4, list: 4, logo: 2, broll: 2.5, "zoom-through-cut": 1 };

// Plan → reel.json: overlaye LongForm (lf: true) zastępują poprzednie, reszta zostaje; zoom trafia do segmentów.
// Efekt z maską bez gotowej maski (`params.mask` z montażu) dostaje wariant bez maski albo jest pominięty — zawsze z adnotacją.
export function planToReel(reel, plan, words) {
  const segments = reel.segments.map((s) => ({ ...s }));
  const span = (from, to, min = 0) => effectSpan(segments, words, from, to, min);
  const lf = [];
  const skipped = [];
  const hookText = plan.customHook?.trim() || plan.hooks?.[plan.hook ?? 0]?.text;
  if (hookText) lf.push({ type: "typography", role: "hook", text: hookText, ...span(words[0].id, words[0].id, 3) });
  (plan.chapters ?? []).forEach((c, i) => {
    if (i) lf.push({ type: "chapter-card", n: i, title: c.title, ...span(c.startWordId, c.startWordId, MIN_DUR["chapter-card"]) });
  });
  for (const e of plan.effects ?? []) {
    if (e.removed) continue;
    const p = e.params ?? {};
    const t = span(e.fromWordId, e.toWordId, MIN_DUR[e.type] ?? 0);
    const base = { ...t, effectId: e.id };
    if (e.type === "digital-zoom") {
      const seg = segments.find((s) => t.start >= s.start && t.start < s.end);
      if (seg) seg.zoomTo = p.scale ?? 1.15;
    } else if (e.type === "typography") lf.push({ ...base, type: "typography", text: p.text, hl: p.hl });
    else if (e.type === "numbers") lf.push({ ...base, type: "counter", to: p.to, from: p.from, prefix: p.prefix, suffix: p.suffix, decimals: p.decimals, label: p.label, source: p.source });
    else if (e.type === "chart-grow") lf.push({ ...base, ...p, type: ["bars", "line", "ring"].includes(p.kind) ? p.kind : "bars", kind: undefined });
    else if (e.type === "compare") lf.push({ ...base, type: "compare", left: p.left, right: p.right });
    else if (e.type === "list") lf.push({ ...base, type: "list", title: p.title, items: p.items, mark: p.mark });
    else if (e.type === "logo" || e.type === "broll") {
      if (!p.src) {
        skipped.push({ id: e.id, why: e.type === "logo" ? `brak oficjalnego logo „${p.brand}”` : `brak przebitki dla „${p.query}”` });
        continue;
      }
      lf.push(e.type === "logo" ? { ...base, type: "logo", src: p.src, brand: p.brand } : { ...base, type: "media", src: p.src, fit: p.fit === "card" ? "card" : "full", credit: p.credit });
    } else if (e.type === "zoom-through-cut") lf.push({ ...base, type: "zoom-through" });
    else if (CATALOG[e.type]?.mask) {
      const mask = p.mask?.src ? { src: p.mask.src, from: p.mask.from } : null;
      const bg = p.bg === "broll" && !p.src ? (mask ? "blur" : null) : p.bg;
      if (mask) {
        if (e.type === "background-swap" && bg !== p.bg) skipped.push({ id: e.id, why: `brak przebitki „${p.query}” — tło rozmyte zamiast B-rollu` });
        lf.push({ ...base, type: e.type, mask, text: p.text, hl: p.hl, bg, src: bg === "broll" ? p.src : undefined, credit: p.credit });
        continue;
      }
      const why = `bez maski osoby${p.maskError ? ` (${p.maskError})` : ""}`;
      if (e.type === "text-behind") lf.push({ ...base, type: "typography", text: p.text, hl: p.hl, noMask: true });
      else if (e.type === "background-swap" && bg === "broll") lf.push({ ...base, type: "media", src: p.src, fit: "full", credit: p.credit, noMask: true });
      else if (e.type === "vertigo") lf.push({ ...base, type: "vertigo", noMask: true });
      else {
        skipped.push({ id: e.id, why: `${why} — efekt pominięty` });
        continue;
      }
      skipped.push({ id: e.id, why: `${why} — wariant: ${CATALOG[e.type].fallback}` });
    }
  }
  // Hook, plansza rozdziału i typography stoją w jednym slocie tekstu — późniejszy (niższy priorytet) nie może nachodzić.
  // Napis zaczynający się ≥ 1,2 s przed kolizją zostaje skrócony do jej początku zamiast znikać.
  const TEXT = new Set(["typography", "chapter-card", "text-behind"]);
  const placed = [];
  const free = lf.filter((o) => {
    if (!TEXT.has(o.type)) return true;
    let hit = placed.find((q) => o.start < q.end && q.start < o.end);
    if (hit && hit.start - o.start >= 1.2 && !placed.some((q) => q !== hit && o.start < q.end && q.start < hit.start)) {
      o.end = hit.start;
      hit = null;
    }
    if (!hit) return placed.push(o), true;
    skipped.push({ id: o.effectId ?? o.type, why: `napis „${o.text ?? o.title}” nachodzi na ${hit.role === "hook" ? "hook" : `„${hit.text ?? hit.title}”`}` });
    return false;
  });
  // PREFERENCJE 2026-10-17: poza wstępem bez napisów, chyba że plan ma tam `kinetic-captions` (podkreślenie/wyjaśnienie).
  const introEnd = plan.chapters?.[1]?.start ?? Infinity;
  const spans = (plan.effects ?? []).filter((e) => !e.removed && e.type === "kinetic-captions").map((e) => span(e.fromWordId, e.toWordId));
  const captions = (reel.captions ?? []).map((caption) => {
    const g = { ...caption };
    delete g.hidden;
    const a = g.words[0]?.start ?? 0;
    const b = g.words.at(-1)?.end ?? a;
    return a < introEnd - 0.01 || spans.some((x) => a < x.end && x.start < b) ? g : { ...g, hidden: true };
  });
  const kept = (reel.overlays ?? []).filter((o) => !o.lf);
  const added = free
    .map((o) => Object.fromEntries(Object.entries({ ...o, lf: true }).filter(([, v]) => v !== undefined)))
    .sort((a, b) => a.start - b.start);
  return { ...reel, segments, captions, overlays: [...kept, ...added], skipped };
}
