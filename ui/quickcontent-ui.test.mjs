import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { URL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
async function loadApi() {
  const apiSource = await readFile(
    new URL("./quickcontent-api.ts", import.meta.url),
    "utf8",
  );
  const api = {};
  new Function(
    "exports",
    ts.transpileModule(apiSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
      },
    }).outputText,
  )(api);
  return api;
}
async function loadUI(descriptionMocks = {}) {
  const source = await readFile(
    new URL("./QuickContent.tsx", import.meta.url),
    "utf8",
  );
  const helpers = await import("./quickcontent-view.mjs");
  const api = await loadApi();
  const publication = {};
  const descriptionSource = await readFile(
    new URL("./PublicationDescription.tsx", import.meta.url),
    "utf8",
  );
  new Function(
    "exports",
    "require",
    ts.transpileModule(descriptionSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )(publication, (path) =>
    path.endsWith(".css")
      ? {}
      : path === "./api"
        ? { api: descriptionMocks.api }
        : path === "react" && descriptionMocks.react
          ? descriptionMocks.react
          : nodeRequire(path),
  );
  const ui = { ...publication };
  const require = (path) =>
    path.endsWith(".css")
      ? {}
      : path === "./PublicationDescription"
        ? publication
        : path === "./quickcontent-api"
          ? api
          : path === "./quickcontent-view.mjs"
            ? helpers
            : nodeRequire(path);
  new Function(
    "exports",
    "require",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText +
      "\nexports.CandidateCard = CandidateCard; exports.Score = Score; exports.BatchCard = BatchCard; exports.ImportForm = ImportForm; exports.JobCard = JobCard;",
  )(ui, require);
  return ui;
}

const helpers = () => import("./quickcontent-view.mjs");
test("transcription activity shows audio position, elapsed time and measured ETA", async () => {
  const { jobActivity } = await helpers();
  const job = {
    stage: "transcribe",
    status: "running",
    progress: 0.5,
    progressUnit: "audioFrames",
    completedUnits: 30000,
    totalUnits: 60000,
    stageStartedAt: "2026-10-15T10:00:00Z",
    progressUpdatedAt: "2026-10-15T10:02:55Z",
    etaSeconds: 120,
  };
  assert.deepEqual(jobActivity(job, Date.parse("2026-10-15T10:03:00Z")), {
    elapsedSeconds: 180,
    processedSeconds: 300,
    totalSeconds: 600,
    etaSeconds: 120,
    sinceProgressSeconds: 5,
  });
  assert.equal(
    jobActivity(
      { ...job, progress: null, completedUnits: 0, etaSeconds: null },
      Date.parse("2026-10-15T10:03:00Z"),
    ).etaSeconds,
    null,
  );
});
test("transcription card exposes real percentage, audio position and current step without promising ETA at startup", async () => {
  const { JobCard } = await loadUI();
  const job = {
    id: "asr",
    kind: "process",
    stage: "transcribe",
    status: "running",
    progress: 0.5,
    progressUnit: "audioFrames",
    completedUnits: 30000,
    totalUnits: 60000,
    progressDetail: "Rozpoznawanie mowy i czasów słów",
    runtimeLabel: "Whisper large-v3-turbo · CPU",
    stageStartedAt: new Date(Date.now() - 180000).toISOString(),
    etaSeconds: 120,
  };
  const html = renderToStaticMarkup(
    createElement(JobCard, {
      job,
      sourceKind: "youtube",
      busy: false,
      onCancel() {},
      onRetry() {},
    }),
  );
  assert.match(html, /aria-valuenow="50"/);
  assert.match(html, /5:00.*10:00/);
  assert.match(html, /Rozpoznawanie mowy/);
  assert.match(html, /CPU/);
  assert.match(html, /Szacunkowo/);
  const loading = renderToStaticMarkup(
    createElement(JobCard, {
      job: {
        ...job,
        progress: null,
        etaSeconds: null,
        completedUnits: 0,
        progressDetail: "Ładowanie modelu",
      },
      sourceKind: "youtube",
      busy: false,
      onCancel() {},
      onRetry() {},
    }),
  );
  assert.match(loading, /Ładowanie modelu/);
  assert.doesNotMatch(loading, /Szacunkowo/);
  assert.doesNotMatch(loading, /aria-valuenow/);
});

test("QuickContent hash round-trips opaque identifiers and rejects missing routes", async () => {
  const { parseQuickContentHash, quickContentHash } = await helpers();
  assert.deepEqual(parseQuickContentHash("#alicante"), null);
  assert.deepEqual(parseQuickContentHash("#qc"), {});
  assert.deepEqual(parseQuickContentHash("#qc/new"), { newProject: true });
  const hash = quickContentHash("project a", "candidate/+1");
  assert.deepEqual(parseQuickContentHash(hash), {
    projectId: "project a",
    candidateId: "candidate/+1",
  });
  assert.equal(parseQuickContentHash("#qc/%ZZ"), null);
  assert.equal(parseQuickContentHash("#qc/p/c/extra"), null);
});

test("batch completion counts only verified current renders in its frozen selection", async () => {
  const { batchProgress, currentCandidate } = await helpers();
  const candidates = [
    { id: "a", status: "completed", isCurrent: true },
    {
      id: "b",
      status: "completed",
      isCurrent: false,
      renders: [{ file: "old.mp4" }],
    },
    { id: "c", status: "failed" },
    { id: "outside", status: "completed", isCurrent: true },
  ];
  assert.equal(
    currentCandidate({ status: "completed", renders: [{ file: "x.mp4" }] }),
    false,
  );
  assert.deepEqual(
    batchProgress({ candidateIds: ["a", "b", "c", "missing"] }, candidates),
    {
      completed: 1,
      total: 4,
      percent: 25,
      failed: 1,
      queued: 1,
      active: 0,
      outdated: 1,
    },
  );
});

test("analysis settings reject empty focus and inverted or out-of-contract duration", async () => {
  const { validateAnalysis } = await helpers();
  assert.deepEqual(
    validateAnalysis({ mode: "auto" }, { min: 30, max: 60 }),
    {},
  );
  assert.equal(
    typeof validateAnalysis(
      { mode: "prompt", prompt: "   " },
      { min: 30, max: 60 },
    ).focus,
    "string",
  );
  for (const duration of [
    { min: 9, max: 60 },
    { min: 20, max: 301 },
    { min: 90, max: 30 },
    { min: NaN, max: 60 },
  ]) {
    assert.equal(
      typeof validateAnalysis({ mode: "auto" }, duration).duration,
      "string",
    );
  }
});

test("raw preview clamps seeking to global candidate boundaries", async () => {
  const { boundedPreviewTime } = await helpers();
  assert.equal(boundedPreviewTime(0, 195, 241), 195);
  assert.equal(boundedPreviewTime(210, 195, 241), 210);
  assert.equal(boundedPreviewTime(400, 195, 241), 241);
});

test("score sorting remains stable and never mutates persistent candidate order", async () => {
  const { sortCandidates } = await helpers();
  const candidates = [
    { id: "a", score: 70, sourceStart: 90 },
    { id: "b", score: 82, sourceStart: 10 },
    { id: "c", score: 70, sourceStart: 20 },
  ];
  assert.deepEqual(
    sortCandidates(candidates, "score").map((c) => c.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    sortCandidates(candidates, "time").map((c) => c.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    candidates.map((c) => c.id),
    ["a", "b", "c"],
  );
});

test("candidate explains the actual structured score without treating completeness as React text", async () => {
  const { Score } = await loadUI();
  const html = renderToStaticMarkup(
    createElement(Score, {
      candidate: {
        id: "c",
        score: 80,
        reason: "Rozmówca domyka własną historię.",
        scoreBreakdown: { hook: 4 },
        completeness: { opening: 4, context: 4, development: 4, closing: 4 },
        confidence: "high",
        contextRisk: { missingContext: false },
      },
    }),
  );
  assert.match(html, /80\/100/);
  assert.match(html, /Rozmówca domyka/);
  assert.match(html, /Początek/);
  assert.match(html, /Domknięcie/);
  assert.doesNotMatch(html, /\[object Object\]/);
});

test("import form shows optional client and all duration presets before measured progress exists", async () => {
  const { ImportForm } = await loadUI();
  const html = renderToStaticMarkup(
    createElement(ImportForm, {
      clients: [],
      templates: [
        {
          id: "persona",
          name: "Persona — ogólny",
          clientId: null,
          styleId: "persona",
          ready: true,
        },
      ],
      onCreated() {},
      onBack() {},
    }),
  );
  for (const label of [
    "Bez klienta — przestrzeń robocza",
    "15–30 s",
    "30–60 s",
    "60–90 s",
    "90–180 s",
    "Auto — 15–180 s",
    "Własny zakres — 10–300 s",
    "Przetwarzaj",
    "Persona — ogólny",
  ])
    assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /role="progressbar"/);
  assert.doesNotMatch(html, /Zmontowane/);
});

test("batch view excludes outdated files from completion percent and exposes failed work", async () => {
  const { BatchCard } = await loadUI();
  const html = renderToStaticMarkup(
    createElement(BatchCard, {
      batch: { id: "b", candidateIds: ["a", "old", "failed"] },
      candidates: [
        {
          id: "a",
          title: "Gotowa rolka",
          status: "completed",
          isCurrent: true,
        },
        {
          id: "old",
          title: "Poprawiona rolka",
          status: "completed",
          isCurrent: false,
        },
        { id: "failed", title: "Błąd zadania", status: "failed" },
      ],
      jobs: [
        { id: "j", batchId: "b", candidateId: "failed", status: "failed" },
      ],
      busy: false,
      onCancel() {},
      onRetry() {},
    }),
  );
  assert.match(html, /Zmontowane 1\/3 — 33%/);
  assert.match(html, /Wymaga aktualnego renderu/);
  assert.match(html, /Ponów nieudane/);
});

test("API selection and montage preserve exact IDs, optimistic revision and request idempotency", async () => {
  const { quickContentApi } = await loadApi();
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, request) => {
    requests.push({ url, ...request, body: JSON.parse(request.body) });
    return {
      ok: true,
      json: async () => ({ revision: 5, batchId: "batch", jobIds: ["j"] }),
    };
  };
  try {
    await quickContentApi.select("project one", ["c-one", "c-two"], 4);
    await quickContentApi.montage(
      "project one",
      ["c-one", "c-two"],
      5,
      "same-key",
    );
    await quickContentApi.montage(
      "project one",
      ["c-one", "c-two"],
      5,
      "same-key",
    );
    assert.equal(
      requests[0].url,
      "/api/quickcontent/projects/project%20one/selection",
    );
    assert.equal(requests[0].headers["X-Panel"], "1");
    assert.deepEqual(requests[0].body, {
      candidateIds: ["c-one", "c-two"],
      expectedRevision: 4,
    });
    assert.deepEqual(requests[1].body, {
      candidateIds: ["c-one", "c-two"],
      expectedRevision: 5,
      idempotencyKey: "same-key",
    });
    assert.deepEqual(requests[1].body, requests[2].body);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("revision conflicts remain typed API errors instead of successful optimistic selection", async () => {
  const { quickContentApi, QuickContentError } = await loadApi();
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ error: "Projekt zmienił się" }),
  });
  try {
    await assert.rejects(
      quickContentApi.select("p", ["c"], 1),
      (error) => error instanceof QuickContentError && error.status === 409,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("terminal AI analysis does not turn a completion flag into measured token progress", async () => {
  const { JobCard } = await loadUI();
  const html = renderToStaticMarkup(
    createElement(JobCard, {
      job: {
        id: "j",
        kind: "find-more",
        stage: "analyze",
        status: "completed",
        progress: 1,
      },
      sourceKind: "upload",
      busy: false,
      onRetry() {},
      onCancel() {},
    }),
  );
  assert.match(html, /Gotowe/);
  assert.doesNotMatch(html, /role="progressbar"/);
});

test("job blocked by surviving processes explains the block without offering unsupported retry", async () => {
  const { JobCard } = await loadUI();
  const html = renderToStaticMarkup(
    createElement(JobCard, {
      job: {
        id: "j",
        kind: "process",
        stage: "analyze",
        status: "blocked",
        progress: null,
        error: "Poprzedni proces nadal pracuje; ponowienie jest zablokowane.",
      },
      sourceKind: "upload",
      busy: false,
      onRetry() {},
      onCancel() {},
    }),
  );
  assert.match(html, /Wymaga działania/);
  assert.match(html, /Poprzedni proces/);
  assert.doesNotMatch(html, /Wznów od ostatniego etapu/);
});

test("actual quality uses the short edge for vertical media without claiming 1920p", async () => {
  const { sourceResolution } = await helpers();
  assert.equal(sourceResolution({ width: 1080, height: 1920 }), 1080);
  assert.equal(sourceResolution({ width: 3840, height: 2160 }), 2160);
  assert.equal(sourceResolution(null), null);
});

test("legacy reel navigation excludes QuickContent paths and survives malformed percent encoding", async () => {
  const { reelNameFromHash } = await helpers();
  assert.equal(reelNameFromHash("#alicante"), "alicante");
  assert.equal(reelNameFromHash("#qc/p/c"), null);
  assert.equal(reelNameFromHash("#qc"), null);
  assert.equal(reelNameFromHash("#%ZZ"), null);
});

test("QuickContent archive isolates exact reel versions without hiding ordinary folder files", async () => {
  const { reelRenderFiles } = await helpers();
  const files = [
    { file: "out/reel-v001.mp4" },
    { file: "out/reel-v002.mp4" },
    { file: "out/reel-extra-v001.mp4" },
    { file: "out/other.mp4" },
  ];
  assert.deepEqual(reelRenderFiles(files, "reel", true), files.slice(0, 2));
  assert.deepEqual(reelRenderFiles(files, "reel", false), files);
});

test("saved project and actual backend error survive a failed process start", async () => {
  const { createAndProcessProject } = await loadApi();
  const previous = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () =>
    ++requests === 1
      ? { ok: true, json: async () => ({ id: "saved-project", revision: 0 }) }
      : {
          ok: false,
          status: 409,
          json: async () => ({
            error: "Inny worker QuickContent nadal pracuje.",
          }),
        };
  try {
    const result = await createAndProcessProject({
      sourceKind: "youtube",
      url: "https://youtu.be/example",
      clientId: null,
      templateId: "persona",
      focus: { mode: "auto" },
      duration: { min: 30, max: 60 },
      resolution: 1080,
    });
    assert.equal(result.project.id, "saved-project");
    assert.equal(result.jobId, undefined);
    assert.equal(result.startError, "Inny worker QuickContent nadal pracuje.");
  } finally {
    globalThis.fetch = previous;
  }
});

test("portrait settings expose distinct sizes and project costs never present historic unknowns as zero", async () => {
  const { PortraitOptions, CostCard } = await loadUI();
  const options = renderToStaticMarkup(
    createElement(PortraitOptions, {
      value: 720,
      onChange() {},
      disabled: false,
    }),
  );
  assert.match(options, /720 × 1280/);
  assert.match(options, /2160 × 3840/);
  assert.match(options, /9:16/);
  const costs = renderToStaticMarkup(
    createElement(CostCard, {
      costs: {
        analysis: { missing: 1, costMicroUsd: 0, requests: 0 },
        montage: {
          missing: 0,
          costMicroUsd: 300,
          requests: 1,
          inputTokens: 100,
          outputTokens: 10,
        },
        chat: { missing: 0, costMicroUsd: 0, requests: 0 },
      },
    }),
  );
  assert.match(costs, /Brak pełnego pomiaru/);
  assert.match(costs, /0,0003/);
  assert.match(costs, /0 USD opłat API/);
  assert.match(costs, /Zaznaczenie propozycji nie nalicza/);
});

test("project tabs expose counts and support keyboard navigation with focus", async () => {
  const { ProjectTabs } = await loadUI();
  let selected = "proposals";
  const changes = [];
  const props = () => ({
    value: selected,
    count: 6,
    onChange(value) {
      selected = value;
      changes.push(value);
    },
  });
  let tabs = ProjectTabs(props()).props.children;
  const html = renderToStaticMarkup(createElement(ProjectTabs, props()));
  assert.match(html, /role="tablist" aria-label="Widok projektu"/);
  assert.match(html, /Zmontowane \(6\)/);
  assert.equal(tabs[0].props["aria-selected"], true);
  assert.equal(tabs[1].props.tabIndex, -1);
  tabs[1].props.onClick();
  tabs = ProjectTabs(props()).props.children;
  assert.equal(tabs[1].props["aria-selected"], true);
  assert.equal(tabs[1].props.tabIndex, 0);
  let focused = null;
  let prevented = 0;
  const event = (key) => ({
    key,
    preventDefault() {
      prevented++;
    },
    currentTarget: {
      parentElement: {
        querySelectorAll() {
          return [0, 1, 2].map((index) => ({
            focus() {
              focused = index;
            },
          }));
        },
      },
    },
  });
  tabs[1].props.onKeyDown(event("ArrowRight"));
  assert.equal(selected, "settings");
  assert.equal(focused, 2);
  tabs = ProjectTabs(props()).props.children;
  tabs[2].props.onKeyDown(event("ArrowRight"));
  assert.equal(selected, "proposals");
  tabs[0].props.onKeyDown(event("End"));
  assert.equal(selected, "settings");
  tabs[2].props.onKeyDown(event("Home"));
  assert.equal(selected, "proposals");
  assert.equal(prevented, 4);
  assert.deepEqual(changes, [
    "finished",
    "settings",
    "proposals",
    "settings",
    "proposals",
  ]);
});

test("finished film cards play and download the verified render, and open the existing editor", async () => {
  const { FinishedCard } = await loadUI();
  const candidate = {
    id: "c",
    title: "Jak zacząć prowadzić firmę",
    reelName: "qc-film",
    sourceStart: 20,
    sourceEnd: 50,
    isCurrent: true,
    currentRender: { filePath: "klienci/klient/Render/film-v002.mp4" },
  };
  let opened = false;
  const props = {
    candidate,
    onEditor() {
      opened = true;
    },
  };
  const card = FinishedCard(props);
  card.props.children
    .find((child) => child?.props?.className === "qc-actions")
    .props.children[0].props.onClick();
  assert.equal(opened, true);
  const html = renderToStaticMarkup(createElement(FinishedCard, props));
  assert.match(
    html,
    /<video[^>]*controls=""[^>]*src="\/api\/file\?path=klienci%2Fklient%2FRender%2Ffilm-v002.mp4"/,
  );
  assert.match(html, /Jak zacząć prowadzić firmę/);
  assert.match(html, /Obejrzyj i popraw/);
  assert.match(html, /download=""[^>]*>Pobierz/);
  assert.doesNotMatch(html, /checkbox|Zmontuj zaznaczone|surowy fragment/);
});

test("finished film keeps the latest verified earlier version accessible after edits", async () => {
  const { FinishedCard, availableFilmRender } = await loadUI();
  const candidate = {
    id: "edited",
    title: "Poprawiana rolka",
    reelName: "edited-reel",
    sourceStart: 5,
    sourceEnd: 25,
    isCurrent: false,
    currentRender: null,
    renders: [
      { filePath: "out/film-v001.mp4", verified: true },
      { filePath: "out/film-v002.mp4", verified: true },
      { filePath: "out/film-v003.mp4", verified: false },
    ],
  };
  assert.equal(availableFilmRender(candidate).filePath, "out/film-v002.mp4");
  assert.equal(availableFilmRender({ ...candidate, renders: [] }), undefined);
  const html = renderToStaticMarkup(
    createElement(FinishedCard, { candidate, onEditor() {} }),
  );
  assert.match(html, /src="\/api\/file\?path=out%2Ffilm-v002.mp4"/);
  assert.match(html, /Wersja wcześniejsza · są poprawki do wyrenderowania/);
  assert.match(html, /Pobierz wcześniejszą wersję/);
  assert.match(html, /Obejrzyj i popraw/);
  assert.doesNotMatch(html, /· Zmontowane|Zmontowana rolka:|film-v003/);
});

test("publication description exposes copy only for current ready text and retries only failed copy", async () => {
  const { PublicationDescriptionView } = await loadUI();
  let copied = 0,
    retried = 0;
  const props = {
    busy: false,
    error: "",
    copied: false,
    onCopy() {
      copied++;
    },
    onGenerate() {
      retried++;
    },
    onRefresh() {},
  };
  const ready = {
    status: "ready",
    isCurrent: true,
    text: "Prawdziwy hook\nPuenta\n#a #b #c #d #e",
  };
  const html = renderToStaticMarkup(
    createElement(PublicationDescriptionView, { ...props, data: ready }),
  );
  assert.match(html, /Prawdziwy hook/);
  assert.match(html, /Kopiuj opis/);
  assert.match(html, /osobny, płatny opis/);
  const button = (data) =>
    PublicationDescriptionView({ ...props, data }).props.children.find(
      (item) => item?.props?.className === "publication-description-actions",
    ).props.children;
  button(ready).props.onClick();
  assert.equal(copied, 1);
  for (const data of [
    { ...ready, status: "stale" },
    { ...ready, isCurrent: false },
  ]) {
    const stale = renderToStaticMarkup(
      createElement(PublicationDescriptionView, { ...props, data }),
    );
    assert.doesNotMatch(stale, /Prawdziwy hook|Kopiuj opis/);
    assert.match(stale, /Przygotuj opis/);
  }
  const failed = { status: "failed", error: "Limit API" };
  const error = renderToStaticMarkup(
    createElement(PublicationDescriptionView, { ...props, data: failed }),
  );
  assert.match(error, /Gotowy MP4 pozostaje dostępny/);
  assert.match(error, /Limit API/);
  assert.match(error, /Ponów tylko opis/);
  button(failed).props.onClick();
  assert.equal(retried, 1);
  assert.equal(copied, 1);
});

test("legacy publication view shows precise separate API cost, deduplicates receipts and preserves unknown measurement", async () => {
  const { PublicationDescriptionView } = await loadUI();
  const props = {
    busy: false,
    error: "",
    copied: false,
    onCopy() {},
    onGenerate() {},
    onRefresh() {},
  };
  const view = (usage) =>
    renderToStaticMarkup(
      createElement(PublicationDescriptionView, {
        ...props,
        data: { status: "ready", text: "Opis starszej rolki", usage },
      }),
    );
  const first = { responseId: "response-1", costMicroUsd: 125 };
  const retry = {
    provider: "openai",
    at: "2026-10-15T12:00:00Z",
    costMicroUsd: 50,
  };
  const html = view([first, first, retry, retry]);
  assert.match(html, /Koszt opisu API \(łącznie z ponowieniami\)/);
  assert.match(html, /0,000175.*USD/);
  assert.doesNotMatch(html, /Brak pełnego pomiaru|Koszt jeszcze niezmierzony/);
  assert.match(view([]), /Koszt jeszcze niezmierzony/);
  assert.match(view([{ costMicroUsd: null }]), /Brak pełnego pomiaru/);
  assert.match(
    view([first, { costMicroUsd: null }]),
    /Zapisano 0,000125.*brak pełnego pomiaru/,
  );
});

test("ready publication copy can be edited and saved for free, while unfinished film blocks paid generation", async () => {
  const { PublicationDescriptionView } = await loadUI();
  let draft = "Opis w moim imieniu",
    saved = 0;
  const props = {
    data: { status: "ready", text: "Stara treść" },
    text: draft,
    busy: false,
    error: "",
    copied: false,
    savingText: false,
    onCopy() {},
    onGenerate() {},
    onRefresh() {},
    onTextChange(value) {
      draft = value;
    },
    onSaveText() {
      saved++;
    },
  };
  const tree = PublicationDescriptionView(props);
  const field = tree.props.children.find((child) => child?.type === "label");
  const textarea = field.props.children.find(
    (child) => child?.type === "textarea",
  );
  assert.equal(textarea.props.value, "Opis w moim imieniu");
  textarea.props.onChange({ target: { value: "Poprawiony opis" } });
  assert.equal(draft, "Poprawiony opis");
  field.props.children
    .find((child) => child?.type === "button")
    .props.onClick();
  assert.equal(saved, 1);
  const html = renderToStaticMarkup(
    createElement(PublicationDescriptionView, props),
  );
  assert.match(html, /Zapisz opis bez AI/);
  assert.match(html, /Ręczna edycja jest bezpłatna/);
  const beforeRender = renderToStaticMarkup(
    createElement(PublicationDescriptionView, {
      ...props,
      data: { status: "missing" },
      canGenerate: false,
    }),
  );
  assert.match(beforeRender, /disabled=""[^>]*>Przygotuj opis/);
  assert.match(beforeRender, /Wskazówki możesz zapisać teraz/);
});

test("project description instructions persist with revision without starting montage", async () => {
  const { quickContentApi } = await loadApi();
  const previous = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return {
      ok: true,
      json: async () => ({
        id: "p",
        revision: 3,
        descriptionInstructions: "Krótko",
      }),
    };
  };
  try {
    await quickContentApi.descriptionInstructions("p", "Krótko", 2);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "PUT");
    assert.equal(requests[0].url, "/api/quickcontent/projects/p/description");
    assert.deepEqual(JSON.parse(requests[0].body), {
      descriptionInstructions: "Krótko",
      expectedRevision: 2,
    });
    assert.equal(requests[0].headers["X-Panel"], "1");
  } finally {
    globalThis.fetch = previous;
  }
});

test("publication drafts survive refresh but reset on reel change and explicit regeneration", async () => {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (
        !previous ||
        dependencies.some((value, i) => value !== previous.dependencies[i])
      ) {
        previous?.cleanup?.();
        const entry = { dependencies };
        slots[index] = entry;
        effects.push(() => {
          entry.cleanup = callback();
        });
      }
    },
  };
  const saves = [];
  const descriptions = {
    a: { status: "ready", text: "Opis A", instructions: "Wskazówki A" },
    b: { status: "ready", text: "Opis B", instructions: "Wskazówki B" },
  };
  const api = {
    async description(name) {
      return descriptions[name];
    },
    async saveDescription(name, payload) {
      saves.push({ name, payload });
      return descriptions[name];
    },
    async generateDescription(name) {
      return { ...descriptions[name], text: "Nowy opis B" };
    },
  };
  const { PublicationDescription } = await loadUI({ react, api });
  function render(name, refreshKey = "") {
    cursor = 0;
    const tree = PublicationDescription({ reelName: name, refreshKey });
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    const find = (node, prop) => {
      if (!node) return null;
      if (node.props?.[prop]) return node;
      const children = Array.isArray(node.props?.children)
        ? node.props.children
        : [node.props?.children];
      return children.map((child) => find(child, prop)).find(Boolean);
    };
    return [find(tree, "onDraftChange"), find(tree, "onTextChange")];
  }
  async function settle(name, refreshKey = "") {
    await new Promise((resolve) => globalThis.setImmediate(resolve));
    render(name, refreshKey);
    return render(name, refreshKey);
  }
  render("a");
  let [, view] = await settle("a");
  assert.equal(view.props.text, "Opis A");
  view.props.onTextChange("Niezapisany opis A");
  let [instructions] = render("a");
  instructions.props.onDraftChange("Niezapisane wskazówki A");
  render("a", "refresh");
  [, view] = await settle("a", "refresh");
  assert.equal(
    view.props.text,
    "Niezapisany opis A",
    "ordinary refresh preserves unsaved text",
  );
  render("b");
  [, view] = await settle("b");
  assert.equal(view.props.text, "Opis B", "different reel loads its own text");
  view.props.onTextChange("Niezapisany opis B");
  [, view] = render("b");
  await view.props.onGenerate();
  [, view] = render("b");
  assert.equal(
    view.props.text,
    "Nowy opis B",
    "explicit regeneration replaces old draft",
  );
  assert.deepEqual(
    saves,
    [],
    "instructions from previous reel never get saved onto next reel",
  );
  slots.forEach((slot) => slot?.cleanup?.());
});

