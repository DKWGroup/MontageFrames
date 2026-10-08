import { useEffect, useState, type ReactElement } from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  type SequenceProps,
} from "remotion";
import { overlayLabel } from "./timeline-labels";
import { captionClips, reelFrames, toOut } from "./reel-timing";
export { keptWords, reelFrames, toOut } from "./reel-timing";
import { TimelineSequence } from "./TimelineSequence";
import { loadFonts } from "./fonts";
import { atBottom, Overlay, OverlayView } from "./overlays";
import { SkyClass } from "./styles/skyclass";
import { SkyClassOverlay } from "./skyclass-overlays";
import { Persona } from "./styles/persona";
import { Herod, HerodOverlay } from "./styles/herod";
import { Bisanz, BisanzOverlay } from "./styles/bisanz";
import { Ameryka, AmerykaOverlay } from "./styles/ameryka";

// Czasy w reel.json są w sekundach ŹRÓDŁA (surowego nagrania).
export type Word = { text: string; start: number; end: number };
export type Dir = "left" | "right" | "top" | "bottom";
export type CaptionGroup = {
  lineBreak?: number; // Liczba słów pierwszej linii w stylu Herod.
  end?: number;
  effect?: "stamp";
  words: Word[];
  key?: number; // indeks słowa-klucza (duże); -1 = bez klucza, same małe słowa
  from?: Dir; // skąd wjeżdża grupa
  align?: "left" | "center" | "right";
  color?: string; // kolor słowa-klucza dla tej grupy
  layout?: "stack" | "inline"; // układ słów na ekranie (zwarty, wycentrowany)
  hl?: number[]; // indeksy słów w kolorze akcentu
};
// zoom = skala kadru; zoomTo = powolny najazd do tej skali w trakcie ujęcia
export type Segment = {
  start: number;
  end: number;
  zoom?: number;
  zoomTo?: number;
};
export type ReelData = {
  source: string;
  style: string;
  client?: string; // folder w klienci/ — render trafia do klienci/<client>/Render
  fps?: number;
  segments: Segment[]; // fragmenty źródła, które zostają (reszta wycięta)
  captions: CaptionGroup[];
  studio?: Record<string, Partial<SequenceProps>>; // trwałe ustawienia bloków z inspektora
  overlays?: Overlay[]; // grafiki: wykresy, liczniki, listy, tytuły... (src/overlays.tsx)
};

// Napisy dostają słowa z czasem `at` = sekundy od początku grupy na osi wyjściowej.
export type StyleProps = {
  group: CaptionGroup;
  words: (Word & { at: number; key: boolean; hl: boolean })[];
  durationInFrames: number;
  raised: boolean; // na dole jest grafika -> napis wyżej, nad nią
};

const STYLES: Record<string, React.FC<StyleProps>> = {
  persona: Persona,
  skyclass: SkyClass,
  herod: Herod,
  bisanz: Bisanz,
  ameryka: Ameryka,
};

export type ReelProps = {
  reel: string;
  data?: ReelData;
  timeline?: Record<string, ReactElement<SequenceProps>>;
};

export const calculateReelMetadata: CalculateMetadataFunction<
  ReelProps
> = async ({ props }) => {
  const data: ReelData = await fetch(
    staticFile(`reels/${props.reel}/reel.json`),
  ).then((r) => r.json());
  return {
    fps: data.fps ?? 30,
    durationInFrames: reelFrames(data),
    props: { ...props, data },
  };
};

const SourceShot: React.FC<{
  reel: string;
  source: string;
  s: Segment;
  fps: number;
  dur: number;
  muted: boolean;
}> = ({ reel, source, s, fps, dur, muted }) => {
  const localFrame = useCurrentFrame();
  return (
    <OffthreadVideo
      src={staticFile(`reels/${reel}/${source}`)}
      trimBefore={Math.round(s.start * fps)}
      volume={
        muted
          ? 0
          : dur < 3
            ? 1
            : (f) =>
                interpolate(f, [0, 1, dur - 1, dur], [0, 1, 1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
      }
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${interpolate(localFrame, [0, dur], [s.zoom ?? 1, s.zoomTo ?? s.zoom ?? 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
      }}
    />
  );
};

export const Reel: React.FC<ReelProps> = ({ reel, data, timeline }) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("fonty"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [handle, continueRender, cancelRender]);

  if (!data) return null;
  const fps = data.fps ?? 30;
  const { segments } = data;
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
            : OverlayView;
  const bottom = (data.overlays ?? []).filter(atBottom);

  return (
    <AbsoluteFill showInTimeline={false} style={{ backgroundColor: "black" }}>
      {data.style === "skyclass" && (
        <Audio
          name="Dźwięk · pełne nagranie"
          src={staticFile(`reels/${reel}/${data.source}`)}
        />
      )}
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
              s={s}
              fps={fps}
              dur={clipDuration(`s${i}`, dur)}
              muted={data.style === "skyclass"}
            />
          </TimelineSequence>
        );
      })}
      {(data.overlays ?? []).map((o, i) => {
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
            {ready && (
              <OverlayComponent
                o={o}
                dur={clipDuration(`o${i}`, dur)}
                src={(file) => staticFile(`reels/${reel}/${file}`)}
                at={(t) => toOut(t, segments) - toOut(o.start, segments)}
              />
            )}
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
                  group={g}
                  words={words.map((w) => ({
                    ...w,
                    at: toOut(w.start, segments) - start,
                    key: w === g.words[g.key ?? 0],
                    hl: g.hl?.includes(g.words.indexOf(w)) ?? false,
                  }))}
                  durationInFrames={clipDuration(`c${index}`, dur)}
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
