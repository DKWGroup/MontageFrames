import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fingerprint, guardShortKeeps, nextVersion, plural, speakerOf, timeline } from "./cutraw.mjs";

const cut = (id, start, end, decision = "cut") => ({ id, start, end, decision, auto: true, reason: "cisza", kind: "silence", wordIds: [] });

test("krótki zachowany fragment ze słowem nie znika: późniejsze cięcie wraca do decyzji", () => {
  const words = [{ id: "w0", text: "tak", start: 1.0, end: 1.1 }];
  const out = guardShortKeeps([cut("a", 0.5, 0.98), cut("b", 1.1, 2)], words, 3);
  assert.deepEqual(out.map((c) => c.decision), ["cut", "undecided"]);
  assert.match(out[1].reason, /za krótki fragment/);
  // Bez słowa w środku krótki kawałek może zniknąć.
  assert.deepEqual(guardShortKeeps([cut("a", 0.5, 0.98), cut("b", 1.1, 2)], [], 3).map((c) => c.decision), ["cut", "cut"]);
});

test("mówca słowa = mikrofon z największą energią; jeden mikrofon albo kamera bez etykiety", () => {
  const ania = Float32Array.from({ length: 300 }, (_, k) => (k < 150 ? 0.5 : 0.01));
  const bartek = Float32Array.from({ length: 300 }, (_, k) => (k < 150 ? 0.02 : 0.4));
  assert.equal(speakerOf({ start: 0.2, end: 0.6 }, [ania, bartek], ["Ania", "Bartek"]), "Ania");
  assert.equal(speakerOf({ start: 2, end: 2.5 }, [ania, bartek], ["Ania", "Bartek"]), "Bartek");
  assert.equal(speakerOf({ start: 2, end: 2.5 }, [ania], ["Ania"]), "Ania");
  assert.equal(speakerOf({ start: 2, end: 2.5 }, [ania], []), null);
});

test("wersje paczki: kolejny numer po istniejących, inne nazwy nie liczą się", () => {
  const base = mkdtempSync(path.join(tmpdir(), "cutraw-v-"));
  assert.equal(nextVersion(path.join(base, "brak"), "odc-1"), 1);
  for (const d of ["odc-1-cutraw-v001", "odc-1-cutraw-v004", "odc-12-cutraw-v009", "odc-1.mp4"]) mkdirSync(path.join(base, d));
  assert.equal(nextVersion(base, "odc-1"), 5);
});

test("oś Premiere: kamera referencyjna na V1, mowa włączona, oryginały wyłączone", () => {
  const p = {
    name: "odc", fps: "25/1", width: 1920, height: 1080, reference: "kamera-2",
    sources: [
      { id: "kamera-1", role: "camera", label: "Szeroki", path: "/x/a.mp4", duration: 60, offset: 1.5, video: { width: 1920, height: 1080 }, audio: { channels: 2, sampleRate: 48000 } },
      { id: "kamera-2", role: "camera", label: "Zbliżenie", path: "/x/b.mp4", duration: 61, offset: 0, video: { width: 1920, height: 1080 }, audio: { channels: 2, sampleRate: 48000 } },
      { id: "mikrofon-1", role: "mic", label: "Ania", path: "/x/ania.wav", duration: 62, offset: -0.4, video: null, audio: { channels: 1, sampleRate: 48000 } },
    ],
    cuts: [],
  };
  const t = timeline(p, [{ id: "mowa-mikrofon-1", path: "/pkg/audio/Ania — mowa.wav", duration: 61, channels: 1, sampleRate: 48000, label: "Ania — mowa" }]);
  assert.deepEqual(t.video.map((v) => [v.file, v.enabled, v.offset]), [["kamera-2", true, 0], ["kamera-1", false, 1.5]]);
  assert.deepEqual(t.audio.map((a) => [a.file, a.enabled !== false, a.offset]), [
    ["mowa-mikrofon-1", true, 0],
    ["mikrofon-1", false, -0.4],
    ["kamera-2", false, 0],
    ["kamera-1", false, 1.5],
  ]);
  assert.equal(t.files.length, 4);
  assert.deepEqual([t.shots, t.video[0].link, t.audio[2].link, t.audio[1].link], [null, "kamera-2", "kamera-2", undefined]);

  // C3: Zbliżenie pokazuje Anię, Szeroki = plan ogólny → V1 montaż kamer, wyżej obie kamery wyłączone; dryf i markery.
  p.duration = 60;
  p.sources[0].shows = "wide";
  p.sources[1].shows = "mikrofon-1";
  p.sources[0].sync = { k: 2e-5, at: 30 };
  p.cuts = [
    { id: "c1", start: 10, end: 11, kind: "false-start", reason: "falstart", decision: "undecided", luna: { verdict: "undecided", reason: "nie wiem" } },
    { id: "c2", start: 20, end: 21, kind: "silence", reason: "cisza", decision: "keep", luna: { verdict: "keep", reason: "oddech" } },
    { id: "c3", start: 30, end: 32, kind: "retake", reason: "dubel", decision: "keep", luna: { verdict: "keep", reason: "inna treść" } },
  ];
  const words = Array.from({ length: 50 }, (_, i) => ({ start: 20 + i * 0.4, end: 20.35 + i * 0.4, speaker: "Ania" }));
  const c3 = timeline(p, [], { words, segments: [{ start: 0, end: 60 }] });
  assert.deepEqual(c3.shots.map((x) => x.camera), ["kamera-1", "kamera-2"]); // po Ani cisza — ujęcie zostaje
  assert.deepEqual(c3.video.map((v) => [v.file ?? "montaż", v.enabled]), [["montaż", undefined], ["kamera-2", false], ["kamera-1", false]]);
  assert.deepEqual([c3.video[0].fallback.file, c3.video[0].shots[1].file, c3.video[2].k], ["kamera-2", "kamera-2", 2e-5]);
  assert.deepEqual(c3.markers.map((m) => [m.at, m.name, m.comment]), [
    [10, "Do decyzji: falstart", "nie wiem"],
    [30, "Luna zostawiła: dubel", "inna treść"],
  ]);
});

