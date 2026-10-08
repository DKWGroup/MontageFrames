// Surowe nagranie -> public/reels/<nazwa>/{source.*, transcript.json, reel.json}
// Użycie: node scripts/prep.mjs <plik-wideo> [nazwa] [--force] [--style=skyclass]
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { syncStudio } from "./studio-sync.mjs";
import { pathToFileURL } from "node:url";

// Cięcie ciszy: próg głośności i minimalna długość pauzy do wycięcia.
// Głośne tło (ulica, wiatr) -> podnieś NOISE_DB do -30.
const NOISE_DB = -35;
const MIN_SILENCE = 0.4;
const PAD = 0.08; // zapas audio zostawiany po obu stronach cięcia

// Słowa, które nie mogą kończyć grupy (lepią się do następnego) i nie są słowem-kluczem.
const STOP = new Set(
  "a i w z o u na do od po za ze we się to jest że nie jak co ale czy ten ta te tym tego tej tak już tylko też jeszcze więc bo by dla przez przy pod nad mi ci go jej mnie ja ty on ona my wy oni są był była było będzie ich im jego mój twój swój sobie jak gdy kiedy żeby aby oraz lub albo".split(" "),
);
const DIRS = ["right", "bottom", "left", "top"];
const LAYOUTS = ["stack", "inline"]; // tylko zwarte układy — PREFERENCJE.md

const bare = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function groupWords(words, { maxWords = 6, maxChars = 32, pauses = [] } = {}) {
  const groups = [];
  let cur = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + bare(x.text).length + 1, 0) + bare(w.text).length;
    const full = cur.length >= maxWords || chars > maxChars;
    // przecinek albo pauza w mowie zamyka grupę dopiero od 2 słów — napisy nie migają
    const soft = cur.length >= 2 && (/[,;:]$/.test(prev?.text) || pauses.some((t) => t > prev.start && t < w.start));
    if (prev && (full || soft || /[.!?]$/.test(prev.text))) {
      // "w", "i", "na"... przechodzą do następnej grupy zamiast wisieć na końcu
      const carry = full && cur.length > 1 && STOP.has(bare(prev.text)) ? [cur.pop()] : [];
      groups.push(cur);
      cur = carry;
    }
    cur.push(w);
  }
  if (cur.length) groups.push(cur);
  // samotne słowo na końcu zdania wraca do poprzedniej grupy (lekko ponad limit liter)
  for (let i = groups.length - 1; i > 0; i--) {
    const [g, p] = [groups[i], groups[i - 1]];
    const len = [...p, ...g].reduce((n, x) => n + bare(x.text).length + 1, -1);
    if (g.length === 1 && p.length < maxWords && len <= maxChars + 8 && !/[.!?,;:]$/.test(p[p.length - 1].text)) {
      p.push(...g);
      groups.splice(i, 1);
    }
  }
  return groups;
}

export function pickKey(words) {
  const score = (w) => (/\d/.test(w.text) ? 100 : STOP.has(bare(w.text)) ? 0 : bare(w.text).length);
  return words.reduce((best, w, i) => (score(w) > score(words[best]) ? i : best), 0);
}

export function keepRanges(silences, duration, pad = PAD) {
  const keep = [];
  let t = 0;
  for (const s of silences) {
    const end = Math.min(s.start + pad, duration);
    if (end - t > 0.15) keep.push({ start: t, end });
    t = Math.max(t, (s.end ?? duration) - pad);
  }
  if (duration - t > 0.15) keep.push({ start: t, end: duration });
  return keep.map((k) => ({ start: +k.start.toFixed(3), end: +k.end.toFixed(3) }));
}

