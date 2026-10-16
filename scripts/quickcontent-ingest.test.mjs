import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  symlink,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
const module = await import("./quickcontent-ingest.mjs");
const root = () => mkdtemp(path.join(tmpdir(), "qc-ingest-"));
test("Python media CLIs ignore inherited Python module paths from the panel launcher", async () => {
  for (const exe of ["yt-dlp", "whisper"]) {
    await module.runMediaTool(exe, ["--version"], {
      root: "/tmp",
      runTool: async (_exe, _args, options) => {
        assert.equal(Object.hasOwn(options.env, "PYTHONPATH"), true);
        assert.equal(options.env.PYTHONPATH, undefined);
        assert.equal(Object.hasOwn(options.env, "PYTHONHOME"), true);
        assert.equal(options.env.PYTHONHOME, undefined);
        return { exitCode: 0, stdout: "version" };
      },
    });
  }
});
test("normalizes only real YouTube video URLs", () => {
  assert.equal(typeof module.normalizeYouTubeUrl, "function");
  assert.equal(
    module.normalizeYouTubeUrl("https://youtu.be/abcdefghijk?t=20"),
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  for (const url of [
    "http://localhost/",
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
    "https://www.youtube.com/playlist?list=foo",
    "https://evil@youtube.com/watch?v=abcdefghijk",
  ])
    assert.throws(() => module.normalizeYouTubeUrl(url));
});
test("media validation rejects decoder errors even when ffprobe exits successfully", async () => {
  await assert.rejects(
    module.probeSource("movie.mp4", {
      runTool: async () => ({
        stdout: JSON.stringify(probe),
        stderr: "[h264] Invalid NAL unit size",
        exitCode: 0,
      }),
    }),
    /uszkodzony/,
  );
});
test("path and symlink escape are rejected", async () => {
  assert.equal(typeof module.safePath, "function");
  const dir = await root();
  await symlink(tmpdir(), path.join(dir, "escape"));
  await assert.rejects(module.safePath(dir, "../oops"));
  await assert.rejects(module.safePath(dir, "escape/video.mp4"));
});
const probe = {
  streams: [
    { codec_type: "video", width: 1920, height: 1080, codec_name: "h264" },
    { codec_type: "audio", codec_name: "aac" },
  ],
  format: { duration: "3" },
};
test("upload is validated, copied immutably into workspace and proxy is finalized", async () => {
  assert.equal(typeof module.acceptUpload, "function");
  const dir = await root();
  const runner = async (exe, args) => {
    if (exe === "ffprobe") return { stdout: JSON.stringify(probe) };
    if (exe === "ffmpeg") await writeFile(args.at(-1), "proxy");
    return { stdout: "", stderr: "" };
  };
  const { uploadId } = await module.acceptUpload(Readable.from(["video"]), {
    root: dir,
    fileName: "film.mp4",
    runTool: runner,
  });
  const metadata = JSON.parse(
    await readFile(
      path.join(dir, ".quickcontent/uploads", uploadId + ".json"),
      "utf8",
    ),
  );
  assert.equal(metadata.fileName, "film.mp4");
  const source = await module.ingestSource(
    { id: "project-1", sourceKind: "upload", uploadId, clientId: null },
    { root: dir, runTool: runner },
  );
  assert.match(source.masterPath, /^\.quickcontent\/workspace\/project-1\//);
  assert.equal(source.duration, 3);
  assert.equal(
    await readFile(path.join(dir, source.masterPath), "utf8"),
    "video",
  );
  assert.equal(
    await readFile(path.join(dir, source.proxyPath), "utf8"),
    "proxy",
  );
});
test("failed upload or media without audio never receives an uploadId", async () => {
  assert.equal(typeof module.acceptUpload, "function");
  const dir = await root();
  await assert.rejects(
    module.acceptUpload(Readable.from(["broken"]), {
      root: dir,
      fileName: "film.mp4",
      runTool: async () => ({
        stdout: JSON.stringify({
          ...probe,
          streams: probe.streams.slice(0, 1),
        }),
      }),
    }),
    /audio|dźwięk/i,
  );
});
test("YouTube selects separate streams, original audio and reports lower quality", async () => {
  assert.equal(typeof module.ingestSource, "function");
  const dir = await root();
  const work = path.join(dir, ".quickcontent/workspace/project-2");
  await mkdir(work, { recursive: true });
  const abandoned = path.join(await realpath(work), "video.download.part");
  await writeFile(abandoned + ".part", "old incompatible partial");
  const calls = [];
  const formats = [
    {
      format_id: "v1080",
      vcodec: "vp9",
      acodec: "none",
      width: 1920,
      height: 1080,
      tbr: 1000,
    },
    {
      format_id: "dub",
      vcodec: "none",
      acodec: "opus",
      abr: 200,
      language: "en",
      format_note: "English dubbed",
    },
    {
      format_id: "original",
      vcodec: "none",
      acodec: "opus",
      abr: 120,
      language: "pl",
      format_note: "Polish original",
    },
  ];
  const runner = async (exe, args) => {
    calls.push([exe, args]);
    if (exe === "ffprobe") return { stdout: JSON.stringify(probe) };
    if (args.includes("--dump-single-json"))
      return {
        stdout: JSON.stringify({
          id: "abcdefghijk",
          title: "Tytuł filmu",
          formats,
        }),
        stderr: "[debug] JS Challenge Providers: bun, deno, node (external)",
      };
    if (exe === "node") return { stdout: "v22.23.2" };
    if (exe === "yt-dlp" && args.includes("-o"))
      await writeFile(args[args.indexOf("-o") + 1], "stream");
    if (exe === "ffmpeg" && !args.includes("-version"))
      await writeFile(args.at(-1), "movie");
    return { stdout: "version", stderr: "" };
  };
  const source = await module.ingestSource(
    {
      id: "project-2",
      sourceKind: "youtube",
      url: "https://youtu.be/abcdefghijk",
      resolution: 2160,
    },
    { root: dir, runTool: runner },
  );
  const downloads = calls.filter(
    ([exe, args]) => exe === "yt-dlp" && args.includes("-f"),
  );
  assert.equal(downloads.length, 2);
  assert.notEqual(
    downloads[0][1][downloads[0][1].indexOf("-o") + 1],
    abandoned,
  );
  assert.equal(
    await readFile(abandoned + ".part", "utf8"),
    "old incompatible partial",
  );
  assert.equal(downloads[0][1][downloads[0][1].indexOf("-f") + 1], "v1080");
  assert.equal(downloads[1][1][downloads[1][1].indexOf("-f") + 1], "original");
  assert.equal(source.audioLanguage, "pl");
  assert.equal(source.title, "Tytuł filmu");
  assert.ok(source.warnings.length);
  assert.ok(
    calls.some(([exe, args]) => exe === "ffmpeg" && args.includes("copy")),
  );
});
test("4K import accepts YouTube audio with unknown language preference -1", async () => {
  const dir = await root();
  const calls = [];
  const runTool = async (exe, args) => {
    calls.push([exe, args]);
    if (exe === "node") return { stdout: "v22.23.2" };
    if (args.includes("--dump-single-json"))
      return {
        stdout: JSON.stringify({
          id: "abcdefghijk",
          title: "Prawdziwy tytuł",
          formats: [
            {
              format_id: "v4k",
              vcodec: "vp9",
              acodec: "none",
              width: 3840,
              height: 2160,
            },
            {
              format_id: "a-low",
              vcodec: "none",
              acodec: "aac",
              language: "pl",
              language_preference: -1,
              abr: 49,
            },
            {
              format_id: "a-best",
              vcodec: "none",
              acodec: "aac",
              language: "pl",
              language_preference: -1,
              abr: 130,
            },
            {
              format_id: "dub",
              vcodec: "none",
              acodec: "opus",
              format_note: "English dubbed",
              abr: 200,
            },
            {
              format_id: "description",
              vcodec: "none",
              acodec: "aac",
              language_preference: -10,
              abr: 300,
            },
          ],
        }),
        stderr: "[debug] JS Challenge Providers: node",
      };
    if (exe === "yt-dlp" && args.includes("-o"))
      await writeFile(args[args.indexOf("-o") + 1], "stream");
    if (exe === "ffmpeg" && !args.includes("-version"))
      await writeFile(args.at(-1), "movie");
    return {
      stdout:
        exe === "ffprobe"
          ? JSON.stringify({
              ...probe,
              streams: [
                { ...probe.streams[0], width: 3840, height: 2160 },
                probe.streams[1],
              ],
            })
          : "",
      stderr: "",
    };
  };
  const source = await module.ingestSource(
    {
      id: "real-audio",
      sourceKind: "youtube",
      url: "https://youtu.be/abcdefghijk",
      resolution: 2160,
    },
    { root: dir, runTool },
  );
  assert.equal(source.videoFormatId, "v4k");
  assert.equal(source.audioFormatId, "a-best");
  assert.equal(source.title, "Prawdziwy tytuł");
  assert.equal(source.width, 3840);
  assert.deepEqual(source.warnings, []);
  const mux = calls.find(
    ([exe, args]) => exe === "ffmpeg" && args.includes("copy"),
  );
  assert.ok(mux);
  assert.ok(mux[1].includes("0:v:0") && mux[1].includes("1:a:0"));
});
test("rejects upload traversal and interrupted request before publishing metadata", async () => {
  const dir = await root();
  await assert.rejects(
    module.acceptUpload(Readable.from(["video"]), {
      root: dir,
      fileName: "../video.mp4",
    }),
  );
  const broken = Readable.from(
    (async function* () {
      yield "partial";
      throw new Error("disconnect");
    })(),
  );
  await assert.rejects(
    module.acceptUpload(broken, { root: dir, fileName: "video.mp4" }),
    /disconnect/,
  );
  const { readdir } = await import("node:fs/promises");
  assert.equal(
    (await readdir(path.join(dir, ".quickcontent/uploads"))).filter((f) =>
      f.endsWith(".json"),
    ).length,
    0,
  );
});
test("1080p limit never allows ultrawide 4K image with a short height", async () => {
  const dir = await root();
  const info = {
    title: "wide",
    formats: [
      {
        format_id: "wide4k",
        width: 3840,
        height: 800,
        vcodec: "vp9",
        acodec: "none",
        tbr: 2000,
      },
      {
        format_id: "fullhd",
        width: 1280,
        height: 720,
        vcodec: "vp9",
        acodec: "none",
        tbr: 1000,
      },
      {
        format_id: "audio",
        vcodec: "none",
        acodec: "opus",
        abr: 120,
        format_note: "original",
      },
    ],
  };
  let selected;
  const runTool = async (exe, args) => {
    if (exe === "node") return { stdout: "v22.1.0" };
    if (args.includes("--dump-single-json"))
      return {
        stdout: JSON.stringify(info),
        stderr:
          "[debug] [youtube] [jsc] JS Challenge Providers: bun (unavailable), deno (unavailable), node, quickjs (unavailable)",
      };
    if (exe === "yt-dlp" && args.includes("-f")) {
      if (!selected) selected = args[args.indexOf("-f") + 1];
      await writeFile(args[args.indexOf("-o") + 1], "stream");
    }
    if (exe === "ffmpeg" && !args.includes("-version"))
      await writeFile(args.at(-1), "movie");
    return {
      stdout: exe === "ffprobe" ? JSON.stringify(probe) : "",
      stderr: "",
    };
  };
  await module.ingestSource(
    {
      id: "wide",
      sourceKind: "youtube",
      url: "https://youtu.be/abcdefghijk",
      resolution: 1080,
    },
    { root: dir, runTool },
  );
  assert.equal(selected, "fullhd");
});
test("injected runner nonzero exit and truncated output cannot masquerade as success", async () => {
  await assert.rejects(
    module.runMediaTool("ffmpeg", [], {
      runTool: async () => ({ exitCode: 1, stderr: "bad" }),
    }),
    /niepowodzenie/,
  );
  await assert.rejects(
    module.runMediaTool("ffprobe", [], {
      runTool: async () => ({
        exitCode: 0,
        outputTruncated: true,
        stdout: "{}",
      }),
    }),
    /duży|trunc/i,
  );
});
async function fixtureUpload(dir) {
  const runTool = async (exe, args) => {
    if (exe === "ffmpeg") await writeFile(args.at(-1), "proxy");
    return {
      stdout: exe === "ffprobe" ? JSON.stringify(probe) : "",
      stderr: "",
    };
  };
  const { uploadId } = await module.acceptUpload(Readable.from(["video"]), {
    root: dir,
    fileName: "film.mp4",
    runTool,
  });
  return {
    project: { id: "partial", sourceKind: "upload", uploadId },
    ctx: { root: dir, runTool },
  };
}
test("proxy partial symlink is rejected before writing outside workspace", async () => {
  const dir = await root(),
    outside = await root(),
    target = path.join(outside, "untouched");
  await writeFile(target, "private");
  const { project, ctx } = await fixtureUpload(dir);
  const work = path.join(dir, ".quickcontent/workspace/partial");
  await mkdir(work, { recursive: true });
  await symlink(target, path.join(work, "proxy.mp4.part"));
  await assert.rejects(module.ingestSource(project, ctx), /Symlink/i);
  assert.equal(await readFile(target, "utf8"), "private");
});
test("interrupted upload master copy is replaced and intact master remains immutable", async () => {
  const dir = await root();
  const { project, ctx } = await fixtureUpload(dir);
  const work = path.join(dir, ".quickcontent/workspace/partial");
  await mkdir(work, { recursive: true });
  await writeFile(path.join(work, "master.mp4.part"), "incomplete");
  const source = await module.ingestSource(project, ctx);
  assert.equal(
    await readFile(path.join(dir, source.masterPath), "utf8"),
    "video",
  );
  await writeFile(path.join(dir, source.masterPath), "manual modification");
  await assert.rejects(module.ingestSource(project, ctx), /Master zmienił/);
});
test("master partial symlink is rejected rather than cleaned or overwritten", async () => {
  const dir = await root(),
    outside = await root(),
    target = path.join(outside, "untouched");
  await writeFile(target, "private");
  const { project, ctx } = await fixtureUpload(dir);
  const work = path.join(dir, ".quickcontent/workspace/partial");
  await mkdir(work, { recursive: true });
  await symlink(target, path.join(work, "master.mp4.part"));
  await assert.rejects(module.ingestSource(project, ctx), /Symlink/i);
  assert.equal(await readFile(target, "utf8"), "private");
});
test("metadata must positively confirm an available Node EJS provider", async () => {
  for (const stderr of [
    "",
    "[debug] [youtube:jsc] JS Challenge Providers: bun (unavailable), deno (unavailable), node (unavailable)",
  ]) {
    const dir = await root();
    let downloaded = false;
    await assert.rejects(
      module.ingestSource(
        {
          id: "ejs",
          sourceKind: "youtube",
          url: "https://youtu.be/abcdefghijk",
          resolution: 1080,
        },
        {
          root: dir,
          runTool: async (exe, args) => {
            if (exe === "node") return { stdout: "v22.1.0" };
            if (args.includes("--dump-single-json"))
              return {
                stdout: JSON.stringify({
                  formats: [
                    {
                      format_id: "v",
                      width: 1920,
                      height: 1080,
                      vcodec: "h264",
                      acodec: "none",
                    },
                    { format_id: "a", vcodec: "none", acodec: "aac" },
                  ],
                }),
                stderr,
              };
            if (args.includes("-f")) downloaded = true;
            if (exe === "yt-dlp" && args.includes("-o"))
              await writeFile(args[args.indexOf("-o") + 1], "stream");
            if (exe === "ffmpeg" && args.at(-1) !== "-version")
              await writeFile(args.at(-1), "movie");
            return {
              stdout: exe === "ffprobe" ? JSON.stringify(probe) : "",
              stderr: "",
            };
          },
        },
      ),
      /JavaScript\/EJS/,
    );
    assert.equal(downloaded, false);
  }
});
test("YouTube download intermediates and mux partial cannot follow symlinks", async () => {
  for (const partial of [
    "video.download.part",
    "video.download.part.part",
    "audio.download.part",
    "audio.download.part.part",
    "master.mkv.part",
  ]) {
    const dir = await root(),
      outside = await root(),
      target = path.join(outside, "private");
    await writeFile(target, "untouched");
    const work = path.join(dir, ".quickcontent/workspace/yt-part");
    await mkdir(work, { recursive: true });
    await symlink(target, path.join(work, partial));
    const runTool = async (exe, args) => {
      if (exe === "node") return { stdout: "v22.23.2" };
      if (args.includes("--dump-single-json"))
        return {
          stdout: JSON.stringify({
            title: "title",
            formats: [
              {
                format_id: "v",
                width: 1920,
                height: 1080,
                vcodec: "h264",
                acodec: "none",
              },
              {
                format_id: "a",
                vcodec: "none",
                acodec: "aac",
                format_note: "original",
              },
            ],
          }),
          stderr: "[debug] [youtube] [jsc] JS Challenge Providers: node",
        };
      if (exe === "yt-dlp" && args.includes("-o"))
        await writeFile(args[args.indexOf("-o") + 1], "stream");
      if (exe === "ffmpeg" && !args.includes("-version"))
        await writeFile(args.at(-1), "mux");
      return {
        stdout: exe === "ffprobe" ? JSON.stringify(probe) : "",
        stderr: "",
      };
    };
    await assert.rejects(
      module.ingestSource(
        {
          id: "yt-part",
          sourceKind: "youtube",
          url: "https://youtu.be/abcdefghijk",
          resolution: 1080,
        },
        { root: dir, runTool },
      ),
      /Symlink/,
    );
    assert.equal(await readFile(target, "utf8"), "untouched", partial);
  }
});
