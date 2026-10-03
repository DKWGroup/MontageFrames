import fs from "node:fs";

// Słowa z transcript.json
const rawWords = JSON.parse(fs.readFileSync("public/reels/magdalena-herod-8/transcript.json", "utf8"));

// Słownik poprawek ASR (słowo po słowie)
const corrections = {
  w13: "nim",
  w42: "utrwalać.",
  w43: "Wyobraź",
  w49: "prowadzenie",
  w58: "zarabianie",
  w60: "sum",
  w81: "uwierzyć,",
  w144: "łatwiej",
  w150: "znane.",
  w161: "każdego",
  w197: "poznałam"
};

// Zaktualizujmy teksty słów w rawWords
for (const w of rawWords) {
  if (corrections[w.id]) {
    w.text = corrections[w.id];
  }
}

// Obsłużmy w161: w Parakeet było "każdzac", zamieniamy na dwa słowa: "każdego" i "dnia wzbudzać"
const idx161 = rawWords.findIndex(w => w.id === "w161");
if (idx161 !== -1) {
  const orig = rawWords[idx161];
  const mid1 = orig.start + 0.5;
  const mid2 = orig.start + 1.0;
  rawWords.splice(idx161, 1, 
    { id: "w161_a", text: "każdego", start: orig.start, end: mid1 },
    { id: "w161_b", text: "dnia", start: mid1, end: mid2 },
    { id: "w161_c", text: "wzbudzać", start: mid2, end: orig.end }
  );
}

const wordMap = new Map(rawWords.map(w => [w.id, w]));

