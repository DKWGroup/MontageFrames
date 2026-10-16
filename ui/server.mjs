import { recordPublicationRender, publicationRenderCurrent } from "./reel-publication-state.mjs";
import { generateReelDescription, readReelDescription, saveReelDescriptionInstructions, saveReelDescriptionText } from "../scripts/reel-description.mjs";
// API panelu — plugin Vite w tym samym procesie co serwer. Kontrakt: docs/superpowers/plans/2026-10-07-panel-etap-1-2.md
import { motionRoute } from "./motion-server.mjs";
import { createLongFormService } from "./longform-server.mjs";
import { createQuickContentService,installQuickContentLifecycle } from "./quickcontent-server.mjs";
import { tryAcquireHeavy } from "./process-resource.mjs";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { clientOf, renderPath, slug } from "../scripts/prep.mjs";
import { chatPrompt, describeEvent, fileName, inside, isName, LOGIN_HINT, maskKey, montagePrompt, operatorCommand, prepLine, renderProgress } from "./lib.mjs";

// ponytail: katalog roboczy = to repo; wersja serwerowa podmieni ROOT na katalog użytkownika.
const ROOT = path.resolve(import.meta.dirname, "..");
const REELS = path.join(ROOT, "public", "reels");
const CLIENTS = path.join(ROOT, "klienci");
const SETTINGS = path.join(ROOT, ".panel.json"); // poza git (.gitignore) — może zawierać klucz API
const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const DEFAULTS = { operator: "claude-account", apiKey: "", model: "opus", renderAfter: true };

// ponytail: zadania żyją w pamięci procesu — restart serwera je przerywa (pliki zostają); trwała kolejka dopiero w wersji serwerowej.
const jobs = new Map();
const quickcontent = createQuickContentService(ROOT, {isBusy: () => [...jobs.values()].some(j => j.status === "running")});
const longform = createLongFormService(ROOT);

