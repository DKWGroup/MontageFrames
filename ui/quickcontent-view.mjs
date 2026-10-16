export function parseQuickContentHash(hash) {
  if (hash === "#qc" || hash === "#qc/") return {};
  if (hash === "#qc/new") return { newProject: true };
  if (!hash.startsWith("#qc/")) return null;
  const parts = hash.slice(4).split("/");
  if (parts.length > 2 || parts.some((part) => !part)) return null;
  try {
    return {
      projectId: decodeURIComponent(parts[0]),
      ...(parts[1] ? { candidateId: decodeURIComponent(parts[1]) } : {}),
    };
  } catch {
    return null;
  }
}

export function quickContentHash(projectId, candidateId) {
  return (
    "#qc" +
    (projectId ? "/" + encodeURIComponent(projectId) : "") +
    (candidateId ? "/" + encodeURIComponent(candidateId) : "")
  );
}

export function reelNameFromHash(hash) {
  if (hash === "#qc" || hash.startsWith("#qc/")) return null;
  try {
    return decodeURIComponent(hash.replace(/^#/, "")) || null;
  } catch {
    return null;
  }
}

export function reelRenderFiles(files, name, quickContent) {
  if (!quickContent) return files;
  return files.filter((file) => {
    const base = file.file.split("/").pop();
    return (
      base === `${name}.mp4` ||
      (base?.startsWith(`${name}-v`) &&
        /^\d+\.mp4$/.test(base.slice(name.length + 2)))
    );
  });
}

export function createReelSaveQueue(save) {
  const revisions = new Map(),
    blocked = new Map();
  let chain = Promise.resolve();
  return {
    reset(name, revision) {
      blocked.delete(name);
      if (revision === undefined) revisions.delete(name);
      else revisions.set(name, revision);
    },
    blocked: (name) => blocked.has(name),
    retry: (name) => blocked.delete(name),
    idle: () => chain,
    enqueue(name, data, quickContent) {
      const result = chain.then(async () => {
        if (quickContent && blocked.has(name)) throw blocked.get(name);
        const revision = quickContent ? revisions.get(name) : undefined;
        if (quickContent && !Number.isInteger(revision))
          throw new Error("Odczytaj aktualną wersję rolki przed zapisem.");
        const reply = await save(name, data, revision);
        if (quickContent) {
          if (!Number.isInteger(reply.editRevision))
            throw new Error(
              "Serwer nie potwierdził rewizji zapisu. Odczytaj aktualną wersję.",
            );
          revisions.set(name, reply.editRevision);
        }
        return reply;
      });
      chain = result.then(
        () => undefined,
        (error) => {
          if (quickContent) blocked.set(name, error);
        },
      );
      return result;
    },
  };
}

// Aktualność pochodzi z kontroli pliku, rewizji i podpisu wykonywanej na serwerze.
export const currentCandidate = (candidate) => candidate.isCurrent === true;
export function jobActivity(job, now = Date.now()) {
  const stageStart =
    job.stageStartedAt ??
    [...(job.events ?? [])].reverse().find((e) => e.stage === job.stage)?.at;
  const elapsedSeconds = Number.isFinite(Date.parse(stageStart))
    ? Math.max(0, Math.floor((now - Date.parse(stageStart)) / 1000))
    : null;
  const audio =
    job.progressUnit === "audioFrames" &&
    Number.isFinite(job.totalUnits) &&
    job.totalUnits > 0;
  return {
    elapsedSeconds,
    processedSeconds: audio ? (job.completedUnits ?? 0) / 100 : null,
    totalSeconds: audio ? job.totalUnits / 100 : null,
    etaSeconds:
      audio &&
      job.completedUnits > 0 &&
      ["queued", "running"].includes(job.status) &&
      Number.isFinite(job.etaSeconds) &&
      job.etaSeconds >= 0
        ? job.etaSeconds
        : null,
    sinceProgressSeconds:
      job.progressUpdatedAt &&
      Number.isFinite(Date.parse(job.progressUpdatedAt))
        ? Math.max(
            0,
            Math.floor((now - Date.parse(job.progressUpdatedAt)) / 1000),
          )
        : null,
  };
}

export function batchProgress(batch, candidates) {
  const ids = [...new Set(batch.candidateIds ?? [])];
  const selected = ids.map((id) =>
    candidates.find((candidate) => candidate.id === id),
  );
  const completed = selected.filter(
    (candidate) => candidate && currentCandidate(candidate),
  ).length;
  const failed = selected.filter(
    (candidate) =>
      candidate?.status === "failed" || candidate?.status === "interrupted",
  ).length;
  const active = selected.filter((candidate) =>
    ["materializing", "montaging", "reviewing", "rendering"].includes(
      candidate?.status,
    ),
  ).length;
  const outdated = selected.filter(
    (candidate) =>
      candidate?.status === "completed" && !currentCandidate(candidate),
  ).length;
  const queued = selected.filter(
    (candidate) =>
      !candidate || ["proposed", "queued"].includes(candidate.status),
  ).length;
  return {
    completed,
    total: ids.length,
    percent: ids.length ? Math.round((100 * completed) / ids.length) : 0,
    failed,
    active,
    queued,
    outdated,
  };
}

export function validateAnalysis(focus, duration) {
  const errors = {};
  if (focus.mode === "prompt" && !focus.prompt?.trim())
    errors.focus = "Wpisz wskazówki albo wybierz tryb Auto.";
  if (
    ![duration.min, duration.max].every(
      (value) => Number.isFinite(value) && value >= 10 && value <= 300,
    ) ||
    duration.max < duration.min
  ) {
    errors.duration =
      "Podaj zakres 10–300 s. Maksimum musi być równe minimum lub większe.";
  }
  return errors;
}

export function boundedPreviewTime(time, start, end) {
  return Math.min(end, Math.max(start, time));
}

export function sourceResolution(source) {
  if (!source?.width || !source?.height) return null;
  return Math.min(source.width, source.height);
}

export function sortCandidates(candidates, order) {
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (a, b) =>
        (order === "time"
          ? a.candidate.sourceStart - b.candidate.sourceStart
          : (b.candidate.score ?? 0) - (a.candidate.score ?? 0)) ||
        a.index - b.index,
    )
    .map(({ candidate }) => candidate);
}
