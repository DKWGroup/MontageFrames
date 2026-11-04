// 10 rolek Kacpra Bisanza z long formu „skyclass poziom.mp4” (2026-11-04).
// Układ kadru jest wypalany w pionowe źródło: przy udostępnianiu ekranu Kacper u góry, ekran na dole (karta),
// w studiu pełny kadr na Kacpra. Napisy, hook, karty, przebitki Pexels i SFX — standardowy Reel w stylu bisanz.
// Użycie: node scripts/skyclass-poziom-reels-2026-11-04.mjs prepare|stills|render|finish [nazwa|numer]
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {buildCandidateReel} from './quickcontent-adapter.mjs';
import {mergeNumberGroups} from './prep.mjs';
import {fetchBroll} from './longform-assets.mjs';
import {generateReelDescription} from './reel-description.mjs';
import {requestQuickContentAI} from './quickcontent-ai.mjs';

const exec = promisify(execFile);
const repo = process.cwd();
const SRC = '/Volumes/t7 blck bad/skyclass poziom.mp4';
const base = '/Volumes/t7 blck bad/MontageFrames/skyclass-poziom-rolki-2026-11-04';
const deliver = '/Volumes/t7 blck bad/Skyclass rolki 04.11.2026';
const publicDir = path.join(base, 'public');
const analysis = path.join(base, 'tmp', 'analysis');
process.env.TMPDIR = path.join(base, 'tmp') + '/';

// ---------- układ kadru z nasycenia barw (próbki co 0,5 s) ----------
const VERSION = 'v002'; // v001 (wersja z 04.11, Kacper z lewej, liczby słownie) zostaje w Render/
const STEP = 0.5;
const series = async (f) => [...(await fs.readFile(path.join(analysis, f), 'utf8')).matchAll(/SATAVG=([\d.]+)/g)].map((m) => +m[1]);
function runs(flags) {
  const out = [];
  for (let i = 0; i < flags.length; ) { let j = i; while (j < flags.length && flags[j] === flags[i]) j++; out.push([i, j]); i = j; }
  return out;
}
export function smooth(flags, minRun = 3) {
  const out = [...flags];
  for (const [i, j] of runs(out)) if (j - i < minRun && i > 0) out.fill(out[i - 1], i, j);
  return out;
}
// Kolorowe strony (żółty Discover Cars, niebieskie plansze) wyglądają jak studio: krótkie „pełne” luki między ekranami -> ekran.
export function fillShortFull(flags, maxGap = 20) {
  const out = [...flags];
  for (const [i, j] of runs(out)) if (!out[i] && i > 0 && j < out.length && j - i < maxGap) out.fill(true, i, j);
  return out;
}
async function layout() {
  const sat = await series('sat.txt'), tr = await series('tr.txt');
  let split = fillShortFull(smooth(sat.map((s) => s < 15)));
  // ponytail: sprawdzone ręcznie studio 192,5–200,5 s krótsze niż filtr luk; przy innym źródle zweryfikować
  for (let i = 385; i < 401; i++) split[i] = false;
  const popup = smooth(split.map((s, i) => !s && tr[i] < 20));
  return {split, popup};
}
const ranges = (flags, a, b) => {
  const res = [];
  let cur = null;
  for (let i = Math.floor(a / STEP); i <= Math.ceil(b / STEP) && i < flags.length; i++) {
    const t = Math.max(0, Math.min(b, i * STEP) - a);
    if (flags[i] && cur === null) cur = t;
    if (!flags[i] && cur !== null) { res.push([cur, t]); cur = null; }
  }
  if (cur !== null) res.push([cur, b - a]);
  return res.filter(([x, y]) => y - x > 0.05);
};
const expr = (rs) => rs.map(([x, y]) => `between(t,${x.toFixed(2)},${y.toFixed(2)})`).join('+') || '0';
const at = (flags, t) => flags[Math.min(flags.length - 1, Math.floor(t / STEP))];

