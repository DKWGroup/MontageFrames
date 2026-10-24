import assert from "node:assert/strict";
import { test } from "node:test";
import { pathurl, placeClips, rateOf, toXmeml } from "./cutraw-xml.mjs";

// Minimalny parser: drzewo elementów; niezamknięty lub źle zagnieżdżony tag = wyjątek (XML musi być poprawny).
function parse(xml) {
  const root = { name: "#root", kids: [] };
  const stack = [root];
  const unesc = (s) => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[e]);
  for (const [, close, name, attrs, self, text] of xml
    .replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>/g, "")
    .matchAll(/<(\/?)([\w:]+)([^>]*?)(\/?)>|([^<]+)/g)) {
    const top = stack.at(-1);
    if (text !== undefined) {
      if (text.trim()) top.text = unesc(text.trim());
    } else if (close) {
      assert.equal(stack.pop().name, name, `zamknięcie </${name}>`);
    } else {
      const node = { name, attrs: Object.fromEntries([...attrs.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]])), kids: [] };
      top.kids.push(node);
      if (!self) stack.push(node);
    }
  }
  assert.equal(stack.length, 1, "niezamknięte elementy");
  return root;
}
const kid = (n, name) => n.kids.find((k) => k.name === name);
const all = (n, name) => n.kids.filter((k) => k.name === name);
const num = (n, name) => +kid(n, name).text;
const clips = (track) => all(track, "clipitem").map((c) => [num(c, "start"), num(c, "end"), num(c, "in"), num(c, "out")]);

const project = {
  name: "Podcast & goście",
  fps: "25/1",
  width: 1920,
  height: 1080,
  segments: [{ start: 0, end: 2 }, { start: 3.5, end: 6.02 }, { start: 8, end: 10 }],
  files: [
    { id: "cam1", path: "/Users/x/a b/Kamera łódź & <1>.mp4", duration: 12, width: 1920, height: 1080, channels: 2, sampleRate: 48000 },
    { id: "cam2", path: "/Users/x/kamera2.mov", duration: 10, width: 1920, height: 1080, channels: 2 },
    { id: "mowa", path: "/Users/x/paczka/audio/mowa-cenzura.wav", duration: 10.5, channels: 1, sampleRate: 48000 },
  ],
  video: [{ file: "cam1", offset: 0 }, { file: "cam2", offset: 1, enabled: false }],
  audio: [{ file: "mowa", offset: 0, label: "Mowa (cenzura)" }, { file: "cam1", offset: 0, enabled: false }],
};

test("fps: całkowite i NTSC (29,97 / 23,976 / 59,94) z dokładnym tempem klatek", () => {
  assert.deepEqual(rateOf("25/1"), { timebase: 25, ntsc: false, real: 25 });
  assert.deepEqual(rateOf(50), { timebase: 50, ntsc: false, real: 50 });
  assert.deepEqual(rateOf("30000/1001"), { timebase: 30, ntsc: true, real: 30000 / 1001 });
  assert.deepEqual(rateOf(29.97), rateOf("30000/1001"));
  assert.equal(rateOf("24000/1001").timebase, 24);
  assert.equal(rateOf("60000/1001").ntsc, true);
  assert.throws(() => rateOf("0/1"));
});

test("klipy: przesunięty plik zaczyna się później na osi, poza zakresem pliku jest luka", () => {
  const frames = [[0, 50], [88, 151], [200, 250]];
  assert.deepEqual(placeClips(frames, 0, 300), [
    { start: 0, end: 50, in: 0, out: 50 },
    { start: 50, end: 113, in: 88, out: 151 },
    { start: 113, end: 163, in: 200, out: 250 },
  ]);
  assert.deepEqual(placeClips(frames, 25, 250)[0], { start: 25, end: 50, in: 0, out: 25 });
  assert.equal(placeClips(frames, 0, 150).length, 1 + 1); // trzeci segment poza plikiem
});

test("XML: poprawna struktura, klatki co do sztuki, ścieżki wyłączone, plik zdefiniowany raz", () => {
  const xml = toXmeml(project);
  const seq = kid(kid(parse(xml), "xmeml"), "sequence");
  assert.equal(kid(seq, "name").text, "Podcast & goście");
  assert.equal(num(seq, "duration"), 50 + 63 + 50);
  assert.deepEqual([num(kid(seq, "rate"), "timebase"), kid(kid(seq, "rate"), "ntsc").text], [25, "FALSE"]);
  const media = kid(seq, "media");
  const [v1, v2] = all(kid(media, "video"), "track");
  const [a1, a2] = all(kid(media, "audio"), "track");
  assert.deepEqual(clips(v1), [[0, 50, 0, 50], [50, 113, 88, 151], [113, 163, 200, 250]]);
  assert.deepEqual(clips(v2), [[25, 50, 0, 25], [50, 113, 63, 126], [113, 163, 175, 225]]);
  assert.deepEqual(clips(a1), clips(v1));
  assert.ok(all(v2, "clipitem").every((c) => kid(c, "enabled").text === "FALSE"));
  assert.ok(all(a1, "clipitem").every((c) => kid(c, "enabled").text === "TRUE"));
  assert.equal(kid(all(a1, "clipitem")[0], "name").text, "Mowa (cenzura)");
  assert.equal(kid(kid(all(a2, "clipitem")[0], "sourcetrack"), "mediatype").text, "audio");
  // Pełna definicja pliku tylko przy pierwszym użyciu, dalej odwołanie po id.
  const cam1 = [...all(v1, "clipitem"), ...all(a2, "clipitem")].map((c) => kid(c, "file"));
  assert.equal(cam1.filter((x) => x.kids.length).length, 1);
  assert.ok(cam1.every((x) => x.attrs.id === "file-1"));
  const def = cam1.find((x) => x.kids.length);
  assert.equal(kid(def, "pathurl").text, "file://localhost/Users/x/a%20b/Kamera%20%C5%82%C3%B3d%C5%BA%20&%20%3C1%3E.mp4");
  assert.equal(num(def, "duration"), 300);
  assert.match(xml, /Kamera%20%C5%82%C3%B3d%C5%BA%20&amp;%20%3C1%3E/);
});