const groupDefs = [
  // 1. Jednym z ważniejszych etapów zmiany
  { ids: ["w0", "w1", "w2", "w3", "w4"], lineBreak: 3, key: 2 }, // Jednym z ważniejszych \n etapów zmiany
  // 2. nie jest samo stworzenie wizji nowej siebie.
  { ids: ["w5", "w6", "w7", "w8", "w9", "w10", "w11"], lineBreak: 4, key: 4 }, // nie jest samo stworzenie \n wizji nowej siebie.
  // 3. Jest nim moment, w którym to, co wcześniej wydawało ci się odległe,
  { ids: ["w12", "w13", "w14", "w15", "w16", "w17", "w18", "w19", "w20", "w21", "w22", "w23"], lineBreak: 6, key: 11 }, // Jest nim moment, w którym to, \n co wcześniej wydawało ci się odległe,
  // 4. niezwykłe, albo nie dla mnie,
  { ids: ["w24", "w25", "w26", "w27", "w28"], lineBreak: 1, key: 0 }, // niezwykłe, \n albo nie dla mnie,
  // 5. zaczyna stawać się dla ciebie normalne.
  { ids: ["w29", "w30", "w31", "w32", "w33", "w34"], lineBreak: 3, key: 5 }, // zaczyna stawać się \n dla ciebie normalne.
  // 6. To właśnie wtedy nowa tożsamość zaczyna się utrwalać.
  { ids: ["w35", "w36", "w37", "w38", "w39", "w40", "w41", "w42"], lineBreak: 5, key: 4 }, // To właśnie wtedy nowa tożsamość \n zaczyna się utrwalać.
  // 7. Wyobraź sobie, że twoim celem jest prowadzenie dużej firmy,
  { ids: ["w43", "w44", "w45", "w46", "w47", "w48", "w49", "w50", "w51"], lineBreak: 5, key: 8 }, // Wyobraź sobie, że twoim celem \n jest prowadzenie dużej firmy,
  // 8. albo występowanie przed setkami osób.
  { ids: ["w52", "w53", "w54", "w55", "w56"], lineBreak: 2, key: 4 }, // albo występowanie \n przed setkami osób.
  // 9. Może zarabianie określonych sum pieniędzy,
  { ids: ["w57", "w58", "w59", "w60", "w61"], lineBreak: 2, key: 4 }, // Może zarabianie \n określonych sum pieniędzy,
  // 10. albo stworzenie zdrowej dojrzałej relacji.
  { ids: ["w62", "w63", "w64", "w65", "w66"], lineBreak: 3, key: 4 }, // albo stworzenie zdrowej \n dojrzałej relacji.
  // 11. I dopóki patrzysz na tę rzeczywistość w taki sposób,
  { ids: ["w67", "w68", "w69", "w70", "w71", "w72", "w73", "w74", "w75"], lineBreak: 5, key: 5 }, // I dopóki patrzysz na tę \n rzeczywistość w taki sposób,
  // 12. że myślisz, wow, nie mogę uwierzyć, że mogłabym tak żyć.
  { ids: ["w76", "w77", "w78", "w79", "w80", "w81", "w82", "w83", "w84", "w85"], lineBreak: 6, key: 2 }, // że myślisz, wow, nie mogę uwierzyć, \n że mogłabym tak żyć.
  // 13. To byłoby coś niesamowitego.
  { ids: ["w86", "w87", "w88", "w89"], lineBreak: 3, key: 3 }, // To byłoby coś \n niesamowitego.
  // 14. Czy ja naprawdę mogę mieć aż tyle,
  { ids: ["w90", "w91", "w92", "w93", "w94", "w95", "w96"], lineBreak: 3, key: 6 }, // Czy ja naprawdę \n mogę mieć aż tyle,
  // 15. czy ja w ogóle jestem osobą,
  { ids: ["w97", "w98", "w99", "w100", "w101", "w102"], lineBreak: 4, key: 5 }, // czy ja w ogóle \n jestem osobą,
  // 16. która może znaleźć się w takim miejscu,
  { ids: ["w103", "w104", "w105", "w106", "w107", "w108", "w109"], lineBreak: 4, key: 2 }, // która może znaleźć się \n w takim miejscu,
  // 17. to w pewnym sensie nadal ustawiasz tę rzeczywistość poza sobą.
  { ids: ["w110", "w111", "w112", "w113", "w114", "w115", "w116", "w117", "w118", "w119"], lineBreak: 6, key: 7 }, // to w pewnym sensie nadal ustawiasz \n tę rzeczywistość poza sobą.
  // 18. Twój świadomy umysł może jej bardzo pragnąć,
  { ids: ["w120", "w121", "w122", "w123", "w124", "w125", "w126"], lineBreak: 3, key: 2 }, // Twój świadomy umysł \n może jej bardzo pragnąć,
  // 19. ale na głębszym poziomie nadal traktujesz ją jako coś
  { ids: ["w127", "w128", "w129", "w130", "w131", "w132", "w133", "w134", "w135"], lineBreak: 4, key: 3 }, // ale na głębszym poziomie \n nadal traktujesz ją jako coś
  // 20. obcego, wyjątkowego, nieznanego, nieosiągalnego,
  { ids: ["w136", "w137", "w138", "w139"], lineBreak: 2, key: 3 }, // obcego, wyjątkowego, \n nieznanego, nieosiągalnego,
  // 21. a nasz system znacznie łatwiej utrzymuje to,
  { ids: ["w140", "w141", "w142", "w143", "w144", "w145", "w146"], lineBreak: 3, key: 2 }, // a nasz system \n znacznie łatwiej utrzymuje to,
  // 22. co jest mu znane.
  { ids: ["w147", "w148", "w149", "w150"], lineBreak: 2, key: 3 }, // co jest \n mu znane.
  // 23. Dlatego budowanie nowej tożsamości nie polega wyłącznie na tym,
  { ids: ["w151", "w152", "w153", "w154", "w155", "w156", "w157", "w158", "w159"], lineBreak: 4, key: 3 }, // Dlatego budowanie nowej tożsamości \n nie polega wyłącznie na tym,
  // 24. żeby każdego dnia wzbudzać w sobie ekscytację
  { ids: ["w160", "w161_a", "w161_b", "w161_c", "w162", "w163", "w164"], lineBreak: 4, key: 6 }, // żeby każdego dnia wzbudzać \n w sobie ekscytację
  // 25. związaną z upragnioną przyszłością,
  { ids: ["w165", "w166", "w167", "w168"], lineBreak: 3, key: 3 }, // związaną z upragnioną \n przyszłością,
  // 26. tylko chodzi również o coś znacznie spokojniejszego,
  { ids: ["w169", "w170", "w171", "w172", "w173", "w174", "w175"], lineBreak: 3, key: 6 }, // tylko chodzi również \n o coś znacznie spokojniejszego,
  // 27. o oswojenie się już z nią. A jak to zrobić?
  { ids: ["w176", "w177", "w178", "w179", "w180", "w181", "w182", "w183", "w184", "w185"], lineBreak: 6, key: 1 }, // o oswojenie się już z nią. \n A jak to zrobić?
  // 28. Zapraszam Cię do mojej przestrzeni,
  { ids: ["w186", "w187", "w188", "w189", "w190"], lineBreak: 2, key: -1 }, // Zapraszam Cię \n do mojej przestrzeni,
  // 29. gdzie dzielę się tym, co sama poznałam i odkryłam przez ostatnie lata.
  { ids: ["w191", "w192", "w193", "w194", "w195", "w196", "w197", "w198", "w199", "w200", "w201", "w202"], lineBreak: 6, key: -1 } // gdzie dzielę się tym, co sama poznałam \n i odkryłam przez ostatnie lata.
];

