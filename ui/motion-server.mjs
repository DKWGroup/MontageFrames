import { serveMedia } from "./media-response.mjs";
import { readAccountPolicy } from "../scripts/quickcontent-ai.mjs";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { tryAcquireHeavy } from "./process-resource.mjs";
import { generateMotionPlan } from "./motion-ai.mjs";
let aiBusy = false;
import {
  buildMotion,
  validateMotion,
  productionReady,
} from "../src/motion/schema.mjs";
const error = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const valid = (n) => {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(n || ""))
    throw error("Nieprawidłowa nazwa");
  return n;
};
export function contentHash(d) {
  const { reviews: _reviews, ...content } = validateMotion(d);
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}
export async function renderSignature(root, d) {
  const hash = createHash("sha256").update(contentHash(d));
  const sources = [
    "src/motion/Motion.tsx",
    "src/motion/Compositions.tsx",
    "src/motion/schema.mjs",
    "src/fonts.ts",
    "scripts/motion-render.mjs",
    "package.json",
  ];
  for (const f of sources) {
    hash.update(f);
    hash.update(
      await fs.readFile(path.join(root, f)).catch(() => Buffer.from("missing")),
    );
  }
  const pub = await fs
    .realpath(path.join(root, "public"))
    .catch(() => path.join(root, "public"));
  const assets = new Set(
    [d.logo, d.font, d.music, ...d.shots.map((s) => s.asset)].filter(Boolean),
  );
  for (const a of assets) {
    const real = await fs.realpath(path.join(pub, a));
    if (!real.startsWith(pub + path.sep)) throw error("Asset poza public");
    hash.update(a);
    hash.update(await fs.readFile(real));
  }
  if (!d.font)
    hash.update(
      await fs
        .readFile(path.join(pub, "fonts/Nunito.ttf"))
        .catch(() => Buffer.from("missing-default-font")),
    );
  return hash.digest("hex");
}
export async function reserveMotionVersion(root, d, format, mode) {
  const dir = outputDir(root, d),
    prefix = `${format.replace(":", "x")}-${mode}`;
  await fs.mkdir(dir, { recursive: true });
  const names = await fs.readdir(dir);
  let version = 1;
  for (const name of names) {
    const m = name.match(new RegExp(`^${prefix}-v(\\d+)-`));
    if (m) version = Math.max(version, Number(m[1]) + 1);
  }
  while (true) {
    const name = `${prefix}-v${String(version).padStart(3, "0")}`;
    try {
      const h = await fs.open(path.join(dir, name + "-reservation.json"), "wx");
      await h.close();
      return name;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      version++;
    }
  }
}
export async function previewEvidence(root, d, format) {
  const dir = outputDir(root, d),
    prefix = format.replace(":", "x");
  const names = await fs.readdir(dir).catch(() => []);
  const signature = await renderSignature(root, d);
  for (const name of names.filter((n) =>
    new RegExp(`^${prefix}-(preview|draft)(-v\\d+)?-evidence\\.json$`).test(n),
  )) {
    try {
      if (
        JSON.parse(await fs.readFile(path.join(dir, name), "utf8")).hash ===
        signature
      )
        return true;
    } catch {
      /* Ignore invalid evidence; a new preview is required. */
    }
  }
  return false;
}
export function createMotionStore(root) {
  const projects = path.join(root, "motion-projects"),
    jobs = new Map();
  const file = (n) => path.join(projects, valid(n) + ".json");
  const get = async (n) => {
    const d = validateMotion(JSON.parse(await fs.readFile(file(n), "utf8")));
    if (d.reviews.length) {
      const sig = await renderSignature(root, d);
      if (d.reviews.some((r) => r.hash !== sig)) d.reviews = [];
    }
    return d;
  };
  const assets = async (d) => {
    for (const a of [
      d.logo,
      d.font,
      d.music,
      ...d.shots.map((s) => s.asset),
    ].filter(Boolean)) {
      const base = await fs.realpath(path.join(root, "public"));
      const real = await fs.realpath(path.join(base, a));
      if (!real.startsWith(base + path.sep)) throw error("Asset poza public");
    }
  };
  const save = async (n, data) => {
    const d = validateMotion(data);
    if (d.name !== valid(n)) throw error("Nazwa projektu nie zgadza się");
    if (jobs.get(n)?.status === "running") throw error("Render trwa", 409);
    await assets(d);
    const previous = await get(n).catch(() => null);
    if (previous && contentHash(previous) !== contentHash(d)) d.reviews = [];
    else if (d.reviews.length > (previous?.reviews.length || 0)) {
      if (
        d.reviews.length !== (previous?.reviews.length || 0) + 1 ||
        !d.reviews.every((r, i) => r.round === i + 1)
      )
        throw error("Dodaj jedną recenzję w kolejności");
      if (
        !(await Promise.all(
          d.formats.map((f) => previewEvidence(root, d, f)),
        ).then((v) => v.some(Boolean)))
      )
        throw error("Najpierw wyrenderuj podgląd bieżącego projektu");
    }
    if (d.client) {
      const c = await fs.realpath(path.join(root, "klienci", valid(d.client)));
      if (!c.startsWith(path.join(root, "klienci") + path.sep))
        throw error("Klient poza repo");
    }
    if (d.reviews.length) {
      const sig = await renderSignature(root, d);
      d.reviews = d.reviews.map((r) => ({ ...r, hash: sig }));
    }
    await fs.mkdir(projects, { recursive: true });
    await fs.writeFile(file(n) + ".tmp", JSON.stringify(d, null, 2));
    await fs.rename(file(n) + ".tmp", file(n));
    return d;
  };
  const list = async () =>
    (await fs.readdir(projects).catch(() => []))
      .filter((s) => /^[a-z0-9-]+\.json$/.test(s))
      .map((s) => s.slice(0, -5));
  const create = async (b) => {
    valid(b.name);
    if ((await list()).includes(b.name))
      throw error("Projekt już istnieje", 409);
    return save(b.name, buildMotion(b));
  };
  const start = async (n, options = {}) => {
    const d = await get(n);
    await assets(d);
    const mode = options.mode || "preview",
      format = options.format || "9:16";
    if (
      !["preview", "draft", "final"].includes(mode) ||
      !d.formats.includes(format)
    )
      throw error("Zły format lub tryb");
    if (mode === "final" && !productionReady(d))
      throw error("Potrzeba 3 recenzji ≥8: telefon, assety i timing");
    if (mode === "final" && !(await previewEvidence(root, d, format)))
      throw error("Najpierw wyrenderuj podgląd wybranego formatu");
    if (
      jobs.get(n)?.status === "running" ||
      [...jobs.values()].some((j) => j.status === "running")
    )
      throw error("Inny render trwa", 409);
    const release = tryAcquireHeavy(`Motion ${n}`);
    if (!release)
      throw error("Inny montaż, analiza lub render jest w toku", 409);
    const previousFiles = new Set(
      await fs.readdir(outputDir(root, d)).catch(() => []),
    );
    const j = { status: "running", lines: [], files: [], mode, format };
    jobs.set(n, j);
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts/motion-render.mjs"), n, format, mode],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );
    j.pid = child.pid;
    child.once("close", release);
    child.once("error", release);
    const collect = (b) => {
      j.lines.push(b.toString().slice(-2000));
      if (j.lines.length > 100) j.lines.shift();
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (e) => {
      j.status = "error";
      collect(e.message);
    });
    child.on("exit", async (code) => {
      j.status = code === 0 ? "done" : "error";
      if (code === 0) {
        const dir = outputDir(root, d);
        j.files = (await fs.readdir(dir))
          .filter(
            (f) =>
              !previousFiles.has(f) &&
              !f.endsWith("-reservation.json") &&
              f.startsWith(format.replace(":", "x") + "-" + mode),
          )
          .map((f) => f);
      }
    });
    return j;
  };
  return { get, save, create, list, start, jobs };
}
export function outputDir(root, d) {
  return d.client
    ? path.join(
        root,
        "klienci",
        valid(d.client),
        "Render",
        "motion-" + valid(d.name),
      )
    : path.join(root, "out", "motion-studio", valid(d.name));
}
const root = path.resolve(import.meta.dirname, "..");
const store = createMotionStore(root);
async function json(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1024 * 1024) throw error("Za duży JSON", 413);
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}
export async function motionRoute(req, res, url) {
  const [, , n, action] = url.pathname.split("/");
  const send = (d) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(d));
  };
  if (!["GET", "HEAD"].includes(req.method) && req.headers["x-panel"] !== "1")
    throw error("Brak X-Panel", 403);
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.origin !== undefined &&
    req.headers.origin !== `http://${req.headers.host}`
  )
    throw error("Obcy Origin — żądanie musi pochodzić z panelu", 403);
  if (!n && req.method === "GET") return send(await store.list());
  if (!n && req.method === "POST")
    return send(await store.create(await json(req)));
  if (action === "job" && req.method === "GET")
    return send(
      store.jobs.get(valid(n)) || { status: "idle", lines: [], files: [] },
    );
  if (action === "render" && req.method === "POST")
    return send(await store.start(n, await json(req)));
  if (action === "ai-plan" && req.method === "POST") {
    if (aiBusy || [...store.jobs.values()].some((j) => j.status === "running"))
      throw error("Operator albo render jest zajęty", 409);
    const body = await json(req);
    let d;
    try {
      d = validateMotion(body.data);
    } catch {
      throw error("Najpierw uzupełnij i zapisz poprawny brief Motion Studio");
    }
    if (d.name !== valid(n)) throw error("Nazwa projektu nie zgadza się");
    await store.get(n);
    if (d.client) valid(d.client);
    const release = tryAcquireHeavy(`Motion AI ${n}`);
    if (!release)
      throw error("Inny montaż, analiza lub render jest w toku", 409);
    aiBusy = true;
    try {
      const settings = JSON.parse(
        await fs
          .readFile(path.join(root, ".panel.json"), "utf8")
          .catch(() => '{"operator":"claude-account","model":"opus"}'),
      );
      if (
        (await readAccountPolicy(root)).accountOnly &&
        settings.operator === "claude-api-key"
      )
        throw error(
          "Tryb tylko konta CLI blokuje API. Zapisz operatora Claude Code na koncie w Ustawieniach.",
          400,
        );
      let preferences = await fs
        .readFile(path.join(root, "PREFERENCJE.md"), "utf8")
        .catch(() => "");
      if (d.client) {
        const base = await fs.realpath(path.join(root, "klienci"));
        const pref = await fs
          .realpath(path.join(base, d.client, "PREFERENCJE.md"))
          .catch(() => null);
        if (pref && pref.startsWith(base + path.sep))
          preferences += "\n" + (await fs.readFile(pref, "utf8"));
      }
      return send(await generateMotionPlan(d, settings, preferences, root));
    } finally {
      aiBusy = false;
      release();
    }
  }
  if (action === "asset" && req.method === "POST") {
    valid(n);
    await store.get(n);
    const filename = url.searchParams.get("file");
    if (
      !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|mp3|wav|m4a|ttf|woff2)$/.test(
        filename || "",
      )
    )
      throw error("Dozwolone zdjęcia, font i muzyka; bez SVG/HTML");
    const dir = path.join(root, "public", "motion-assets", n);
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, filename);
    const handle = await fs.open(target, "wx");
    let size = 0;
    try {
      for await (const c of req) {
        size += c.length;
        if (size > 50 * 1024 * 1024) throw error("Limit 50 MB", 413);
        await handle.write(c);
      }
      await handle.close();
    } catch (e) {
      await handle.close();
      await fs.unlink(target);
      throw e;
    }
    return send({ asset: `motion-assets/${n}/${filename}` });
  }
  if (action === "artifact" && ["GET", "HEAD"].includes(req.method)) {
    const d = await store.get(n);
    const f = url.searchParams.get("file");
    if (
      !/^(9x16|1x1|16x9)-(preview|draft|final)[a-z0-9.-]*\.(png|mp4|json|zip)$/.test(
        f || "",
      )
    )
      throw error("Zły artifact");
    const dir = outputDir(root, d);
    const real = await fs.realpath(path.join(dir, f));
    if (!real.startsWith((await fs.realpath(dir)) + path.sep))
      throw error("Zła ścieżka");
    res.setHeader(
      "Content-Type",
      f.endsWith(".png")
        ? "image/png"
        : f.endsWith(".mp4")
          ? "video/mp4"
          : "application/octet-stream",
    );
    await serveMedia(
      req,
      res,
      real,
      f.endsWith(".png")
        ? "image/png"
        : f.endsWith(".mp4")
          ? "video/mp4"
          : "application/octet-stream",
    );
    return;
  }
  if (!action && req.method === "GET") return send(await store.get(n));
  if (!action && req.method === "PUT")
    return send(await store.save(n, await json(req)));
  throw error("Nie ma takiej trasy", 404);
}
