import fs from "node:fs";

// Słowa z transcript.json
const rawWords = JSON.parse(fs.readFileSync("public/reels/magdalena-herod-7/transcript.json", "utf8"));

// Słownik poprawek ASR (słowo po słowie)
const corrections = {
  w17: "reagować,",
  w57: "wycofujesz",
  w95: "przestrzeń",
  w98: "ebooku",
  w99: "„Zobacz",
  w100: "siebie”.",
  w112: "żebyś",
  w128: "sobą",
};

// Zaktualizujmy teksty słów w rawWords
for (const w of rawWords) {
  if (corrections[w.id]) {
    w.text = corrections[w.id];
  }
}

// Jeśli w16 to "przestać", a w17 to "reagować", sprawdźmy czy nie ma zbędnych słów:
// w16: przestać, w17: reagować, wszystko ok.

// Precyzyjne grupy z podziałem linii (lineBreak: indeks słowa, od którego zaczyna się linia 2)
// Każda grupa to dokładnie dobrany zestaw słów z transcriptu.
const groupDefs = [
  // 1. Kiedy zaczynasz pracować nad sobą
  { ids: ["w0", "w1", "w2", "w3", "w4"], lineBreak: 2, key: 2 }, // Kiedy zaczynasz \n pracować nad sobą,
  // 2. bardzo łatwo jest wpaść w kolejną presję.
  { ids: ["w5", "w6", "w7", "w8", "w9", "w10", "w11"], lineBreak: 4, key: 6 }, // bardzo łatwo jest wpaść \n w kolejną presję.
  // 3. Muszę się zmienić, muszę przestać reagować,
  { ids: ["w12", "w13", "w14", "w15", "w16", "w17"], lineBreak: 3, key: 2 }, // Muszę się zmienić, \n muszę przestać reagować,
  // 4. muszę naprawić swoje przekonania.
  { ids: ["w18", "w19", "w20", "w21"], lineBreak: 2, key: 3 }, // muszę naprawić \n swoje przekonania.
  // 5. Muszę stać się nową wersją siebie.
  { ids: ["w22", "w23", "w24", "w25", "w26", "w27"], lineBreak: 3, key: 4 }, // Muszę stać się \n nową wersją siebie.
  // 6. A ja coraz bardziej widzę to inaczej.
  { ids: ["w28", "w29", "w30", "w31", "w32", "w33", "w34"], lineBreak: 4, key: 6 }, // A ja coraz bardziej \n widzę to inaczej.
  // 7. Najpierw zobacz.
  { ids: ["w35", "w36"], lineBreak: 1, key: 1 }, // Najpierw \n zobacz.
  // 8. Zauważ myśl, która pojawia się automatycznie,
  { ids: ["w37", "w38", "w39", "w40", "w41", "w42"], lineBreak: 2, key: 5 }, // Zauważ myśl, \n która pojawia się automatycznie,
  // 9. reakcję, która włącza się zawsze w podobnej sytuacji.
  { ids: ["w43", "w44", "w45", "w46", "w47", "w48", "w49", "w50"], lineBreak: 4, key: 7 }, // reakcję, która włącza się \n zawsze w podobnej sytuacji.
  // 10. Przekonanie, przez które po raz kolejny wycofujesz się
  { ids: ["w51", "w52", "w53", "w54", "w55", "w56", "w57", "w58"], lineBreak: 3, key: 0 }, // Przekonanie, przez które \n po raz kolejny wycofujesz się
  // 11. z czegoś, czego naprawdę chcesz.
  { ids: ["w59", "w60", "w61", "w62", "w63"], lineBreak: 2, key: 4 }, // z czegoś, \n czego naprawdę chcesz.
  // 12. Czegoś, co jest naprawdę twoje.
  { ids: ["w64", "w65", "w66", "w67", "w68"], lineBreak: 3, key: 4 }, // Czegoś, co jest \n naprawdę twoje.
  // 13. Nie oceniaj tego od razu.
  { ids: ["w69", "w70", "w71", "w72", "w73"], lineBreak: 3, key: 1 }, // Nie oceniaj tego \n od razu.
  // 14. Obserwuj, pytaj, sprawdzaj,
  { ids: ["w74", "w75", "w76"], lineBreak: 1, key: 2 }, // Obserwuj, \n pytaj, sprawdzaj,
  // 15. bo kiedy zaczynasz widzieć swoje automaty,
  { ids: ["w77", "w78", "w79", "w80", "w81", "w82"], lineBreak: 3, key: 5 }, // bo kiedy zaczynasz \n widzieć swoje automaty,
  // 16. przestajesz być przez nie prowadzona,
  { ids: ["w83", "w84", "w85", "w86", "w87"], lineBreak: 2, key: 4 }, // przestajesz być \n przez nie prowadzona,
  // 17. zupełnie nieświadomie.
  { ids: ["w88", "w89"], lineBreak: 1, key: 1 }, // zupełnie \n nieświadomie.
  // 18. I właśnie temu chciałam stworzyć
  { ids: ["w90", "w91", "w92", "w93", "w94"], lineBreak: 3, key: 4 }, // I właśnie temu \n chciałam stworzyć
  // 19. przestrzeń w najnowszym ebooku „Zobacz siebie”.
  { ids: ["w95", "w96", "w97", "w98", "w99", "w100"], lineBreak: 3, key: 4 }, // przestrzeń w najnowszym \n ebooku „Zobacz siebie”.
  // 20. I nie po to, żeby powiedzieć, kim masz się stać,
  { ids: ["w101", "w102", "w103", "w104", "w105", "w106", "w107", "w108", "w109", "w110"], lineBreak: 6, key: -1 }, // I nie po to, żeby powiedzieć, \n kim masz się stać,
  // 21. ale żebyś mogła coraz lepiej
  { ids: ["w111", "w112", "w113", "w114", "w115"], lineBreak: 3, key: -1 }, // ale żebyś mogła \n coraz lepiej
  // 22. zobaczyć to, co do tej pory
  { ids: ["w116", "w117", "w118", "w119", "w120", "w121"], lineBreak: 2, key: 0 }, // zobaczyć to, \n co do tej pory
  // 23. nie pozwalało ci być w pełni sobą
  { ids: ["w122", "w123", "w124", "w125", "w126", "w127", "w128"], lineBreak: 3, key: 6 }, // nie pozwalało ci \n być w pełni sobą
  // 24. i tworzyć życia,
  { ids: ["w129", "w130", "w131"], lineBreak: 1, key: 2 }, // i tworzyć \n życia,
  // 25. którego tak naprawdę mocno pragniesz.
  { ids: ["w132", "w133", "w134", "w135", "w136"], lineBreak: 3, key: 4 }, // którego tak naprawdę \n mocno pragniesz.
];

