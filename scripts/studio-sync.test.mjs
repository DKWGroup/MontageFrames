import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncStudio, syncStudioEdits, readTrackProps } from "./studio-sync.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "montage-studio-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "public/reels/sample");
  fs.mkdirSync(dir, { recursive: true });
  const data = {
    source: "source.mp4",
    style: "persona",
    fps: 30,
    segments: [{ start: 0, end: 2 }],
    captions: [{ words: [{ text: "Test", start: 0, end: 1 }] }],
    overlays: [{ type: "counter", start: 1, end: 2, to: 10 }],
  };
  const json = path.join(dir, "reel.json");
  fs.writeFileSync(json, JSON.stringify(data));
  return {
    root,
    json,
    track: path.join(root, "src/studio/sample/s0.tsx"),
    tracks: path.join(root, "src/studio/sample"),
  };
}

test("każdy blok ma osobny edytowalny węzeł JSX z rzeczywistym czasem", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  const props = readAll(f);
  assert.deepEqual(Object.keys(props), ["s0", "o0", "c0"]);
  assert.deepEqual([props.s0.from, props.s0.durationInFrames], [0, 60]);
  assert.deepEqual([props.o0.from, props.o0.durationInFrames], [30, 30]);
});

test("zmiana pojedynczego bloku w inspektorze zapisuje się w JSON i przetrwa synchronizację", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  const source = fs
    .readFileSync(f.track, "utf8")
    .replace("from={0}", "from={15}");
  fs.writeFileSync(f.track, source);
  syncStudioEdits(f.root, "sample");
  const data = JSON.parse(fs.readFileSync(f.json, "utf8"));
  assert.equal(data.studio.s0.from, 15);
  assert.equal(data.studio.o0, undefined);
  syncStudio(f.root);
  assert.equal(readTrackProps(fs.readFileSync(f.track, "utf8")).s0.from, 15);
});

test("nowa rolka dostaje deklarację kompozycji z literalnym id i zapisywalnym defaultProps", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  const root = fs.readFileSync(path.join(f.root, "src/Root.tsx"), "utf8");
  assert.match(root, /id="sample"/);
  assert.match(root, /defaultProps=\{\{"reel":"sample"\}\}/);
  const previous = root;
  syncStudio(f.root);
  assert.equal(
    fs.readFileSync(path.join(f.root, "src/Root.tsx"), "utf8"),
    previous,
  );
});

test("nie interpretuje wykonywalnego kodu jako ustawień montażu", () => {
  assert.throws(
    () =>
      readTrackProps(
        'const x = {s0: <Sequence key="s0" from={run()} durationInFrames={30} />}',
      ),
    /statycz/,
  );
});

test("pola bloków są statyczne i edytowalne dla rzeczywistego parsera Studio", async (t) => {
  const { getNodes, getNodeProps } = await import("@remotion/codemods");
  const f = fixture(t);
  syncStudio(f.root);
  const files = Object.fromEntries(
    ["s0", "o0", "c0"].map((key) => [
      `${key}.tsx`,
      fs.readFileSync(path.join(f.tracks, `${key}.tsx`), "utf8"),
    ]),
  );
  const project = { rootDir: "/", files };
  const nodes = Object.keys(files).flatMap((filePath) =>
    getNodes({ project, filePath }).filter((n) => n.tagName === "Sequence"),
  );
  assert.equal(nodes.length, 3);
  for (const node of nodes) {
    const status = getNodeProps({
      project,
      node,
      componentIdentity: node.componentIdentity,
      keys: ["from", "durationInFrames", "style.scale", "style.opacity"],
      effectKeys: [],
      videoConfig: { width: 1080, height: 1920, fps: 30, durationInFrames: 60 },
    });
    assert.ok(Object.values(status.props).every((p) => p.status === "static"));
  }
});

test("zmiana JSON nie zamienia starych czasów JSX w ręczne nadpisania", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  const data = JSON.parse(fs.readFileSync(f.json, "utf8"));
  data.overlays[0].start = 1.5;
  fs.writeFileSync(f.json, JSON.stringify(data));
  syncStudio(f.root);
  assert.equal(readAll(f).o0.from, 45);
  assert.equal(JSON.parse(fs.readFileSync(f.json, "utf8")).studio, undefined);
});

test("reset pola do wartości domyślnej usuwa nadpisanie, również gdy Studio pomija from=0", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  fs.writeFileSync(
    f.track,
    fs.readFileSync(f.track, "utf8").replace("from={0}", "from={15}"),
  );
  syncStudioEdits(f.root, "sample");
  syncStudio(f.root);
  fs.writeFileSync(
    f.track,
    fs.readFileSync(f.track, "utf8").replace(" from={15}", ""),
  );
  syncStudioEdits(f.root, "sample");
  syncStudio(f.root);
  assert.equal(readTrackProps(fs.readFileSync(f.track, "utf8")).s0.from, 0);
  assert.equal(JSON.parse(fs.readFileSync(f.json, "utf8")).studio, undefined);
});

test("synchronizacja zachowuje ustawienia kompozycji zmienione w inspektorze", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  const file = path.join(f.root, "src/Root.tsx");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace("width={1080}", "width={720}"),
  );
  syncStudio(f.root);
  assert.match(fs.readFileSync(file, "utf8"), /width=\{720\}/);
});

test("synchronizacja nazw z symbolami dolara jest stabilna i nie powiela źródła", (t) => {
  const f = fixture(t);
  const data = JSON.parse(fs.readFileSync(f.json, "utf8"));
  data.captions[0].words[0].text = "$& $` $' 20 zł";
  fs.writeFileSync(f.json, JSON.stringify(data));
  syncStudio(f.root);
  const caption = path.join(f.tracks, "c0.tsx");
  const before = fs.readFileSync(caption, "utf8");
  syncStudio(f.root);
  syncStudio(f.root);
  assert.equal(fs.readFileSync(caption, "utf8"), before);
});

function readAll(f) {
  return Object.assign(
    {},
    ...["s0", "o0", "c0"].map((key) =>
      readTrackProps(
        fs.readFileSync(path.join(f.tracks, `${key}.tsx`), "utf8"),
      ),
    ),
  );
}
test("formatowanie jednego bloku nie zmienia plików pozostałych ścieżek", (t) => {
  const f = fixture(t);
  syncStudio(f.root);
  const other = fs.readFileSync(path.join(f.tracks, "o0.tsx"), "utf8");
  fs.writeFileSync(
    f.track,
    fs
      .readFileSync(f.track, "utf8")
      .replace("from={0}", "style={{scale:1.01}} from={0}"),
  );
  syncStudioEdits(f.root, "sample");
  syncStudio(f.root);
  assert.equal(fs.readFileSync(path.join(f.tracks, "o0.tsx"), "utf8"), other);
  assert.equal(readAll(f).s0.style.scale, 1.01);
});
