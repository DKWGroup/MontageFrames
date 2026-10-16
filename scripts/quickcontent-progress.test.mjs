import test from "node:test";
import assert from "node:assert/strict";
import { parseWhisperProgress } from "./quickcontent-progress.mjs";

test("Whisper tqdm progress uses completed audio frames, not rounded percent or elapsed clock", () => {
  const p = parseWhisperProgress(
    " 29%|██▉       | 30000/101251 [04:30<10:41, 111.11frames/s]",
  );
  assert.equal(p.completedUnits, 30000);
  assert.equal(p.totalUnits, 101251);
  assert.equal(p.progress, 30000 / 101251);
  assert.equal(p.etaSeconds, 641);
  assert.equal(p.progressUnit, "audioFrames");
  assert.equal(
    parseWhisperProgress(" 0%| | 0/101251 [00:00<?, ?frames/s]").progress,
    0,
  );
});
test("Whisper progress ignores diagnostics, invalid counters and unrelated download bars", () => {
  for (const line of [
    "loading model",
    "100%| | 1530/1530 [00:01<00:00, 100MiB/s]",
    "3/0 [00:00<?, ?frames/s]",
    "20/10 [00:00<?, ?frames/s]",
  ])
    assert.equal(parseWhisperProgress(line), null);
  const done = parseWhisperProgress(
    "100%|████| 101251/101251 [10:00<00:00, 168.75frames/s]",
  );
  assert.equal(done.progress, 0.99);
  assert.equal(done.completedUnits, 101251);
});
