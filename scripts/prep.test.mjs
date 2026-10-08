import assert from "node:assert/strict";
import test from "node:test";
import { buildReel, clientOf, groupWords, keepRanges, pickKey, renderPath, slug, styleOf } from "./prep.mjs";

const w = (s) => s.split(" ").map((text, i) => ({ text, start: i, end: i + 0.5 }));

test("grupy: 2–6 słów, koniec zdania tnie zawsze, przecinek/pauza od 2 słów, przyimek nie wisi", () => {
  const g = groupWords(w("Większość ludzi przewija rolkę w pierwsze 3 sekundy. Dlatego napisy, które czytasz, muszą przyciągać uwagę"), {
    pauses: [12.5], // pauza po 1 słowie grupy -> bez cięcia
  });
  assert.deepEqual(
    g.map((x) => x.map((y) => y.text).join(" ")),
    ["Większość ludzi przewija rolkę", "w pierwsze 3 sekundy.", "Dlatego napisy,", "które czytasz,", "muszą przyciągać uwagę"],
  );
});

test("sierota na końcu zdania dokleja się do poprzedniej grupy", () => {
  const g = groupWords(w("W tym miesiącu moje rolki zrobiły ponad 120 tysięcy wyświetleń. Spróbuj tego w swojej następnej rolce."));
  assert.deepEqual(
    g.map((x) => x.map((y) => y.text).join(" ")),
    ["W tym miesiącu moje rolki", "zrobiły ponad 120 tysięcy wyświetleń.", "Spróbuj tego w swojej następnej rolce."],
  );
});

test("słowo-klucz: liczba > najdłuższe słowo, nigdy stop-słowo", () => {
  assert.equal(pickKey(w("w pierwsze 3 sekundy.")), 2);
  assert.equal(pickKey(w("i to jest najważniejsze")), 3);
});

test("cięcie ciszy: wycina pauzy z zapasem, gubi ciszę na początku i końcu", () => {
  const k = keepRanges([{ start: 0, end: 0.5 }, { start: 3, end: 4.3 }, { start: 9 }], 10);
  assert.deepEqual(k, [
    { start: 0.42, end: 3.08 },
    { start: 4.22, end: 9.08 },
  ]);
});


test("SkyClass: zachowuje całość nagrania i wszystkie słowa mimo wykrytych pauz", () => {
  const words = w("Takie loty dostajesz każd… w SkyClass");
  const data = buildReel({ source: "source.mp4", words, silences: [{ start: 0, end: 0.5 }, { start: 3, end: 4.3 }, { start: 9 }], duration: 10, style: "skyclass" });
  assert.equal(data.style, "skyclass");
  assert.deepEqual(data.segments, [{ start: 0, end: 10, zoom: 1 }]);
  assert.deepEqual(data.captions.flatMap((g) => g.words), words);
});

test("klient z ścieżki nagrania; jego rolki renderują się do klienci/<klient>/Render, reszta do out/", () => {
  assert.equal(clientOf("klienci/skyclass/surowe pliki/lot na cypr.mp4"), "skyclass");
  assert.equal(clientOf("/Users/x/MontageFrames/Klienci/kacper-bisanz/surowe pliki/a.mp4"), "kacper-bisanz");
  assert.equal(clientOf("inbox/demo.mp4"), null);
  assert.equal(renderPath("skyclass", "lot-na-cypr"), "klienci/skyclass/Render/lot-na-cypr.mp4");
  assert.equal(renderPath(null, "demo"), "out/demo.mp4");
});

test("slug: polskie znaki (też wielkie), spacje i podkreślenia", () => {
  assert.equal(slug("Lot na Cypr_1"), "lot-na-cypr-1");
  assert.equal(slug("Łódź Żabka!"), "lodz-zabka");
});

test("buildReel zapisuje klienta, gdy jest znany", () => {
  const base = { source: "source.mp4", words: w("raz dwa."), silences: [], duration: 2, style: "skyclass" };
  assert.equal(buildReel({ ...base, client: "skyclass" }).client, "skyclass");
  assert.equal("client" in buildReel(base), false);
});

test("styl napisów z folderu klienta w ścieżce nagrania", () => {
  assert.equal(styleOf("klienci/skyclass/surowe pliki/lot.mp4"), "skyclass");
  assert.equal(styleOf("klienci/kacper-bisanz/surowe pliki/a.mp4"), "bisanz");
  assert.equal(styleOf("klienci/magdalena-herod/surowe pliki/a.mp4"), "herod");
  assert.equal(styleOf("klienci/swieza-bryka-ameryka/surowe pliki/mustang.mp4"), "ameryka");
  assert.equal(styleOf("/Users/x/Klienci/swiezabryka-ameryka/a.mp4"), "ameryka");
  assert.equal(styleOf("inbox/lot do ameryki.mp4"), "persona");
});
