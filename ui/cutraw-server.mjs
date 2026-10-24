// CutRaw w panelu: projekty w public/cutraw/<nazwa>/ (logika w scripts/cutraw.mjs, ta sama co w terminalu).
// Przetwarzanie i eksport to ciężkie zadania: wspólna blokada z QuickContent i LongForm, stan w pamięci panelu
// (restart = zadanie znika, projekt zostaje w ostatnim zapisanym stanie i można je ponowić).
import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";
import * as engine from "../scripts/cutraw.mjs";
import { errorLine, fileName, inside, isName } from "./lib.mjs";
import { serveMedia } from "./media-response.mjs";
import { tryAcquireHeavy } from "./process-resource.mjs";

const MEDIA = /\.(mp4|mov|m4v|mkv|webm|mxf|wav|mp3|m4a|aac|flac|aiff?)$/i;
const VIDEO = /\.(mp4|mov|m4v|mkv|webm|mxf)$/i;
const fail = (status, message) => Object.assign(new Error(message), { status });
const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};
const readBody = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8"));
  } catch {
    throw fail(400, "Nieprawidłowy JSON");
  }
};
const readJson = (file, fallback) => fsp.readFile(file, "utf8").then(JSON.parse, () => fallback);

export function createCutRawService(root, { tools = engine, acquire = () => tryAcquireHeavy("CutRaw"), reveal } = {}) {
  const jobs = new Map();
  const base = path.join(root, "public/cutraw");
  const dir = (id) => path.join(base, id);
  const relPath = (abs) => path.relative(root, abs).split(path.sep).join("/");
  const revisionOf = (req) => Number(req.headers["x-edit-revision"]);
  const project = (id) => {
    if (!isName(id)) throw fail(400, "Nieprawidłowa nazwa projektu");
    return tools.loadProject(id);
  };
  const running = (id) => jobs.get(id)?.state === "running";
  const view = (p) => ({ project: p, job: jobs.get(p.name) ?? null });

  // Ciężkie zadanie: jedno naraz w całym panelu; postęp i wynik w `jobs`.
  function startJob(id, kind, work) {
    if (running(id)) throw fail(409, "To zadanie już trwa.");
    const release = acquire();
    if (!release) throw fail(409, "Trwa inne ciężkie zadanie (QuickContent, LongForm lub CutRaw) — poczekaj na koniec.");
    const job = { kind, state: "running", stage: null, detail: kind === "export" ? "Eksport do Premiere" : "Start", progress: null, startedAt: new Date().toISOString() };
    jobs.set(id, job);
    (async () => {
      try {
        job.result = await work((r) => Object.assign(job, { stage: r.stage ?? job.stage, detail: r.detail ?? job.detail, progress: r.progress ?? null }));
        job.state = "done";
      } catch (e) {
        Object.assign(job, { state: "failed", error: errorLine(e) });
      } finally {
        job.finishedAt = new Date().toISOString();
        release();
      }
    })();
    return job;
  }

  async function sources() {
    // Pliki do wyboru: inbox/ i foldery klientów (bez renderów i paczek), wideo i audio.
    const found = [];
    const walk = async (rel, depth) => {
      for (const e of await fsp.readdir(path.join(root, rel), { withFileTypes: true }).catch(() => [])) {
        const r = `${rel}/${e.name}`;
        if (e.isDirectory() && depth > 0 && !e.name.startsWith(".") && !["Render", "QuickContent", "branding"].includes(e.name)) await walk(r, depth - 1);
        else if (e.isFile() && MEDIA.test(e.name))
          found.push({ path: r, kind: VIDEO.test(e.name) ? "video" : "audio", size: (await fsp.stat(path.join(root, r))).size });
      }
    };
    await walk("inbox", 2);
    await walk("klienci", 3);
    return found.sort((a, b) => a.path.localeCompare(b.path, "pl"));
  }

  // Plik przeciągnięty z dysku → inbox/cutraw/. Zajęta nazwa = „nazwa (2).mp4”; zapis przez .part, więc przerwany upload nie zostawia pliku.
  async function upload(req, raw) {
    const name = fileName(raw);
    if (!name || !MEDIA.test(name)) throw fail(400, "Przeciągnij plik wideo albo audio (mp4, mov, wav, mp3…).");
    const folder = path.join(root, "inbox/cutraw");
    await fsp.mkdir(folder, { recursive: true });
    const tmp = path.join(folder, `.upload-${randomUUID()}.part`);
    try {
      await pipeline(req, fs.createWriteStream(tmp, { flags: "wx" }));
      const { name: stem, ext } = path.parse(name);
      for (let n = 1; n < 1000; n++) {
        const dest = path.join(folder, n === 1 ? name : `${stem} (${n})${ext}`);
        try {
          await fsp.link(tmp, dest);
          return { path: relPath(dest), kind: VIDEO.test(name) ? "video" : "audio", size: (await fsp.stat(dest)).size };
        } catch (e) {
          if (e.code !== "EEXIST") throw e;
        }
      }
      throw fail(409, `Za dużo plików o nazwie „${name}”.`);
    } finally {
      await fsp.unlink(tmp).catch(() => {});
    }
  }

  async function route(req, res, url) {
    // /api/cutraw/<id>/<sub>; w Vite middleware „/api” bywa już obcięte
    const [, , id, sub] = url.pathname.replace(/^\/api(?=\/)/, "").split("/");
    const m = req.method;
    if (id === "projects" && !sub && m === "GET") {
      const names = (await fsp.readdir(base).catch(() => [])).filter(isName);
      const list = names
        .map((n) => {
          try {
            const p = tools.loadProject(n);
            return { name: p.name, client: p.client, sources: p.sources.length, duration: p.duration, processedAt: p.processedAt ?? null, exports: p.exports?.length ?? 0, job: jobs.get(n) ?? null };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => String(b.processedAt ?? "").localeCompare(String(a.processedAt ?? "")));
      return send(res, 200, list);
    }
    if (id === "projects" && !sub && m === "POST") {
      const b = await readBody(req);
      const files = Array.isArray(b.files) ? b.files : [];
      const abs = files.map((f) => (typeof f === "string" && MEDIA.test(f) ? inside(root, f) : null));
      if (!abs.length || abs.some((f) => !f || !fs.existsSync(f))) throw fail(400, "Wybierz pliki kamer i mikrofonów z inbox/ albo folderu klienta.");
      const ref = typeof b.ref === "string" ? inside(root, b.ref) : undefined;
      if (b.ref && (!ref || !abs.includes(ref))) throw fail(400, "Kamera główna musi być jednym z wybranych plików.");
      return send(res, 201, view(await tools.createProject(b.name, abs, { ref })));
    }
    if (id === "sources" && m === "GET") return send(res, 200, await sources());
    if (id === "upload" && m === "POST") return send(res, 201, await upload(req, url.searchParams.get("file")));

    if (!sub && m === "GET") return send(res, 200, view(project(id)));
    if (sub === "review" && m === "GET") {
      const p = project(id);
      return send(res, 200, {
        ...view(p),
        words: await readJson(path.join(dir(id), "transcript.json"), []),
        levels: await readJson(path.join(dir(id), "levels.json"), null),
        proxy: fs.existsSync(path.join(dir(id), "proxy.mp4")),
      });
    }
    if (sub === "proxy" && ["GET", "HEAD"].includes(m)) {
      project(id);
      const file = path.join(dir(id), "proxy.mp4");
      if (!fs.existsSync(file)) throw fail(404, "Brak podglądu — przetwórz nagranie w panelu.");
      return serveMedia(req, res, file, "video/mp4");
    }
    if (sub === "cuts" && m === "PUT") {
      if (running(id)) throw fail(409, "Trwa zadanie tego projektu — poczekaj na koniec.");
      const b = await readBody(req);
      const p = tools.saveCuts(id, revisionOf(req), { cuts: b.cuts, mutes: b.mutes });
      return send(res, 200, { revision: p.revision });
    }
    if (sub === "sync" && m === "POST") {
      if (running(id)) throw fail(409, "Trwa zadanie tego projektu — poczekaj na koniec.");
      const b = await readBody(req);
      return send(res, 200, view(tools.nudgeSync(id, revisionOf(req), b.source, Number(b.delta))));
    }
    if (sub === "angle" && m === "POST") {
      if (running(id)) throw fail(409, "Trwa zadanie tego projektu — poczekaj na koniec.");
      const b = await readBody(req);
      return send(res, 200, view(tools.setAngle(id, revisionOf(req), b.camera, b.shows ?? null)));
    }
    if (sub === "process" && m === "POST") {
      const b = await readBody(req);
      project(id);
      const opt = {
        pace: typeof b.pace === "string" ? b.pace : undefined,
        ai: engine.AI.includes(b.ai) ? b.ai : undefined,
        keepHead: Number.isInteger(b.keepHead) ? b.keepHead : undefined,
        keepTail: b.keepTail === 0 || b.keepTail === 1 ? b.keepTail : undefined,
      };
      const job = startJob(id, "process", async (report) => {
        const r = await tools.processProject(id, opt, { report, panel: true });
        return { cuts: r.cuts, undecided: r.undecided, mutes: r.mutes, kept: r.kept };
      });
      return send(res, 202, { job });
    }
    if (sub === "export" && m === "POST") {
      project(id);
      return send(res, 202, { job: startJob(id, "export", (report) => tools.exportProject(id, { report })) });
    }
    if (sub === "reveal" && m === "POST") {
      const b = await readBody(req);
      const rec = (project(id).exports ?? []).find((e) => e.version === b.version);
      const file = rec && inside(root, rec.xml ?? `${rec.dir}/${id}.xml`);
      if (!file || !fs.existsSync(file)) throw fail(404, "Nie ma takiej paczki eksportu.");
      if (process.platform !== "darwin" && !reveal) throw fail(501, "„Pokaż w Finderze” działa tylko na macOS.");
      (reveal ?? ((f) => execFile("open", ["-R", f])))(file);
      return send(res, 200, { ok: true, path: relPath(file) });
    }
    throw fail(404, "Nie ma takiej trasy CutRaw");
  }

  return {
    route: (req, res, url) =>
      route(req, res, url).catch((e) => {
        if (!res.headersSent) send(res, e.status ?? (e.name === "ZodError" ? 400 : 500), { error: e.message });
      }),
  };
}
