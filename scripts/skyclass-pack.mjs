// Eksport zlecenia 2026-10-30. Całe ciężkie I/O, łącznie z Remotion TMPDIR, na zewnętrznym dysku.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { toXmeml } from "./cutraw-xml.mjs";
const project = path.resolve(
  "klienci/kacper-bisanz/Animacje/skyclass-poziom-1",
);
const plan = JSON.parse(fs.readFileSync(`${project}/plan.json`));
const out = plan.output;
const work = path.join(path.dirname(out), "robocze");
const [cmd = "qa", ...args] = process.argv.slice(2);
const force = args.includes("--force");
const ids = args.filter((x) => x !== "--force");
if (!fs.existsSync(plan.source))
  throw Error("Brak oryginału na dysku zewnętrznym");
if (!out.startsWith("/Volumes/t7 blck bad/"))
  throw Error("Rendery mogą trafić tylko na wskazany dysk zewnętrzny");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(`${work}/tmp`, { recursive: true });
process.env.TMPDIR = `${work}/tmp`;
const probe = (f) =>
  JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,codec_name,pix_fmt,profile,width,height,r_frame_rate,channels,sample_rate",
        "-of",
        "json",
        f,
      ],
      { encoding: "utf8" },
    ),
  );
const file = (id, p) => {
  const d = probe(p),
    v = d.streams.find((s) => s.codec_type === "video"),
    a = d.streams.find((s) => s.codec_type === "audio");
  return {
    id,
    path: p,
    duration: Number(d.format.duration),
    width: v?.width,
    height: v?.height,
    channels: a?.channels,
    sampleRate: Number(a?.sample_rate ?? 48000),
  };
};
const movie = (it) => `${out}/${it.id}.mov`;
const selected = plan.items.filter((it) => !ids.length || ids.includes(it.id));
const tc = (t) => {
  let f = Math.round(t * 25),
    s = Math.floor(f / 25);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f % 25]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};
