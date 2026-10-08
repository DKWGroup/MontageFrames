// Oś czasu pod podglądem: ujęcia, napisy i grafiki w czasie PO montażu (toOut), tak jak w renderze.
import type { PlayerRef } from "@remotion/player";
import { useEffect, useState, type RefObject } from "react";
import type { ReelData } from "../src/Reel";
import { captionClips, reelFrames, toOut } from "../src/reel-timing";
import { fmt } from "./api";

export type Clip = { start: number; end: number; index: number; label: string };
export type Lanes = {
  total: number;
  shots: Clip[];
  captions: (Clip & { words: { text: string; key: boolean }[] })[];
  overlays: Clip[];
};
export type Lane = "shots" | "captions" | "overlays";

export { overlayLabel } from "../src/timeline-labels";
import { overlayLabel } from "../src/timeline-labels";

export function lanesOf(data: ReelData): Lanes {
  const seg = data.segments;
  const shots = seg.map((s, index) => {
    const start = toOut(s.start, seg);
    const zoom = s.zoomTo
      ? `zoom ${s.zoom ?? 1} → ${s.zoomTo}`
      : (s.zoom ?? 1) !== 1
        ? `zoom ${s.zoom}`
        : "";
    return { start, end: start + s.end - s.start, index, label: zoom };
  });
  const captions = captionClips(data).map(
    ({ g, index, words, from, durationInFrames }) => {
      const key = g.words[g.key ?? 0];
      const fps = data.fps ?? 30;
      return {
        start: from / fps,
        end: (from + durationInFrames) / fps,
        index,
        label: words.map((w) => w.text).join(" "),
        words: words.map((w) => ({ text: w.text, key: w === key })),
      };
    },
  );
  const overlays = (data.overlays ?? []).map((o, index) => ({
    start: toOut(o.start, seg),
    end: toOut(o.end, seg),
    index,
    label: `${overlayLabel(o).kind} ${overlayLabel(o).detail}`.trim(),
  }));
  const edited = <T extends Clip>(clips: T[], prefix: string): T[] =>
    clips.map((clip) => {
      const edit = data.studio?.[`${prefix}${clip.index}`];
      const rate = data.fps ?? 30;
      const start = edit?.from == null ? clip.start : edit.from / rate;
      const duration =
        edit?.durationInFrames == null
          ? clip.end - clip.start
          : edit.durationInFrames / rate;
      return {
        ...clip,
        start,
        end: start + duration,
        label: edit?.name ?? clip.label,
      };
    });
  return {
    total: reelFrames(data) / (data.fps ?? 30),
    shots: edited(shots, "s"),
    captions: edited(captions, "c"),
    overlays: edited(overlays, "o"),
  };
}

type Props = {
  lanes: Lanes;
  fps: number;
  player: RefObject<PlayerRef | null>;
  focus: { lane: Lane; index: number } | null;
  onPick: (lane: Lane, index: number) => void;
};

export function Timeline({ lanes, fps, player, focus, onPick }: Props) {
  const seek = (sec: number) => player.current?.seekTo(Math.round(sec * fps));
  const pos = (c: Clip) => ({
    left: `${(100 * c.start) / lanes.total}%`,
    width: `${(100 * Math.max(c.end - c.start, 0.08)) / lanes.total}%`,
  });
  const seekAtPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * lanes.total);
  };
  const ticks = Array.from(
    { length: Math.floor(lanes.total / 5) + 1 },
    (_, i) => i * 5,
  );
  const clip = (
    lane: Lane,
    c: Clip,
    className: string,
    content: React.ReactNode,
  ) => (
    <button
      key={c.index}
      type="button"
      className={`clip ${className}${focus?.lane === lane && focus.index === c.index ? " focus" : ""}`}
      style={pos(c)}
      title={`${fmt(c.start)}–${fmt(c.end)} ${c.label}`}
      onClick={(e) => {
        e.stopPropagation();
        seek(c.start + 0.02);
        onPick(lane, c.index);
      }}
    >
      {content}
    </button>
  );

  return (
    <div className="timeline">
      <div className="lane-labels" aria-hidden="true">
        <span />
        <span>Ujęcia</span>
        <span>Napisy</span>
        <span>Grafiki</span>
      </div>
      <div className="tracks">
        <div className="ruler" onClick={seekAtPointer}>
          {ticks.map((t) => (
            <span key={t} style={{ left: `${(100 * t) / lanes.total}%` }}>
              {fmt(t).replace(/\.0$/, "")}
            </span>
          ))}
        </div>
        <div className="track" onClick={seekAtPointer} aria-label="Ujęcia">
          {lanes.shots.map((c) => clip("shots", c, "shot", c.label))}
        </div>
        <div
          className="track captions"
          onClick={seekAtPointer}
          aria-label="Napisy"
        >
          {lanes.captions.map((c) =>
            clip(
              "captions",
              c,
              "cap",
              c.words.map((w, i) => (
                <span key={i} className={w.key ? "k" : undefined}>
                  {w.text}{" "}
                </span>
              )),
            ),
          )}
        </div>
        <div className="track" onClick={seekAtPointer} aria-label="Grafiki">
          {lanes.overlays.map((c) => clip("overlays", c, "ov", c.label))}
        </div>
        <Playhead player={player} fps={fps} total={lanes.total} />
      </div>
    </div>
  );
}

// Osobny komponent: odświeża się 30 razy na sekundę, więc nie przerysowuje całych pasów.
function Playhead({
  player,
  fps,
  total,
}: {
  player: RefObject<PlayerRef | null>;
  fps: number;
  total: number;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const on = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    p.addEventListener("frameupdate", on);
    return () => p.removeEventListener("frameupdate", on);
  }, [player]);
  return (
    <div
      className="playhead"
      style={{ left: `${(100 * frame) / fps / total}%` }}
    >
      <span>{fmt(frame / fps)}</span>
    </div>
  );
}