// ---------- poprawki ASR ----------
const FIX = {Kasper: 'Kacper', Bissons: 'Bisanz', Skyklasie: 'SkyClassie', Pafost: 'Pafos', klimatystacja: 'klimatyzacja', ekspert: 'ekspres', Igo: 'Aygo', wnająć: 'wynająć', cyprz: 'Cypr', Marokko: 'Maroko', wdzięczka: 'wycieczka', czterogreskim: 'czterogwiazdkowym', detenacje: 'destynacje', Zerwnij: 'Zerknij', dili: 'deali', odsymywać: 'dostawać', rolników: 'saloników', Larnaki: 'Larnaka', IK: 'IKE'};
export const fix = (w) => { const m = w.match(/^(.*?)([.,?!:]*)$/); return (FIX[m[1]] ?? m[1]) + m[2]; };
function sourceWords(a, b, all) {
  const ws = all.filter((w) => w.start >= a - 0.05 && w.end <= b + 0.3).map((w) => ({text: fix(w.word.trim()), start: +(Math.max(w.start, a) - a).toFixed(3), end: +(Math.min(w.end, b) - a).toFixed(3)})).filter((w) => w.text);
  for (let i = 0; i < ws.length - 1; i++) if (/^sky$/i.test(ws[i].text) && /^class/i.test(ws[i + 1].text)) { ws[i] = {...ws[i], text: 'SkyClass' + ws[i + 1].text.slice(5), end: ws[i + 1].end}; ws.splice(i + 1, 1); }
  // Whisper pisze tysiące po angielsku („3” „,200” → „3,200”) — po polsku 3200.
  return mergeNumberGroups(numbersToDigits(ws)).map((w) => ({...w, text: w.text.replace(/^(\d{1,2}),(\d{3})(?=[.,?!:]*$)/, '$1$2')}));
}

// Liczebniki słowne -> cyfry (klient 2026-11-04). Ciąg słów-liczb skleja się w jedno słowo: start pierwszego, koniec ostatniego.
const CARD = {dwa: 2, dwie: 2, dwóch: 2, trzy: 3, trzech: 3, cztery: 4, czterech: 4, pięć: 5, pięciu: 5, sześć: 6, siedem: 7, osiem: 8, dziewięć: 9, dziesięć: 10,
  jedenaście: 11, dwanaście: 12, trzynaście: 13, czternaście: 14, piętnaście: 15, szesnaście: 16, siedemnaście: 17, osiemnaście: 18, dziewiętnaście: 19,
  dwadzieścia: 20, trzydzieści: 30, czterdzieści: 40, pięćdziesiąt: 50, sześćdziesiąt: 60, siedemdziesiąt: 70, osiemdziesiąt: 80, dziewięćdziesiąt: 90,
  sto: 100, dwieście: 200, trzysta: 300, czterysta: 400, pięćset: 500, sześćset: 600, siedemset: 700, osiemset: 800, dziewięćset: 900};
const ONE = {jeden: 1, jedna: 1, jedno: 1}; // tylko wewnątrz liczby („dziewięćset siedemdziesiąt jeden”), samo „jeden” zostaje słowem
const ORD = {czternasta: 14, czternastej: 14, szósta: 6, szóstej: 6, piąta: 5, piątej: 5, ósma: 8, ósmej: 8, dwudziesta: 20};
const THOUSAND = /^tysi(ąc|ąca|ące|ęcy|ącu)$/;
export function numbersToDigits(words) {
  const out = [];
  for (let i = 0; i < words.length; ) {
    const core = (w) => w.text.toLowerCase().replace(/[.,?!:]+$/, '');
    let j = i, total = 0, cur = 0, parts = 0;
    while (j < words.length) {
      const c = core(words[j]);
      const v = CARD[c] ?? (parts && ONE[c]);
      if (v) { cur += v; parts++; j++; continue; }
      if (THOUSAND.test(c) && !(i === j && /\d$/.test(out.at(-1)?.text ?? ''))) { total += (cur || 1) * 1000; cur = 0; parts++; j++; continue; }
      break;
    }
    if (parts) {
      const last = words[j - 1];
      out.push({...words[i], text: String(total + cur) + (last.text.match(/[.,?!:]+$/)?.[0] ?? ''), end: last.end});
      i = j;
      continue;
    }
    const o = ORD[core(words[i])];
    // Whisper pisze tysiące po angielsku („3,200”) — po polsku 3200.
    const text = words[i].text.replace(/^(\d{1,2}),(\d{3})(?=[.,?!:]*$)/, '$1$2');
    out.push(o ? {...words[i], text: String(o) + (words[i].text.match(/[.,?!:]+$/)?.[0] ?? '')} : {...words[i], text});
    i++;
  }
  return out;
}

