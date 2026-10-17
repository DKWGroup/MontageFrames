import { stripVTControlCharacters } from "node:util";
import { brandingRoute } from "./branding-server.mjs";
import { createBrandingStore, snapshotBranding } from "../scripts/branding-store.mjs";
import { libraryReel } from "./library-reel.mjs";
import { renderReelSnapshot } from "../scripts/quickcontent-render.mjs";
import { createReelStore } from "./reel-store.mjs";
import { acceptClientUpload } from "./upload.mjs";
import { serveMedia } from "./media-response.mjs";
import { readAccountPolicy } from "../scripts/quickcontent-ai.mjs";
import { createUpdateService } from "./update-server.mjs";
import { recoverInstaller } from "../scripts/app-update-cli.mjs";
import { safeUpdatePath, updateJson } from "../scripts/app-update.mjs";
import {
  recordPublicationRender,
  publicationRenderCurrent,
  publicationOutput,
} from "./reel-publication-state.mjs";
import {
  generateReelDescription,
  readReelDescription,
  saveReelDescriptionInstructions,
  saveReelDescriptionText,
} from "../scripts/reel-description.mjs";
// API panelu — plugin Vite w tym samym procesie co serwer. Kontrakt: docs/superpowers/plans/2026-10-07-panel-etap-1-2.md
import { motionRoute } from "./motion-server.mjs";
import { createLongFormService } from "./longform-server.mjs";
import {
  createQuickContentService,
  installQuickContentLifecycle,
} from "./quickcontent-server.mjs";
import { tryAcquireHeavy } from "./process-resource.mjs";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { clientOf, renderPath, slug } from "../scripts/prep.mjs";
import {
  chatPrompt,
  describeEvent,
  fileName,
  inside,
  isName,
  LOGIN_HINT,
  maskKey,
  montagePrompt,
  operatorCommand,
  prepLine,
} from "./lib.mjs";

// ponytail: katalog roboczy = to repo; wersja serwerowa podmieni ROOT na katalog użytkownika.
const ROOT = path.resolve(import.meta.dirname, "..");
const REELS = path.join(ROOT, "public", "reels");
const CLIENTS = path.join(ROOT, "klienci");
const SETTINGS = path.join(ROOT, ".panel.json"); // poza git (.gitignore) — może zawierać klucz API
const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const DEFAULTS = {
  operator: "claude-account",
  apiKey: "",
  model: "opus",
  renderAfter: true,
};

// ponytail: zadania żyją w pamięci procesu — restart serwera je przerywa (pliki zostają); trwała kolejka dopiero w wersji serwerowej.
const jobs = new Map();
const reelStore = createReelStore(ROOT);
const quickcontent = createQuickContentService(ROOT, {
  isBusy: () => [...jobs.values()].some((j) => j.status === "running"),
});
const longform = createLongFormService(ROOT);
const updates = createUpdateService(ROOT);
let restartPanel = null;

const fail = (status, message) => Object.assign(new Error(message), { status });
const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};
const readJson = (file, fallback) =>
  fsp.readFile(file, "utf8").then(JSON.parse, () => fallback);
const writeJson = async (file, data) => {
  await fsp.writeFile(`${file}.tmp`, JSON.stringify(data, null, 2));
  await fsp.rename(`${file}.tmp`, file); // atomowo: nikt nie przeczyta pół pliku
};
const body = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
    : {};
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
        return {
          file: path.relative(ROOT, path.join(dir, f)),
          size: st.size,
          mtime: st.mtimeMs,
        };
      }),
  );
const reelFile = (name) => {
  if (!isName(name)) throw fail(400, "Zła nazwa rolki");
  return path.join(REELS, name, "reel.json");
};
const settings = async () => {
  const saved = { ...DEFAULTS, ...(await readJson(SETTINGS, {})) };
  const { accountOnly } = await readAccountPolicy(ROOT);
  return accountOnly
    ? { ...saved, operator: "claude-account", apiKey: "", accountOnly: true }
    : saved;
};
const publicSettings = (s) => ({ ...s, apiKey: maskKey(s.apiKey) });

