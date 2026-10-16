import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as remotion from "remotion";
import ts from "typescript";

// Exercise the shipped component, with only renderer context and font measurement mocked.
const require = createRequire(import.meta.url);
let frame = 0;
const renderer = {
  ...remotion,
  useCurrentFrame: () => frame,
  useVideoConfig: () => ({ fps: 30, width: 1080, height: 1920 }),
  AbsoluteFill: ({ children, ...props }) =>
    React.createElement("div", props, children),
};
function load(file, dependencies = {}) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2018,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) =>
    name === "remotion"
      ? renderer
      : name === "@remotion/layout-utils"
        ? { fitText: () => ({ fontSize: 80 }) }
        : (dependencies[name] ?? require(name));
  new Function("require", "module", "exports", compiled)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
const decoration = await import("../src/caption-decoration.mjs");
const emoji = load("../src/WordEmoji.tsx");
const baseDeps = {
  "../WordEmoji": emoji,
  "../reel-timing": load("../src/reel-timing.ts"),
  "../caption-decoration.mjs": decoration,
};
const helpers = load("../src/styles/skyclass.tsx", baseDeps);
const { Bisanz, BISANZ, kineticCaptions, kineticOverlay } = load(
  "../src/styles/bisanz.tsx",
  {
    ...baseDeps,
    "./skyclass": helpers,
    "../overlays": { OverlayView: () => null },
  },
);
function elements(node) {
  if (!React.isValidElement(node)) return [];
  return [
    node,
    ...React.Children.toArray(node.props.children).flatMap(elements),
  ];
}
function shot(motion, at = 1.95) {
  const words = [
    { text: "To", start: 0, end: 0.2, at: 0, key: false, hl: false },
    {
      text: "najnieprawdopodobniejszego",
      start: at,
      end: 2,
      at,
      key: true,
      hl: false,
    },
  ];
  return Bisanz({
    group: { words, key: 1, motion, layout: "inline" },
    words,
    durationInFrames: 60,
    raised: false,
  });
}
test("late long Bisanz letter animation finishes with fully visible glyphs before exit", () => {
  frame = 54;
  const tree = shot("letters");
  const glyphs = elements(tree).filter(
    (e) => e.props.style?.whiteSpace === "pre",
  );
  assert.ok(glyphs.length >= 25);
  for (const glyph of glyphs) {
    const offset = Number(
      glyph.props.style.transform.match(/translateY\(([-\d.e]+)%\)/)[1],
    );
    assert.ok(
      offset <= 0.00001,
      `unfinished glyph at frame ${frame}: ${offset}`,
    );
  }
  assert.ok(
    !elements(tree).some(
      (e) => e.props.style?.clipPath === "inset(-60% -20% 0 -20%)",
    ),
  );
  const html = renderToStaticMarkup(tree);
  assert.ok(
    html.includes("najnieprawdopodobniejszego") || html.includes(">n</span>"),
  );
});
test("Bisanz keeps distinct word motion while guaranteeing late color fill before exit", () => {
  assert.equal(
    BISANZ.readable,
    undefined,
    "inherited themes must retain their own motion settings",
  );
  frame = 10;
  const motions = [
    "rise",
    "drop",
    "slide",
    "pop",
    "bounce",
    "wiggle",
    "letters",
    "color",
  ];
  const variants = motions.map((motion) =>
    renderToStaticMarkup(shot(motion, 0.3)),
  );
  assert.equal(new Set(variants).size, motions.length);
  frame = 54;
  const nodes = elements(shot("color"));
  assert.ok(
    !nodes.some((e) =>
      String(e.props.style?.WebkitTextFillColor).includes("transparent"),
    ),
  );
  assert.ok(
    !nodes.some((e) => /^inset\(-60%/.test(e.props.style?.clipPath ?? "")),
  );
});

test("Happy News hook is visible at frame zero and invalid colour highlights never become text", () => {
  frame = 0;
  const View = kineticOverlay({ ...BISANZ, instantTitle: true });
  const html = renderToStaticMarkup(
    React.createElement(View, {
      o: {
        type: "title",
        start: 0,
        end: 3,
        text: "Zobacz ten skuter",
        hl: "#FF3D8B",
      },
      dur: 90,
      src: (x) => x,
      at: (x) => x,
    }),
  );
  assert.match(html, /opacity:1/);
  assert.equal(html.replace(/<[^>]*>/g, ""), "Zobacz ten skuter");
  frame = 89;
  const exit = renderToStaticMarkup(
    React.createElement(View, {
      o: { type: "title", start: 0, end: 3, text: "Zobacz ten skuter" },
      dur: 90,
      src: (x) => x,
      at: (x) => x,
    }),
  );
  assert.doesNotMatch(exit, /opacity:1;/);
});

test("emoji is a sibling after the word marker and hook backgrounds follow wrapped text", () => {
  frame = 18;
  const Captions = kineticCaptions(BISANZ);
  const words = [
    {
      text: "skuter",
      start: 0,
      end: 1,
      at: 0,
      key: true,
      hl: false,
      emoji: "🛵",
    },
  ];
  const tree = Captions({
    group: { words, key: 0, layout: "inline" },
    words,
    durationInFrames: 60,
    raised: false,
  });
  const parent = elements(tree).find((e) =>
    React.Children.toArray(e.props.children).some(
      (c) => c.type === emoji.WordEmoji,
    ),
  );
  assert.ok(parent);
  const children = React.Children.toArray(parent.props.children);
  assert.equal(children.at(-1).type, emoji.WordEmoji);
  assert.ok(!elements(children[0]).some((e) => e.type === emoji.WordEmoji));
  frame = 0;
  const Hook = kineticOverlay({ ...BISANZ, instantTitle: true });
  const hook = Hook({
    o: { type: "title", text: "Test hook", start: 0, end: 3 },
    dur: 90,
    src: (x) => x,
    at: (x) => x,
  });
  assert.equal(hook.props.style.fontWeight, 800);
  assert.equal(hook.props.style.background, undefined);
  assert.ok(
    elements(hook).some((e) => e.props.style?.boxDecorationBreak === "clone"),
  );
});
