// Przejście klienta: 2,5 s, 4K 50 fps, ProRes 4444. Całe ciężkie I/O na dysku zewnętrznym.
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

const v2 = process.argv.includes("--v2");
const cleanA = process.argv.includes("--clean-a");
const cleanB = process.argv.includes("--clean-b");
const fusionA = process.argv.includes("--fusion-a");
const fusionB = process.argv.includes("--fusion-b");
const travel = process.argv.includes("--travel");
const fusion = fusionA || fusionB || travel;
const clean = cleanA || cleanB || fusion;
const base =
  "/Volumes/t7 blck bad/MontageFrames/skyclass-poziom-1/przejscie-happy-plane";
const out = travel
  ? `${base}/fusion-b-podroze`
  : fusionA
    ? `${base}/fusion-a-orbit`
    : fusionB
      ? `${base}/fusion-b-ribbon`
      : cleanA
        ? `${base}/propozycja-a-biala`
        : cleanB
          ? `${base}/propozycja-b-niebieska`
          : v2
            ? `${base}/v2-kacper-bisanz`
            : base;
const work = `${out}/robocze`;
process.env.TMPDIR = `${work}/tmp`;
fs.mkdirSync(`${work}/tmp`, { recursive: true });
const cmd = process.argv[2] ?? "qa";
const movie = `${out}/${travel ? "kacper-bisanz-b-podroze-2_5s" : fusionA ? "kacper-bisanz-fusion-a-orbit-2_5s" : fusionB ? "kacper-bisanz-fusion-b-ribbon-2_5s" : cleanA ? "kacper-bisanz-a-biale-2_5s" : cleanB ? "kacper-bisanz-b-niebieskie-2_5s" : v2 ? "kacper-bisanz-przejscie-v2-2_5s" : "happy-plane-przejscie-2_5s"}.mov`;
const probe = (p) =>
  JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name,profile,codec_type,width,height,r_frame_rate,pix_fmt,nb_frames,channels,sample_rate",
        "-of",
        "json",
        p,
      ],
      { encoding: "utf8" },
    ),
  );

