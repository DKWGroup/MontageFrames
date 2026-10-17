import {
  HappyNewsSource,
  HappyNewsCredit,
} from "./quickcontent/HappyNewsSource";
import { happyCaptionY, happyHookY, layoutAt } from "./quickcontent/layout.mjs";
import { captionEmojis } from "./caption-decoration.mjs";
import { trackingPosition, cameraScale } from "./quickcontent/framing.mjs";
import type { Framing } from "./quickcontent/framing.mjs";
import { useEffect, useState, type ReactElement } from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  type SequenceProps,
} from "remotion";
import { overlayLabel } from "./timeline-labels";
import { captionClips, censorWord, muteGain, reelDimensions, reelFrames, toOut, zoomThroughAt, type Mute } from "./reel-timing";
import { isLongFormEffect, LongFormEffect, SourceTag } from "./longform/effects";
import { isMaskEffect, maskBgFilter, MaskLayers, maskScales } from "./longform/mask";
export { keptWords, reelFrames, toOut } from "./reel-timing";
import { TimelineSequence } from "./TimelineSequence";
import { loadFonts } from "./fonts";
import type { BrandingSnapshot } from "./branding/types";
import { loadBrandFonts } from "./branding/fonts";
import { BrandLogo } from "./branding/BrandLogo";
import { Brand } from "./styles/brand";
import { atBottom, Overlay, OverlayView } from "./overlays";
import { SkyClass } from "./styles/skyclass";
import { SkyClassOverlay } from "./skyclass-overlays";
import { Persona } from "./styles/persona";
import { Herod, HerodOverlay } from "./styles/herod";
import { Bisanz, BisanzOverlay } from "./styles/bisanz";
import { Ameryka, AmerykaOverlay } from "./styles/ameryka";
import { Glowup, GlowupOverlay } from "./styles/glowup";
import { HappyNews, HappyNewsOverlay } from "./styles/happynews";
import { Vital, VitalOverlay } from "./styles/vital";

// Czasy w reel.json są w sekundach ŹRÓDŁA (surowego nagrania).
export type Word = { text: string; start: number; end: number };
export type Dir = "left" | "right" | "top" | "bottom";
export type CaptionGroup = {
  lineBreak?: number; // Liczba słów pierwszej linii w stylu Herod.
  end?: number;
  effect?: "stamp";
  words: Word[];
  key?: number; // indeks słowa-klucza (duże); -1 = bez klucza, same małe słowa
  hidden?: boolean; // LongForm: napis poza wstępem bez powodu (PREFERENCJE 2026-10-17) — zostaje w danych, nie renderuje się
  from?: Dir; // skąd wjeżdża grupa
  align?: "left" | "center" | "right";
  color?: string; // kolor słowa-klucza dla tej grupy
  layout?: "stack" | "inline"; // układ słów na ekranie (zwarty, wycentrowany)
  hl?: number[]; // indeksy słów w kolorze akcentu
  motion?:
    | "rise"
    | "drop"
    | "slide"
    | "pop"
    | "letters"
    | "color"
    | "bounce"
    | "wiggle"; // wejście słów (silnik bisanz), domyślnie rise
  y?: number; // środek bloku (ułamek wysokości), np. omijanie tekstu wypalonego w nagraniu
};
// zoom = skala kadru; zoomTo = powolny najazd do tej skali w trakcie ujęcia
export type Segment = {
  start: number;
  end: number;
  zoom?: number;
  zoomTo?: number;
};
export type ReelData = {
  branding?: BrandingSnapshot;
  source: string;
  outputResolution?: 720 | 1080 | 2160;
  framingNote?: string;
  style: string;
  client?: string; // folder w klienci/ — render trafia do klienci/<client>/Render
  fps?: number;
  segments: Segment[]; // fragmenty źródła, które zostają (reszta wycięta)
  captions: CaptionGroup[];
  studio?: Record<string, Partial<SequenceProps>>; // trwałe ustawienia bloków z inspektora
  hold?: number; // s: min. czas ostatniego słowa grupy na ekranie przed wjazdem następnej (glowup 0,7)
  overlays?: Overlay[]; // grafiki: wykresy, liczniki, listy, tytuły... (src/overlays.tsx)
  face?: { bottom: number }; // dolna krawędź twarzy (ułamek kadru źródła, sprawdzona na klatkach) — napisy stoją niżej
  framing?: Framing;
  format?: { width: number; height: number }; // LongForm: np. 1920×1080; brak = pion 1080×1920
  mutes?: Mute[]; // LongForm: cenzura — wyciszenia w czasie źródła + SFX z public/sfx/index.json
};