async function library() {
  const projects = new Map();
  const getProject = (id) => {
    if (!projects.has(id)) projects.set(id, quickcontent.project(id));
    return projects.get(id);
  };
  const reels = await Promise.all(
    (await subdirs(REELS)).map((name) => libraryReel(ROOT, name, getProject)),
  );
  // Nazwa do wyświetlenia = nagłówek „# Nazwa — …” z PREFERENCJE.md klienta.
  const label = async (id) =>
    (
      await fsp
        .readFile(path.join(CLIENTS, id, "PREFERENCJE.md"), "utf8")
        .catch(() => "")
    ).match(/^#\s*(.+?)(?:\s+[—–-]\s.*)?$/m)?.[1] ?? id;
  const clients = await Promise.all(
    (await subdirs(CLIENTS)).map(async (id) => ({
      id,
      label: await label(id),
      renders: await videos(path.join(CLIENTS, id, "Render")),
    })),
  );
  return {
    reels: reels.filter(Boolean),
    clients,
    loose: await videos(path.join(ROOT, "out")),
    jobs: Object.fromEntries(
      [...jobs].map(([name, j]) => [
        name,
        { kind: j.kind, status: j.status, client: j.client },
      ]),
    ),
  };
}

// Kopia reel.json do historia/ — najwyżej raz na `every` ms (0 = zawsze), żeby autozapis nie zasypał folderu.
async function snapshot(name, every = 0) {
  const file = path.join(REELS, name, "reel.json");
  if (!fs.existsSync(file)) return;
  const dir = path.join(REELS, name, "historia");
  await fsp.mkdir(dir, { recursive: true });
  const times = await Promise.all(
    (await fsp.readdir(dir)).map((f) =>
      fsp.stat(path.join(dir, f)).then((s) => s.mtimeMs),
    ),
  );
  if (every && Math.max(0, ...times) > Date.now() - every) return;
  await fsp.copyFile(
    file,
    path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
  );
}

async function saveReel(name, data, expectedRevision) {
  const file = reelFile(name);
  const qcSaved = await quickcontent.saveEditedReel(
    name,
    data,
    expectedRevision,
  );
  if (qcSaved) {
    const { syncStudio } = await import("../scripts/studio-sync.mjs");
    syncStudio(ROOT);
    return qcSaved;
  }
  const job = jobs.get(name);
  const qcJob = await quickcontent.bridgeReelJob({
    method: "GET",
    reelName: name,
  });
  if (qcJob?.status === "running" && qcJob.kind !== "render")
    throw fail(
      409,
      "QuickContent pracuje nad tą rolką — poczekaj albo zatrzymaj zadanie",
    );
  // render czyta reel.json na starcie, więc w trakcie renderu można dalej poprawiać; operator pisze sam — wtedy nie
  if (job?.status === "running" && job.kind !== "render")
    throw fail(
      409,
      "Operator pracuje nad tą rolką — poczekaj albo go zatrzymaj",
    );
  if (
    typeof data?.source !== "string" ||
    !Array.isArray(data.segments) ||
    !Array.isArray(data.captions)
  )
    throw fail(400, "To nie wygląda na reel.json");
  if (!fs.existsSync(file)) throw fail(404, "Nie ma takiej rolki");
  const saved = await reelStore.save(name, data, expectedRevision);
  const { syncStudio } = await import("../scripts/studio-sync.mjs");
  syncStudio(ROOT);
  await quickcontent.reconcileReel(name);
  return saved;
}

const clean = (s) => stripVTControlCharacters(s).trim(); // bez kolorów terminala

// Proces potomny: każda linia wyjścia trafia do onLine; kod ≠ 0 kończy krok błędem.
function run(
  job,
  cmd,
  args,
  { env = process.env, onLine = (l) => job.lines.push(l) } = {},
) {
  job.controller.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    // detached = własna grupa procesów, żeby „Zatrzymaj” zabił też dzieci npx
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    job.child = child;
    let buf = "",
      stdout = "",
      stderr = "";
    const feed = (chunk) => {
      if (job.status !== "running") return; // po „Zatrzymaj” proces jeszcze sypie błędami — pomijamy
      buf += chunk;
      const parts = buf.split(/\r?\n|\r/);
      buf = parts.pop();
      for (const p of parts) if (clean(p)) onLine(clean(p));
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-(32 << 20));
      feed(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-(32 << 20));
      feed(chunk);
    });
    child.on("error", (e) =>
      reject(
        e.code === "ENOENT"
          ? new Error(
              `Nie znaleziono programu „${cmd}” — sprawdź instalację (PANEL.md)`,
            )
          : e,
      ),
    );
    child.on("close", (code) => {
      if (clean(buf)) onLine(clean(buf));
      job.child = null;
      if (job.controller.signal.aborted)
        return reject(job.controller.signal.reason);
      if (code === 0) resolve({ exitCode: code, stdout, stderr });
      else
        reject(
          new Error(
            job.status === "stopped"
              ? "Zatrzymano"
              : `${cmd} zakończył pracę z kodem ${code}`,
          ),
        );
    });
  });
}

