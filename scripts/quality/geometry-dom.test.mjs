import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { ensureBrowser, openBrowser } from "@remotion/renderer";
import { collectGeometryFrame } from "../../src/quality/geometry-dom.mjs";

test("DOM measurement includes transformed Polish text, marker and rotated emoji; hidden differs from missing", async (t) => {
  const installed = await ensureBrowser({
    logLevel: "error",
    onBrowserDownload: () => {
      throw Error("GEOMETRY_BROWSER_UNAVAILABLE");
    },
  }).catch((e) => {
    if (e.message === "GEOMETRY_BROWSER_UNAVAILABLE") {
      t.skip("Brak przygotowanego Chromium; test nie pobiera przeglądarki");
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
  await page.goto({
    url:
      "data:text/html," +
      encodeURIComponent(
        `<html><body style="margin:0"><div data-quality-root style="position:relative;width:1000px;height:1000px"><div data-quality-id="c0" data-quality-role="caption" style="position:absolute;left:200px;top:600px;transform:scale(1.2);transform-origin:0 0"><span style="font:30px sans-serif;background:yellow">Źdźbło żółci</span><span data-quality-id="c0w0" data-quality-role="emoji" style="display:inline-block;width:100px;height:100px;background:red;transform:rotate(45deg)">🐝</span></div><div data-quality-id="o0" data-quality-role="hook" style="opacity:0">Ukryty</div></div></body></html>`,
      ),
    timeout: 20000,
  });
  const result = await page.evaluate(collectGeometryFrame, {
    frame: 4,
    expected: [
      { id: "c0", role: "caption" },
      { id: "c0w0", role: "emoji" },
      { id: "o0", role: "hook" },
      { id: "missing", role: "hook" },
    ],
  });
  assert.ok(
    result.boxes.some((b) => b.id === "c0" && b.width > 0.1 && b.y >= 0.59),
  );
  const emoji = result.boxes.find((b) => b.id === "c0w0");
  assert.ok(
    emoji.width > 0.16 && emoji.width < 0.18,
    "rotation and scale must expand the emoji box",
  );
  assert.deepEqual(result.hidden, [{ id: "o0", role: "hook" }]);
  assert.ok(result.issues.some((s) => s.includes("missing")));
  assert.equal(
    result.boxes.some((b) => b.id === "o0"),
    false,
  );
  const bytes = await fs.readFile(
    new URL("../../public/fonts/Poppins-Medium.ttf", import.meta.url),
  );
  await page.evaluate(async (font) => {
    const loaded = await new globalThis.FontFace(
      "ProofPoppins",
      `url(data:font/ttf;base64,${font})`,
      { weight: "500" },
    ).load();
    globalThis.document.fonts.add(loaded);
    globalThis.document.querySelector("[data-quality-root]").innerHTML =
      '<span data-quality-id="j" data-quality-role="caption" style="position:absolute;left:61px;top:600px;font:500 200px ProofPoppins">j</span>';
  }, bytes.toString("base64"));
  const ink = await page.evaluate(collectGeometryFrame, {
    frame: 0,
    expected: [{ id: "j", role: "caption" }],
  });
  assert.ok(
    ink.boxes.some((b) => b.x < 0.06) ||
      ink.issues.some((s) => s.includes("ink")),
    "glyph ink overhang must be measured or explicitly unknown",
  );
});
