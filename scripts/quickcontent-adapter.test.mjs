import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const module = await import("./quickcontent-adapter.mjs");
const words = [
  { id: "a", text: "Pełna", start: 125.2, end: 125.6 },
  { id: "b", text: "wypowiedź.", start: 126, end: 126.8 },
];
test("rebases source word times without modifying original values", () => {
  assert.equal(typeof module.rebaseWords, "function");
  const a = module.rebaseWords(words, 125, 128);
  assert.equal(a.words[0].start, 0.2);
  assert.equal(a.words[0].end, 0.6);
  assert.equal(words[0].start, 125.2);
  assert.equal(a.wordMap[0].sourceWordId, "a");
  assert.throws(() => module.rebaseWords(words, 125.4, 128));
});
test("SkyClass keeps complete selected clip with local start zero and all captions", () => {
  assert.equal(typeof module.buildCandidateReel, "function");
  const data = module.buildCandidateReel({
    words: module.rebaseWords(words, 125, 128).words,
    duration: 3,
    styleId: "skyclass",
    clientId: "skyclass",
    width: 1920,
    height: 1080,
  });
  assert.deepEqual(data.segments, [{ start: 0, end: 3, zoom: 1 }]);
  assert.equal(data.captions.flatMap((c) => c.words).length, 2);
  assert.equal(data.framing.mode, "crop");
});
test("materialization is exact transcode and retry preserves manual edits but rejects wrong origin", async () => {
  assert.equal(typeof module.materializeCandidate, "function");
  const root = await mkdtemp(path.join(tmpdir(), "qc-adapter-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "master");
  const calls = [];
  const ctx = {
    root,
    runTool: async (exe, args) => {
      calls.push([exe, args]);
      if (exe === "ffmpeg") await writeFile(args.at(-1), "clip");
      return {
        stdout:
          exe === "ffprobe"
            ? JSON.stringify({
                streams: [
                  {
                    codec_type: "video",
                    width: 1920,
                    height: 1080,
                    codec_name: "h264",
                    r_frame_rate: "30/1",
                  },
                  { codec_type: "audio", codec_name: "aac" },
                ],
                format: { duration: "3" },
              })
            : "",
        stderr: "",
      };
    },
  };
  const input = {
    project: {
      id: "proj",
      styleId: "skyclass",
      clientId: null,
      source: {
        id: "source",
        masterPath: "media/master.mkv",
        width: 1920,
        height: 1080,
        duration: 200,
        hash: "sourcehash",
      },
    },
    candidate: {
      id: "candidate",
      sourceStart: 125,
      sourceEnd: 128,
      firstWordId: "a",
      lastWordId: "b",
    },
    transcript: { hash: "transcript", words },
  };
  const result = await module.materializeCandidate(input, ctx);
  assert.equal(result.origin.sourceStart, 125);
  assert.equal(result.data.source, "source.mp4");
  const ffmpeg = calls.find(([exe]) => exe === "ffmpeg")[1];
  assert.ok(ffmpeg.includes("libx264"));
  assert.ok(ffmpeg.includes("aac"));
  assert.ok(ffmpeg.indexOf("-ss") > ffmpeg.indexOf("-i"));
  const reel = path.join(root, "public/reels", result.reelName, "reel.json");
  const edited = { ...result.data, hold: 2 };
  await writeFile(reel, JSON.stringify(edited));
  assert.deepEqual(
    (await module.materializeCandidate(input, ctx)).data,
    edited,
  );
  assert.equal(
    calls.filter(([exe, args]) => exe === "ffmpeg" && args.includes("libx264"))
      .length,
    1,
  );
  await writeFile(
    path.join(path.dirname(reel), "origin.json"),
    JSON.stringify({ ...result.origin, sourceStart: 0 }),
  );
  await assert.rejects(
    module.materializeCandidate(input, ctx),
    /origin|pochodzeni/i,
  );
});
test("real FFmpeg clip from offset keeps the later audio and CFR H264 AAC", async () => {
  const { runMediaTool, probeSource, hashFile } =
    await import("./quickcontent-ingest.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "qc-real-"));
  await mkdir(path.join(root, "media"));
  const master = path.join(root, "media/master.mp4");
  await runMediaTool(
    "ffmpeg",
    [
      "-hide_banner",
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=320x180:rate=24:duration=5",
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=if(lt(t\\,2)\\,sin(2*PI*440*t)\\,sin(2*PI*880*t)):s=48000:d=5",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-shortest",
      master,
    ],
    { root },
  );
  const source = {
    id: "source",
    masterPath: "media/master.mp4",
    width: 320,
    height: 180,
    duration: 5,
    hash: await hashFile(master),
  };
  const result = await module.materializeCandidate(
    {
      project: { id: "actual", styleId: "skyclass", source },
      candidate: {
        id: "later",
        sourceStart: 2,
        sourceEnd: 4,
        firstWordId: "w1",
        lastWordId: "w2",
      },
      transcript: {
        hash: "actualwords",
        words: [
          { id: "w1", text: "Pełna", start: 2.2, end: 2.5 },
          { id: "w2", text: "wypowiedź.", start: 3.2, end: 3.5 },
        ],
      },
    },
    { root },
  );
  const clip = path.join(root, "public/reels", result.reelName, "source.mp4");
  const info = await probeSource(clip, { root });
  assert.equal(info.videoCodec, "h264");
  assert.equal(info.audioCodec, "aac");
  assert.equal(info.fps, "30/1");
  assert.ok(Math.abs(info.duration - 2) < 0.1);
  assert.equal(result.data.segments[0].start, 0);
  assert.equal(result.data.captions.flatMap((c) => c.words)[0].start, 0.2);
  const pcm = path.join(root, "clip.pcm");
  await runMediaTool(
    "ffmpeg",
    [
      "-hide_banner",
      "-v",
      "error",
      "-y",
      "-i",
      clip,
      "-t",
      "0.5",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "s16le",
      pcm,
    ],
    { root },
  );
  const audio = await readFile(pcm);
  let crossings = 0;
  for (let i = 2; i < audio.length; i += 2)
    if (audio.readInt16LE(i - 2) <= 0 && audio.readInt16LE(i) > 0) crossings++;
  assert.ok(
    crossings > 420 && crossings < 460,
    `later audio expected 880 Hz; observed ${crossings * 2} Hz`,
  );
});
test("partial word ends and missing style cannot silently materialize", () => {
  assert.throws(() => module.rebaseWords(words, 125, 126.5), /przecina/);
  assert.throws(
    () =>
      module.buildCandidateReel({
        words,
        duration: 3,
        width: 1920,
        height: 1080,
      }),
    /stylu/,
  );
});

test("generated reel name fits existing panel limit", async () => {
  const { mkdtemp, mkdir, writeFile } = await import("node:fs/promises");
  const root = await mkdtemp(path.join(tmpdir(), "qc-name-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "master");
  const result = await module.materializeCandidate(
    {
      project: {
        id: "qc-01234567-89ab-cdef-0123-456789abcdef",
        styleId: "skyclass",
        source: { id: "s", masterPath: "media/master.mkv", duration: 200 },
      },
      candidate: {
        id: "c-01234567-89ab-cdef-0123-456789abcdef",
        sourceStart: 125,
        sourceEnd: 128,
        firstWordId: "a",
        lastWordId: "b",
      },
      transcript: { hash: "t", words },
    },
    {
      root,
      runTool: async (exe, args) => {
        if (exe === "ffmpeg") await writeFile(args.at(-1), "movie");
        return {
          stdout:
            exe === "ffprobe"
              ? JSON.stringify({
                  streams: [
                    {
                      codec_type: "video",
                      width: 1920,
                      height: 1080,
                      codec_name: "h264",
                    },
                    { codec_type: "audio", codec_name: "aac" },
                  ],
                  format: { duration: "3" },
                })
              : "",
        };
      },
    },
  );
  assert.ok(result.reelName.length < 80);
});
test("client catalog keeps product files and relative logo inside client directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qc-products-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "master");
  await mkdir(path.join(root, "klienci/client/produkty"), { recursive: true });
  await mkdir(path.join(root, "klienci/client/logo"));
  await writeFile(path.join(root, "klienci/client/PREFERENCJE.md"), "zasady");
  await writeFile(
    path.join(root, "klienci/client/produkty/product.png"),
    "picture",
  );
  await writeFile(path.join(root, "klienci/client/logo/logo.png"), "logo");
  await writeFile(
    path.join(root, "klienci/client/produkty/produkty.json"),
    JSON.stringify([
      {
        name: "SHIELD",
        aliases: ["szild"],
        file: "product.png",
        logo: "../logo/logo.png",
      },
    ]),
  );
  const result = await module.materializeCandidate(
    {
      project: {
        id: "catalog",
        clientId: "client",
        styleId: "glowup",
        source: { id: "s", masterPath: "media/master.mkv", duration: 3 },
      },
      candidate: {
        id: "product",
        sourceStart: 0,
        sourceEnd: 3,
        firstWordId: "a",
        lastWordId: "a",
      },
      transcript: {
        hash: "t",
        words: [{ id: "a", text: "szild", start: 0.5, end: 1 }],
      },
    },
    {
      root,
      runTool: async (exe, args) => {
        if (exe === "ffmpeg") await writeFile(args.at(-1), "movie");
        return {
          stdout:
            exe === "ffprobe"
              ? JSON.stringify({
                  streams: [
                    {
                      codec_type: "video",
                      width: 1920,
                      height: 1080,
                      codec_name: "h264",
                    },
                    { codec_type: "audio", codec_name: "aac" },
                  ],
                  format: { duration: "3" },
                })
              : "",
        };
      },
    },
  );
  assert.equal(result.data.captions[0].words[0].text, "SHIELD");
  const dir = path.join(root, "public/reels", result.reelName);
  assert.equal(await readFile(path.join(dir, "logo.png"), "utf8"), "logo");
  assert.equal(
    await readFile(path.join(dir, "product.png"), "utf8"),
    "picture",
  );
  assert.equal(
    await readFile(path.join(dir, "preferences.snapshot.md"), "utf8"),
    "zasady",
  );
});
test("same style but changed template snapshot blocks retry and retains existing edit and source", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qc-template-"));
  await mkdir(path.join(root, "media"));
  await writeFile(path.join(root, "media/master.mkv"), "immutable master");
  let transcodes = 0;
  const ctx = {
    root,
    runTool: async (exe, args) => {
      if (exe === "ffmpeg") {
        if (args.includes("libx264")) transcodes++;
        await writeFile(args.at(-1), "clip");
      }
      return {
        stdout:
          exe === "ffprobe"
            ? JSON.stringify({
                streams: [
                  {
                    codec_type: "video",
                    width: 1920,
                    height: 1080,
                    codec_name: "h264",
                  },
                  { codec_type: "audio", codec_name: "aac" },
                ],
                format: { duration: "3" },
              })
            : "",
      };
    },
  };
  const input = {
    project: {
      id: "snapshot",
      templateSnapshot: { id: "first", styleId: "skyclass", brandVersion: 1 },
      source: { id: "s", masterPath: "media/master.mkv", duration: 200 },
    },
    candidate: {
      id: "candidate",
      sourceStart: 125,
      sourceEnd: 128,
      firstWordId: "a",
      lastWordId: "b",
    },
    transcript: { hash: "t", words },
  };
  const initial = await module.materializeCandidate(input, ctx);
  const directory = path.join(root, "public/reels", initial.reelName),
    edited = { ...initial.data, hold: 2 };
  await writeFile(path.join(directory, "reel.json"), JSON.stringify(edited));
  await assert.rejects(
    module.materializeCandidate(
      {
        ...input,
        project: {
          ...input.project,
          templateSnapshot: {
            ...input.project.templateSnapshot,
            brandVersion: 2,
          },
        },
      },
      ctx,
    ),
    /origin|szablonu/,
  );
  assert.deepEqual(
    JSON.parse(await readFile(path.join(directory, "reel.json"), "utf8")),
    edited,
  );
  assert.equal(
    await readFile(path.join(directory, "source.mp4"), "utf8"),
    "clip",
  );
  assert.equal(
    await readFile(path.join(root, "media/master.mkv"), "utf8"),
    "immutable master",
  );
  assert.equal(transcodes, 1);
});
test("real local FFmpeg converts PQ HDR with available native filters to SDR", async () => {
  const { runMediaTool, probeSource, hashFile } =
    await import("./quickcontent-ingest.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "qc-hdr-"));
  await mkdir(path.join(root, "media"));
  const master = path.join(root, "media/hdr.mp4");
  await runMediaTool(
    "ffmpeg",
    [
      "-hide_banner",
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=gray:size=32x32:rate=30:duration=1",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=1",
      "-vf",
      "scale=in_color_matrix=bt709:in_primaries=bt709:in_transfer=bt709:out_color_matrix=bt2020:out_primaries=bt2020:out_transfer=smpte2084,format=yuv420p10le",
      "-color_primaries",
      "bt2020",
      "-color_trc",
      "smpte2084",
      "-colorspace",
      "bt2020nc",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-shortest",
      master,
    ],
    { root },
  );
  assert.equal(
    (await probeSource(master, { root })).colorTransfer,
    "smpte2084",
  );
  const result = await module.materializeCandidate(
    {
      project: {
        id: "hdr",
        styleId: "skyclass",
        source: {
          id: "s",
          masterPath: "media/hdr.mp4",
          duration: 1,
          hash: await hashFile(master),
        },
      },
      candidate: {
        id: "clip",
        sourceStart: 0,
        sourceEnd: 1,
        firstWordId: "word",
        lastWordId: "word",
      },
      transcript: {
        hash: "t",
        words: [{ id: "word", text: "Test.", start: 0.2, end: 0.7 }],
      },
    },
    { root },
  );
  const clip = await probeSource(
    path.join(root, "public/reels", result.reelName, "source.mp4"),
    { root },
  );
  assert.equal(clip.colorTransfer, "bt709");
  assert.equal(clip.colorPrimaries, "bt709");
  assert.equal(clip.pixelFormat, "yuv420p");
  assert.equal(clip.fps, "30/1");
});
