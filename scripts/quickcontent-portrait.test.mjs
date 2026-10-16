import test from "node:test";
import assert from "node:assert/strict";
import { outputDimensions, faceFraming } from "./quickcontent-portrait.mjs";
test("all supported output sizes are exactly 9:16; rejects arbitrary sizes", () => {
  assert.deepEqual(outputDimensions(720), {
    width: 720,
    height: 1280,
    scale: 2 / 3,
  });
  assert.deepEqual(outputDimensions(2160), {
    width: 2160,
    height: 3840,
    scale: 2,
  });
  assert.throws(() => outputDimensions(1000));
});
test("speaker face at right becomes centered in portrait through object-position geometry", () => {
  const f = faceFraming(
    [{ x: 0.72, y: 0.2, width: 0.12, height: 0.2 }],
    1920,
    1080,
  );
  assert.equal(f.mode, "crop");
  const visible = 0.31640625;
  assert.ok(Math.abs(f.centerX * (1 - visible) + visible / 2 - 0.78) < 1e-6);
  assert.deepEqual(faceFraming([], 1920, 1080), {
    mode: "crop",
    centerX: 0.5,
    centerY: 0.5,
  });
});

test("face tracking follows moving subject, holds missed detections and rejects malformed paths", async () => {
  const { buildFaceTracking } = await import("./quickcontent-portrait.mjs");
  const { trackingPosition, validTracking } =
    await import("../src/quickcontent/framing.mjs");
  const face = (x) => ({ x, y: 0.2, width: 0.12, height: 0.2 });
  const f = buildFaceTracking(
    [[face(0.25)], [], [face(0.4)], [face(0.6)]],
    1920,
    1080,
    4,
  );
  assert.ok(f.tracking.length >= 4);
  assert.ok(f.tracking.at(-1).centerX > f.tracking[0].centerX);
  assert.deepEqual(trackingPosition({ ...f, trackingEnabled: false }, 2), {
    centerX: f.centerX,
    centerY: f.centerY,
  });
  assert.ok(validTracking(f, 4));
  assert.equal(
    validTracking(
      { ...f, tracking: [{ time: 0, centerX: NaN, centerY: 0.5 }] },
      4,
    ),
    false,
  );
  assert.equal(
    validTracking(
      {
        ...f,
        tracking: [
          { time: 2, centerX: 0.5, centerY: 0.5 },
          { time: 1, centerX: 0.5, centerY: 0.5 },
        ],
      },
      4,
    ),
    false,
  );
  const middle = trackingPosition(
    {
      mode: "crop",
      centerX: 0.5,
      centerY: 0.5,
      tracking: [
        { time: 0, centerX: 0.2, centerY: 0.5 },
        { time: 2, centerX: 0.8, centerY: 0.5 },
      ],
    },
    1,
  );
  assert.ok(Math.abs(middle.centerX - 0.5) < 1e-8);
  assert.equal(buildFaceTracking([[], []], 1920, 1080, 2).tracking, undefined);
});

test("source close-ups pull back to leave room below the face and scale is validated", async () => {
  const { buildFaceTracking } = await import("./quickcontent-portrait.mjs");
  const { validTracking, trackingPosition } =
    await import("../src/quickcontent/framing.mjs");
  const face = { x: 0.2, y: 0.1, width: 0.3, height: 0.6 };
  const framing = buildFaceTracking([[face], [face], [face]], 1920, 1080, 3);
  assert.ok(framing.tracking.every((p) => p.scale < 0.65 && p.scale >= 0.55));
  assert.ok(trackingPosition(framing, 1).scale < 0.65);
  assert.equal(
    validTracking(
      {
        ...framing,
        tracking: [{ time: 0, centerX: 0.5, centerY: 0.5, scale: -1 }],
      },
      3,
    ),
    false,
  );
  assert.equal(validTracking({ ...framing, tracking: [null] }, 3), false);
});

test("legacy XY tracking never introduces an adaptive scale or switches zoom origin", async () => {
  const { trackingPosition } = await import("../src/quickcontent/framing.mjs");
  const framing = {
    mode: "crop",
    centerX: 0.5,
    centerY: 0.5,
    tracking: [
      { time: 0, centerX: 0.3, centerY: 0.5 },
      { time: 2, centerX: 0.7, centerY: 0.5 },
    ],
  };
  for (const time of [-1, 0, 1, 2, 3])
    assert.equal(trackingPosition(framing, time).scale, undefined);
});

test("Bisanz camera ignores editorial and adaptive zoom while other styles retain their scale", async () => {
  const { cameraScale } = await import("../src/quickcontent/framing.mjs");
  assert.equal(cameraScale("bisanz", { zoom: 1.2, zoomTo: 1.3 }, 0.7, 0.5), 1);
  assert.equal(cameraScale("bisanz", { zoom: 1, zoomTo: 1 }, 0.8, 1), 1);
  assert.ok(
    Math.abs(
      cameraScale("persona", { zoom: 1.1, zoomTo: 1.2 }, 1, 0.5) - 1.15,
    ) < 1e-8,
  );
});