if (cmd === "audio") {
  const source = path.resolve("public/longform-pack/subskrypcje/sfx-src");
  // Łagodne, krótkie whooshe; bez dodatkowej muzyki i bez przesterowania.
  const tmp = `${work}/with-audio.mov`;
  const intro =
    "[1:a]atrim=duration=1.1,asetpts=PTS-STARTPTS,volume=0.05,afade=t=in:d=0.03,afade=t=out:st=0.75:d=0.35,adelay=60:all=1[a];";
  const outro =
    "[2:a]atrim=duration=0.9,asetpts=PTS-STARTPTS,volume=0.16,afade=t=in:d=0.025,afade=t=out:st=0.55:d=0.35,adelay=1550:all=1[b];";
  const accent = v2
    ? "[3:a]atrim=duration=0.8,asetpts=PTS-STARTPTS,volume=0.04,afade=t=in:d=0.01,afade=t=out:st=0.55:d=0.25,adelay=180:all=1[c];"
    : "";
  const mix = `${intro}${outro}${accent}${v2 ? "[a][b][c]amix=inputs=3" : "[a][b]amix=inputs=2"}:normalize=0,alimiter=limit=0.18:level=0,apad=whole_dur=2.5,atrim=duration=2.5[mix]`;

  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    movie,
    "-i",
    `${source}/whoosh.wav`,
    "-i",
    `${source}/whoosh2.wav`,
    ...(v2 ? ["-i", `${source}/pop.wav`] : []),
    "-filter_complex",
    mix,
    "-map",
    "0:v:0",
    "-map",
    "[mix]",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-c:v",
    "copy",
    "-c:a",
    "pcm_s16le",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-t",
    "2.5",
    tmp,
  ]);
  fs.renameSync(tmp, movie);
  console.log("MOV z whooshami:", movie);
} else if (cmd === "preview") {
  const source = "/Volumes/t7 blck bad/skyclass poziom_1.mp4";
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    "350",
    "-i",
    source,
    "-i",
    movie,
    "-filter_complex",
    "[0:v]scale=1280:720,fps=50[b];[1:v]scale=1280:720,format=rgba[o];[b][o]overlay=shortest=1:format=auto,format=yuv420p[v]",
    "-map",
    "[v]",
    "-map",
    "1:a:0",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-c:v",
    "libx264",
    "-crf",
    "18",
    "-preset",
    "fast",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    "2.5",
    "-movflags",
    "+faststart",
    `${out}/podglad-na-filmie.mp4`,
  ]);
  console.log("Podgląd:", `${out}/podglad-na-filmie.mp4`);
} else if (cmd === "verify") {
  const d = probe(movie),
    v = d.streams.find((s) => s.codec_type === "video"),
    a = d.streams.find((s) => s.codec_type === "audio");
  if (
    v.codec_name !== "prores" ||
    v.profile !== "4444" ||
    v.width !== 3840 ||
    v.height !== 2160 ||
    v.r_frame_rate !== "50/1" ||
    Number(v.nb_frames) !== 125 ||
    Number(d.format.duration) !== 2.5 ||
    a?.codec_name !== "pcm_s16le"
  )
    throw Error("Nieprawidłowy master");
  fs.writeFileSync(
    `${out}/kontrola.json`,
    JSON.stringify(
      {
        status: "pass",
        duration: 2.5,
        frames: 125,
        width: 3840,
        height: 2160,
        fps: 50,
        video: v,
        audio: a,
        sourceAsset: "/Users/wskopek/Downloads/happy-plane-D-Gc4Z6i.png",
        ...(clean
          ? {
              renderedAsset: path.resolve(
                "public/longform-pack/happy-plane-transition/happy-plane-right.png",
              ),
              assetPreparation:
                "Nowy widok w prawo na podstawie dostarczonej referencji; bez odbicia logotypów",
            }
          : {}),
        type: travel
          ? "Wersja B: okno samolotu z krajobrazem Dolomitów; pozostała choreografia Fusion B"
          : clean
            ? fusion
              ? "Przestrzenne wejście prawa-lewa, dwuwierszowy biały Inter 700, gradientowa rzeźba, wyjście samolotu lewa-prawa"
              : "Dwa przeloty lewa-prawa, Inter 700 w naturalnych proporcjach, czysta plansza"
            : v2
              ? "KACPER BISANZ: duża typografia 3D, wjeżdżające bryły i szybki przelot"
              : "Dostarczony render samolotu animowany w perspektywie + geometryczne obręcze 3D",
        ...(clean
          ? {
              onScreenText: "Kacper Bisanz",
              font: "Inter 700",
              variant: travel
                ? "B — podróże, okno i Dolomity"
                : fusionA
                  ? "Fusion A — Orbit"
                  : fusionB
                    ? "Fusion B — Ribbon"
                    : cleanA
                      ? "A — biała plansza, czarny tytuł"
                      : "B — niebieska plansza, biały tytuł",
              planeFacing: fusion ? "opening left; departure right" : "right",
              ...(fusion
                ? {
                    slogan: fusionA
                      ? "Więcej możliwości."
                      : "Działaj po swojemu.",
                    sloganType: "autorska propozycja; nie oficjalne motto",
                  }
                : {}),
              flights: 2,
            }
          : v2
            ? {
                onScreenText: "KACPER BISANZ",
                font: "Inter 900",
                arrivalBezier: [0.16, 1, 0.3, 1],
                exitBezier: [0.7, 0, 0.84, 0.3],
              }
            : {}),
        premiereImportTested: false,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    `${out}/README.md`,
    [
      clean
        ? `# Kacper Bisanz — ${travel ? "B — podróże, okno samolotu" : fusionA ? "Fusion A, Orbit" : fusionB ? "Fusion B, Ribbon" : cleanA ? "A, biała" : "B, niebieska"}, 2,5 sekundy`
        : v2
          ? "# Kacper Bisanz — przejście v2, 2,5 sekundy"
          : "# Happy Plane — przejście 2,5 sekundy",
      "",
      `Master: ${path.basename(movie)} — 3840×2160, 50 kl./s, 125 klatek, ProRes 4444 z alfą i SFX. Nie wymaga kluczowania tła.`,
      "",
      "Premiere: wstaw klip na ścieżkę nad filmem. Początek i koniec są przezroczyste; środek zakrywa film niebiesko-białą formą. Cięcie pomiędzy fragmentami umieść w środku przejścia, około 1,25 s od początku klipu. Dźwięk jest wbudowany i można go odłączyć lub wyciszyć.",
      "",
      "Master 50 kl./s zapewnia dokładne 2,500 s. Na osi 25 kl./s pół klatki nie istnieje: Premiere może dopasować długość do 2,48 lub 2,52 s. Nie wymaga to zmiany szybkości klipu.",
      "",
      "podglad-na-filmie.mp4 pokazuje zastosowanie na fragmencie źródła. Tylko MOV zawiera kanał alfa. Film źródłowy i wcześniejsze 45 animacji nie były modyfikowane.",
      "",
      clean
        ? (travel
            ? "Nowa wersja B: satynową wstęgę zastępuje niebieskie przestrzenne okno z krajobrazem Dolomitów używanym na bisanz.pl. Pozostałe elementy, czasy i typografia jak w zaakceptowanej Fusion B. "
            : "") +
          "Branding: Inter 700 (naturalne proporcje), biel, #141414 i #066FED. Samolot odsłania planszę i nazwę, następnie przelot z lewej na prawą odsłania film. W Fusion wejście jest przestrzenne z prawej na lewą, nawiązując do pierwszego przejścia; dwa wiersze białej typografii, podkreślenie i niebieska przestrzenna oprawa zastępują płaski trójkąt. Tekst uzupełniający to propozycja, nie potwierdzone motto kanału. Nowy widok samolotu przygotowano z dostarczonego modelu referencyjnego; logotypy nie są odwrócone. Wcześniejsze wersje pozostają zachowane. Import w Premiere nie był wykonywany."
        : v2
          ? "Duża typografia KACPER BISANZ (Inter 900), przestrzenne bryły i szybki przelot dostarczonego samolotu. Wejścia: cubic-bezier(.16,1,.30,1), następnie ciągły dryf kamery i przyspieszone wyjście. SFX: whoosh, akcent przy wejściu typografii i whoosh wyjścia. Wersja 1 i poprzednie animacje zostały zachowane. Import w Premiere nie był wykonywany."
          : "Grafika samolotu pochodzi od użytkowniczki; nie odwracano logotypów. Plik jest gotowym renderem samolotu animowanym w perspektywie, a obręcze mają generowaną geometrię 3D. SFX z wcześniejszej biblioteki klienta. Import w Premiere nie był wykonywany.",
    ].join("\n"),
  );
  console.log("PASS 125 klatek, 2,5 s, 4K, alfa, PCM");
} else {
  const url = await bundle({
    entryPoint: path.resolve(
      travel
        ? "src/pack/BisanzTravel.tsx"
        : fusionA
          ? "src/pack/BisanzFusionA.tsx"
          : fusionB
            ? "src/pack/BisanzFusionB.tsx"
            : cleanA
              ? "src/pack/BisanzCleanWhite.tsx"
              : cleanB
                ? "src/pack/BisanzCleanBlue.tsx"
                : v2
                  ? "src/pack/HappyPlaneTypography.tsx"
                  : "src/pack/HappyPlaneTransition.tsx",
    ),
    publicDir: path.resolve("public/longform-pack"),
    outDir: `${work}/bundle-${cmd}-${process.pid}`,
    enableCaching: false,
  });
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const composition = await selectComposition({
      serveUrl: url,
      id: "HappyPlaneTransition",
      puppeteerInstance: browser,
    });
    if (cmd === "qa") {
      fs.mkdirSync(`${work}/qa`, { recursive: true });
      const frames = [0, 12, 24, 36, 48, 62, 76, 88, 100, 110, 118, 124];
      for (const [i, frame] of frames.entries()) {
        const p = `${work}/qa/${String(i).padStart(3, "0")}.png`;
        await renderStill({
          composition,
          serveUrl: url,
          output: p,
          frame,
          imageFormat: "png",
          scale: 0.5,
          puppeteerInstance: browser,
          logLevel: "error",
        });
        execFileSync("ffmpeg", [
          "-v",
          "error",
          "-y",
          "-i",
          p,
          "-f",
          "lavfi",
          "-i",
          "nullsrc=s=960x540,geq=lum='if(mod(floor(X/48)+floor(Y/48),2),205,232)':cb=128:cr=128",
          "-filter_complex",
          "[1:v][0:v]overlay",
          "-frames:v",
          "1",
          `${work}/qa/check-${String(i).padStart(3, "0")}.jpg`,
        ]);
      }
      // Podglądy na szachownicy uwidaczniają prawdziwy kanał alfa.
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-framerate",
        "1",
        "-i",
        `${work}/qa/check-%03d.jpg`,
        "-vf",
        "scale=480:270,tile=4x3",
        "-frames:v",
        "1",
        `${out}/arkusz-przejscia.jpg`,
      ]);
      console.log("Arkusz:", `${out}/arkusz-przejscia.jpg`);
    } else if (cmd === "render") {
      await renderMedia({
        composition,
        serveUrl: url,
        outputLocation: movie,
        puppeteerInstance: browser,
        scale: 2,
        codec: "prores",
        proResProfile: "4444",
        pixelFormat: "yuva444p10le",
        imageFormat: "png",
        enforceAudioTrack: true,
        audioCodec: "pcm-16",
        concurrency: 2,
        colorSpace: "bt709",
        logLevel: "error",
      });
      console.log("Render:", movie);
    } else throw Error("qa | render | audio | preview | verify");
  } finally {
    await browser.close({ silent: true });
  }
}
