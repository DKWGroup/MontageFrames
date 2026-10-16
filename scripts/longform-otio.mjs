// reel.json → OpenTimelineIO (.otio, JSON) do importu w Premiere Pro (≥ 25.6): tor wideo i audio, klip na segment.
// Wyciszenia cenzury: audio renderuje FFmpeg (censoredAudioArgs) i to ono trafia do toru audio.
// ponytail: Clip.1 (najszerzej czytany); markery rozdziałów dojdą razem z rozdziałami w L3; kruk w WAV, gdy będzie plik SFX.
import { pathToFileURL } from "node:url";

const time = (value, rate) => ({ OTIO_SCHEMA: "RationalTime.1", rate, value });

const clip = (name, url, startFrame, frames, rate) => ({
  OTIO_SCHEMA: "Clip.1",
  name,
  metadata: {},
  enabled: true,
  effects: [],
  markers: [],
  source_range: { OTIO_SCHEMA: "TimeRange.1", start_time: time(startFrame, rate), duration: time(frames, rate) },
  media_reference: { OTIO_SCHEMA: "ExternalReference.1", target_url: url, available_range: null, metadata: {} },
});

export function toOtio(reel, { mediaPath, audioPath = mediaPath, name = "LongForm", fps = reel.fps ?? 30 }) {
  const video = pathToFileURL(mediaPath).href;
  const audio = pathToFileURL(audioPath).href;
  // Klatki liczone od zaokrąglonych granic — suma długości = długość osi bez dryfu.
  const ranges = reel.segments.map((s) => {
    const a = Math.round(s.start * fps);
    return [a, Math.round(s.end * fps) - a];
  });
  const track = (kind, url) => ({
    OTIO_SCHEMA: "Track.1",
    name: kind === "Video" ? "V1" : "A1",
    kind,
    metadata: {},
    effects: [],
    markers: [],
    source_range: null,
    children: ranges.map(([a, n], i) => clip(`${name} ${i + 1}`, url, a, n, fps)),
  });
  return {
    OTIO_SCHEMA: "Timeline.1",
    name,
    metadata: { montageframes: { format: reel.format ?? null } },
    global_start_time: time(0, fps),
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      name: "tracks",
      metadata: {},
      effects: [],
      markers: [],
      source_range: null,
      children: [track("Video", video), track("Audio", audio)],
    },
  };
}

export const censoredAudioArgs = (src, mutes, out) => [
  "-hide_banner", "-v", "error", "-y", "-i", src, "-vn",
  "-af", mutes.map((m) => `volume=enable='between(t,${m.start},${m.end})':volume=0`).join(","),
  "-c:a", "pcm_s24le", out,
];