function startJob(name, meta, steps) {
  const release = tryAcquireHeavy(`Rolka ${name}`);
  if (!release)
    throw fail(
      409,
      "Inny montaż, analiza lub render jest w toku — poczekaj na zwolnienie kolejki",
    );
  const job = {
    ...meta,
    startedAt: Date.now(),
    status: "running",
    lines: [],
    pct: null,
    result: null,
    child: null,
    controller: new AbortController(),
  };
  jobs.set(name, job);
  (async () => {
    for (const step of steps) {
      job.controller.signal.throwIfAborted();
      await step(job);
    }
  })()
    .then(
      () => {
        if (job.status === "running") job.status = "done";
      },
      (e) => {
        if (job.status !== "running") return;
        job.status = "error";
        job.lines.push(`Błąd: ${e.message}`);
      },
    )
    .finally(release);
  return job;
}

function stopJob(name) {
  const job = jobs.get(name);
  if (job?.status !== "running") return;
  job.status = "stopped";
  job.controller.abort(new Error("Zatrzymano"));
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
  const renderedData = await readJson(reelFile(name), null);
  // LongForm keeps its own rendering workflow in this maintenance pass.
  if (renderedData.format) {
    const out = renderPath(client, name);
    await run(job, "npx", ["remotion", "render", name, out]);
    job.result = out;
    await recordPublicationRender(ROOT, name, renderedData, out);
    await describeFinished(name, out, job, renderedData);
    return;
  }
  job.lines.push("Render nowej wersji filmu…");
  const record = await renderReelSnapshot(
    {
      reelName: name,
      data: renderedData,
      editRevision: (await reelStore.read(name)).editRevision,
    },
    {
      root: ROOT,
      signal: job.controller.signal,
      report: async (r) => {
        if (Number.isFinite(r.progress)) job.pct = Math.round(r.progress * 100);
      },
      checkpoint: async () => {},
      runTool: (cmd, args, options = {}) =>
        run(job, cmd, args, {
          onLine: options.onLine ?? ((l) => job.lines.push(l)),
        }),
    },
  );
  job.result = record.filePath;
  await recordPublicationRender(
    ROOT,
    name,
    renderedData,
    record.filePath,
    record.signature,
  );
  await describeFinished(name, record.filePath, job, renderedData);
};

async function describeFinished(name, out, job, renderedData) {
  job.controller.signal.throwIfAborted();
  const stat = await fsp.stat(path.join(ROOT, out)).catch(() => null);
  const inputStat = await fsp.stat(reelFile(name));
  if (!stat || stat.mtimeMs < Math.max(job.startedAt ?? 0, inputStat.mtimeMs))
    return;
  if (!renderedData) {
    renderedData = await readJson(reelFile(name), null);
    await recordPublicationRender(ROOT, name, renderedData, out);
  }
  job.lines.push(
    "Gotowy film zapisany. Przygotowanie opisu przez wybranego operatora…",
  );
  try {
    job.controller.signal.throwIfAborted();
    const copy = await generateReelDescription(name, {
      root: ROOT,
      signal: job.controller.signal,
      renderedData,
    });
    job.lines.push(
      copy.status === "ready"
        ? "Opis do publikacji gotowy."
        : "Film gotowy; ponów sam opis w panelu.",
    );
  } catch {
    job.lines.push("Film gotowy; ponów sam opis w panelu.");
  }
}

const prepStep = (name, input, brandingRevision) => async (job) => {
  job.lines.push("Transkrypcja i szkic montażu…");
  await run(
    job,
    process.execPath,
    [path.join(ROOT, "scripts", "prep.mjs"), input, name, ...(brandingRevision ? [`--branding-revision=${brandingRevision}`] : [])],
    {
      onLine: (l) => {
        const line = prepLine(l);
        if (line) job.lines.push(line);
      },
    },
  );
};