// Wpis public/sfx/index.json; rmsDb = zmierzony poziom pliku (do miksu −10 dB względem wypowiedzi).
type Sfx = { id: string; file: string; license: string; source: string; rmsDb?: number };

// Napisy dostają słowa z czasem `at` = sekundy od początku grupy na osi wyjściowej.
export type StyleProps = {
  branding?: BrandingSnapshot;
  group: CaptionGroup;
  words: (Word & {
    at: number;
    key: boolean;
    hl: boolean;
    emoji?: string | null;
  })[];
  durationInFrames: number;
  raised: boolean; // na dole jest grafika -> napis wyżej, nad nią
  minTop?: number; // najwyższa dozwolona górna krawędź napisu (pod twarzą, po zoomie ujęcia)
};

const STYLES: Record<string, React.FC<StyleProps>> = {
  brand: Brand,
  persona: Persona,
  skyclass: SkyClass,
  herod: Herod,
  bisanz: Bisanz,
  ameryka: Ameryka,
  glowup: Glowup,
  happynews: HappyNews,
  vital: Vital,
};

export type ReelProps = {
  reel: string;
  data?: ReelData;
  timeline?: Record<string, ReactElement<SequenceProps>>;
  sfx?: Sfx[];
};

// Rejestr SFX dla wyciszeń. Brak pliku nie blokuje renderu: wyciszenie działa samo (ostrzeżenie w logu).
export async function loadSfx(data: ReelData): Promise<Sfx[]> {
  const sfx: Sfx[] = data.mutes?.some((m) => m.sfx)
    ? await fetch(staticFile("sfx/index.json"))
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    : [];
  for (const id of new Set((data.mutes ?? []).map((m) => m.sfx).filter(Boolean)))
    if (!sfx.some((x) => x.id === id))
      console.warn(`Brak SFX „${id}” w public/sfx/index.json — cenzura bez dźwięku.`);
  return sfx;
}

export const calculateReelMetadata: CalculateMetadataFunction<
  ReelProps
> = async ({ props }) => {
  const data: ReelData = await fetch(
    staticFile(`reels/${props.reel}/reel.json`),
  ).then((r) => r.json());
  const sfx = await loadSfx(data);
  return {
    fps: data.fps ?? 30,
    durationInFrames: reelFrames(data),
    ...reelDimensions(data),
    props: { ...props, data, sfx },
  };
};