test("both QuickContent film cards refresh descriptions when background publication changes without a new render", async () => {
  const { FinishedCard, CandidateCard } = await loadUI();
  const base = {
    id: "c",
    title: "Film",
    summary: "Historia",
    reelName: "film",
    sourceStart: 0,
    sourceEnd: 30,
    editRevision: 1,
    renderRevision: 1,
    isCurrent: true,
    currentRender: { filePath: "out/film-v001.mp4", verified: true },
  };
  for (const Card of [FinishedCard, CandidateCard]) {
    const key = (publication) =>
      Card({
        candidate: { ...base, publication },
        onEditor() {},
      }).props.children.find((child) => child?.props?.reelName === "film").props
        .refreshKey;
    const stale = key({
      status: "stale",
      updatedAt: "old",
      contentHash: "hash1",
    });
    const ready = key({
      status: "ready",
      updatedAt: "new",
      contentHash: "hash1",
    });
    assert.notEqual(stale, ready);
    assert.notEqual(
      ready,
      key({ status: "ready", updatedAt: "newer", contentHash: "hash1" }),
    );
    assert.notEqual(
      ready,
      key({ status: "ready", updatedAt: "new", contentHash: "hash2" }),
    );
  }
});

test("completed newer render hides obsolete candidate failure while preserving unresolved and unrelated failures", async () => {
  const { obsoleteJobFailure } = await loadUI();
  const failed = {
    id: "failed",
    candidateId: "c",
    kind: "render",
    status: "failed",
    createdAt: "2026-10-15T10:00:00Z",
  };
  const completed = {
    ...failed,
    id: "done",
    status: "completed",
    createdAt: "2026-10-15T11:00:00Z",
  };
  assert.equal(obsoleteJobFailure(failed, [failed, completed]), true);
  assert.equal(
    obsoleteJobFailure(failed, [
      failed,
      { ...completed, candidateId: "other" },
    ]),
    false,
  );
  assert.equal(
    obsoleteJobFailure(failed, [failed, { ...completed, kind: "chat" }]),
    false,
  );
  assert.equal(
    obsoleteJobFailure(failed, [failed, { ...completed, status: "running" }]),
    false,
  );
  assert.equal(
    obsoleteJobFailure(failed, [
      failed,
      { ...completed, createdAt: "2026-10-15T09:00:00Z" },
    ]),
    false,
  );
  const latestFailure = {
    ...failed,
    id: "latest",
    createdAt: "2026-10-15T12:00:00Z",
  };
  assert.equal(
    obsoleteJobFailure(latestFailure, [failed, completed, latestFailure]),
    false,
  );
  assert.equal(
    obsoleteJobFailure({ ...failed, candidateId: undefined }, [
      failed,
      completed,
    ]),
    false,
  );
});

test("each finished film shows its own token measurements and honest unknown subscription credits", async () => {
  const { FilmCosts } = await loadUI();
  const empty = {
    requests: 0,
    missing: 0,
    inputTokens: 0,
    outputTokens: 0,
    costMicroUsd: 0,
  };
  const html = renderToStaticMarkup(
    createElement(FilmCosts, {
      costs: {
        analysis: empty,
        montage: {
          ...empty,
          requests: 1,
          inputTokens: 1200,
          outputTokens: 100,
          subscriptionRequests: 1,
        },
        chat: empty,
        description: empty,
      },
    }),
  );
  assert.match(html, /1200 tokenów wejścia \/ 100 wyjścia/);
  assert.match(html, /subskrypcji/);
  assert.match(html, /operator nie udostępnia pomiaru/);
  assert.doesNotMatch(html, /0 kredyt/);
});