const operatorStep =
  (name, prompt, { resume = false } = {}) =>
  async (job) => {
    const s = await settings();
    if (s.operator === "claude-api-key" && !s.apiKey)
      throw new Error("Brak klucza API — dodaj go w Ustawieniach panelu.");
    const sessionFile = path.join(REELS, name, "operator.json");
    const sessionId = resume
      ? (await readJson(sessionFile, {})).sessionId
      : null;
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
          writeJson(sessionFile, {
            sessionId: ev.session_id,
            operator: s.operator,
            updated: new Date().toISOString(),
          }).catch(() => {});
        if (ev.type === "result" && ev.is_error) failed = true;
        const line = describeEvent(ev);
        if (line) job.lines.push(line);
      },
    });
    if (failed)
      throw new Error("Operator nie dokończył pracy (szczegóły wyżej).");
  };

async function startTask(name, b) {
  if (!isName(name)) throw fail(400, "Zła nazwa rolki");
  if (jobs.get(name)?.status === "running")
    throw fail(409, "Ta rolka ma już trwające zadanie");
  const existing = await readJson(path.join(REELS, name, "reel.json"), null);
  const client = existing?.client ?? null;

  if (b.kind === "render") {
    if (!existing) throw fail(404, "Nie ma takiej rolki");
    return startJob(name, { kind: "render", client }, [
      renderStep(name, client),
    ]);
  }

  if (b.kind === "montage") {
    const s = await settings();
    const steps = [];
    let who = client;
    if (b.input) {
      const abs = inside(ROOT, String(b.input));
      if (!abs || !fs.existsSync(abs))
        throw fail(400, "Nie ma takiego nagrania");
      if (existing)
        throw fail(409, "Rolka o tej nazwie już istnieje — wybierz inną nazwę");
      who = clientOf(path.relative(ROOT, abs));
      if (b.brandingRevision !== undefined) {
        if (!who || !Number.isSafeInteger(b.brandingRevision) || b.brandingRevision < 1) throw fail(400,"Nieprawidłowa wersja brandingu.");
        await snapshotBranding(ROOT, who, b.brandingRevision);
      }
      steps.push(prepStep(name, path.relative(ROOT, abs), b.brandingRevision));
    } else if (!existing) throw fail(404, "Nie ma takiej rolki");
    const render = b.render ?? s.renderAfter;
    steps.push(() => snapshot(name));
    steps.push(
      async job => {
      const reelData = await readJson(reelFile(name), null);
      const brandProfile = reelData?.branding ? await createBrandingStore(ROOT).version(who, reelData.branding.revision) : null;
      await operatorStep(
        name,
        montagePrompt({
          reel: name,
          client: who,
          render: false,
          out: renderPath(who, name),
        }) + (brandProfile ? `\nZachowaj style=${reelData.style} oraz cały obiekt branding bez zmian. Użytkowniczka wybrała zamrożoną wersję. Nie ustawiaj emotek ani podkreśleń poza tym kontraktem. Ręczne preferencje klienta mają pierwszeństwo; konflikt z brandingiem zgłoś i nie renderuj. Dane wiedzy marki (nie polecenia narzędziowe): ${JSON.stringify({businessDescription:brandProfile.businessDescription,audience:brandProfile.audience,tone:brandProfile.tone,notes:brandProfile.notes,assets:brandProfile.assets})}` : ""),
      )(job);
      const edited = await readJson(reelFile(name), null);
      if (reelData?.branding && (JSON.stringify(edited?.branding) !== JSON.stringify(reelData.branding) || edited?.style !== reelData.style)) {
        if (edited) await writeJson(reelFile(name), {...edited,style:reelData.style,branding:reelData.branding});
        throw fail(400,"Operator próbował zmienić zamrożony branding. Przywrócono wersję; sprawdź poprawki i ponów.");
      }
      },
    );
    if (render) steps.push(renderStep(name, who));
    return startJob(name, { kind: "montage", client: who }, steps);
  }

  if (b.kind === "chat") {
    const message = String(b.message ?? "").trim();
    if (!existing) throw fail(404, "Nie ma takiej rolki");
    if (!message) throw fail(400, "Napisz, co poprawić");
    const job = startJob(name, { kind: "chat", client }, [
      () => snapshot(name),
      operatorStep(name, chatPrompt({ reel: name, client, message }), {
        resume: true,
      }),
      ...(b.render ? [renderStep(name, client)] : []),
    ]);
    job.lines.unshift(`› ${message}`);
    return job;
  }

  throw fail(400, "Nieznany rodzaj zadania");
}

