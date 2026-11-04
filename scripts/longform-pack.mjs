// Paczka animacji do long formu: osobne klipy MOV (ProRes 4444 z alfą) + XML do Premiere.
// node scripts/longform-pack.mjs resolve|qa|render|xml <folder paczki w public/longform-pack> [--only 3,7]
// pack.json: czasy jako "słowo@sekundy" (kotwica w transcript.json) albo liczby; resolve → pack.resolved.json.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { toXmeml } from "./cutraw-xml.mjs";

const [cmd, dirArg, ...rest] = process.argv.slice(2);
if (!cmd || !dirArg) throw new Error("Użycie: node scripts/longform-pack.mjs resolve|qa|render|xml <folder> [--only 1,2]");
const dir = path.resolve(dirArg);
const only = rest.includes("--only") ? new Set(rest[rest.indexOf("--only") + 1].split(",").map(Number)) : null;
// qa --at 1.5,6: klatki w tych sekundach klipu zamiast jednej domyślnej (np. kilka chwil długiej animacji)
const atList = rest.includes("--at") ? rest[rest.indexOf("--at") + 1].split(",").map(Number) : null;
const LEAD = 0.12; // grafika rusza chwilę przed słowem, żeby wejście skończyło się razem z nim

const norm = (s) => s.toLowerCase().normalize("NFC").replace(/[.,!?;:„”"'()]/g, "");
// Nazwa pliku i kompozycji: numer z kolejności albo jawne `file` (np. „reklama-skyclass-v1”), żeby dopiski nie przenumerowały paczki.
export const compId = (i, it) => `sub-${it.file ?? `${String(i + 1).padStart(2, "0")}-${it.slug}`}`;

function resolve() {
  const plan = JSON.parse(fs.readFileSync(`${dir}/pack.json`, "utf8"));
  const tr = JSON.parse(fs.readFileSync(`${dir}/transcript.json`, "utf8"));
  const words = Array.isArray(tr) ? tr : tr.words;
  // Długość z oryginału; gdy oryginału już nie ma na dysku, z planu (`duration`).
  const duration = fs.existsSync(plan.source)
    ? Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", plan.source], { encoding: "utf8" }))
    : plan.duration;
  if (!(duration > 0)) throw new Error(`Brak oryginału ${plan.source} i pola "duration" w pack.json`);
  const anchor = (v, where) => {
    if (typeof v === "number") return v;
    const [w, t] = v.split("@");
    const hits = words.filter((x) => norm(x.text).startsWith(norm(w)) && Math.abs(x.start - Number(t)) < 4);
    if (!hits.length) throw new Error(`${where}: brak słowa „${w}” w okolicy ${t} s`);
    return hits.reduce((a, b) => (Math.abs(b.start - t) < Math.abs(a.start - t) ? b : a)).start;
  };
  // Każde pole `at`/`*At` z kotwicą → sekundy źródła.
  const walk = (o, where) => {
    if (Array.isArray(o)) return o.map((x, i) => walk(x, `${where}[${i}]`));
    if (!o || typeof o !== "object") return o;
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, /^(at|strike|.+At)$/.test(k) && v != null ? anchor(v, `${where}.${k}`) : walk(v, `${where}.${k}`)]));
  };
  const items = plan.items.map((it) => {
    const r = walk(it, it.slug);
    // `xyzFile: "media/a.json"` → dane wczytane do `xyz` (np. wyróżnienia kwot z OCR)
    for (const [k, v] of Object.entries(r)) if (k.endsWith("File") && String(v).endsWith(".json")) r[k.slice(0, -4)] = JSON.parse(fs.readFileSync(`${dir}/${v}`, "utf8"));
    r.at = Math.max(0, Math.round((r.at - LEAD) * 100) / 100);
    r.dur = Math.min(r.dur, duration - r.at);
    return r;
  });
  // Ostrzeżenia: nakładanie w tej samej strefie, elementy poza czasem klipu.
  items.forEach((it, i) => {
    const prev = items.slice(0, i).filter((p) => p.zone === it.zone && p.at + p.dur > it.at);
    for (const p of prev) console.warn(`! ${it.slug} nachodzi na ${p.slug} w strefie ${it.zone}`);
    const late = innerTimes(it).filter((t) => t > it.at + it.dur - 0.6);
    if (late.length) console.warn(`! ${it.slug}: element po końcu klipu (${late.join(", ")} s > ${(it.at + it.dur).toFixed(2)} s)`);
  });
  fs.writeFileSync(`${dir}/pack.resolved.json`, JSON.stringify({ ...plan, duration, items }, null, 1));
  const gaps = items.map((it, i) => (i ? it.at - items[i - 1].at : it.at));
  console.log(`${items.length} animacji, odstęp średnio ${(duration / items.length).toFixed(1)} s, najdłuższa przerwa ${Math.max(...gaps).toFixed(1)} s`);
  for (const [i, it] of items.entries()) console.log(`${String(i + 1).padStart(2)}  ${it.at.toFixed(2).padStart(8)}  ${it.dur.toFixed(1).padStart(4)}  ${it.zone}  ${it.type.padEnd(9)} ${it.slug}`);
}