// ---------- rolki: czasy w sekundach źródła ----------
const B = (s, e, q, text) => ({kind: 'broll', s, e, q, text});
const specs = [
  {n: 1, name: 'skyclass-poziom-01-kazdy-kraj', start: 35.6, end: 73.0, title: 'Kazdy kraj swiata', hook: 'Mój cel: każdy kraj świata', hl: 'każdy kraj', fx: [
    B(38.6, 43.0, 'airplane window clouds', null), {kind: 'counter', s: 38.6, e: 43.0, title: '/01 · Cel: każdy kraj', to: 80, suffix: '+', label: 'odwiedzonych krajów'},
    B(47.3, 49.9, 'budget airline airplane boarding', 'TAŃSZE LINIE'),
    B(50.1, 55.2, 'business class airplane seat', 'LEPSZA KLASA'),
    B(56.0, 61.4, 'friends traveling together', null), B(61.4, 66.9, 'travel adventure people mountains', null),
    {kind: 'list', s: 56.0, e: 66.9, title: '/02 · Najważniejsze', items: [{text: 'Z kim podróżujesz', at: 59.0}, {text: 'Czego doświadczasz', at: 62.1}]},
  ]},
  {n: 2, name: 'skyclass-poziom-02-masz-kase', start: 76.4, end: 97.3, title: 'Ty masz kase to podrozujesz', hook: '„Kacper, ty masz kasę”?', hl: 'masz kasę', fx: [
    B(85.2, 88.9, 'airport departure board', null), {kind: 'counter', s: 85.2, e: 88.9, title: '/01 · Od 8 lat', to: 1, suffix: '× w miesiącu', label: 'lot w podróż'},
    B(89.4, 94.0, 'counting money budget wallet', 'BUDŻET'),
  ]},
  {n: 3, name: 'skyclass-poziom-03-oferty-jednego-dnia', start: 140.6, end: 199.9, title: 'Oferty z jednego dnia', hook: 'Oferty z jednego dnia w SkyClass', hl: 'jednego dnia', fx: [
    B(156.0, 159.7, 'maldives resort beach', 'MALEDIWY · ALL INCLUSIVE'),
    B(164.8, 168.6, 'madeira island coast', 'MADERA'),
    B(176.8, 179.1, 'sri lanka', 'SRI LANKA'),
  ]},
  {n: 4, name: 'skyclass-poziom-04-cypr-w-grudniu', start: 199.8, end: 254.7, title: 'Cypr w grudniu', hook: 'Cypr w grudniu? Sprawdzam pogodę', hl: 'w grudniu?', fx: [
    B(200.0, 203.2, 'paphos cyprus', 'PAFOS · CYPR'),
    B(245.6, 250.0, 'sunny beach mediterranean', null), {kind: 'counter', s: 245.6, e: 250.0, title: '/01 · Cypr w grudniu', to: 17, suffix: '°C', label: 'średnio w grudniu'},
    B(250.2, 254.7, 'airplane takeoff', null), {kind: 'counter', s: 250.2, e: 254.7, title: '/02 · Lot', to: 187, suffix: ' zł', label: 'w dwie strony', cash: 251.5},
  ]},
  {n: 5, name: 'skyclass-poziom-05-booking', start: 255.4, end: 313.2, title: 'Booking nie jest najlepszy', hook: 'Booking nie jest najlepszy', hl: 'nie jest', fx: [
    B(297.4, 300.7, 'air conditioner', 'KLIMATYZACJA'),
    B(301.1, 307.8, 'cyprus old town houses', null),
  ]},
  {n: 6, name: 'skyclass-poziom-06-lot-i-nocleg', start: 313.5, end: 352.6, title: 'Lot i nocleg za 900 zl', hook: 'Lot i nocleg na Cyprze za niecałe 900 zł', hl: 'niecałe 900 zł', fx: [
    B(331.4, 337.8, 'taxi car city', 'TAKSÓWKA · 2 STRONY'),
    B(344.3, 352.6, 'cyprus beach sea', null),
    {kind: 'calc', s: 344.3, e: 352.6, title: '/01 · Na osobę', rows: [{text: 'Nocleg 1258 zł / 2', value: '629 zł', at: 345.0}, {text: 'Lot', value: '187 zł', at: 346.2}, {text: 'Taksówka', value: '75 zł', at: 347.4}], to: 891, suffix: ' zł', resultAt: 348.6, label: 'tydzień na Cyprze', cash: 348.6},
  ]},
  {n: 7, name: 'skyclass-poziom-07-auto-na-cyprze', start: 354.5, end: 411.0, title: 'Auto na Cyprze', hook: 'Auto na Cyprze? Uważaj na to', hl: 'Uważaj', fx: [
    B(394.7, 401.2, 'driving car road left hand traffic', 'RUCH LEWOSTRONNY'),
    B(402.8, 408.4, 'car rental keys', null), {kind: 'counter', s: 402.8, e: 408.4, title: '/01 · Auto na tydzień', to: 310, suffix: ' zł', label: 'automat, wynajem', cash: 403.6},
  ]},
  {n: 8, name: 'skyclass-poziom-08-tydzien-za-971', start: 411.1, end: 465.5, title: 'Tydzien na Cyprze za 971 zl', hook: 'Tydzień na Cyprze z autem za 971 zł', hl: '971 zł', fx: [
    B(433.6, 445.8, 'cyprus coast road', null),
    {kind: 'calc', s: 433.6, e: 445.8, title: '/01 · Na osobę', rows: [{text: 'Auto 310 zł / 2', value: '155 zł', at: 434.0}, {text: 'Lot', value: '187 zł', at: 435.2}, {text: 'Nocleg', value: '629 zł', at: 436.4}], to: 971, suffix: ' zł', resultAt: 437.8, label: 'samochód, nocleg i lot', cash: 437.8},
    B(453.8, 459.2, 'friends road trip car', 'TANIEJ WE CZTERY OSOBY'),
  ]},
  {n: 9, name: 'skyclass-poziom-09-business-class', start: 493.2, end: 528.0, title: 'Business class do Chicago', hook: 'Business class do Chicago za 3200 zł', hl: '3200 zł', fx: [
    B(500.2, 502.7, 'airplane seat legroom', 'MIEJSCE NA NOGI'),
    B(503.0, 506.5, 'hotel balcony sea view', 'WIDOK NA MORZE'),
    B(514.8, 520.9, 'business class cabin', null), {kind: 'counter', s: 514.8, e: 520.9, title: '/01 · Warszawa → Chicago', to: 3200, suffix: ' zł', label: 'business class w dwie strony', cash: 518.8},
  ]},
  {n: 10, name: 'skyclass-poziom-10-grazyno-cypr', start: 546.1, end: 584.1, title: 'Grazyno Cypr za dwie stowki', hook: '„Grażyno, Cypr za dwie stówki!”', hl: 'dwie stówki!”', fx: [
    B(550.9, 554.4, 'lunch break office laptop', 'PRZERWA NA OBIAD'),
    B(560.8, 565.9, 'couple airport travel', null),
    B(571.2, 573.6, 'cyprus beach', 'CYPR'),
    B(578.0, 584.1, 'airplane flying sunset', null), {kind: 'cta', s: 581.8, e: 584.1, label: 'System na podróże', text: 'SkyClass'},
  ]},
];