test("odcisk pliku zmienia się, gdy zmieni się treść", () => {
  const f = path.join(mkdtempSync(path.join(tmpdir(), "cutraw-fp-")), "a.bin");
  writeFileSync(f, Buffer.alloc(3 << 20, 1));
  const a = fingerprint(f);
  writeFileSync(f, Buffer.concat([Buffer.alloc((3 << 20) - 1, 1), Buffer.from([2])]));
  assert.notEqual(fingerprint(f), a);
  assert.match(a, /^3145728:[0-9a-f]{24}$/);
});

test("odmiana liczebników w komunikatach", () => {
  assert.deepEqual([1, 2, 5, 12, 22, 25].map((n) => plural(n, "cięcie", "cięcia", "cięć")), ["1 cięcie", "2 cięcia", "5 cięć", "12 cięć", "22 cięcia", "25 cięć"]);
});

test("zapis decyzji z przeglądu i ręczne przesunięcie synchronizacji na prawdziwym projekcie", async (t) => {
  const { execFileSync } = await import("node:child_process");
  const { rmSync } = await import("node:fs");
  const { createProject, dirOf, loadProject, nudgeSync, saveCuts } = await import("./cutraw.mjs");
  const src = mkdtempSync(path.join(tmpdir(), "cutraw-p-"));
  const cam = path.join(src, "Kamera.mp4");
  const mic = path.join(src, "Ania.wav");
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=160x90:rate=25:duration=2", "-f", "lavfi", "-i", "sine=duration=2", "-c:v", "libx264", "-c:a", "aac", "-shortest", cam]);
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=duration=2", mic]);
  const name = `test-${process.pid}`;
  t.after(() => rmSync(dirOf(name), { recursive: true, force: true }));
  const p = await createProject(name, [cam, mic]);
  assert.deepEqual([p.reference, p.sources.map((s) => s.role), p.fps], ["kamera-1", ["camera", "mic"], "25/1"]);
  const cut = { id: "user-0.500", start: 0.5, end: 0.9, wordIds: [], kind: "manual", reason: "własne", confidence: 1, auto: false, decision: "cut", luna: { verdict: "cut", reason: "x" } };
  assert.throws(() => saveCuts(name, 99, { cuts: [cut], mutes: [] }), (e) => e.status === 409);
  assert.throws(() => saveCuts(name, 1, { cuts: [{ ...cut, end: 0.1 }], mutes: [] }), (e) => e.status === 400);
  assert.equal(saveCuts(name, 1, { cuts: [cut], mutes: [] }).revision, 2);
  assert.equal(loadProject(name).cuts[0].luna.reason, "x"); // pola spoza schematu (werdykt Luny) zostają
  assert.throws(() => nudgeSync(name, 2, "kamera-1", 0.04), (e) => e.status === 400);
  const n = nudgeSync(name, 2, "mikrofon-1", -0.04);
  assert.deepEqual([n.sources[1].offset, n.sources[1].sync.manual, n.stale, n.revision], [-0.04, true, undefined, 3]);
});