// Czasy elementów wewnątrz klipu (wszystkie pola at/*At poza samym startem).
const innerTimes = (it) => (JSON.stringify(it).match(/"(?:at|strike|\w+At)":\d+(\.\d+)?/g) ?? []).map((m) => Number(m.split(":")[1])).filter((t) => t > it.at);
const load = () => JSON.parse(fs.readFileSync(`${dir}/pack.resolved.json`, "utf8"));
const outDir = (plan) => path.resolve(`klienci/${plan.client}/Render/${plan.name}-animacje`);
// Bundle dostaje tylko public/longform-pack (fonty + paczki), nie całe public/ z filmami rolek; kopia tymczasowa znika po pracy.
const serve = async () => {
  const url = await bundle({ entryPoint: path.resolve("src/pack/index.ts"), publicDir: path.resolve("public/longform-pack") });
  process.on("exit", () => fs.rmSync(url, { recursive: true, force: true }));
  return url;
};

// Kontrola: klatka z każdej animacji na tle klatki źródła w tym samym czasie → arkusze 3×3.
async function qa() {
  const plan = load();
  const url = await serve();
  const qd = `${dir}/qa`;
  fs.rmSync(qd, { recursive: true, force: true }); // folder w całości generowany; stare kafelki psułyby arkusze
  fs.mkdirSync(qd, { recursive: true });
  let n = 0;
  for (const [i, it] of plan.items.entries()) {
    if (only && !only.has(i + 1)) continue;
    const composition = await selectComposition({ serveUrl: url, id: compId(i, it) });
    for (const t of atList?.map((x) => it.at + x) ?? [Math.min(Math.max(...innerTimes(it), it.at) + 1.1, it.at + it.dur - 0.35)]) {
      await renderStill({ composition, serveUrl: url, output: `${qd}/fg.png`, frame: Math.round((t - it.at) * plan.fps), imageFormat: "png", scale: 0.5 });
      if (fs.existsSync(plan.source)) execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", plan.source, "-frames:v", "1", "-vf", "scale=960:540", `${qd}/bg.png`]);
      else fs.copyFileSync(`${dir}/qa-bg.png`, `${qd}/bg.png`); // oryginał przeniesiony: stały kadr studia
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${qd}/bg.png`, "-i", `${qd}/fg.png`, "-filter_complex", "overlay", `${qd}/${String(n++).padStart(3, "0")}.png`]);
      console.log(`kafelek ${n} → animacja ${i + 1} ${it.slug} (${(t - it.at).toFixed(1)} s)`);
    }
  }
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${qd}/%03d.png`, "-vf", "tile=3x3", `${qd}/sheet-%02d.png`]);
  console.log(`Arkusze: ${qd}/sheet-*.png`);
}

async function render() {
  const plan = load();
  const out = outDir(plan);
  fs.mkdirSync(out, { recursive: true });
  const url = await serve();
  for (const [i, it] of plan.items.entries()) {
    if (only && !only.has(i + 1)) continue;
    const id = compId(i, it);
    const composition = await selectComposition({ serveUrl: url, id });
    const file = `${out}/${id.replace(/^sub-/, "")}.mov`;
    const t0 = Date.now();
    await renderMedia({
      composition, serveUrl: url, outputLocation: file, scale: plan.width / composition.width,
      codec: "prores", proResProfile: "4444", pixelFormat: "yuva444p10le", imageFormat: "png", audioCodec: "pcm-16",
    });
    console.log(`${id}  ${((Date.now() - t0) / 1000).toFixed(0)} s  ${(fs.statSync(file).size / 1e6).toFixed(0)} MB`);
  }
}