async function json(file, value) { await fs.mkdir(path.dirname(file), {recursive: true}); await fs.writeFile(file, JSON.stringify(value, null, 2)); }
const exists = (p) => fs.access(p).then(() => true, () => false);
const env = async () => Object.fromEntries((await fs.readFile(path.join(repo, '.env'), 'utf8')).split('\n').map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const only = (list) => list.filter((s) => !process.argv[3] || s.name === process.argv[3] || String(s.n) === process.argv[3]);

async function bake(spec, dir, L) {
  const out = path.join(dir, 'source.mp4');
  if (await exists(out)) return;
  const dur = spec.end - spec.start;
  const mask = path.join(base, 'tmp', 'screen-mask-1000x700.png');
  if (!(await exists(mask))) await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=white:s=1000x700', '-vf', "format=gray,geq=lum='if(gt(abs(X-500),472)*gt(abs(Y-350),322),if(lte(hypot(abs(X-500)-472,abs(Y-350)-322),28),255,0),255)'", '-frames:v', '1', mask]);
  const split = expr(ranges(L.split, spec.start, spec.end));
  const pop = expr(ranges(L.popup, spec.start, spec.end).map(([x, y]) => [Math.max(x, 3.2), y]).filter(([x, y]) => y > x));
  const fc = `[0:v]fps=30,split=4[a][b][c][d];
[a]crop=1216:2160:1240:0,scale=1080:1920,setsar=1[full];
[b]crop=1320:1405:0:60,scale=1080:1150,setsar=1[top];
[c]crop=2180:1526:1660:300,scale=1000:700,setsar=1,format=yuva420p[scr];
[1:v]format=gray,scale=1000:700[m];[scr][m]alphamerge[card];
color=c=0xEEF3F9:s=1080x1920:r=30:d=${dur.toFixed(3)}[bg];
[bg][top]overlay=0:0[t1];[t1]drawbox=x=0:y=1150:w=1080:h=6:color=0x066FED:t=fill[t2];[t2][card]overlay=40:1182[split];
[d]crop=880:480:2870:110,scale=820:-2,setsar=1[pop];
[full][split]overlay=0:0:enable='${split}'[v1];
[v1][pop]overlay=130:905:enable='${pop}',format=yuv420p[v];
[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[au]`;
  const fcp = path.join(base, 'tmp', `${spec.name}-fc.txt`);
  await fs.writeFile(fcp, fc);
  await exec('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-ss', String(spec.start), '-t', dur.toFixed(3), '-i', SRC, '-loop', '1', '-i', mask, '-filter_complex_script', fcp, '-map', '[v]', '-map', '[au]', '-t', dur.toFixed(3), '-c:v', 'h264_videotoolbox', '-b:v', '16M', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out + '.part.mp4'], {maxBuffer: 64e6});
  await fs.rename(out + '.part.mp4', out);
}

