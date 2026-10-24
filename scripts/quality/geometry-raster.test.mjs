import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { ensureBrowser, openBrowser } from "@remotion/renderer";
import {
  isolateGeometryElement,
  restoreGeometryIsolation,
} from "../../src/quality/geometry-raster.mjs";
import { decodePngRgba, alphaBounds } from "./raster-mask.mjs";
test("raster isolation captures glyph ink, shadow, stroke, clipping and nested emoji without layout or paint drift", async (t) => {
  const installed = await ensureBrowser({
    logLevel: "error",
    onBrowserDownload: () => {
      throw Error("GEOMETRY_BROWSER_UNAVAILABLE");
    },
  }).catch((e) => {
    if (e.message === "GEOMETRY_BROWSER_UNAVAILABLE") {
      t.skip("Brak przygotowanego Chromium");
      return null;
    }
    throw e;
  });
  if (!installed) return;
  const browser = await openBrowser("chrome", {
    browserExecutable: installed.path,
    logLevel: "error",
  });
  t.after(() => browser.close({ silent: true }));
  const page = await browser.newPage({
    context: undefined,
    logLevel: "error",
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  });
  await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
  await page.goto({
    url: "data:text/html,<html><body style='margin:0'><div data-quality-root style='position:relative;width:1000px;height:1000px'></div></body></html>",
    timeout: 20000,
  });
  const font = await fs.readFile(
    new URL("../../public/fonts/Poppins-Medium.ttf", import.meta.url),
  );
  await page.evaluate(async (data) => {
    const f = await new globalThis.FontFace(
      "ProofPoppins",
      `url(data:font/ttf;base64,${data})`,
      { weight: "500" },
    ).load();
    globalThis.document.fonts.add(f);
  }, font.toString("base64"));
  for (const [name, file] of [
    ["ProofNunito", "Nunito.ttf"],
    ["ProofLibre", "LibreBaskerville.ttf"],
  ]) {
    const bytes = await fs.readFile(
      new URL("../../public/fonts/" + file, import.meta.url),
    );
    await page.evaluate(
      async ({ name, data }) => {
        const f = await new globalThis.FontFace(
          name,
          `url(data:font/ttf;base64,${data})`,
          { weight: "500" },
        ).load();
        globalThis.document.fonts.add(f);
      },
      { name, data: bytes.toString("base64") },
    );
  }
  const capture = async () => {
    const client = page._client();
    await client.send("Emulation.setDefaultBackgroundColorOverride", {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    const { value } = await client.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 1000, height: 1000, scale: 1 },
      captureBeyondViewport: true,
    });
    return decodePngRgba(Buffer.from(value.data, "base64"), 1000, 1000);
  };
  await page.evaluate(() => {
    globalThis.document.querySelector("[data-quality-root]").innerHTML =
      '<span data-quality-id="j" data-quality-role="caption" style="position:absolute;left:61px;top:300px;font:500 200px ProofPoppins">j</span><div style="position:absolute;inset:0;background:blue;z-index:-1"></div>';
  });
  const original = await page.evaluate(
    () => globalThis.document.querySelector("[data-quality-root]").outerHTML,
  );
  const isolated = await page.evaluate(isolateGeometryElement, { id: "j" });
  const ink = alphaBounds(await capture(), 1000, 1000);
  assert.ok(
    ink.x >= 50 && ink.x < 60,
    "actual j ink must extend left of the 6% safezone",
  );
  assert.equal(isolated.status, "measured");
  await page.evaluate(restoreGeometryIsolation);
  assert.equal(
    await page.evaluate(
      () => globalThis.document.querySelector("[data-quality-root]").outerHTML,
    ),
    original,
  );
  await page.evaluate(() => {
    globalThis.document.querySelector("[data-quality-root]").innerHTML =
      '<div data-quality-id="a" data-quality-role="caption" style="display:contents"><div style="position:absolute;left:200px;top:200px;width:50px;height:50px;background:red"></div></div><div data-quality-id="b" data-quality-role="hook" style="display:contents"><div style="position:absolute;left:800px;top:800px;width:50px;height:50px;background:blue"></div></div>';
  });
  await t.test("sibling contents scopes stay out of target mask", async () => {
    try {
      const contents = await page.evaluate(isolateGeometryElement, { id: "a" });
      assert.equal(contents.status, "measured");
      assert.deepEqual(
        alphaBounds(await capture(), 1000, 1000),
        {
          x: 200,
          y: 200,
          width: 50,
          height: 50,
          pixels: 2500,
          touchesEdge: false,
        },
        "sibling display:contents scopes must not leak into a mask",
      );
    } finally {
      await page.evaluate(restoreGeometryIsolation);
    }
  });
  await t.test("dependent generated pseudo paint stays unknown", async () => {
    await page.evaluate(() => {
      globalThis.document.querySelector("[data-quality-root]").innerHTML =
        '<style>.dependent::before{content:"";position:absolute;inset:0;background:red;backdrop-filter:blur(5px);mix-blend-mode:multiply}</style><div class="dependent" data-quality-id="q0" data-quality-role="caption" style="position:absolute;left:200px;top:200px;width:50px;height:50px">f</div>';
    });
    try {
      const dependent = await page.evaluate(isolateGeometryElement, {
        id: "q0",
      });
      assert.equal(dependent.status, "unknown");
    } finally {
      await page.evaluate(restoreGeometryIsolation);
    }
  });
  for (const style of [
    "font:500 90px ProofPoppins;text-shadow:8px 6px 5px red",
    "font:500 90px ProofPoppins;-webkit-text-stroke:4px red;transform:rotate(-8deg)",
    "font:500 90px ProofPoppins;width:350px;clip-path:inset(0 35% 0 0);filter:blur(2px)",
    "font:500 90px ProofPoppins;width:300px;line-height:1.1;overflow-wrap:anywhere",
    "font:500 110px ProofNunito;text-shadow:-12px 4px 6px red",
    "font:500 110px ProofLibre;transform:rotate(7deg)",
  ]) {
    await page.evaluate((s) => {
      const root = globalThis.document.querySelector("[data-quality-root]");
      root.innerHTML = `<div style="position:absolute;left:180px;top:250px;transform:scale(1.2) rotate(5deg);opacity:.8"><span data-quality-id="c0" data-quality-role="caption" style="display:inline-block;${s}">Źdźbło żółci f</span></div>`;
    }, style);
    const reference = await capture();
    await page.evaluate(() => {
      const r = globalThis.document.querySelector("[data-quality-root]");
      r.style.background = "green";
      r.insertAdjacentHTML(
        "beforeend",
        '<div style="position:absolute;inset:0;background:blue;z-index:-1"></div>',
      );
    });
    const report = await page.evaluate(isolateGeometryElement, { id: "c0" });
    assert.equal(report.status, "measured", JSON.stringify(report));
    assert.ok(
      (await capture()).equals(reference),
      "paint of the isolated scope must equal independently rendered transparent reference",
    );
    await page.evaluate(restoreGeometryIsolation);
    await page.evaluate(() => {
      globalThis.document.querySelector(
        "[data-quality-root]",
      ).style.background = "transparent";
    });
  }
  await page.evaluate(() => {
    globalThis.document.querySelector("[data-quality-root]").innerHTML =
      '<style>.proof::before{content:"";position:absolute;left:-70px;top:0;width:50px;height:40px;background:red}</style><span class="proof" data-quality-id="p0" data-quality-role="hook" style="position:absolute;left:150px;top:300px;font:60px ProofPoppins">f Źółć 🇵🇱</span>';
  });
  const pseudoReference = await capture();
  const pseudo = await page.evaluate(isolateGeometryElement, { id: "p0" });
  assert.equal(pseudo.status, "measured", JSON.stringify(pseudo));
  assert.ok((await capture()).equals(pseudoReference));
  await page.evaluate(restoreGeometryIsolation);
  await page.evaluate(() => {
    globalThis.document.querySelector("[data-quality-root]").innerHTML =
      '<div style="position:absolute;left:200px;top:400px;font:60px sans-serif">Tekst<span data-quality-id="e0" data-quality-role="emoji" style="display:inline-block;width:60px;height:60px;background:red;transform:rotate(15deg)">🐝</span>koniec</div>';
  });
  const emoji = await page.evaluate(isolateGeometryElement, { id: "e0" });
  assert.equal(emoji.status, "measured", JSON.stringify(emoji));
  const box = alphaBounds(await capture(), 1000, 1000);
  assert.ok(
    box.width > 65 && box.width < 90,
    "ancestor text must not contaminate emoji mask",
  );
  await page.evaluate(restoreGeometryIsolation);
  await page.evaluate(() => {
    globalThis.document.querySelector(
      '[data-quality-id="e0"]',
    ).style.mixBlendMode = "multiply";
  });
  const unsafe = await page.evaluate(isolateGeometryElement, { id: "e0" });
  assert.equal(unsafe.status, "unknown");
});