test("XML: NTSC 29,97 liczy klatki z 30000/1001, błędne dane zatrzymują eksport", () => {
  const xml = toXmeml({ ...project, fps: "30000/1001", segments: [{ start: 0, end: 60 }], video: [{ file: "cam1" }], audio: [] });
  const seq = kid(kid(parse(xml), "xmeml"), "sequence");
  assert.equal(num(seq, "duration"), Math.round(60 * (30000 / 1001)));
  assert.equal(kid(kid(seq, "rate"), "ntsc").text, "TRUE");
  assert.throws(() => toXmeml({ ...project, video: [{ file: "brak" }] }), /nieznany plik/);
  assert.throws(() => toXmeml({ ...project, video: [{ file: "mowa" }] }), /nie ma strumienia wideo/);
  assert.throws(() => toXmeml({ ...project, segments: [{ start: 3, end: 5 }, { start: 4, end: 6 }] }), /nachodzą/);
});

test("ścieżka pliku: file://localhost z kodowaniem spacji i polskich znaków", () => {
  assert.equal(pathurl("/Volumes/Dysk 1/Nagrania/żółw.wav"), "file://localhost/Volumes/Dysk%201/Nagrania/%C5%BC%C3%B3%C5%82w.wav");
});

test("C3: montaż kamer na V1 (ujęcia + kamera główna, gdy ujęcie nie ma obrazu), dryf per klip, markery, link", () => {
  const xml = toXmeml({
    ...project,
    video: [
      { shots: [{ start: 0, end: 4, file: "cam2", offset: 1, label: "Ania" }, { start: 4, end: 12, file: "cam1", offset: 0, label: "Plan ogólny" }], fallback: { file: "cam1", offset: 0, label: "Plan ogólny" } },
      { file: "cam1", offset: 0, k: 0.01, at: 0, enabled: false, link: "cam1" },
    ],
    audio: [{ file: "mowa" }, { file: "cam1", offset: 0, k: 0.01, at: 0, enabled: false, link: "cam1" }],
    markers: [{ at: 5, name: "Do decyzji: falstart", comment: "Luna: a & b" }, { at: 2.5, name: "wycięte" }],
  });
  const seq = kid(kid(parse(xml), "xmeml"), "sequence");
  const [v1, v2] = all(kid(kid(seq, "media"), "video"), "track");
  const [, a2] = all(kid(kid(seq, "media"), "audio"), "track");
  // [0,50): Kamera 2 zaczyna się dopiero w 25. klatce → kamera główna; [88,151) dzielone na 100. klatce.
  assert.deepEqual(clips(v1), [[0, 50, 0, 50], [50, 62, 63, 75], [62, 113, 100, 151], [113, 163, 200, 250]]);
  assert.deepEqual(all(v1, "clipitem").map((c) => kid(c, "name").text), ["Plan ogólny", "Ania", "Plan ogólny", "Plan ogólny"]);
  // dryf 1%: przesunięcie w środku każdego klipu (0 / 1 / 2 klatki)
  assert.deepEqual(clips(v2).map((c) => c[2]), [0, 87, 198]);
  assert.deepEqual(clips(a2), clips(v2));
  const markers = all(seq, "marker");
  assert.equal(markers.length, 1);
  assert.deepEqual([kid(markers[0], "name").text, kid(markers[0], "comment").text, num(markers[0], "in"), num(markers[0], "out")], ["Do decyzji: falstart", "Luna: a & b", 87, -1]);
  const v = all(v2, "clipitem")[1];
  const a = all(a2, "clipitem")[1];
  const linkOf = (c) => all(c, "link").map((l) => [kid(l, "linkclipref").text, kid(l, "mediatype").text, num(l, "trackindex"), num(l, "clipindex")]);
  assert.deepEqual(linkOf(v), [[v.attrs.id, "video", 2, 2], [a.attrs.id, "audio", 2, 2]]);
  assert.deepEqual(linkOf(a), linkOf(v));
  assert.equal(all(all(v1, "clipitem")[0], "link").length, 0);
});