async function prepare() {
  const L = await layout();
  const all = JSON.parse(await fs.readFile(path.join(analysis, 'transcript-whisper.json'), 'utf8')).segments.flatMap((s) => s.words ?? []);
  const {PEXELS_API_KEY: key} = await env();
  for (const spec of only(specs)) {
    const dir = path.join(publicDir, 'reels', spec.name);
    await fs.mkdir(dir, {recursive: true});
    console.log('ŹRÓDŁO', spec.name);
    await bake(spec, dir, L);
    const dur = spec.end - spec.start;
    const words = sourceWords(spec.start, spec.end, all);
    const data = buildCandidateReel({words, duration: dur, styleId: 'bisanz', clientId: 'kacper-bisanz'});
    data.outputResolution = 1080;
    data.segments = [{start: 0, end: +dur.toFixed(3), zoom: 1, zoomTo: 1}]; // wypowiedź 1:1, sens ponad tempo
    const local = (t) => +(t - spec.start).toFixed(3);
    const brolls = spec.fx.filter((f) => f.kind === 'broll').map((f) => [local(f.s), local(f.e)]);
    const onBroll = (t) => brolls.some(([x, y]) => t >= x && t < y);
    // Napisy: przy ekranie na łączeniu (pod Kacprem), w studiu pod brodą; na przebitce z kartą niżej.
    for (const c of data.captions) {
      const t = c.words[0].start;
      c.y = onBroll(t) ? 0.73 : at(L.split, spec.start + t) ? 0.53 : 0.72;
    }
    // W układzie z ekranem głowa jest przy górnej krawędzi, a biała karta ekranu gasi biały tekst:
    // hook na koszuli pod brodą, napisy pierwszych 3 s tuż pod nim (nad łączeniem).
    const splitStart = at(L.split, spec.start + 0.5);
    data.overlays = [{type: 'title', start: 0, end: 3, text: spec.hook, hl: spec.hl, y: splitStart ? 0.45 : 0.1, size: 54}];
    if (splitStart) for (const c of data.captions) if (c.words[0].start < 3) c.y = 0.55;
    data.sfx = [{at: 0.1, src: 'pop.mp3', volume: 0.3}];
    for (const f of spec.fx) {
      const s = local(f.s), e = local(f.e);
      if (f.kind === 'broll') {
        const clip = await fetchBroll(f.q, e - s, dir, {key, cacheDir: path.join(base, 'tmp', 'pexels-cache')});
        if (!clip) { console.log('  brak przebitki:', f.q); continue; }
        data.overlays.push({type: 'media', fit: 'full', src: clip.src, start: s, end: e, volume: 0, credit: clip.credit, ...(f.text && {text: f.text})});
        data.sfx.push({at: s, src: 'pop.mp3', volume: 0.3});
      } else {
        const o = {type: f.kind, start: s, end: e, y: 0.37};
        for (const k of ['title', 'to', 'suffix', 'label', 'text']) if (f[k] !== undefined) o[k] = f[k];
        if (f.items) o.items = f.items.map((it) => ({...it, at: local(it.at)}));
        if (f.rows) { o.rows = f.rows.map((r) => ({...r, at: local(r.at)})); o.resultAt = local(f.resultAt); }
        if (f.kind === 'cta') o.y = 0.4;
        data.overlays.push(o);
        if (f.cash) data.sfx.push({at: local(f.cash), src: 'cash.mp3', volume: 0.3});
      }
    }
    data.sfx.sort((x, y) => x.at - y.at);
    data.sfx = data.sfx.filter((x, i, a) => i === 0 || x.at - a[i - 1].at >= 0.5);
    for (const f of ['pop.mp3', 'cash.mp3']) await fs.copyFile(path.join(repo, 'public/reels/qc-ae470d7074e8f8bc-dc4f8f0520fc265e', f), path.join(dir, f));
    await json(path.join(dir, 'reel.json'), data);
    await json(path.join(dir, 'transcript.json'), words);
    await json(path.join(dir, 'origin.json'), {kind: 'manual-longform-cut', source: SRC, sourceStart: spec.start, sourceEnd: spec.end, transcript: 'Whisper large-v3-turbo (pl), poprawki pisowni w FIX', layout: 'split: ekran udostępniony (Kacper góra, ekran dół), full: studio'});
    await json(path.join(dir, 'publication-settings.json'), {projectInstructions: 'Konkretny głos Kacpra Bisanza, pierwsza osoba, bez ściemy. Ceny i oferty to przykłady z nagrania, nie aktualna oferta. Bez nowych cen i obietnic. Dokładnie 5 hashtagów.'});
    console.log('  dane:', data.captions.length, 'grup napisów,', data.overlays.length, 'grafik');
  }
}

