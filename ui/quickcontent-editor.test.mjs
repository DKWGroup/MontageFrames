import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as helpers from "./quickcontent-view.mjs";

const nodeRequire = createRequire(import.meta.url);
const cache = new Map();
function loadTS(file) {
  if (cache.has(file)) return cache.get(file);
  const output = {};
  cache.set(file, output);
  const source = readFileSync(file, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const require = (specifier) => {
    if (specifier.endsWith(".css")) return {};
    if (specifier === "./quickcontent-view.mjs") return helpers;
    if (!specifier.startsWith(".")) return nodeRequire(specifier);
    const target = resolve(dirname(file), specifier);
    return loadTS(
      target +
        (["./Timeline", "./PublicationDescription"].includes(specifier)
          ? ".tsx"
          : ".ts"),
    );
  };
  new Function(
    "exports",
    "require",
    code +
      (file.endsWith("Inspector.tsx")
        ? "\nexports.Assistant = Assistant; exports.Framing = Framing; exports.RenderTab = RenderTab; exports.updateWord = updateWord;"
        : ""),
  )(output, require);
  return output;
}
const inspector = () =>
  loadTS(fileURLToPath(new URL("./Inspector.tsx", import.meta.url)));
const data = {
  source: "source.mp4",
  style: "persona",
  fps: 30,
  segments: [{ start: 0, end: 3 }],
  captions: [{ words: [{ text: "Film", start: 1, end: 1.2 }], key: 0 }],
  framing: { mode: "crop", centerX: 0.3, centerY: 0.6 },
};
function findElement(element, predicate) {
  if (!element || typeof element !== "object") return null;
  if (predicate(element)) return element;
  return (
    []
      .concat(element.props?.children ?? [])
      .map((child) => findElement(child, predicate))
      .find(Boolean) ?? null
  );
}

test("manual framing slider applies to existing ReelData while preserving source and word times", () => {
  const { Framing } = inspector();
  let changed;
  const tree = Framing({
    data,
    readOnly: false,
    edit: (fn) => {
      changed = fn(data);
    },
  });
  const slider = findElement(
    tree,
    (element) =>
      element.type === "input" &&
      element.props["aria-label"] === "Pozycja obrazu w poziomie",
  );
  assert.ok(slider);
  slider.props.onChange({ target: { valueAsNumber: 0.75 } });
  assert.deepEqual(changed.framing, {
    mode: "crop",
    centerX: 0.75,
    centerY: 0.6,
    trackingEnabled: false,
  });
  assert.deepEqual(changed.captions, data.captions);
  assert.equal(changed.source, data.source);
  assert.equal(data.framing.centerX, 0.3);
});

test("framing reset centers the crop and keeps the chosen fit mode", () => {
  const { Framing } = inspector();
  const original = {
    ...data,
    framing: { mode: "fit", centerX: 0.3, centerY: 0.6 },
  };
  let changed;
  const tree = Framing({
    data: original,
    readOnly: false,
    edit: (fn) => {
      changed = fn(original);
    },
  });
  const reset = findElement(
    tree,
    (element) =>
      element.type === "button" && element.props.children === "Wyśrodkuj obraz",
  );
  reset.props.onClick();
  assert.deepEqual(changed.framing, {
    mode: "fit",
    centerX: 0.5,
    centerY: 0.5,
    trackingEnabled: false,
  });
});

test("text correction in the reused caption editor does not move word timestamps", () => {
  const { updateWord } = inspector();
  const changed = updateWord(data, 0, 0, "Nagranie", false, true);
  assert.deepEqual(changed.captions[0].words[0], {
    text: "Nagranie",
    start: 1,
    end: 1.2,
  });
  assert.equal(data.captions[0].words[0].text, "Film");
});

function renderProps(isCurrent) {
  return {
    name: "reel",
    out: "out/reel.mp4",
    hasReel: true,
    isQuickContent: true,
    pendingSave: false,
    quickContentLoading: false,
    quickContent: {
      projectId: "p",
      candidateId: "c",
      candidate: {
        id: "c",
        editRevision: 2,
        isCurrent,
        currentRender: { filePath: "out/reel-v002.mp4" },
        renders: [],
      },
    },
    files: [
      { file: "out/reel-v001.mp4", size: 100, mtime: 100 },
      { file: "out/reel-v002.mp4", size: 100, mtime: 200 },
      { file: "out/other.mp4", size: 100, mtime: 300 },
    ],
    job: { status: "idle", kind: null, lines: [], pct: null, result: null },
    onStart() {},
    onStop() {},
    onError() {},
  };
}
test("stale QuickContent MP4 remains explicitly downloadable as an earlier version", () => {
  const { RenderTab } = inspector();
  const html = renderToStaticMarkup(
    createElement(RenderTab, renderProps(false)),
  );
  assert.match(html, /Zmiany do wyrenderowania/);
  assert.match(html, /Pobierz wersję wcześniejszą/);
  assert.doesNotMatch(html, /Pobierz aktualny film/);
  assert.doesNotMatch(html, /other\.mp4/);
});

test("verified current render gets the default download and saving blocks a premature render", () => {
  const { RenderTab } = inspector();
  const ready = renderToStaticMarkup(
    createElement(RenderTab, renderProps(true)),
  );
  assert.match(ready, /Pobierz aktualny film/);
  assert.match(ready, /reel-v002\.mp4/);
  const pending = renderToStaticMarkup(
    createElement(RenderTab, { ...renderProps(true), pendingSave: true }),
  );
  assert.match(pending, /Najpierw zapisz zmiany/);
  assert.doesNotMatch(pending, /Pobierz aktualny film/);
  assert.match(pending, /disabled=""/);
});

test("ordinary reels keep downloads for the whole existing folder", () => {
  const { RenderTab } = inspector();
  const html = renderToStaticMarkup(
    createElement(RenderTab, {
      ...renderProps(false),
      isQuickContent: false,
      quickContent: null,
    }),
  );
  assert.match(html, /other\.mp4/);
  assert.doesNotMatch(html, /Wersja wcześniejsza/);
});

test("queued QC saves advance only from confirmed revisions", async () => {
  const calls = [];
  const queue = helpers.createReelSaveQueue(async (name, content, revision) => {
    calls.push({ name, content, revision });
    return { ok: true, editRevision: revision + 1 };
  });
  queue.reset("reel", 2);
  await Promise.all([
    queue.enqueue("reel", { text: "first" }, true),
    queue.enqueue("reel", { text: "second" }, true),
  ]);
  assert.deepEqual(
    calls.map((c) => c.revision),
    [2, 3],
  );
});

test("save conflict preserves the base and blocks subsequent queued writes until explicit reload", async () => {
  let attempts = 0;
  const queue = helpers.createReelSaveQueue(
    async (_name, _content, revision) => {
      attempts++;
      if (attempts === 1)
        throw Object.assign(new Error("Projekt zmienił się"), { status: 409 });
      return { ok: true, editRevision: revision + 1 };
    },
  );
  queue.reset("reel", 2);
  const results = await Promise.allSettled([
    queue.enqueue("reel", { text: "draft" }, true),
    queue.enqueue("reel", { text: "draft newer" }, true),
  ]);
  assert.deepEqual(
    results.map((result) => result.status),
    ["rejected", "rejected"],
  );
  assert.equal(attempts, 1);
  assert.equal(queue.blocked("reel"), true);
  queue.reset("reel", 5);
  const result = await queue.enqueue(
    "reel",
    { text: "explicit new edit" },
    true,
  );
  assert.equal(result.editRevision, 6);
});

test("ordinary saves preserve their legacy payload without revision metadata", async () => {
  let savedRevision = "unset";
  const queue = helpers.createReelSaveQueue(
    async (_name, _content, revision) => {
      savedRevision = revision;
      return { ok: true };
    },
  );
  await queue.enqueue("ordinary", {}, false);
  assert.equal(savedRevision, undefined);
});

test("panel API pairs loaded QC data with its response revision and sends it outside ReelData", async () => {
  const { api } = loadTS(fileURLToPath(new URL("./api.ts", import.meta.url)));
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, request) => {
    requests.push({ url, request });
    return {
      ok: true,
      headers: { get: (key) => (key === "X-Edit-Revision" ? "7" : null) },
      json: async () => (request ? { ok: true, editRevision: 8 } : data),
    };
  };
  try {
    const state = await api.reelState("qc-reel");
    assert.equal(state.editRevision, 7);
    assert.deepEqual(state.data, data);
    const saved = await api.save("qc-reel", data, state.editRevision);
    assert.equal(saved.editRevision, 8);
    assert.equal(requests[1].request.headers["X-Edit-Revision"], "7");
    assert.deepEqual(JSON.parse(requests[1].request.body), data);
    await api.save("ordinary", data);
    assert.equal(requests[2].request.headers["X-Edit-Revision"], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("QuickContent editor identifies its own provider instead of claiming unlogged Claude blocks editing", () => {
  const { Assistant } = inspector();
  const html = renderToStaticMarkup(
    createElement(Assistant, {
      hasReel: true,
      isQuickContent: true,
      quickContent: { aiProvider: "codex" },
      job: { kind: null, status: "idle", lines: [], pct: null, result: null },
      operator: { installed: true, loggedIn: false },
      onRecheck() {},
      onSettings() {},
      onStart() {},
    }),
  );
  assert.match(html, /Codex/);
  assert.doesNotMatch(html, /Operator nie jest zalogowany/);
});

test("manual adjustment disables tracking without losing its reusable path", () => {
  const original = {
    ...data,
    framing: {
      ...data.framing,
      trackingEnabled: true,
      tracking: [
        { time: 0, centerX: 0.3, centerY: 0.5 },
        { time: 3, centerX: 0.7, centerY: 0.5 },
      ],
    },
  };
  let changed;
  const tree = inspector().Framing({
    data: original,
    readOnly: false,
    edit: (fn) => {
      changed = fn(original);
    },
  });
  const slider = findElement(
    tree,
    (e) => e.props?.["aria-label"] === "Pozycja obrazu w poziomie",
  );
  slider.props.onChange({ target: { valueAsNumber: 0.4 } });
  assert.equal(changed.framing.trackingEnabled, false);
  assert.deepEqual(changed.framing.tracking, original.framing.tracking);
});

test("publication API reads without paid generation and explicit retry posts only description with panel protection", async () => {
  const { api } = loadTS(fileURLToPath(new URL("./api.ts", import.meta.url)));
  const previous = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return { ok: true, json: async () => ({ status: "missing" }) };
  };
  try {
    await api.description("film one");
    await api.generateDescription("film one");
    assert.deepEqual(
      requests.map((request) => [request.method, request.url]),
      [
        ["GET", "/api/description/film%20one"],
        ["POST", "/api/description/film%20one"],
      ],
    );
    assert.equal(requests[1].headers["X-Panel"], "1");
    assert.deepEqual(JSON.parse(requests[1].body), {});
  } finally {
    globalThis.fetch = previous;
  }
});

test("instructions before render and manual text edits use free description PUT only", async () => {
  const { api } = loadTS(fileURLToPath(new URL("./api.ts", import.meta.url)));
  const previous = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return {
      ok: true,
      json: async () => ({ status: "missing", instructions: "Krótko" }),
    };
  };
  try {
    await api.saveDescription("film one", { instructions: "Krótko" });
    await api.saveDescription("film one", { text: "Mój poprawiony opis" });
    assert.deepEqual(
      requests.map((request) => request.method),
      ["PUT", "PUT"],
    );
    assert.equal(requests[0].url, "/api/description/film%20one");
    assert.equal(requests[0].headers["X-Panel"], "1");
    assert.deepEqual(JSON.parse(requests[0].body), { instructions: "Krótko" });
    assert.deepEqual(JSON.parse(requests[1].body), {
      text: "Mój poprawiony opis",
    });
  } finally {
    globalThis.fetch = previous;
  }
});