const fail = (status, message) => Object.assign(new Error(message), { status });
const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};
const readJson = (file, fallback) => fsp.readFile(file, "utf8").then(JSON.parse, () => fallback);
const writeJson = async (file, data) => {
  await fsp.writeFile(`${file}.tmp`, JSON.stringify(data, null, 2));
  await fsp.rename(`${file}.tmp`, file); // atomowo: nikt nie przeczyta pół pliku
};
const body = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
};
const subdirs = async (dir) =>
  (await fsp.readdir(dir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
const videos = async (dir) =>
  Promise.all(
    (await fsp.readdir(dir).catch(() => []))
      .filter((f) => VIDEO.test(f))
      .map(async (f) => {
        const st = await fsp.stat(path.join(dir, f));
        return { file: path.relative(ROOT, path.join(dir, f)), size: st.size, mtime: st.mtimeMs };
      }),
  );
const reelFile = (name) => {
  if (!isName(name)) throw fail(400, "Zła nazwa rolki");
  return path.join(REELS, name, "reel.json");
};
const settings = async () => ({ ...DEFAULTS, ...(await readJson(SETTINGS, {})) });
const publicSettings = (s) => ({ ...s, apiKey: maskKey(s.apiKey) });

async function library() {
  const reels = await Promise.all(
    (await subdirs(REELS)).map(async (name) => {
      const d = await readJson(path.join(REELS, name, "reel.json"), null);
      if (!d) return null;
      const seconds = (d.segments ?? []).reduce((n, s) => n + s.end - s.start, 0);
      return { name, client: d.client ?? null, style: d.style, seconds, out: renderPath(d.client ?? null, name) };
    }),
  );
  // Nazwa do wyświetlenia = nagłówek „# Nazwa — …” z PREFERENCJE.md klienta.
  const label = async (id) =>
    (await fsp.readFile(path.join(CLIENTS, id, "PREFERENCJE.md"), "utf8").catch(() => "")).match(/^#\s*(.+?)(?:\s+[—–-]\s.*)?$/m)?.[1] ?? id;
  const clients = await Promise.all(
    (await subdirs(CLIENTS)).map(async (id) => ({ id, label: await label(id), renders: await videos(path.join(CLIENTS, id, "Render")) })),
  );
  return {
    reels: reels.filter(Boolean),
    clients,
    loose: await videos(path.join(ROOT, "out")),
    jobs: Object.fromEntries([...jobs].map(([name, j]) => [name, { kind: j.kind, status: j.status, client: j.client }])),
  };
}

// Kopia reel.json do historia/ — najwyżej raz na `every` ms (0 = zawsze), żeby autozapis nie zasypał folderu.
async function snapshot(name, every = 0) {
  const file = path.join(REELS, name, "reel.json");
  if (!fs.existsSync(file)) return;
  const dir = path.join(REELS, name, "historia");
  await fsp.mkdir(dir, { recursive: true });
  const times = await Promise.all((await fsp.readdir(dir)).map((f) => fsp.stat(path.join(dir, f)).then((s) => s.mtimeMs)));
  if (every && Math.max(0, ...times) > Date.now() - every) return;
  await fsp.copyFile(file, path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
}

async function saveReel(name, data, expectedRevision) {
  const file = reelFile(name);
  const qcSaved=await quickcontent.saveEditedReel(name,data,expectedRevision);
  if(qcSaved){const{syncStudio}=await import('../scripts/studio-sync.mjs');syncStudio(ROOT);return qcSaved;}
  const job = jobs.get(name);
  const qcJob = await quickcontent.bridgeReelJob({method:"GET",reelName:name});
  if (qcJob?.status === "running" && qcJob.kind !== "render") throw fail(409, "QuickContent pracuje nad tą rolką — poczekaj albo zatrzymaj zadanie");
  // render czyta reel.json na starcie, więc w trakcie renderu można dalej poprawiać; operator pisze sam — wtedy nie
  if (job?.status === "running" && job.kind !== "render") throw fail(409, "Operator pracuje nad tą rolką — poczekaj albo go zatrzymaj");
  if (typeof data?.source !== "string" || !Array.isArray(data.segments) || !Array.isArray(data.captions)) throw fail(400, "To nie wygląda na reel.json");
  if (!fs.existsSync(file)) throw fail(404, "Nie ma takiej rolki");
  await snapshot(name, 5 * 60_000);
  await writeJson(file, data);
  const { syncStudio } = await import("../scripts/studio-sync.mjs");
  syncStudio(ROOT);
  await quickcontent.reconcileReel(name);
  return {ok:true};
}

const clean = (s) => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").trim(); // bez kolorów terminala

// Proces potomny: każda linia wyjścia trafia do onLine; kod ≠ 0 kończy krok błędem.
function run(job, cmd, args, { env = process.env, onLine = (l) => job.lines.push(l) } = {}) {
  return new Promise((resolve, reject) => {
    // detached = własna grupa procesów, żeby „Zatrzymaj” zabił też dzieci npx
    const child = spawn(cmd, args, { cwd: ROOT, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    job.child = child;
    let buf = "";
    const feed = (chunk) => {
      if (job.status !== "running") return; // po „Zatrzymaj” proces jeszcze sypie błędami — pomijamy
      buf += chunk;
      const parts = buf.split(/\r?\n|\r/);
      buf = parts.pop();
      for (const p of parts) if (clean(p)) onLine(clean(p));
    };
    child.stdout.on("data", feed);
    child.stderr.on("data", feed);
    child.on("error", (e) => reject(e.code === "ENOENT" ? new Error(`Nie znaleziono programu „${cmd}” — sprawdź instalację (PANEL.md)`) : e));
    child.on("close", (code) => {
      if (clean(buf)) onLine(clean(buf));
      job.child = null;
      if (code === 0) resolve();
      else reject(new Error(job.status === "stopped" ? "Zatrzymano" : `${cmd} zakończył pracę z kodem ${code}`));
    });
  });
}

function startJob(name, meta, steps) {
  const release = tryAcquireHeavy(`Rolka ${name}`);
  if (!release) throw fail(409, "Inny montaż, analiza lub render jest w toku — poczekaj na zwolnienie kolejki");
  const job = { ...meta, startedAt: Date.now(), status: "running", lines: [], pct: null, result: null, child: null };
  jobs.set(name, job);
  (async () => {
    for (const step of steps) await step(job);
  })().then(
    () => {
      if (job.status === "running") job.status = "done";
    },
    (e) => {
      if (job.status !== "running") return;
      job.status = "error";
      job.lines.push(`Błąd: ${e.message}`);
    },
  ).finally(release);
  return job;
}

function stopJob(name) {
  const job = jobs.get(name);
  if (job?.status !== "running") return;
  job.status = "stopped";
  job.lines.push("Zatrzymano.");
  if (job.child) {
    try {
      process.kill(-job.child.pid, "SIGTERM");
    } catch {
      job.child.kill("SIGTERM");
    }
  }
}

const renderStep = (name, client) => async (job) => {
  const out = renderPath(client, name);
  const renderedData = await readJson(reelFile(name),null);
  job.lines.push(`Render → ${out}`);
  job.pct = 0;
  await run(job, "npx", ["remotion", "render", name, out], {
    onLine: (l) => {
      const pct = renderProgress(l);
      if (pct == null) job.lines.push(l);
      else job.pct = pct;
    },
  });
  job.result = out;
  await recordPublicationRender(ROOT,name,renderedData,out);
  await describeFinished(name, out, job, renderedData);
};

async function describeFinished(name, out, job, renderedData) {
  const stat = await fsp.stat(path.join(ROOT,out)).catch(()=>null);
  const inputStat = await fsp.stat(reelFile(name));
  if(!stat || stat.mtimeMs < Math.max(job.startedAt ?? 0,inputStat.mtimeMs)) return;
  if(!renderedData) {
    renderedData=await readJson(reelFile(name),null);
    await recordPublicationRender(ROOT,name,renderedData,out);
  }
  job.lines.push("Gotowy film zapisany. Opis do publikacji — GPT‑6 Luna API…");
  try {
    const copy=await generateReelDescription(name,{root:ROOT,renderedData});
    job.lines.push(copy.status === "ready" ? "Opis do publikacji gotowy." : "Film gotowy; ponów sam opis w panelu.");
  } catch {job.lines.push("Film gotowy; ponów sam opis w panelu.");}
}

const prepStep = (name, input) => async (job) => {
  job.lines.push("Transkrypcja i szkic montażu…");
  await run(job, process.execPath, [path.join(ROOT, "scripts", "prep.mjs"), input, name], {
    onLine: (l) => {
      const line = prepLine(l);
      if (line) job.lines.push(line);
    },
  });
};

const operatorStep = (name, prompt, { resume = false } = {}) => async (job) => {
  const s = await settings();
  if (s.operator === "claude-api-key" && !s.apiKey) throw new Error("Brak klucza API — dodaj go w Ustawieniach panelu.");
  const sessionFile = path.join(REELS, name, "operator.json");
  const sessionId = resume ? (await readJson(sessionFile, {})).sessionId : null;
  const { cmd, args, env } = operatorCommand(s, prompt, sessionId);
  let failed = false;
  await run(job, cmd, args, {
    env,
    onLine: (l) => {
      let ev;
      try {
        ev = JSON.parse(l);
      } catch {
        job.lines.push(l);
        return;
      }
      if (ev.type === "system" && ev.subtype === "init" && ev.session_id)
        writeJson(sessionFile, { sessionId: ev.session_id, operator: s.operator, updated: new Date().toISOString() }).catch(() => {});
      if (ev.type === "result" && ev.is_error) failed = true;
      const line = describeEvent(ev);
      if (line) job.lines.push(line);
    },
  });
  if (failed) throw new Error("Operator nie dokończył pracy (szczegóły wyżej).");
};

async function startTask(name, b) {
  if (!isName(name)) throw fail(400, "Zła nazwa rolki");
  if (jobs.get(name)?.status === "running") throw fail(409, "Ta rolka ma już trwające zadanie");
  const existing = await readJson(path.join(REELS, name, "reel.json"), null);
  const client = existing?.client ?? null;

  if (b.kind === "render") {
    if (!existing) throw fail(404, "Nie ma takiej rolki");
    return startJob(name, { kind: "render", client }, [renderStep(name, client)]);
  }

  if (b.kind === "montage") {
    const s = await settings();
    const steps = [];
    let who = client;
    if (b.input) {
      const abs = inside(ROOT, String(b.input));
      if (!abs || !fs.existsSync(abs)) throw fail(400, "Nie ma takiego nagrania");
      if (existing) throw fail(409, "Rolka o tej nazwie już istnieje — wybierz inną nazwę");
      who = clientOf(path.relative(ROOT, abs));
      steps.push(prepStep(name, path.relative(ROOT, abs)));
    } else if (!existing) throw fail(404, "Nie ma takiej rolki");
    const render = b.render ?? s.renderAfter;
    steps.push(() => snapshot(name));
    steps.push(operatorStep(name, montagePrompt({ reel: name, client: who, render, out: renderPath(who, name) })));
    steps.push(job=>describeFinished(name,renderPath(who,name),job));
    return startJob(name, { kind: "montage", client: who }, steps);
  }

  if (b.kind === "chat") {
    const message = String(b.message ?? "").trim();
    if (!existing) throw fail(404, "Nie ma takiej rolki");
    if (!message) throw fail(400, "Napisz, co poprawić");
    const job = startJob(name, { kind: "chat", client }, [
      () => snapshot(name),
      operatorStep(name, chatPrompt({ reel: name, client, message }), { resume: true }),
      job=>describeFinished(name,renderPath(client,name),job),
    ]);
    job.lines.unshift(`› ${message}`);
    return job;
  }

  throw fail(400, "Nieznany rodzaj zadania");
}

async function upload(req, url) {
  const client = url.searchParams.get("client");
  const kind = url.searchParams.get("kind");
  const name = fileName(url.searchParams.get("file"));
  if (!isName(client) || !["surowe", "przebitki"].includes(kind) || !name) throw fail(400, "Zły klient, rodzaj albo nazwa pliku");
  if (!fs.existsSync(path.join(CLIENTS, client))) throw fail(404, "Nie ma takiego klienta");
  const dir = path.join(CLIENTS, client, kind === "surowe" ? "surowe pliki" : "przebitki");
  await fsp.mkdir(dir, { recursive: true });
  const dest = path.join(dir, name);
  const rel = path.relative(ROOT, dest);
  if (fs.existsSync(dest)) {
    // ten sam plik wrzucony drugi raz -> użyj istniejącego
    if ((await fsp.stat(dest)).size === Number(req.headers["content-length"])) {
      req.resume();
      return { path: rel, reused: true };
    }
    throw fail(409, `Plik „${name}” już jest u klienta — zmień nazwę pliku`);
  }
  await pipeline(req, fs.createWriteStream(`${dest}.part`));
  await fsp.rename(`${dest}.part`, dest);
  return { path: rel };
}

async function newClient(b) {
  const label = String(b.name ?? "").trim();
  const id = slug(label);
  if (!isName(id)) throw fail(400, "Podaj nazwę klienta");
  const dir = path.join(CLIENTS, id);
  for (const sub of ["surowe pliki", "przebitki", "Render"]) await fsp.mkdir(path.join(dir, sub), { recursive: true });
  const prefs = path.join(dir, "PREFERENCJE.md");
  if (!fs.existsSync(prefs))
    await fsp.writeFile(
      prefs,
      `# ${label} — preferencje montażu\n\nProfil klienta: ma pierwszeństwo przed ogólnymi \`PREFERENCJE.md\` i \`frame.md\` tam, gdzie się różnią.\nUzupełnij markę (font, kolory, logo) oraz styl napisów i grafik — albo poproś operatora AI, żeby zbadał stronę klienta.\n`,
    );
  return { id };
}

async function saveSettings(b) {
  const s = await settings();
  const next = {
    operator: ["claude-account", "claude-api-key"].includes(b.operator) ? b.operator : s.operator,
    // zamaskowany klucz z formularza = bez zmiany
    apiKey: typeof b.apiKey === "string" && !b.apiKey.startsWith("••••") ? b.apiKey.trim() : s.apiKey,
    model: ["", "opus", "sonnet"].includes(b.model) ? b.model : s.model,
    renderAfter: typeof b.renderAfter === "boolean" ? b.renderAfter : s.renderAfter,
  };
  await writeJson(SETTINGS, next);
  await fsp.chmod(SETTINGS, 0o600);
  return publicSettings(next);
}

const output = (cmd, args) =>
  new Promise((resolve) => execFile(cmd, args, { cwd: ROOT, timeout: 15_000 }, (_err, stdout) => resolve(stdout?.trim() || null)));

async function operatorStatus() {
  const version = await output("claude", ["--version"]);
  if (!version) return { installed: false, hint: "Zainstaluj Claude Code: https://code.claude.com (PANEL.md)" };
  let auth = {};
  try {
    auth = JSON.parse((await output("claude", ["auth", "status"])) ?? "{}");
  } catch {
    /* starsza wersja CLI bez JSON — traktuj jak niezalogowane */
  }
  return { installed: true, version, loggedIn: Boolean(auth.loggedIn), authMethod: auth.authMethod ?? null, hint: auth.loggedIn ? null : LOGIN_HINT };
}

// Tylko gotowe rendery: klienci/<klient>/Render/* albo out/*.
function renderFile(rel) {
  const abs = inside(ROOT, String(rel ?? ""));
  const ok = abs && VIDEO.test(abs) && /^(klienci\/[^/]+\/Render|out)\/[^/]+$/.test(path.relative(ROOT, abs).split(path.sep).join("/"));
  if (!ok) throw fail(403, "To nie jest plik renderu");
  if (!fs.existsSync(abs)) throw fail(404, "Nie ma takiego pliku");
  return abs;
}

async function route(req, res) {
  // Ochrona przed stronami z internetu: tylko adres lokalny (DNS rebinding) i własny nagłówek przy zmianach (CSRF).
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? "")) throw fail(403, "Panel działa tylko lokalnie");
  if (!["GET","HEAD"].includes(req.method) && req.headers["x-panel"] !== "1") throw fail(403, "Brak nagłówka X-Panel");
  const url = new URL(req.url, "http://panel");
  const [, what, name] = url.pathname.split("/");
  const m = req.method;
  if (what === "quickcontent") return quickcontent.route(req, res, url);
  if (what === "motion") return motionRoute(req, res, url);
  if (what === "lf") return longform.route(req, res, url);

  if (what === "description" && ["GET","POST","PUT"].includes(m)) {
    if(!isName(name)) throw fail(400,"Nieprawidłowa nazwa rolki");
    const data=await readJson(reelFile(name),null);
    if(!data) throw fail(404,"Nie ma takiej rolki");
    const edit=m === "PUT" ? await body(req) : null;
    if (m === "PUT" && (!edit || typeof edit !== "object" || Array.isArray(edit) || Object.keys(edit).length !== 1 || !["instructions","text"].includes(Object.keys(edit)[0])))
      throw fail(400,"Zapisz osobno wytyczne albo tekst opisu.");
    if(edit && Object.hasOwn(edit,"instructions"))
      return send(res,200,await saveReelDescriptionInstructions(name,edit.instructions,ROOT));
    const origin=await quickcontent.originOf(name);
    let current=true;
    let descriptionInstructions;
    if(origin) {
      const p=await quickcontent.project(origin.projectId);
      descriptionInstructions=p.descriptionInstructions;
      current=Boolean(p.candidates.find(c=>c.id===origin.candidateId)?.isCurrent);
    } else {
      current=jobs.get(name)?.status !== "running" && await publicationRenderCurrent(ROOT,name,data,renderPath(data.client ?? null,name));
    }
    if(m === "GET") {
      const copy=await readReelDescription(name,ROOT,{descriptionInstructions});
      if(!current && copy?.status === "ready") return send(res,200,{status:"stale",model:copy.model,usage:copy.usage,instructions:copy.instructions,error:"Najpierw wyrenderuj aktualną rolkę."});
      return send(res,200,copy ?? {status:"missing",instructions:descriptionInstructions ?? ""});
    }
    if(!current) throw fail(409,"Najpierw ukończ render aktualnej rolki. Opis nie uruchamia renderu.");
    if(m === "PUT") return send(res,200,await saveReelDescriptionText(name,edit.text,ROOT,{descriptionInstructions}));
    return send(res,200,await generateReelDescription(name,{root:ROOT,renderedData:data,descriptionInstructions}));
  }
  if (m === "GET" && what === "library") return send(res, 200, await library());
  if (what === "reel" && m === "GET") {
    const state=await quickcontent.readEditedReel(name);
    if(state){res.setHeader('X-Edit-Revision',String(state.editRevision));return send(res,200,state.data);}
    const d = await readJson(reelFile(name), null);
    return d ? send(res, 200, d) : send(res, 404, { error: "Nie ma takiej rolki" });
  }
  if (what === "reel" && m === "PUT") {
    const revision=req.headers['x-edit-revision'];
    return send(res,200,await saveReel(name,await body(req),revision===undefined?undefined:Number(revision)));
  }
  if (what === "job" && m === "POST") {
    const requestBody = await body(req);
    const qc = await quickcontent.bridgeReelJob({method:m,reelName:name,body:requestBody});
    if (qc) return send(res, 200, qc);
    await startTask(name, requestBody);
    return send(res, 200, { ok: true });
  }
  if (what === "job" && m === "GET") {
    const qc = await quickcontent.bridgeReelJob({method:m,reelName:name,cursor:url.searchParams.get("since")});
    if (qc) return send(res, 200, qc);
    const job = jobs.get(name);
    if (!job) return send(res, 200, { status: "idle" });
    const since = Number(url.searchParams.get("since")) || 0;
    return send(res, 200, { kind: job.kind, status: job.status, lines: job.lines.slice(since), next: job.lines.length, pct: job.pct, result: job.result });
  }
  if (what === "job" && m === "DELETE") {
    const qc = await quickcontent.bridgeReelJob({method:m,reelName:name});
    if (qc) return send(res, 200, qc);
    stopJob(name);
    return send(res, 200, { ok: true });
  }
  if (what === "upload" && m === "POST") return send(res, 200, await upload(req, url));
  if (what === "client" && m === "POST") return send(res, 200, await newClient(await body(req)));
  if (what === "settings" && m === "GET") return send(res, 200, publicSettings(await settings()));
  if (what === "settings" && m === "PUT") return send(res, 200, await saveSettings(await body(req)));
  if (what === "operator" && m === "GET") return send(res, 200, await operatorStatus());
  if (what === "file" && m === "GET") {
    const abs = renderFile(url.searchParams.get("path"));
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", (await fsp.stat(abs)).size);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(abs))}`);
    return pipeline(fs.createReadStream(abs), res);
  }
  if (what === "reveal" && m === "POST") {
    const abs = renderFile((await body(req)).path);
    if (process.platform !== "darwin") throw fail(501, "„Pokaż w Finderze” działa tylko na macOS");
    execFile("open", ["-R", abs]);
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: "Nie ma takiej trasy" });
}

export function panelApi() {
  return {
    name: "montage-panel-api",
    configureServer(server) {
      installQuickContentLifecycle(server,quickcontent);
      server.middlewares.use("/api", (req, res, next) => {
        // Connect montuje „/api” także dla „/api.ts” — to plik klienta, oddaj go Vite
        if (!req.originalUrl?.startsWith("/api/")) return next();
        route(req, res).catch((e) => {
          if (!res.headersSent) send(res, e.status ?? 500, { error: e.message });
        });
      });
    },
  };
}