async function bundleAndRender(mode) {
  const {bundle} = await import('@remotion/bundler');
  const {renderMedia, renderStill, selectComposition, ensureBrowser} = await import('@remotion/renderer');
  const browser = await ensureBrowser({logLevel: 'error'});
  const serveUrl = await bundle({entryPoint: path.join(repo, 'src/pack/skyclass-poziom-index.tsx'), outDir: path.join(base, 'tmp', 'bundle'), publicDir});
  for (const spec of only(specs)) {
    const inputProps = {reel: spec.name};
    const composition = await selectComposition({serveUrl, id: 'SkyPoziomReel', inputProps, browserExecutable: browser.path});
    const shared = {serveUrl, composition, inputProps: composition.props, browserExecutable: browser.path};
    if (mode === 'stills') {
      const frames = [15, 60, ...spec.fx.map((f) => Math.round((f.s - spec.start + 1.2) * 30)), composition.durationInFrames - 20];
      for (const frame of frames.filter((f) => f < composition.durationInFrames)) await renderStill({...shared, frame, scale: 0.35, imageFormat: 'jpeg', output: path.join(base, 'tmp', 'stills', spec.name, `f${String(frame).padStart(5, '0')}.jpg`)});
      console.log('KLATKI', spec.name);
    } else {
      const out = path.join(base, 'Render', `${spec.name}-${VERSION}.mp4`);
      if (await exists(out)) { console.log('jest', out); continue; }
      await renderMedia({...shared, outputLocation: out + '.part.mp4', codec: 'h264', crf: 18, pixelFormat: 'yuv420p', audioCodec: 'aac', concurrency: 2, offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024});
      await fs.rename(out + '.part.mp4', out);
      console.log('MP4', out);
    }
  }
}