const captions = groupDefs.map(def => {
  const words = def.ids.map(id => wordMap.get(id)).filter(Boolean);
  return {
    words: words.map(({ text, start, end }) => ({ text, start, end })),
    key: def.key,
    lineBreak: def.lineBreak,
    from: "bottom",
    layout: "stack"
  };
});

// Segmenty wideo z łagodnym zoomem naprzemiennym (1.0 vs 1.025)
const segments = [
  { start: 0, end: 4.40, zoom: 1 },
  { start: 4.40, end: 12.00, zoom: 1.025 },
  { start: 12.00, end: 20.16, zoom: 1 },
  { start: 20.16, end: 24.56, zoom: 1.025 },
  { start: 24.56, end: 36.80, zoom: 1 },
  { start: 36.80, end: 44.40, zoom: 1.025 },
  { start: 44.40, end: 56.59, zoom: 1 },
  { start: 56.59, end: 65.07, zoom: 1.025 },
  { start: 65.07, end: 71.39, zoom: 1 },
  { start: 71.39, end: 76.833333, zoom: 1.025 }
];

// Overlays (żadne się nie nakładają):
// 1. Przebitka refleksja (kobieta w zamyśleniu): 5.50 - 9.80 s
// 2. Ikona layers (nowa tożsamość): 12.50 - 14.50 s
// 3. Przebitka rozmowa/biznes: 16.50 - 20.00 s
// 4. Przebitka bliskość/relacja: 22.20 - 24.50 s
// 5. Ikona eye (ustawianie rzeczywistości poza sobą): 38.00 - 40.50 s
// 6. Przebitka spokój w naturze: 45.00 - 50.50 s
// 7. Przebitka dziennik (budowanie nowej tożsamości): 60.50 - 65.00 s
// 8. Ebook prezentacja: 70.80 - 76.83 s

const overlays = [
  {
    type: "media",
    src: "przebitka-refleksja.mp4",
    fit: "full",
    start: 5.50,
    end: 9.80,
    trim: 1.0
  },
  {
    type: "emoji",
    emoji: "layers",
    start: 12.50,
    end: 14.50,
    y: 0.82
  },
  {
    type: "media",
    src: "przebitka-rozmowa.mp4",
    fit: "full",
    start: 16.50,
    end: 20.00,
    trim: 1.0
  },
  {
    type: "media",
    src: "przebitka-bliskosc.mp4",
    fit: "full",
    start: 22.20,
    end: 24.50,
    trim: 1.0
  },
  {
    type: "emoji",
    emoji: "eye",
    start: 38.00,
    end: 40.50,
    y: 0.82
  },
  {
    type: "media",
    src: "przebitka-spokoj.mp4",
    fit: "full",
    start: 45.00,
    end: 50.50,
    trim: 5.0
  },
  {
    type: "media",
    src: "przebitka-dziennik.mp4",
    fit: "full",
    start: 60.50,
    end: 65.00,
    trim: 2.0
  },
  {
    type: "media",
    fit: "card",
    src: "okladka1.png",
    start: 70.80,
    end: 76.833333
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

fs.writeFileSync("public/reels/magdalena-herod-8/reel.json", JSON.stringify(reel, null, 2));
console.log("Stworzono reel.json dla magdalena-herod-8! Grup napisów:", captions.length, "Nakładek:", overlays.length);