const SourceShot: React.FC<{
  reel: string;
  source: string;
  s: Segment;
  fps: number;
  dur: number;
  muted: boolean;
  framing?: ReelData["framing"];
  styleId?: string;
  mutes?: Mute[];
  zoomThrough?: { start: number }[];
  maskFx?: Overlay[];
}> = ({ reel, source, s, fps, dur, muted, framing, styleId, mutes, zoomThrough, maskFx }) => {
  const localFrame = useCurrentFrame();
  const zt = zoomThroughAt(s.start + localFrame / fps, zoomThrough);
  const t = s.start + localFrame / fps;
  const fx = maskFx?.find((o) => t >= o.start && t < o.end);
  const fxScale = maskScales(fx, t);
  const position = trackingPosition(framing, s.start + localFrame / fps);
  if (
    styleId === "happynews" &&
    framing &&
    layoutAt(framing, s.start + localFrame / fps)
  )
    return (
      <HappyNewsSource
        reel={reel}
        source={source}
        segment={s}
        fps={fps}
        framing={framing}
      />
    );
  const fit = framing?.mode === "fit" || position.fit;
  const adaptiveScale = styleId === "bisanz" ? 1 : (position.scale ?? 1);
  // geometria ujęcia — tę samą dostaje wycięta osoba (L4), żeby pokrywała się z oryginałem co do piksela
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: fit ? "contain" : "cover",
    objectPosition: `${position.centerX * 100}% ${position.centerY * 100}%`,
    transformOrigin: styleId !== "bisanz" && position.scale !== undefined ? "50% 25%" : undefined,
    transform: `scale(${cameraScale(styleId, s, fit ? 1 : adaptiveScale, localFrame / dur) * zt.scale})`,
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {(fit || adaptiveScale < 1) && (
        <OffthreadVideo
          src={staticFile(`reels/${reel}/${source}`)}
          trimBefore={Math.round(s.start * fps)}
          muted
          toneMapped={false}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(32px) brightness(0.45)",
            transform: "scale(1.12)",
          }}
        />
      )}
      <OffthreadVideo
        src={staticFile(`reels/${reel}/${source}`)}
        trimBefore={Math.round(s.start * fps)}
        // materiał SDR: bez tone mappingu dekoder nie przelicza kolorów każdej klatki (szybszy render)
        toneMapped={false}
        volume={
          muted
            ? 0
            : (f) =>
                (dur < 3
                  ? 1
                  : interpolate(f, [0, 1, dur - 1, dur], [0, 1, 1, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })) *
                // ponytail: głośność liczona per klatka (±1/fps); dokładna rampa w audio z FFmpeg przy eksporcie OTIO
                muteGain((Math.round(s.start * fps) + f) / fps, mutes)
        }
        style={{
          ...videoStyle,
          transform: `${videoStyle.transform} scale(${fxScale.bg})`,
          filter: [zt.blur ? `blur(${zt.blur}px)` : "", maskBgFilter(fx, t) ?? ""].join(" ").trim() || undefined,
        }}
      />
      {fx && (
        <MaskLayers o={fx} t={t} reel={reel} shotStart={s.start} fps={fps} videoStyle={videoStyle} personScale={fxScale.person} styleId={styleId} />
      )}
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = ({ reel, data, timeline, sfx }) => {
  const currentFrame = useCurrentFrame();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [ready, setReady] = useState(false);
  const brandFonts = data?.branding?.fonts;
  useEffect(() => {
    let active = true;
    setReady(false);
    const handle = delayRender("fonty");
    Promise.all([loadFonts(), loadBrandFonts(brandFonts ? {fonts:brandFonts} : undefined)])
      .then(() => {
        if (active) setReady(true);
        continueRender(handle);
      })
      .catch((e) => { if (active) cancelRender(e); else continueRender(handle); });
    return () => { active = false; };
    // Loading is keyed by the exact manifest; other draft edits need no font reload.
  }, [brandFonts, delayRender, continueRender, cancelRender]);

  if (!data) return null;
  const fps = data.fps ?? 30;
  const { segments } = data;
  let elapsed = 0;
  let sourceTime = segments[segments.length - 1]?.end ?? 0;
  for (const segment of segments) {
    const length = segment.end - segment.start;
    if (currentFrame / fps < elapsed + length) {
      sourceTime = segment.start + currentFrame / fps - elapsed;
      break;
    }
    elapsed += length;
  }
  const newsLayout =
    data.style === "happynews" ? layoutAt(data.framing, sourceTime) : null;
  const clipDuration = (id: string, fallback: number) =>
    timeline?.[id]?.props.durationInFrames ??
    data.studio?.[id]?.durationInFrames ??
    fallback;
  const frame = (t: number) => Math.round(toOut(t, segments) * fps);
  const Style = STYLES[data.style] ?? Persona;

  const OverlayComponent =
    data.style === "skyclass"
      ? SkyClassOverlay
      : data.style === "herod"
        ? HerodOverlay
        : data.style === "bisanz"
          ? BisanzOverlay
          : data.style === "ameryka"
            ? AmerykaOverlay
            : data.style === "glowup"
              ? GlowupOverlay
              : data.style === "vital"
                ? VitalOverlay
                : data.style === "happynews"
                  ? HappyNewsOverlay
                  : OverlayView;
  const bottom = (data.overlays ?? []).filter((o) => atBottom(o) && !isLongFormEffect(o));
  const zoomThrough = (data.overlays ?? []).filter((o) => o.lf && o.type === "zoom-through");
  const maskFx = (data.overlays ?? []).filter(isMaskEffect);

  return (
    <AbsoluteFill showInTimeline={false} style={{ backgroundColor: "black" }}>
      {data.style === "skyclass" && (
        <Audio
          name="Dźwięk · pełne nagranie"
          src={staticFile(`reels/${reel}/${data.source}`)}
          volume={(f) => muteGain(f / fps, data.mutes)}
        />
      )}
      {(data.mutes ?? []).map((m, i) => {
        const file = sfx?.find((x) => x.id === m.sfx);
        if (!file || !segments.some((s) => m.start >= s.start && m.start < s.end)) return null;
        // SFX 10 dB pod poziomem wypowiedzi wokół słowa (PREFERENCJE.md → Efekty dźwiękowe)
        const volume =
          m.level != null && file.rmsDb != null
            ? Math.min(1, 10 ** ((m.level - file.rmsDb - 10) / 20))
            : 0.316;
        return (
          <Sequence
            key={`m${i}`}
            name={`Cenzura ${i + 1} · ${file.id}`}
            from={frame(m.start)}
            durationInFrames={Math.round((m.end - m.start + 0.6) * fps)}
            layout="none"
          >
            <Audio src={staticFile(`sfx/${file.file}`)} volume={volume} />
          </Sequence>
        );
      })}
      {segments.map((s, i) => {
        const from = frame(s.start);
        const dur =
          (i + 1 < segments.length
            ? frame(segments[i + 1].start)
            : Math.round(toOut(Infinity, segments) * fps)) - from;
        if (dur < 1) return null;
        return (
          <TimelineSequence
            name={`Ujęcie ${i + 1} · ${data.source}`}
            template={timeline?.[`s${i}`]}
            overrides={data.studio?.[`s${i}`]}
            key={`s${i}`}
            from={from}
            durationInFrames={dur}
          >
            <SourceShot
              reel={reel}
              source={data.source}
              framing={data.framing}
              styleId={data.client === "kacper-bisanz" ? "bisanz" : data.style}
              s={s}
              fps={fps}
              dur={clipDuration(`s${i}`, dur)}
              muted={data.style === "skyclass"}
              mutes={data.mutes}
              zoomThrough={zoomThrough}
              maskFx={maskFx}
            />
          </TimelineSequence>
        );
      })}
      {data.style === "happynews" && <HappyNewsCredit />}
      {data.style === "brand" && ready && <BrandLogo branding={data.branding} />}
      {(data.overlays ?? []).map((o, i) => {
        if (o.type === "emoji" && o.label === "word") return null;
        const from = frame(o.start);
        const dur = frame(o.end) - from;
        if (dur < 1) return null;
        return (
          <TimelineSequence
            name={`Grafika ${i + 1} · ${overlayLabel(o).kind}${overlayLabel(o).detail ? ` · ${overlayLabel(o).detail}` : ""}`}
            template={timeline?.[`o${i}`]}
            overrides={data.studio?.[`o${i}`]}
            key={`o${i}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            {ready &&
              (isLongFormEffect(o) ? (
                <LongFormEffect o={o} dur={clipDuration(`o${i}`, dur)} src={(file) => staticFile(`reels/${reel}/${file}`)} style={data.style} />
              ) : (
                <OverlayComponent
                  o={
                    data.style === "happynews" && o.type === "title"
                      ? { ...o, y: happyHookY(newsLayout?.kind, o.y) }
                      : o
                  }
                  dur={clipDuration(`o${i}`, dur)}
                  src={(file) => staticFile(`reels/${reel}/${file}`)}
                  at={(t) => toOut(t, segments) - toOut(o.start, segments)}
                />
              ))}
            {ready && o.lf && o.source && <SourceTag o={o} dur={clipDuration(`o${i}`, dur)} style={data.style} />}
          </TimelineSequence>
        );
      })}
      {captionClips(data).map(
        ({ g, index, words, start, end, from, durationInFrames: dur }) => {
          return (
            <TimelineSequence
              name={`Napis ${index + 1} · ${words.map((w) => w.text).join(" ")}`}
              template={timeline?.[`c${index}`]}
              overrides={data.studio?.[`c${index}`]}
              key={`c${index}`}
              from={from}
              durationInFrames={dur}
              layout="none"
            >
              {ready && (
                <Style
                  branding={data.branding}
                  group={
                    data.style === "happynews"
                      ? {...g, y: happyCaptionY(newsLayout?.kind, g.y)}
                      : g
                  }
                  words={words.map((w, wordIndex) => ({
                    ...w,
                    text: data.mutes?.some((m) => m.start >= w.start && m.start < w.end)
                      ? censorWord(w.text)
                      : w.text,
                    emoji: data.style === "happynews"
                      ? captionEmojis(words, data.overlays)[wordIndex]
                      : null,
                    at: toOut(w.start, segments) - start,
                    key: w === g.words[g.key ?? 0],
                    hl: g.hl?.includes(g.words.indexOf(w)) ?? false,
                  }))}
                  durationInFrames={clipDuration(`c${index}`, dur)}
                  // twarz nad środkiem kadru: zoom ujęcia tylko ją podnosi, więc wystarczy jej dolna krawędź + zapas
                  minTop={data.face && data.face.bottom + 0.02}
                  raised={bottom.some(
                    (o) =>
                      toOut(o.start, segments) < end &&
                      toOut(o.end, segments) > start,
                  )}
                />
              )}
            </TimelineSequence>
          );
        },
      )}
    </AbsoluteFill>
  );
};