async function finish() {
  await fs.mkdir(deliver, {recursive: true});
  for (const spec of only(specs)) {
    const dir = path.join(publicDir, 'reels', spec.name);
    const mp4 = path.join(base, 'Render', `${spec.name}-${VERSION}.mp4`);
    const probe = JSON.parse((await exec('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', mp4])).stdout);
    const v = probe.streams.find((s) => s.codec_type === 'video');
    assert.equal(v.width, 1080); assert.equal(v.height, 1920);
    const label = `${String(spec.n).padStart(2, '0')} - ${spec.title}`;
    await fs.copyFile(mp4, path.join(deliver, `${label}.mp4`));
    const description = await generateReelDescription(spec.name, {
      root: base,
      descriptionInstructions: JSON.parse(await fs.readFile(path.join(dir, 'publication-settings.json'), 'utf8')).projectInstructions,
      requestAI: (req, ctx) => requestQuickContentAI(req, {...ctx, root: repo}), // klucz API zostaje w .env repo
    });
    console.log('OPIS', spec.name, description.status);
    if (description.status === 'ready') {
      await fs.copyFile(path.join(dir, 'publication.txt'), path.join(base, 'Render', `${spec.name}-opis.txt`));
      await fs.copyFile(path.join(dir, 'publication.txt'), path.join(deliver, `${label} - opis.txt`));
    }
  }
}

assert.deepEqual(smooth([1, 1, 1, 0, 1, 1, 1]), [1, 1, 1, 1, 1, 1, 1]);
assert.deepEqual(fillShortFull([true, false, false, true], 20), [true, true, true, true]);
assert.equal(fix('Kasper,'), 'Kacper,');
{
  const w = (t, s) => ({text: t, start: s, end: s + 0.5});
  const r = numbersToDigits([w('Mamy', 0), w('dziewięćset', 1), w('siedemdziesiąt', 2), w('jeden', 3), w('złotych.', 4), w('jeden', 5), w('tysiąc', 6), w('Czternasta', 7)]);
  assert.deepEqual(r.map((x) => x.text), ['Mamy', '971', 'złotych.', 'jeden', '1000', '14']);
  assert.equal(r[1].end, 3.5);
}
const action = process.argv[2] ?? 'prepare';
if (action === 'prepare') await prepare();
else if (action === 'stills' || action === 'render') await bundleAndRender(action);
else if (action === 'finish') await finish();
else throw Error('prepare | stills | render | finish');
