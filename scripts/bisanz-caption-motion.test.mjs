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

test("composited media overlays keep their crop, exposure and baked transitions", () => {
  const View = kineticOverlay(BISANZ);
  for (const atFrame of [0, 30, 89]) {
    frame = atFrame;
    const tree = View({
      o: { type: "media", fit: "overlay", src: "split.mp4", start: 0, end: 3 },
      dur: 90,
      src: (x) => x,
      at: (x) => x,
    });
    assert.equal(tree.props.style.opacity, 1);
    const video = elements(tree).find((e) => e.props.src === "split.mp4");
    assert.ok(video);
    assert.equal(video.props.style.transform, undefined);
    assert.ok(!elements(tree).some((e) => e.props.style?.background));
  }
  frame = 30;
  const broll = View({
    o: { type: "media", fit: "full", src: "broll.mp4", start: 0, end: 3 },
    dur: 90,
    src: (x) => x,
    at: (x) => x,
  });
  assert.match(elements(broll).find((e) => e.props.src === "broll.mp4").props.style.transform, /scale/);
  assert.ok(elements(broll).some((e) => e.props.style?.background));
});

test("phrase reveal shows late words immediately while default word timing stays intact", () => {
  frame = 4;
  const Captions = kineticCaptions(BISANZ);
  const words = [
    { text: "Zadzwoń", start: 0, end: 0.4, at: 0, key: false, hl: false },
    { text: "teraz", start: 1.8, end: 2, at: 1.8, key: true, hl: false },
  ];
  const render = (reveal) => Captions({
    group: { words, key: 1, motion: "slide", layout: "inline", ...(reveal ? { reveal } : {}) },
    words, durationInFrames: 75, raised: false,
  });
  const wordOpacity = (tree) => elements(tree)
    .filter((e) => e.props.style?.display === "inline-block" && e.props.style.opacity !== undefined)
    .map((e) => e.props.style.opacity);
  assert.deepEqual(wordOpacity(render("phrase")), [1, 1]);
  assert.deepEqual(wordOpacity(render()), [1, 0]);
  const phrase = elements(render("phrase"));
  assert.ok(phrase.filter((e) => e.props.style?.transform === "none").length >= words.length);
  assert.ok(!phrase.some((e) => e.props.style?.filter?.startsWith("blur(")));
});

test("kinetic phrases have distinct short entrances and fully settle before reading time ends", () => {
  const Captions = kineticCaptions(BISANZ);
  const words = [
    { text: "Wymarzone", start: 0, end: .4, at: 0, key: false, hl: false },
    { text: "auto", start: 1.8, end: 2, at: 1.8, key: true, hl: false },
  ];
  for (const [motion, expected] of [["pop", "scale("], ["slide", "translateX("], ["bounce", "translateY("], ["glitch", "skewX("]]) {
    const render = () => Captions({
      group: { words, key: 1, motion, layout: "inline", reveal: "kinetic-phrase", from: "left" },
      words, durationInFrames: 36, raised: false,
    });
    frame = 4;
    assert.ok(elements(render()).some(e => e.props.style?.transform?.includes(expected)), motion);
    frame = 24;
    const settled = elements(render());
    assert.ok(settled.filter(e => e.props.style?.transform === "none").length >= words.length, motion);
    assert.ok(!settled.some(e => e.props.style?.filter?.startsWith("blur(")), motion);
    assert.ok(!settled.some(e => e.props.style?.opacity === 0), motion);
  }
});