if (cmd === "xml") {
  const files = [
    file("master", plan.source),
    ...plan.items.map((it) => file(it.id, movie(it))),
  ];
  for (const it of plan.items) {
    const p = probe(movie(it)),
      v = p.streams.find((s) => s.codec_type === "video");
    if (
      v.width !== 3840 ||
      v.height !== 2160 ||
      v.r_frame_rate !== "25/1" ||
      !v.pix_fmt.includes("a") ||
      v.codec_name !== "prores"
    )
      throw Error(`Nieprawidłowy render ${it.id}`);
    if (Math.abs(Number(p.format.duration) - it.dur) > 0.041)
      throw Error(`Długość ${it.id}`);
  }
  const tracks = [];
  for (const it of plan.items) {
    let tr = tracks.find((tr) => tr.at(-1).end <= it.at);
    if (!tr) tracks.push((tr = []));
    tr.push({
      file: it.id,
      start: Math.round(it.at * 25) / 25,
      end: (Math.round(it.at * 25) + Math.round(it.dur * 25)) / 25,
      offset: Math.round(it.at * 25) / 25,
      label: it.title,
    });
  }
  const master = { file: "master", link: "master" };
  const video = [
    master,
    ...tracks.map((shots, i) => ({ shots, link: `overlay-${i}` })),
  ];
  const xml = toXmeml({
    name: "SkyClass poziom 1 — osobne animacje",
    fps: 25,
    width: 3840,
    height: 2160,
    segments: [{ start: 0, end: plan.duration }],
    files,
    video,
    audio: video,
    markers: plan.items.map((it) => ({
      at: it.at,
      name: it.id,
      comment: it.title,
    })),
  });
  const withAlpha = xml.replace(/<clipitem\b[\s\S]*?<\/clipitem>/g, (block) =>
    block.includes("<sourcetrack>") || block.includes('<file id="file-1"')
      ? block
      : block.replace(
          "</clipitem>",
          "<alphatype>straight</alphatype><compositemode>normal</compositemode></clipitem>",
        ),
  );
  fs.writeFileSync(`${out}/skyclass-poziom-1.xml`, withAlpha);
  fs.copyFileSync(`${project}/plan.json`, `${out}/plan.json`);
  fs.copyFileSync(`${project}/sources.md`, `${out}/sources.md`);
  fs.writeFileSync(
    `${out}/README.md`,
    [
      "# SkyClass poziom 1 — animacje do Premiere",
      "",
      `${plan.items.length} osobnych plików MOV ProRes 4444 z alfą, 3840×2160, 25 kl./s, audio PCM. Tło przezroczyste; nie wymaga kluczowania. Położenie grafiki jest zapisane w pełnej klatce.`,
      "",
      "Premiere: Plik → Importuj → skyclass-poziom-1.xml. Sekwencja zachowuje pełny oryginał na V1/A1; animacje i ich SFX są wyżej. Jeżeli przeniesiesz paczkę, wskaż jej nowy folder przy relinkowaniu. Nie stosuj ponownie transformacji pozycji ani skali do nakładek. Jeśli film jest już w Twoim projekcie Premiere, skopiuj z zaimportowanej sekwencji tylko nakładki z V2/V3 i ich dźwięki z A2/A3 na swoją oś, ze wspólnym początkiem 00:00:00:00.",
      "",
      "Wskazania ekranów są dopasowane do tego konkretnego pliku skyclass poziom_1.mp4. Po zmianie montażu lub powiększenia ekranu trzeba ponownie dopasować nakładki. Screeny i oprawa już obecne w oryginale pozostają częścią źródła.",
      "",
      "Ceny wycieczek i wyliczenia oznaczone jako „z nagrania” są przykładem z materiału, nie bieżącą ofertą. Aktualne warunki i daty w sources.md. Nie dodano napisów całej wypowiedzi.",
      "",
      "Kontrola techniczna i wizualna: zobacz kontrola.json i podglady/. Import XML w Premiere wymaga sprawdzenia w aplikacji; parser XML sam nie potwierdza importu.",
      "",
      "| Plik | Timecode | Długość | Zawartość |",
      "|---|---|---|---|",
      ...plan.items.map(
        (it) =>
          `| ${it.id}.mov | ${tc(it.at)} | ${(Math.round(it.dur * 25) / 25).toFixed(2)} s | ${it.title} |`,
      ),
    ].join("\n"),
  );
  console.log(
    `XML: ${out}/skyclass-poziom-1.xml (${tracks.length} ścieżek animacji)`,
  );
} else if (cmd === "audio") {
  // Kopia strumienia obrazu: bez ponownej kompresji ProRes i bez utraty alfy.
  for (const it of selected) {
    const events = [
      {
        s:
          it.sound ??
          (it.kind === "track" ? "click" : it.logo ? "pop" : "whoosh2"),
        at: 0,
      },
    ];
    if (it.to !== undefined || it.value) {
      const s = /zł/.test((it.suffix ?? "") + (it.value ?? ""))
        ? "cash"
        : "ding";
      events.push({ s, at: (it.hit ?? 1.45) - (s === "cash" ? 0.5425 : 0) });
    }
    const inputs = events.flatMap((e) => [
      "-i",
      path.resolve(`public/longform-pack/subskrypcje/sfx/${e.s}.wav`),
    ]);
    const filters = events.map(
      (e, i) =>
        `[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${it.audioGain ?? 1},adelay=${Math.max(0, Math.round((Math.round(e.at * 25) / 25) * 1000))}:all=1[s${i}]`,
    );
    filters.push(
      `${events.map((_, i) => `[s${i}]`).join("")}amix=inputs=${events.length}:normalize=0:duration=longest,apad=whole_dur=${it.dur},atrim=duration=${it.dur}[mix]`,
    );
    const tmp = `${out}/${it.id}.audio.tmp.mov`;
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      movie(it),
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "0:v:0",
      "-map",
      "[mix]",
      "-c:v",
      "copy",
      "-c:a",
      "pcm_s16le",
      "-t",
      String(it.dur),
      tmp,
    ]);
    fs.renameSync(tmp, movie(it));
    console.log(`SFX ${it.id}`);
  }
} else {
  const url = await bundle({
    entryPoint: path.resolve("src/pack/Skyclass.tsx"),
    publicDir: path.resolve("public/longform-pack"),
    outDir: `${work}/bundle-${cmd}-${process.pid}`,
    enableCaching: false,
  });
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    for (const it of selected) {
      const composition = await selectComposition({
        serveUrl: url,
        id: it.id,
        puppeteerInstance: browser,
      });
      if (cmd === "render") {
        if (
          !force &&
          fs.existsSync(movie(it)) &&
          probe(movie(it)).streams.some((s) => s.codec_type === "audio")
        ) {
          console.log(`OK istnieje: ${it.id}`);
          continue;
        }
        const start = Date.now();
        await renderMedia({
          composition,
          serveUrl: url,
          outputLocation: movie(it),
          puppeteerInstance: browser,
          scale: 2,
          codec: "prores",
          proResProfile: "4444",
          pixelFormat: "yuva444p10le",
          imageFormat: "png",
          audioCodec: "pcm-16",
          enforceAudioTrack: true,
          concurrency: 2,
          colorSpace: "bt709",
          logLevel: "error",
          onProgress: ({ progress }) => {
            if (progress === 1) console.log(`zapis: ${it.id}`);
          },
        });
        console.log(
          `Gotowy ${it.id} (${Math.round((Date.now() - start) / 1000)} s, ${Math.round(fs.statSync(movie(it)).size / 1e6)} MB)`,
        );
      } else if (cmd === "qa") {
        fs.mkdirSync(`${work}/qa`, { recursive: true });
        for (const s of [0.16, Math.min(2, it.dur / 2), it.dur - 0.32]) {
          const name = `${it.id}-${s.toFixed(2)}`,
            fg = `${work}/qa/${name}-alpha.png`,
            bg = `${work}/qa/${name}-bg.jpg`;
          await renderStill({
            composition,
            serveUrl: url,
            output: fg,
            puppeteerInstance: browser,
            frame: Math.round(s * 25),
            imageFormat: "png",
            scale: 0.5,
            logLevel: "error",
          });
          execFileSync("ffmpeg", [
            "-v",
            "error",
            "-y",
            "-ss",
            String(it.at + s),
            "-i",
            plan.source,
            "-frames:v",
            "1",
            "-vf",
            "scale=960:540",
            bg,
          ]);
          execFileSync("ffmpeg", [
            "-v",
            "error",
            "-y",
            "-i",
            bg,
            "-i",
            fg,
            "-filter_complex",
            "overlay",
            "-frames:v",
            "1",
            `${work}/qa/${name}.jpg`,
          ]);
          fs.unlinkSync(bg);
        }
        console.log(`QA ${it.id}`);
      } else throw Error("qa | render [ID...] | xml");
    }
  } finally {
    await browser.close({ silent: true });
  }
}
