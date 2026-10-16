import assert from "node:assert/strict";
import { test } from "node:test";
import { censoredAudioArgs, toOtio } from "./longform-otio.mjs";

const reel = { fps: 25, segments: [{ start: 0, end: 2 }, { start: 3.5, end: 6.02 }, { start: 8, end: 10 }] };

test("OTIO: klip na segment, oba tory, suma = długość wyniku, oś od 0", () => {
  const t = toOtio(reel, { mediaPath: "/Users/x/a b/source.mp4", name: "wywiad" });
  assert.equal(t.OTIO_SCHEMA, "Timeline.1");
  assert.equal(t.global_start_time.value, 0);
  const [video, audio] = t.tracks.children;
  assert.deepEqual([video.kind, audio.kind], ["Video", "Audio"]);
  for (const track of [video, audio]) {
    assert.equal(track.children.length, 3);
    const total = track.children.reduce((n, c) => n + c.source_range.duration.value, 0);
    assert.equal(total, 50 + 63 + 50);
  }
  const first = video.children[0];
  assert.deepEqual([first.source_range.start_time.value, first.source_range.start_time.rate], [0, 25]);
  assert.equal(video.children[1].source_range.start_time.value, 88);
  assert.equal(first.media_reference.target_url, "file:///Users/x/a%20b/source.mp4");
});

test("OTIO: audio po cenzurze w torze audio zamiast oryginału", () => {
  const t = toOtio(reel, { mediaPath: "/m/source.mp4", audioPath: "/m/audio-censored.wav" });
  assert.equal(t.tracks.children[1].children[0].media_reference.target_url, "file:///m/audio-censored.wav");
  assert.equal(t.tracks.children[0].children[0].media_reference.target_url, "file:///m/source.mp4");
});

test("FFmpeg: wyciszenia jako volume=0 w zakresach źródła", () => {
  const args = censoredAudioArgs("/m/source.mp4", [{ start: 4.038, end: 4.42 }, { start: 9, end: 9.3 }], "/m/out.wav");
  const af = args[args.indexOf("-af") + 1];
  assert.equal(af, "volume=enable='between(t,4.038,4.42)':volume=0,volume=enable='between(t,9,9.3)':volume=0");
  assert.equal(args.at(-1), "/m/out.wav");
});
