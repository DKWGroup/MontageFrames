import assert from "node:assert/strict";
import test from "node:test";
import { groupWords, keepRanges, pickKey } from "./prep.mjs";

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
