import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  selectComposition,
  renderStill,
  renderFrames,
  makeCancelSignal,
} from "@remotion/renderer";
import { safePath, hashFile, writeMediaJson } from "../quickcontent-ingest.mjs";
import {
  inputFiles,
  filesUnder,
  renderInputSignature,
} from "../quickcontent-render.mjs";
import { validateReelEdit } from "../reel-validation.mjs";
import { preflightReelAssets, renderRuntime } from "./render-assets.mjs";
import { createRenderManifest } from "./manifest.mjs";
import { geometryInventory } from "../../src/quality/geometry-plan.mjs";
import { measureRasterFrame } from "./render-raster.mjs";
import { checkGeometry } from "./geometry-check.mjs";

export async function scanReelGeometry({
  root,
  reelName,
  frames,
  pixels = false,
  signal,
  onProgress = () => {},
}) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(reelName ?? ""))
    throw Error("Nieprawidłowa nazwa rolki");
  const draft = await safePath(root, `public/reels/${reelName}/reel.json`);
  const original = await fs.readFile(draft, "utf8"),
    data = JSON.parse(original);
  validateReelEdit(data, data);
  if (data.format)
    throw Error(
      "Pomiar tej kompozycji obsługuje obecnie pion 9:16; 16:9 wymaga osobnego odbioru",
    );
  const check = () => signal?.throwIfAborted();
  check();
  const liveSignature = await renderInputSignature(root, reelName, data);
  const preflight = await preflightReelAssets(root, reelName, data),
    runtime = await renderRuntime(root);
  const directory = `.quickcontent/quality/geometry-${randomUUID()}`;
  const work = await safePath(root, directory + "/placeholder", {
      create: true,
    }),
    engine = path.join(path.dirname(work), "engine");
  const sourceFiles = (await filesUnder(root, "src")).filter(
    (f) =>
      !f.startsWith("src/studio/") &&
      !f.startsWith("src/motion/") &&
      f !== "src/Root.tsx",
  );
  const assets = [];
  for (const file of [
    ...new Set([...sourceFiles, ...(await inputFiles(root, reelName, data))]),
  ].sort()) {
    check();
    const from = await safePath(root, file),
      to = path.join(engine, file);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    assets.push({
      id: file,
      path: file,
      sha256: await hashFile(to),
      byteLength: (await fs.stat(to)).size,
      mime: "application/octet-stream",
      kind: file.startsWith("src/")
        ? "code"
        : (preflight.assets.find((a) => a.path === file)?.kind ?? "config"),
    });
  }
  if (
    (await renderInputSignature(root, reelName, data)) !== liveSignature ||
    (await fs.readFile(draft, "utf8")) !== original
  )
    throw Object.assign(
      Error("Projekt zmienił się podczas przygotowania kontroli"),
      { status: 409 },
    );
  const timingSource = await fs.readFile(
    path.join(engine, "src/reel-timing.ts"),
    "utf8",
  );
  const timing = await import(
    `data:text/javascript;base64,${Buffer.from(ts.transpileModule(timingSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString("base64")}`
  );
  const expectedFrames = timing.reelFrames(data);
  const selected =
    frames ?? Array.from({ length: expectedFrames }, (_, i) => i);
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some(
      (f) => !Number.isSafeInteger(f) || f < 0 || f >= expectedFrames,
    )
  )
    throw Error("Nieprawidłowy zakres klatek kontroli");
  const manifest = createRenderManifest({
    orgId: "local",
    reelRevision: 0,
    inputs: {
      data,
      expectedFrames,
      geometryMode: pixels ? "raster-v1" : "dom-v1",
      sourceSha256: assets.find(
        (a) => a.path === `public/reels/${reelName}/${data.source}`,
      ).sha256,
      renderFonts: preflight.bindings,
      decorations: preflight.decorations,
    },
    contract: data.branding?.qualityContract ?? null,
    assets,
    runtime,
    output: { width: 1080, height: 1920, fps: data.fps ?? 30 },
    seed: 0,
  });
  await writeMediaJson(
    path.join(path.dirname(work), "manifest.json"),
    manifest,
  );
  const verify = async () => {
    check();
    for (const asset of assets)
      if ((await hashFile(path.join(engine, asset.path))) !== asset.sha256)
        throw Error("Zmieniono zamrożony zasób kontroli");
    if ((await hashFile(runtime.browserPath)) !== runtime.browserSha256)
      throw Error("Zmieniono Chromium podczas kontroli");
  };
  await verify();
  const serveUrl = await bundle({
    entryPoint: path.join(engine, "src/quickcontent/index.ts"),
    publicDir: path.join(engine, "public"),
    outDir: path.join(path.dirname(work), "bundle"),
  });
  const renderData = {
    ...data,
    renderAssets: {
      fonts: preflight.bindings,
      decorations: preflight.decorations,
    },
  };
  const expectedInventory = geometryInventory(
    renderData,
    timing.captionClips(renderData),
    timing.toOut,
  );
  const inputProps = {
    reel: reelName,
    data: renderData,
    qualityMeasurement: { manifestSignature: manifest.signature },
  };
  const { cancelSignal, cancel } = makeCancelSignal();
  const abort = () => cancel();
  signal?.addEventListener("abort", abort, { once: true });
  const frameBounds = {
    measurementVersion: pixels ? 2 : 1,
    collector: pixels ? "remotion-raster-v1" : "remotion-dom-v1",
    space: "output-normalized",
    manifestSignature: manifest.signature,
    frames: [],
  };
  let browser;
  try {
    check();
    browser = await openBrowser("chrome", {
      browserExecutable: runtime.browserPath,
      logLevel: "error",
    });
    // Metadata needs no scan; measurements are requested only by explicit renderStill calls.
    const metadata = await selectComposition({
      serveUrl,
      id: "QuickContentRender",
      inputProps: { reel: reelName, data: renderData },
      puppeteerInstance: browser,
      logLevel: "error",
    });
    const composition = {
      ...metadata,
      props: {
        ...metadata.props,
        qualityMeasurement: inputProps.qualityMeasurement,
      },
    };
    const measurements = [];
    const onBrowserLog = (log) => {
      if (log.text.startsWith("MF_GEOMETRY:"))
        measurements.push(JSON.parse(log.text.slice("MF_GEOMETRY:".length)));
    };
    if (frames) {
      for (const frame of selected) {
        check();
        await renderStill({
          serveUrl,
          composition,
          inputProps,
          puppeteerInstance: browser,
          frame,
          scale: 1,
          output: path.join(path.dirname(work), `frame-${frame}.png`),
          cancelSignal,
          onBrowserLog,
          logLevel: "error",
        });
        onProgress({
          completed: measurements.filter((m) => selected.includes(m.frame))
            .length,
          total: selected.length,
        });
      }
    } else {
      await renderFrames({
        serveUrl,
        composition,
        inputProps,
        puppeteerInstance: browser,
        frames: selected,
        imageFormat: "none",
        outputDir: null,
        muted: true,
        concurrency: 1,
        cancelSignal,
        onBrowserLog,
        logLevel: "error",
        onStart: () => {},
        onFrameUpdate: (completed) =>
          onProgress({ completed, total: selected.length }),
      });
    }
    for (const frame of selected) {
      const measured = measurements
        .filter(
          (m) =>
            m.frame === frame && m.manifestSignature === manifest.signature,
        )
        .at(-1);
      if (!measured)
        throw Error(`Renderer nie dostarczył pomiaru klatki ${frame}`);
      frameBounds.frames.push(measured);
    }
    if (pixels) {
      for (let i = 0; i < frameBounds.frames.length; i++) {
        const frame = frameBounds.frames[i];
        frameBounds.frames[i] = await measureRasterFrame({
          frame,
          manifest,
          signal,
          renderMask: async (item) => {
            check();
            const logs = [];
            const props = {
              ...composition.props,
              qualityMeasurement: {
                manifestSignature: manifest.signature,
                rasterTarget: item.id,
              },
            };
            const { buffer } = await renderStill({
              serveUrl,
              composition: { ...composition, props },
              inputProps: props,
              puppeteerInstance: browser,
              frame: frame.frame,
              imageFormat: "png",
              scale: 1,
              output: null,
              cancelSignal,
              logLevel: "error",
              onBrowserLog: (log) => {
                if (log.text.startsWith("MF_GEOMETRY:"))
                  logs.push(JSON.parse(log.text.slice("MF_GEOMETRY:".length)));
              },
            });
            const measurement = logs
              .filter(
                (m) =>
                  m.frame === frame.frame &&
                  m.manifestSignature === manifest.signature &&
                  m.isolation?.id === item.id,
              )
              .at(-1);
            if (frames && buffer)
              await fs.writeFile(
                path.join(
                  path.dirname(work),
                  `mask-${frame.frame}-${item.id}.png`,
                ),
                buffer,
              );
            return { buffer, measurement };
          },
        });
        onProgress({
          completed: i + 1,
          total: selected.length,
          stage: "pixels",
        });
      }
    }
    await verify();
    if (
      (await fs.readFile(draft, "utf8")) !== original ||
      (await renderInputSignature(root, reelName, data)) !== liveSignature
    )
      throw Object.assign(
        Error("Projekt zmienił się podczas kontroli; wynik nie jest aktualny"),
        { status: 409 },
      );
    const geometry = checkGeometry({
      manifest,
      frameBounds,
      expectedInventory,
    });
    const result = {
      directory,
      expectedFrames,
      manifestSignature: manifest.signature,
      expectedInventory,
      frameBounds,
      geometry,
      sourceSha256: manifest.inputs.sourceSha256,
    };
    await writeMediaJson(
      path.join(path.dirname(work), "geometry.json"),
      result,
    );
    return result;
  } finally {
    signal?.removeEventListener("abort", abort);
    if (browser) await browser.close({ silent: true });
  }
}
