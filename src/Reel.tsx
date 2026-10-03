import { useEffect, useState } from "react";
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
} from "remotion";
import { loadFonts } from "./fonts";
import { atBottom, Overlay, OverlayView } from "./overlays";
import { SkyClass } from "./styles/skyclass";
import { SkyClassOverlay } from "./skyclass-overlays";
import { Persona } from "./styles/persona";
import { Herod, HerodOverlay } from "./styles/herod";

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
  fps?: number;
  segments: Segment[]; // fragmenty źródła, które zostają (reszta wycięta)
  captions: CaptionGroup[];
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
};

type Props = { reel: string; data?: ReelData };

const kept = (s: Segment) => s.end - s.start;

// Czas źródła -> czas po montażu. Czas wewnątrz wyciętego fragmentu przykleja się do miejsca cięcia.
const toOut = (t: number, segments: Segment[]) => {
  let acc = 0;
  for (const s of segments) {
    if (t < s.start) return acc;
    if (t <= s.end) return acc + t - s.start;
    acc += kept(s);
  }
  return acc;
};

export const calculateReelMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const data: ReelData = await fetch(
    staticFile(`reels/${props.reel}/reel.json`),
  ).then((r) => r.json());
  const fps = data.fps ?? 30;
  const total = data.segments.reduce((n, s) => n + kept(s), 0);
  return {
    fps,
    durationInFrames: Math.max(1, Math.round(total * fps)),
    props: { ...props, data },
  };
};

export const Reel: React.FC<Props> = ({ reel, data }) => {
  const now = useCurrentFrame();
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
  const frame = (t: number) => Math.round(toOut(t, segments) * fps);
  const Style = STYLES[data.style] ?? Persona;

  const OverlayComponent =
    data.style === "skyclass" ? SkyClassOverlay : data.style === "herod" ? HerodOverlay : OverlayView;
  const bottom = (data.overlays ?? []).filter(atBottom);

  // Słowo zostaje, jeśli zaczyna się w zachowanym fragmencie (ASR startuje słowa do ~0.2 s za wcześnie) — wycięty dubel znika razem z napisem.
  const visible = data.captions
    .map((g) => ({
      g,
      words: g.words.filter((w) =>
        segments.some((s) => w.start >= s.start - 0.25 && w.start < s.end),
      ),
    }))
    .filter((c) => c.words.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {data.style === "skyclass" && (
        <Audio src={staticFile(`reels/${reel}/${data.source}`)} />
      )}
      {segments.map((s, i) => {
        const from = frame(s.start);
        const dur =
          (i + 1 < segments.length
            ? frame(segments[i + 1].start)
            : Math.round(toOut(Infinity, segments) * fps)) - from;
        if (dur <= 2) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <OffthreadVideo
              src={staticFile(`reels/${reel}/${data.source}`)}
              trimBefore={Math.round(s.start * fps)}
              // 1 klatka wyciszenia na krawędziach cięcia = brak trzasków
              volume={
                data.style === "skyclass"
                  ? 0
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
                transform: `scale(${interpolate(now - from, [0, dur], [s.zoom ?? 1, s.zoomTo ?? s.zoom ?? 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
              }}
            />
          </Sequence>
        );
      })}
      {ready &&
        (data.overlays ?? []).map((o, i) => {
          const from = frame(o.start);
          const dur = frame(o.end) - from;
          if (dur < 2) return null;
          return (
            <Sequence
              key={`o${i}`}
              from={from}
              durationInFrames={dur}
              layout="none"
            >
              <OverlayComponent
                o={o}
                dur={dur}
                src={(file) => staticFile(`reels/${reel}/${file}`)}
                at={(t) => toOut(t, segments) - toOut(o.start, segments)}
              />
            </Sequence>
          );
        })}
      {ready &&
        visible.map(({ g, words }, i) => {
          const start = toOut(words[0].start, segments);
          const next = visible[i + 1];
          const end = Math.min(
            g.end == null ? Infinity : toOut(g.end, segments),
            next ? toOut(next.words[0].start, segments) : Infinity,
            Math.max(
              toOut(words[words.length - 1].end, segments) + 1,
              start + 0.8,
            ),
          );
          const from = Math.round(start * fps);
          const dur = Math.round(end * fps) - from;
          if (dur < 1) return null;
          return (
            <Sequence key={i} from={from} durationInFrames={dur} layout="none">
              <Style
                group={g}
                words={words.map((w) => ({
                  ...w,
                  at: toOut(w.start, segments) - start,
                  key: w === g.words[g.key ?? 0],
                  hl: g.hl?.includes(g.words.indexOf(w)) ?? false,
                }))}
                durationInFrames={dur}
                raised={bottom.some(
                  (o) =>
                    toOut(o.start, segments) < end &&
                    toOut(o.end, segments) > start,
                )}
              />
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
};
