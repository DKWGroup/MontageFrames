// LongForm L3: assety planu — przebitki Pexels (cache 24 h, limity, credits.md), logotypy z oficjalnych źródeł, SFX z rejestru.
// Klucz Pexels nigdy nie trafia do logów ani komunikatów błędów.
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { URLSearchParams } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const DAY = 24 * 3600e3;
const exists = (p) => fs.access(p).then(() => true, () => false);
const header = (res, name) => res.headers?.get?.(name) ?? null;

export async function pexelsSearch(query, { key, fetch = globalThis.fetch, cacheDir, now = Date.now() }) {
  if (!key) throw new Error("Brak PEXELS_API_KEY w .env — przebitki pominięte.");
  const file = path.join(cacheDir, `${createHash("sha1").update(query).digest("hex")}.json`);
  const cached = await fs.readFile(file, "utf8").then(JSON.parse, () => null);
  if (cached && now - cached.at < DAY) return cached.videos;
  const url = `https://api.pexels.com/videos/search?${new URLSearchParams({ query, orientation: "landscape", per_page: "15" })}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  const reset = Number(header(res, "x-ratelimit-reset"));
  if (res.status === 429 || header(res, "x-ratelimit-remaining") === "0")
    throw Object.assign(new Error("Pexels: wyczerpany limit zapytań — ponowimy po odnowieniu limitu."), { rateLimited: true, resetAt: reset ? reset * 1000 : now + 3600e3 });
  if (!res.ok) throw new Error(`Pexels odrzucił zapytanie (HTTP ${res.status}).`);
  const videos = (await res.json()).videos ?? [];
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(file, JSON.stringify({ at: now, query, videos }));
  return videos;
}

// Plik ≥ 1920 px szerokości z nagrania ≥ potrzebnej długości; najmniejszy wystarczający (mniej danych).
export function pickVideoFile(videos, minDuration) {
  const files = videos
    .filter((v) => v.duration >= minDuration)
    .flatMap((v) => v.video_files.filter((f) => f.width >= 1920 && f.file_type === "video/mp4").map((f) => ({ ...f, video: v })));
  return files.sort((a, b) => a.width - b.width)[0] ?? null;
}

export async function fetchBroll(query, minDuration, reelDir, opts) {
  const file = pickVideoFile(await pexelsSearch(query, opts), minDuration);
  if (!file) return null;
  const v = file.video;
  const rel = `assets/pexels/${v.id}.mp4`;
  const abs = path.join(reelDir, rel);
  if (!(await exists(abs))) {
    const res = await (opts.fetch ?? globalThis.fetch)(file.link);
    if (!res.ok) throw new Error(`Pexels: nie udało się pobrać wideo ${v.id} (HTTP ${res.status}).`);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(`${abs}.part`, Buffer.from(await res.arrayBuffer()));
    await fs.rename(`${abs}.part`, abs);
  }
  const credits = path.join(reelDir, "credits.md");
  const prev = await fs.readFile(credits, "utf8").catch(() => "# Przebitki i licencje\n\n");
  if (!prev.includes(v.url)) await fs.writeFile(credits, `${prev}- Wideo: ${v.user?.name ?? "autor"} (${v.user?.url ?? ""}) — Pexels ${v.url} (licencja Pexels)\n`);
  return { src: rel, credit: `${v.user?.name ?? "Pexels"} / Pexels` };
}

const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Logo tylko z cache oficjalnych materiałów marki: public/Brandings/_logos/<marka>.svg|png + <marka>.source.txt (URL źródła).
// ponytail: bez automatycznego pobierania — pewność „oficjalne” daje człowiek, który dodał plik źródła.
export async function logoFor(brand, root, reelDir) {
  const dir = path.join(root, "public/Brandings/_logos");
  const name = slug(String(brand ?? ""));
  if (!name) return null;
  const source = (await fs.readFile(path.join(dir, `${name}.source.txt`), "utf8").catch(() => "")).trim();
  if (!/^https?:\/\//.test(source)) return null;
  for (const ext of ["svg", "png"]) {
    const file = path.join(dir, `${name}.${ext}`);
    if (!(await exists(file))) continue;
    const rel = `assets/logos/${name}.${ext}`;
    await fs.mkdir(path.join(reelDir, "assets/logos"), { recursive: true });
    await fs.copyFile(file, path.join(reelDir, rel));
    return { src: rel, source };
  }
  return null;
}

// SFX z rejestru public/sfx/index.json: wpis z licencją i istniejącym plikiem, inaczej efekt bez dźwięku.
export async function sfxFor(id, root) {
  const list = await fs.readFile(path.join(root, "public/sfx/index.json"), "utf8").then(JSON.parse, () => []);
  const e = list.find((x) => x.id === id && String(x.license ?? "").trim());
  return e && (await exists(path.join(root, "public/sfx", e.file))) ? e : null;
}