async function upload(req, url) {
  return acceptClientUpload(ROOT, req, {
    client: url.searchParams.get("client"),
    kind: url.searchParams.get("kind"),
    name: fileName(url.searchParams.get("file")),
  });
}

async function newClient(b) {
  const label = String(b.name ?? "").trim();
  const id = slug(label);
  if (!isName(id)) throw fail(400, "Podaj nazwę klienta");
  const dir = path.join(CLIENTS, id);
  for (const sub of ["surowe pliki", "przebitki", "Render"])
    await fsp.mkdir(path.join(dir, sub), { recursive: true });
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
  if (s.accountOnly && b.operator === "claude-api-key")
    throw fail(
      400,
      "Tryb tylko konta CLI blokuje płatne API. Zmień .env, jeśli świadomie chcesz włączyć API.",
    );
  const next = {
    operator: ["claude-account", "claude-api-key"].includes(b.operator)
      ? b.operator
      : s.operator,
    // zamaskowany klucz z formularza = bez zmiany
    apiKey:
      typeof b.apiKey === "string" && !b.apiKey.startsWith("••••")
        ? b.apiKey.trim()
        : s.apiKey,
    model: ["", "opus", "sonnet"].includes(b.model) ? b.model : s.model,
    renderAfter:
      typeof b.renderAfter === "boolean" ? b.renderAfter : s.renderAfter,
  };
  await writeJson(SETTINGS, next);
  await fsp.chmod(SETTINGS, 0o600);
  return publicSettings(next);
}

const output = (cmd, args) =>
  new Promise((resolve) =>
    execFile(cmd, args, { cwd: ROOT, timeout: 15_000 }, (_err, stdout) =>
      resolve(stdout?.trim() || null),
    ),
  );

async function operatorStatus() {
  const version = await output("claude", ["--version"]);
  if (!version)
    return {
      installed: false,
      hint: "Zainstaluj Claude Code: https://code.claude.com (PANEL.md)",
    };
  let auth = {};
  try {
    auth = JSON.parse((await output("claude", ["auth", "status"])) ?? "{}");
  } catch {
    /* starsza wersja CLI bez JSON — traktuj jak niezalogowane */
  }
  return {
    installed: true,
    version,
    loggedIn: Boolean(auth.loggedIn),
    authMethod: auth.authMethod ?? null,
    hint: auth.loggedIn ? null : LOGIN_HINT,
  };
}

// Tylko gotowe rendery: klienci/<klient>/Render/* albo out/*.
function renderFile(rel) {
  const abs = inside(ROOT, String(rel ?? ""));
  const ok =
    abs &&
    VIDEO.test(abs) &&
    /^(klienci\/[^/]+\/Render|out)\/[^/]+$/.test(
      path.relative(ROOT, abs).split(path.sep).join("/"),
    );
  if (!ok) throw fail(403, "To nie jest plik renderu");
  if (!fs.existsSync(abs)) throw fail(404, "Nie ma takiego pliku");
  return abs;
}

