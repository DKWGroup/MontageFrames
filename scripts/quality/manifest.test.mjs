import test from "node:test";
import assert from "node:assert/strict";
import { createRenderManifest } from "./manifest.mjs";
const asset = {
  id: "source",
  path: "public/reels/demo/source.mp4",
  sha256: "a".repeat(64),
  byteLength: 12,
  mime: "video/mp4",
  kind: "media",
};
const input = {
  orgId: "local",
  reelRevision: 2,
  inputs: { data: { source: "source.mp4" } },
  contract: null,
  assets: [asset],
  runtime: { node: "22", remotion: "4", os: "darwin", arch: "arm64" },
  output: { width: 1080, height: 1920, fps: 30 },
  seed: 0,
};
test("manifest freezes inputs and canonical provenance independently of insertion order", () => {
  const m = createRenderManifest(input);
  assert.equal(m.manifestVersion, 1);
  assert.match(m.signature, /^[a-f0-9]{64}$/);
  assert.equal(
    m.signature,
    createRenderManifest({
      ...input,
      runtime: { arch: "arm64", os: "darwin", remotion: "4", node: "22" },
    }).signature,
  );
  assert.notEqual(
    m.signature,
    createRenderManifest({ ...input, seed: 1 }).signature,
  );
  const mutable = globalThis.structuredClone(input);
  const frozen = createRenderManifest(mutable);
  mutable.inputs.data.source = "changed.mp4";
  assert.equal(frozen.inputs.data.source, "source.mp4");
});
test("manifest rejects duplicate IDs, foreign paths and remote mutable URLs", () => {
  assert.throws(
    () => createRenderManifest({ ...input, assets: [asset, asset] }),
    /powtórzon/i,
  );
  for (const path of ["../private", "/etc/hosts", "https://example.com/a.ttf"])
    assert.throws(
      () => createRenderManifest({ ...input, assets: [{ ...asset, path }] }),
      /ścież/i,
    );
});
