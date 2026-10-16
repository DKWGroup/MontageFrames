import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { TextEncoder } from "node:util";
import { fetchBroll, logoFor, pickVideoFile, pexelsSearch, sfxFor } from "./longform-assets.mjs";

const tmp = async (t) => {
  const d = await fs.mkdtemp(path.join(tmpdir(), "lf-assets-"));
  t.after(() => fs.rm(d, { recursive: true, force: true }));
  return d;
};
const video = (id, duration, widths) => ({
  id,
  duration,
  url: `https://www.pexels.com/video/${id}/`,
  user: { name: "Autor", url: "https://www.pexels.com/@autor" },
  video_files: widths.map((w, i) => ({ id: i, width: w, height: Math.round((w * 9) / 16), file_type: "video/mp4", link: `https://videos.pexels.com/${id}-${w}.mp4` })),
});
const response = (body, { status = 200, headers = {} } = {}) => ({
  ok: status < 300,
  status,
  headers: new Map(Object.entries(headers)),
  json: async () => body,
  arrayBuffer: async () => new TextEncoder().encode("mp4").buffer,
});

test("Pexels: zapytanie poziome z kluczem w nagłówku, cache 24 h", async (t) => {
  const cacheDir = await tmp(t);
  const calls = [];
  const fetch = async (url, opts) => (calls.push([url, opts.headers.Authorization]), response({ videos: [video(1, 10, [1920])] }));
  const a = await pexelsSearch("city night", { key: "K", fetch, cacheDir, now: 1000 });
  const b = await pexelsSearch("city night", { key: "K", fetch, cacheDir, now: 1000 + 23 * 3600e3 });
  await pexelsSearch("city night", { key: "K", fetch, cacheDir, now: 1000 + 25 * 3600e3 });
  assert.equal(calls.length, 2);
  assert.match(calls[0][0], /videos\/search\?query=city\+night&orientation=landscape&per_page=15/);
  assert.equal(calls[0][1], "K");
  assert.deepEqual(a, b);
});

test("Pexels: limit (429 albo Remaining 0) = błąd z czasem wznowienia, klucz nie wycieka", async (t) => {
  const cacheDir = await tmp(t);
  const fetch = async () => response({}, { status: 429, headers: { "x-ratelimit-reset": "1800000000" } });
  await assert.rejects(pexelsSearch("x", { key: "SEKRET", fetch, cacheDir, now: 0 }), (e) => e.rateLimited && e.resetAt === 1800000000 * 1000 && !e.message.includes("SEKRET"));
  await assert.rejects(pexelsSearch("y", { key: "", fetch, cacheDir, now: 0 }), /PEXELS_API_KEY/);
});

test("wybór pliku: ≥ 1920 px szerokości, ≥ potrzebnej długości, najmniejszy wystarczający", () => {
  assert.equal(pickVideoFile([video(1, 3, [3840]), video(2, 12, [1280, 3840, 1920])], 5).link, "https://videos.pexels.com/2-1920.mp4");
  assert.equal(pickVideoFile([video(1, 12, [1280])], 5), null);
});

test("przebitka: plik w assets/pexels, wiersz w credits.md raz na wideo", async (t) => {
  const dir = await tmp(t);
  const fetch = async (url) => (url.includes("api.pexels.com") ? response({ videos: [video(7, 12, [1920])] }) : response(null));
  const opts = { key: "K", fetch, cacheDir: path.join(dir, "cache"), now: 0 };
  const a = await fetchBroll("forest", 4, dir, opts);
  await fetchBroll("forest", 4, dir, opts);
  assert.equal(a.src, "assets/pexels/7.mp4");
  assert.equal(await fs.readFile(path.join(dir, "assets/pexels/7.mp4"), "utf8"), "mp4");
  const credits = await fs.readFile(path.join(dir, "credits.md"), "utf8");
  assert.equal(credits.match(/pexels\.com\/video\/7/g).length, 1);
  assert.match(credits, /Autor/);
});

test("logo: tylko z lokalnego cache z plikiem źródła; brak = null", async (t) => {
  const root = await tmp(t);
  const reelDir = path.join(root, "public/reels/r");
  await fs.mkdir(path.join(root, "public/Brandings/_logos"), { recursive: true });
  await fs.writeFile(path.join(root, "public/Brandings/_logos/netflix.svg"), "<svg/>");
  assert.equal(await logoFor("Netflix", root, reelDir), null); // brak pliku źródła
  await fs.writeFile(path.join(root, "public/Brandings/_logos/netflix.source.txt"), "https://brand.netflix.com/");
  assert.deepEqual(await logoFor("Netflix", root, reelDir), { src: "assets/logos/netflix.svg", source: "https://brand.netflix.com/" });
  assert.equal(await logoFor("Nieznana Marka", root, reelDir), null);
});

test("SFX z rejestru: tylko z licencją i istniejącym plikiem", async (t) => {
  const root = await tmp(t);
  await fs.mkdir(path.join(root, "public/sfx"), { recursive: true });
  await fs.writeFile(path.join(root, "public/sfx/index.json"), JSON.stringify([{ id: "pop", file: "pop.wav", license: "CC0", source: "https://x" }, { id: "kasa", file: "kasa.wav", license: "", source: "" }]));
  assert.equal(await sfxFor("pop", root), null);
  await fs.writeFile(path.join(root, "public/sfx/pop.wav"), "x");
  await fs.writeFile(path.join(root, "public/sfx/kasa.wav"), "x");
  assert.equal((await sfxFor("pop", root)).file, "pop.wav");
  assert.equal(await sfxFor("kasa", root), null);
});