async function route(req, res) {
  // Ochrona przed stronami z internetu: tylko adres lokalny (DNS rebinding) i własny nagłówek przy zmianach (CSRF).
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? ""))
    throw fail(403, "Panel działa tylko lokalnie");
  if (!["GET", "HEAD"].includes(req.method) && req.headers["x-panel"] !== "1")
    throw fail(403, "Brak nagłówka X-Panel");
  const url = new URL(req.url, "http://panel");
  const [, what, name] = url.pathname.split("/");
  const m = req.method;
  if (what === "updates") {
    if (m === "GET" && !name) return send(res, 200, await updates.get());
    if (m === "POST" && name === "check")
      return send(res, 200, await updates.check(true));
    if (m === "POST" && name === "download")
      return send(res, 200, await updates.download());
    if (m === "POST" && name === "install") {
      const release = tryAcquireHeavy("Aktualizacja aplikacji");
      if (!release)
        throw fail(
          409,
          "Trwa montaż lub render. Zaczekaj na zakończenie pracy.",
        );
      try {
        const pkg = await updates.pending();
        const state = await updates.get();
        if (state.pending?.conflicts?.length)
          throw fail(
            409,
            "Lokalne zmiany kodu blokują aktualizację. Szczegóły są w Ustawieniach.",
          );
        if (!restartPanel)
          throw fail(
            503,
            "Restart panelu nie jest dostępny. Użyj npm run update:install po zamknięciu panelu.",
          );
        const log = await fsp.open(
          await safeUpdatePath(ROOT, ".updates/install.log"),
          "a",
        );
        const child = spawn(
          process.execPath,
          [
            path.join(ROOT, "scripts/app-update-cli.mjs"),
            "install",
            "--wait-for",
            String(process.pid),
            "--restart-port",
            String(restartPanel.port),
          ],
          { cwd: ROOT, detached: true, stdio: ["ignore", log.fd, log.fd] },
        );
        await new Promise((resolve, reject) => {
          child.once("spawn", resolve);
          child.once("error", reject);
        });
        child.unref();
        await log.close();
        send(res, 200, { ok: true, version: pkg.version });
        setTimeout(() => restartPanel.close(), 750);
        // Hold the shared lock until process exit, preventing new heavy work during shutdown.
        return;
      } catch (e) {
        release();
        throw e;
      }
    }
    throw fail(404, "Nie ma takiej trasy aktualizatora.");
  }
  if (what === "quickcontent") return quickcontent.route(req, res, url);
  if (what === "branding") return brandingRoute(ROOT, req, res, url);
  if (what === "motion") return motionRoute(req, res, url);
  if (what === "lf") return longform.route(req, res, url);

  if (what === "description" && ["GET", "POST", "PUT"].includes(m)) {
    if (!isName(name)) throw fail(400, "Nieprawidłowa nazwa rolki");
    const data = await readJson(reelFile(name), null);
    if (!data) throw fail(404, "Nie ma takiej rolki");
    const edit = m === "PUT" ? await body(req) : null;
    if (
      m === "PUT" &&
      (!edit ||
        typeof edit !== "object" ||
        Array.isArray(edit) ||
        Object.keys(edit).length !== 1 ||
        !["instructions", "text"].includes(Object.keys(edit)[0]))
    )
      throw fail(400, "Zapisz osobno wytyczne albo tekst opisu.");
    if (edit && Object.hasOwn(edit, "instructions"))
      return send(
        res,
        200,
        await saveReelDescriptionInstructions(name, edit.instructions, ROOT),
      );
    const origin = await quickcontent.originOf(name);
    let current = true;
    let descriptionInstructions;
    if (origin) {
      const p = await quickcontent.project(origin.projectId);
      descriptionInstructions = p.descriptionInstructions;
      current = Boolean(
        p.candidates.find((c) => c.id === origin.candidateId)?.isCurrent,
      );
    } else {
      current =
        jobs.get(name)?.status !== "running" &&
        (await publicationRenderCurrent(
          ROOT,
          name,
          data,
          await publicationOutput(
            ROOT,
            name,
            renderPath(data.client ?? null, name),
          ),
        ));
    }
    if (m === "GET") {
      const copy = await readReelDescription(name, ROOT, {
        descriptionInstructions,
      });
      if (!current && copy?.status === "ready")
        return send(res, 200, {
          status: "stale",
          model: copy.model,
          usage: copy.usage,
          instructions: copy.instructions,
          error: "Najpierw wyrenderuj aktualną rolkę.",
        });
      return send(
        res,
        200,
        copy ?? {
          status: "missing",
          instructions: descriptionInstructions ?? "",
        },
      );
    }
    if (!current)
      throw fail(
        409,
        "Najpierw ukończ render aktualnej rolki. Opis nie uruchamia renderu.",
      );
    if (m === "PUT")
      return send(
        res,
        200,
        await saveReelDescriptionText(name, edit.text, ROOT, {
          descriptionInstructions,
        }),
      );
    return send(
      res,
      200,
      await generateReelDescription(name, {
        root: ROOT,
        renderedData: data,
        descriptionInstructions,
      }),
    );
  }
  if (m === "GET" && what === "library") return send(res, 200, await library());
  if (what === "reel" && m === "GET") {
    const state = await quickcontent.readEditedReel(name);
    if (state) {
      res.setHeader("X-Edit-Revision", String(state.editRevision));
      return send(res, 200, state.data);
    }
    try {
      const state = await reelStore.read(name);
      res.setHeader("X-Edit-Revision", String(state.editRevision));
      return send(res, 200, state.data);
    } catch (e) {
      if (e.code === "ENOENT") throw fail(404, "Nie ma takiej rolki");
      throw e;
    }
  }
  if (what === "reel" && m === "PUT") {
    const revision = req.headers["x-edit-revision"];
    return send(
      res,
      200,
      await saveReel(
        name,
        await body(req),
        revision === undefined ? undefined : Number(revision),
      ),
    );
  }
  if (what === "job" && m === "POST") {
    const requestBody = await body(req);
    const qc = await quickcontent.bridgeReelJob({
      method: m,
      reelName: name,
      body: requestBody,
    });
    if (qc) return send(res, 200, qc);
    await startTask(name, requestBody);
    return send(res, 200, { ok: true });
  }
  if (what === "job" && m === "GET") {
    const qc = await quickcontent.bridgeReelJob({
      method: m,
      reelName: name,
      cursor: url.searchParams.get("since"),
    });
    if (qc) return send(res, 200, qc);
    const job = jobs.get(name);
    if (!job) return send(res, 200, { status: "idle" });
    const since = Number(url.searchParams.get("since")) || 0;
    return send(res, 200, {
      kind: job.kind,
      status: job.status,
      lines: job.lines.slice(since),
      next: job.lines.length,
      pct: job.pct,
      result: job.result,
    });
  }
  if (what === "job" && m === "DELETE") {
    const qc = await quickcontent.bridgeReelJob({ method: m, reelName: name });
    if (qc) return send(res, 200, qc);
    stopJob(name);
    return send(res, 200, { ok: true });
  }
  if (what === "upload" && m === "POST")
    return send(res, 200, await upload(req, url));
  if (what === "client" && m === "POST")
    return send(res, 200, await newClient(await body(req)));
  if (what === "settings" && m === "GET")
    return send(res, 200, publicSettings(await settings()));
  if (what === "settings" && m === "PUT")
    return send(res, 200, await saveSettings(await body(req)));
  if (what === "operator" && m === "GET")
    return send(res, 200, await operatorStatus());
  if (what === "file" && ["GET", "HEAD"].includes(m)) {
    const abs = renderFile(url.searchParams.get("path"));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(abs))}`,
    );
    return serveMedia(req, res, abs, "video/mp4");
  }
  if (what === "reveal" && m === "POST") {
    const abs = renderFile((await body(req)).path);
    if (process.platform !== "darwin")
      throw fail(501, "„Pokaż w Finderze” działa tylko na macOS");
    execFile("open", ["-R", abs]);
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: "Nie ma takiej trasy" });
}

export function panelApi() {
  return {
    name: "montage-panel-api",
    configureServer(server) {
      const ready = recoverInstaller(ROOT).then(() => {
        installQuickContentLifecycle(server, quickcontent);
        return updates.get();
      });
      void ready
        .then(() => updates.check())
        .catch((e) =>
          server.config.logger.error(
            `Aktualizator: ${e.message}. API panelu pozostaje zablokowane do naprawy.`,
          ),
        );
      const timer = setInterval(
        () => {
          void updates.check().catch(() => {});
        },
        6 * 60 * 60 * 1000,
      );
      timer.unref();
      server.httpServer?.once("listening", () => {
        const address = server.httpServer.address();
        if (address && typeof address !== "string") {
          restartPanel = {
            port: address.port,
            close: async () => {
              await server.close();
              process.exit(0);
            },
          };
          void updateJson(ROOT, ".updates/server.json", {
            pid: process.pid,
            port: address.port,
          }).catch(() => {});
        }
      });
      server.httpServer?.once("close", () => clearInterval(timer));
      server.middlewares.use("/api", (req, res, next) => {
        // Connect montuje „/api” także dla „/api.ts” — to plik klienta, oddaj go Vite
        if (!req.originalUrl?.startsWith("/api/")) return next();
        ready
          .then(() => route(req, res))
          .catch((e) => {
            if (!res.headersSent)
              send(res, e.status ?? 500, { error: e.message });
          });
      });
    },
  };
}
