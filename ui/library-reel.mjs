import fs from "node:fs/promises";
import { safePath } from "../scripts/quickcontent-ingest.mjs";
import {
  publicationOutput,
  publicationRenderCurrent,
} from "./reel-publication-state.mjs";
import { renderPath } from "../scripts/prep.mjs";
import { isName } from "./lib.mjs";
export async function libraryReel(root, name, projectForOrigin) {
  if (!isName(name)) return null;
  const json = async (relative) => {
    try {
      return JSON.parse(
        await fs.readFile(await safePath(root, relative), "utf8"),
      );
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  };
  const data = await json(`public/reels/${name}/reel.json`);
  if (!data) return null;
  const origin = await json(`public/reels/${name}/origin.json`);
  let candidate = null,
    thumbnail = null;
  if (origin?.kind === "quickcontent" && projectForOrigin) {
    const project = await projectForOrigin(origin.projectId);
    candidate = project?.candidates.find(
      (c) => c.id === origin.candidateId && c.reelName === name,
    );
    if (candidate?.thumbnailPath)
      thumbnail = `/api/quickcontent/projects/${encodeURIComponent(origin.projectId)}/media/thumbnails/${encodeURIComponent(origin.candidateId)}`;
  }
  let archivedOutput;
  for (const render of [...(candidate?.renders ?? [])].reverse()) {
    if (
      render.verified &&
      render.filePath &&
      (await fs.stat(await safePath(root, render.filePath)).catch(() => null))
    ) {
      archivedOutput = render.filePath;
      break;
    }
  }
  const out =
    candidate?.currentRender?.filePath ??
    archivedOutput ??
    (await publicationOutput(
      root,
      name,
      renderPath(data.client ?? null, name),
    ));
  const exists = await fs.stat(await safePath(root, out)).catch(() => null);
  const current = candidate
    ? candidate.isCurrent
    : exists && (await publicationRenderCurrent(root, name, data, out));
  return {
    name,
    title: candidate?.title || data.title || name.replaceAll("-", " "),
    client: data.client ?? null,
    style: data.style,
    seconds: (data.segments ?? []).reduce((n, s) => n + s.end - s.start, 0),
    out,
    thumbnail,
    module: origin?.kind === "quickcontent" ? "quickcontent" : "reels",
    renderState: current ? "current" : exists ? "stale" : "missing",
  };
}