// XML: V1/A1 oryginał, nad nim ścieżki animacji (strefy L, R, C; nakładki w tej samej strefie na kolejnej ścieżce).
function xml() {
  const plan = load();
  const out = outDir(plan);
  const probe = (f) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,channels,sample_rate", "-of", "json", f], { encoding: "utf8" }));
  const fileOf = (id, f) => {
    const p = probe(f);
    const v = p.streams.find((s) => s.codec_type === "video");
    const a = p.streams.find((s) => s.codec_type === "audio");
    return { id, path: f, duration: Number(p.format.duration), width: v?.width, height: v?.height, channels: a?.channels, sampleRate: Number(a?.sample_rate ?? 48000) };
  };
  // Oryginał przeniesiony z dysku: metadane z planu, Premiere poprosi o wskazanie pliku przy imporcie.
  const files = [
    fs.existsSync(plan.source)
      ? fileOf("master", plan.source)
      : { id: "master", path: plan.source, duration: plan.duration, width: plan.width, height: plan.height, channels: 2, sampleRate: 48000 },
  ];
  const tracks = [];
  for (const [i, it] of plan.items.entries()) {
    const f = `${out}/${compId(i, it).replace(/^sub-/, "")}.mov`;
    if (!fs.existsSync(f)) throw new Error(`Brak renderu: ${f}`);
    files.push(fileOf(it.slug, f));
    const shot = { file: it.slug, start: it.at, end: it.at + it.dur, offset: it.at, label: path.basename(f) };
    let t = tracks.find((x) => x.zone === it.zone && x.shots.at(-1).end <= it.at);
    if (!t) tracks.push((t = { zone: it.zone, shots: [] }));
    t.shots.push(shot);
  }
  tracks.sort((a, b) => "LRCA".indexOf(a.zone) - "LRCA".indexOf(b.zone));
  const master = { file: "master", label: path.basename(plan.source), link: "master" };
  const doc = toXmeml({
    name: `${plan.name} — animacje`, fps: plan.fps, width: plan.width, height: plan.height,
    segments: [{ start: 0, end: plan.duration }], files,
    video: [master, ...tracks.map((t, i) => ({ shots: t.shots, link: `anim-${i}` }))],
    audio: [master, ...tracks.map((t, i) => ({ shots: t.shots, link: `anim-${i}` }))],
    markers: plan.items.map((it, i) => ({ at: it.at, name: compId(i, it).replace(/^sub-/, "") })),
  });
  const target = `${out}/${plan.name}-animacje.xml`;
  fs.writeFileSync(target, doc);
  // README obok renderów: import, lista klipów z timecode'ami, uwagi do sprawdzenia, źródła.
  const tc = (t) => {
    const f = Math.round(t * plan.fps);
    const s = Math.floor(f / plan.fps);
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f % plan.fps].map((n) => String(n).padStart(2, "0")).join(":");
  };
  const zone = { L: "lewa kolumna", R: "prawy górny róg", C: "środek", A: "telefon po lewej" };
  const readme = [
    `# ${plan.name} — animacje (${plan.items.length} klipów)`,
    "",
    `Każdy klip to osobny MOV ProRes 4444 z kanałem alfa, ${plan.width}×${plan.height}, ${plan.fps} kl./s, z wbudowanymi SFX. Pozycja w kadrze jest już ustawiona (pełna klatka, przezroczysta).`,
    "",
    `**Premiere Pro:** Plik → Importuj → \`${path.basename(target)}\`. Powstanie sekwencja z oryginałem na V1/A1 i animacjami na kolejnych ścieżkach, w czasie wypowiedzi, z markerami. Gdy Premiere zapyta o brakujący plik, wskaż oryginał \`${path.basename(plan.source)}\`. SFX są ustawione 10 dB pod głosem z surowego nagrania: jeśli podbijasz dialog, podbij też ścieżki animacji o tyle samo.`,
    "",
    ...(plan.notes?.length ? ["## Do sprawdzenia", "", ...plan.notes.map((n) => `- ${n}`), ""] : []),
    "## Klipy",
    "",
    "| nr | start | czas | miejsce | plik |",
    "|---|---|---|---|---|",
    ...plan.items.map((it, i) => `| ${i + 1} | ${tc(it.at)} | ${it.dur.toFixed(1)} s | ${zone[it.zone]} | ${compId(i, it).replace(/^sub-/, "")}.mov |`),
    "",
    fs.existsSync(`${dir}/sources.md`) ? fs.readFileSync(`${dir}/sources.md`, "utf8") : "",
  ].join("\n");
  fs.writeFileSync(`${out}/README.md`, readme);
  console.log(`${target}: ${plan.items.length} klipów na ${tracks.length} ścieżkach; opis: ${out}/README.md`);
}

const run = { resolve, qa, render, xml }[cmd];
if (!run) throw new Error(`Nieznane polecenie: ${cmd}`);
await run();