const wordMap = new Map(rawWords.map(w => [w.id, w]));

const captions = groupDefs.map(def => {
  const words = def.ids.map(id => wordMap.get(id));
  return {
    words: words.map(({ text, start, end }) => ({ text, start, end })),
    key: def.key,
    lineBreak: def.lineBreak,
    from: "bottom",
    layout: "stack"
  };
});

// Segmenty wideo (płynny montaż bez wycinania głosu, delikatny subtelny zoom naprzemienny)
const segments = [
  { start: 0, end: 4.24, zoom: 1 },
  { start: 4.24, end: 9.68, zoom: 1.025 },
  { start: 9.68, end: 18.00, zoom: 1 },
  { start: 18.00, end: 23.52, zoom: 1.025 },
  { start: 23.52, end: 32.56, zoom: 1 },
  { start: 32.56, end: 37.76, zoom: 1.025 },
  { start: 37.76, end: 50.70, zoom: 1 }
];

// Overlays:
// 1. Przebitka 1 (presja, nauka, zamyślenie): 1.84 - 4.24 s
// 2. Ikona oka (oko -> zmiana perspektywy "ja coraz bardziej widzę to inaczej"): 10.00 - 11.60 s
// 3. Przebitka 2 (refleksja, zamyślenie przy oknie/w wodzie): 13.50 - 17.50 s
// 4. Przebitka 3 (spokojny spacer w naturze / "z czegoś co jest naprawdę twoje"): 19.50 - 23.40 s
// 5. Ikona badge (mózg / proces: "obserwuj, pytaj, sprawdzaj"): 25.40 - 27.20 s
// 6. Przebitka 4 (dziennik / notes / "widzieć swoje automaty"): 27.60 - 32.20 s
// 7. Ebook prezentacja: 34.50 - 43.50 s
// 8. Przebitka 5 (oddech, poranek / "być w pełni sobą"): 44.50 - 48.30 s

const overlays = [
  {
    type: "media",
    src: "przebitka-presja.mp4",
    fit: "full",
    start: 1.84,
    end: 4.24,
    trim: 2.0
  },
  {
    type: "emoji",
    emoji: "eye",
    start: 10.00,
    end: 11.60,
    y: 0.82
  },
  {
    type: "media",
    src: "przebitka-refleksja.mp4",
    fit: "full",
    start: 13.50,
    end: 17.50,
    trim: 1.0
  },
  {
    type: "media",
    src: "przebitka-spokoj.mp4",
    fit: "full",
    start: 19.50,
    end: 23.40,
    trim: 4.0
  },
  {
    type: "emoji",
    emoji: "brain",
    start: 25.40,
    end: 27.20,
    y: 0.82
  },
  {
    type: "media",
    src: "przebitka-dziennik.mp4",
    fit: "full",
    start: 27.60,
    end: 32.20,
    trim: 2.0
  },
  {
    type: "media",
    fit: "card",
    src: "okladka1.png",
    start: 34.50,
    end: 43.50
  },
  {
    type: "media",
    src: "przebitka-oddech.mp4",
    fit: "full",
    start: 44.50,
    end: 48.30,
    trim: 1.0
  }
];

const reel = {
  source: "source.mp4",
  style: "herod",
  fps: 30,
  segments,
  captions,
  overlays
};

fs.writeFileSync("public/reels/magdalena-herod-7/reel.json", JSON.stringify(reel, null, 2));
console.log("Stworzono reel.json dla magdalena-herod-7! Liczba grup napisów:", captions.length, "Liczba nakładek:", overlays.length);
