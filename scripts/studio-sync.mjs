// Statyczne węzły dla Visual Mode; źródłem montażu pozostaje reel.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { isDeepStrictEqual } from "node:util";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const loadTs = (file) => {
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function("exports", js)(exports);
  return exports;
};
const { captionClips, reelFrames, toOut } = loadTs(
  path.join(project, "src/reel-timing.ts"),
);
const { overlayLabel } = loadTs(path.join(project, "src/timeline-labels.ts"));
const allowed = new Set([
  "name",
  "from",
  "durationInFrames",
  "hidden",
  "style",
  "width",
  "height",
  "layout",
  "trimBefore",
  "playbackRate",
  "freeze",
  "loop",
  "premountFor",
  "postmountFor",
  "cropLeft",
  "cropRight",
  "cropTop",
  "cropBottom",
]);
const read = (file) =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const write = (file, content) => {
  if (read(file) === content) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, file);
};

function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken
  )
    return -literal(node.operand);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((p) => {
        if (!ts.isPropertyAssignment(p))
          throw new Error("Ustawienia muszą być statyczne");
        return [p.name.text, literal(p.initializer)];
      }),
    );
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    return literal(node.expression);
  throw new Error(
    "Ustawienia muszą być statyczne — nie wykonujemy kodu z inspektora",
  );
}
function attributes(node) {
  return Object.fromEntries(
    node.attributes.properties.map((a) => {
      if (!ts.isJsxAttribute(a))
        throw new Error("Ustawienia muszą być statyczne");
      return [
        a.name.text,
        a.initializer
          ? ts.isJsxExpression(a.initializer)
            ? literal(a.initializer.expression)
            : literal(a.initializer)
          : true,
      ];
    }),
  );
}
export function readTrackProps(source) {
  const file = ts.createSourceFile(
    "tracks.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  if (file.parseDiagnostics.length)
    throw new Error("Niepoprawna składnia pliku ścieżek");
  const result = {};
  const visit = (node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(file) === "Sequence"
    ) {
      const { key, ...props } = attributes(node);
      props.from ??= 0;
      if (typeof key !== "string" || !/^[soc]\d+$/.test(key))
        throw new Error("Brak identyfikatora ścieżki");
      if (
        !Number.isInteger(props.from) ||
        props.from < 0 ||
        !Number.isInteger(props.durationInFrames) ||
        props.durationInFrames < 1
      )
        throw new Error("Niepoprawny czas ścieżki");
      result[key] = Object.fromEntries(
        Object.entries(props).filter(([k]) => allowed.has(k)),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
}
function baseTracks(data) {
  const fps = data.fps ?? 30,
    seg = data.segments;
  const frame = (t) => Math.round(toOut(t, seg) * fps);
  const tracks = {};
  seg.forEach((s, i) => {
    const from = frame(s.start),
      durationInFrames =
        (i + 1 < seg.length ? frame(seg[i + 1].start) : reelFrames(data)) -
        from;
    if (durationInFrames > 0)
      tracks[`s${i}`] = {
        name: `Ujęcie ${i + 1} · ${data.source}`,
        from,
        durationInFrames,
      };
  });
  (data.overlays ?? []).forEach((o, i) => {
    const from = frame(o.start),
      durationInFrames = frame(o.end) - from,
      label = overlayLabel(o);
    if (durationInFrames > 0)
      tracks[`o${i}`] = {
        name: `Grafika ${i + 1} · ${label.kind}${label.detail ? ` · ${label.detail}` : ""}`,
        from,
        durationInFrames,
      };
  });
  captionClips(data).forEach(
    (c) =>
      (tracks[`c${c.index}`] = {
        name: `Napis ${c.index + 1} · ${c.words.map((w) => w.text).join(" ")}`,
        from: c.from,
        durationInFrames: c.durationInFrames,
      }),
  );
  return tracks;
}
const recordedValues = (values) =>
  JSON.stringify(values).replace(/\u00a0/g, "\\u00a0");
const attr = ([key, value]) => `${key}={${JSON.stringify(value)}}`;
function trackSource(data, onlyKey) {
  const allTracks = baseTracks(data);
  const tracks = onlyKey ? { [onlyKey]: allTracks[onlyKey] } : allTracks;
  const values = Object.fromEntries(
    Object.entries(tracks).map(([key, props]) => [
      key,
      { ...props, ...(data.studio?.[key] ?? {}) },
    ]),
  );
  const entries = Object.entries(tracks).map(([key, props]) => {
    const overrides = data.studio?.[key] ?? {};
    const merged = {
      ...props,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([k]) => allowed.has(k)),
      ),
    };
    return `      ${key}: <Sequence key="${key}" ${Object.entries(merged).map(attr).join(" ")} /> ,`;
  });
  if (onlyKey)
    return `${values[onlyKey].from === 0 ? "/* eslint-disable @remotion/from-0 -- jawny czas bloku */" : "// Statyczna definicja bloku osi czasu."}
// studio-values: ${recordedValues(values)}
import { Sequence } from "remotion";
const timeline = {
${entries.join("\n")}
};
export default timeline.${onlyKey};
`;
  return `/* eslint-disable @remotion/from-0 -- jawne czasy są edytowalne w inspektorze */
// Ścieżki synchronizowane z reel.json. Pola bloków można edytować w inspektorze Studio.
// studio-values: ${recordedValues(values)}
import { Sequence } from "remotion";
import { Reel, type ReelProps } from "../Reel";

const timeline = {
${entries.join("\n")}
};

export const StudioReel: React.FC<ReelProps> = (props) => (
  <Reel {...props} timeline={timeline} />
);
`;
}
function defaultsOf(source) {
  const file = ts.createSourceFile(
      "Root.tsx",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    values = {};
  const visit = (node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(file) === "Composition"
    ) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const id = attrs.find((a) => a.name.text === "id")?.initializer;
      const defaults = attrs.find(
        (a) => a.name.text === "defaultProps",
      )?.initializer;
      if (
        id &&
        ts.isStringLiteral(id) &&
        defaults &&
        ts.isJsxExpression(defaults)
      )
        values[id.text] = literal(defaults.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return values;
}
export function syncStudio(root = project) {
  const reels = path.join(root, "public/reels"),
    studio = path.join(root, "src/studio");
  const names = fs
    .readdirSync(reels, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        /^[a-z0-9-]+$/.test(d.name) &&
        fs.existsSync(path.join(reels, d.name, "reel.json")),
    )
    .map((d) => d.name)
    .sort();
  const rootSource = read(path.join(root, "src/Root.tsx"));
  const defaults = defaultsOf(rootSource);
  names.forEach((name) => {
    const wrapper = path.join(studio, `${name}.tsx`);
    // Jednorazowo przenosimy ustawienia poprzednich, wspólnych definicji.
    if (read(wrapper).includes("// studio-values:"))
      syncFileEdits(root, name, wrapper);
    syncStudioEdits(root, name);
    const data = JSON.parse(read(path.join(reels, name, "reel.json")));
    const keys = Object.keys(baseTracks(data));
    for (const key of keys) {
      const file = path.join(studio, name, `${key}.tsx`);
      const source = trackSource(data, key);
      const current = read(file);
      if (
        !current.includes("// studio-values:") ||
        !isDeepStrictEqual(readTrackProps(current), readTrackProps(source))
      )
        write(file, source);
    }
    write(
      wrapper,
      `// Każdy blok ma własny plik: edycja nie przesuwa lokalizacji innych bloków.
import { Reel, type ReelProps } from "../Reel";
${keys.map((key) => `import ${key} from "./${name}/${key}";`).join("\n")}
const timeline = { ${keys.join(", ")} };
export const StudioReel: React.FC<ReelProps> = (props) => <Reel {...props} timeline={props.reel === "${name}" ? timeline : undefined} />;
`,
    );
  });
  if (JSON.stringify(Object.keys(defaults).sort()) === JSON.stringify(names))
    return names;
  write(
    path.join(root, "src/Root.tsx"),
    `// Rejestr synchronizowany automatycznie; defaultProps zapisuje także Studio.\nimport "./index.css";\nimport { Composition } from "remotion";\nimport { calculateReelMetadata } from "./Reel";\n${names.map((name, i) => `import { StudioReel as Reel${i} } from "./studio/${name}";`).join("\n")}\n\nexport const RemotionRoot: React.FC = () => (\n  <>\n${names.map((name, i) => `    <Composition id="${name}" component={Reel${i}} calculateMetadata={calculateReelMetadata} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={${JSON.stringify(defaults[name] ?? { reel: name })}} />`).join("\n")}\n  </>\n);\n`,
  );
  return names;
}
function syncFileEdits(root, name, file) {
  if (!/^[a-z0-9-]+$/.test(name)) return;
  const json = path.join(root, "public/reels", name, "reel.json");
  if (!fs.existsSync(json) || !fs.existsSync(file)) return;
  const source = read(file);
  const data = JSON.parse(read(json));
  const previousData = JSON.stringify(data);
  const base = baseTracks(data);
  const edited = readTrackProps(source);
  const recorded = source.match(/^\/\/ studio-values: (.+)$/m);
  const previous = recorded ? JSON.parse(recorded[1]) : base;
  const studio = data.studio ?? {};
  for (const [key, props] of Object.entries(edited)) {
    if (!base[key] || !previous[key]) continue;
    const deltaKeys = new Set([
      ...Object.keys(previous[key]),
      ...Object.keys(props),
    ]);
    for (const field of deltaKeys) {
      if (JSON.stringify(previous[key][field]) === JSON.stringify(props[field]))
        continue;
      const overrides = studio[key] ?? {};
      if (
        props[field] === undefined ||
        JSON.stringify(base[key][field]) === JSON.stringify(props[field])
      )
        delete overrides[field];
      else overrides[field] = props[field];
      if (Object.keys(overrides).length) studio[key] = overrides;
      else delete studio[key];
    }
  }
  if (Object.keys(studio).length) data.studio = studio;
  else delete data.studio;
  if (JSON.stringify(data) !== previousData)
    write(json, JSON.stringify(data, null, 2) + "\n");
  if (recorded)
    write(
      file,
      source.replace(
        /^\/\/ studio-values: .+$/m,
        () => `// studio-values: ${recordedValues(edited)}`,
      ),
    );
}
export function syncStudioEdits(root, name) {
  if (!/^[a-z0-9-]+$/.test(name)) return;
  const folder = path.join(root, "src/studio", name);
  if (!fs.existsSync(folder)) return;
  for (const file of fs.readdirSync(folder)) {
    if (/^[soc]\d+\.tsx$/.test(file))
      syncFileEdits(root, name, path.join(folder, file));
  }
}
export function watchStudio(root = project) {
  syncStudio(root);
  const pending = new Set();
  let timer;
  const flush = () => {
    try {
      for (const name of pending) syncStudioEdits(root, name);
      pending.clear();
      syncStudio(root);
    } catch (error) {
      console.error("Synchronizacja Studio:", error.message);
    }
  };
  const schedule = (name) => {
    if (name) pending.add(name);
    clearTimeout(timer);
    timer = setTimeout(flush, 180);
  };
  const watchers = [
    fs.watch(
      path.join(root, "public/reels"),
      { recursive: true },
      (_, file) => {
        if (file?.endsWith("reel.json")) schedule();
      },
    ),
    fs.watch(path.join(root, "src/studio"), { recursive: true }, (_, file) => {
      if (file?.endsWith(".tsx"))
        schedule(file.split(path.sep)[0].replace(/\.tsx$/, ""));
    }),
  ];
  watchers.forEach((w) => w.unref());
  return () => {
    clearTimeout(timer);
    watchers.forEach((w) => w.close());
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  syncStudio();