export function buildReel({ source, words, silences, duration, style = "persona", client = null }) {
  const ranges = style === "skyclass" ? [{ start: 0, end: duration }] : keepRanges(silences, duration);
  const segments = ranges.map((s, i) => ({ ...s, zoom: i % 2 ? 1.1 : 1 }));
  let dir = 0;
  const pauses = silences.map((s) => s.start);
  const captions = groupWords(words, { pauses }).map((g, i) => {
    const group = {
      words: g.map(({ text, start, end }) => ({ text, start, end })),
      key: pickKey(g),
      from: DIRS[dir % DIRS.length],
      layout: g.length <= 2 ? "stack" : LAYOUTS[i % LAYOUTS.length],
    };
    if (/[.!?]$/.test(g.at(-1).text)) dir++; // nowe zdanie = nowy kierunek wjazdu
    return group;
  });
  return { source, style, ...(client && { client }), fps: 30, segments, captions, overlays: [] };
}

// Klient = folder z klienci/<klient>/... w ścieżce nagrania. Jego rolki renderują się do klienci/<klient>/Render (PREFERENCJE.md), reszta do out/.
export const clientOf = (input) => input.match(/(?:^|\/)klienci\/([^/]+)\//i)?.[1] ?? null;
export const renderPath = (client, name) => (client ? `klienci/${client}/Render/${name}.mp4` : `out/${name}.mp4`);

// Styl napisów z folderu klienta w ścieżce nagrania (--style= ma pierwszeństwo).
export const styleOf = (input) =>
  /(^|[\/])skyclass([\/]|$)/i.test(input)
    ? "skyclass"
    : /bisanz/i.test(input)
      ? "bisanz"
      : /herod/i.test(input)
        ? "herod"
        : /swieza-?bryka-?ameryka/i.test(input)
          ? "ameryka"
          : "persona";

// Nazwa rolki/klienta: małe litery, bez polskich znaków, myślniki zamiast reszty.
export const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function detectSilences(file) {
  const { stderr } = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-i", file, "-af", `silencedetect=noise=${NOISE_DB}dB:d=${MIN_SILENCE}`, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const out = [];
  for (const m of stderr.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === "start") out.push({ start: +m[2] });
    else if (out.length) out.at(-1).end = +m[2];
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const [input, rawName] = args.filter((a) => !a.startsWith("--"));
  if (!input || !existsSync(input)) {
    console.error("Użycie: node scripts/prep.mjs <plik-wideo> [nazwa] [--force] [--style=skyclass]");
    process.exit(1);
  }
  const style = args.find((a) => a.startsWith("--style="))?.slice(8) ?? styleOf(input);
  const client = clientOf(input);
  const name = slug(rawName ?? path.parse(input).name);
  if (!name) {
    console.error("Nazwa rolki jest pusta po oczyszczeniu — podaj ją jako drugi argument.");
    process.exit(1);
  }
  const dir = path.join("public", "reels", name);
  if (existsSync(path.join(dir, "reel.json")) && !force) {
    console.error(`${dir}/reel.json już istnieje (może mieć ręczne poprawki). Dodaj --force, żeby nadpisać.`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  const source = "source" + path.extname(input).toLowerCase();
  const src = path.join(dir, source);
  if (path.resolve(input) !== path.resolve(src)) copyFileSync(input, src);

  const duration = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], {
    encoding: "utf8",
  }).trim();

  console.log("Transkrypcja (Parakeet, pl)...");
  execFileSync("npx", ["hyperframes", "transcribe", src, "-d", dir, "-l", "pl", "--json"], { stdio: "inherit" });
  const words = JSON.parse(readFileSync(path.join(dir, "transcript.json"), "utf8"));

  const reel = buildReel({ source, words, silences: style === "skyclass" ? [] : detectSilences(src), duration, style, client });
  writeFileSync(path.join(dir, "reel.json"), JSON.stringify(reel, null, 2));
  syncStudio();
  const kept = reel.segments.reduce((n, s) => n + s.end - s.start, 0);
  console.log(
    `\n${name}: ${duration.toFixed(1)}s -> ${kept.toFixed(1)}s (${style === "skyclass" ? "bez cięcia ciszy" : "po cięciu ciszy"}), ${reel.segments.length} ujęć, ${reel.captions.length} grup napisów`,
  );
  console.log(`Podgląd: npm run dev  |  Render: npx remotion render ${name} "${renderPath(client, name)}"`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
