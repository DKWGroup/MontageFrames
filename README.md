# MontageFrames

Montaż rolek z surowego nagrania: cięcie ciszy, animowane napisy w wybranym stylu, zoomy. Silnik: [Remotion](https://www.remotion.dev).

```bash
npm run reel -- inbox/nagranie.mov moja-rolka   # transkrypcja + szkic montażu
npm run dev                                     # podgląd w Remotion Studio
npx remotion render moja-rolka out/moja-rolka.mp4
```

Szczegóły (format `reel.json`, style napisów, fonty): [CLAUDE.md](CLAUDE.md).

Remotion jest darmowy dla zespołów do 3 osób, większe firmy potrzebują licencji: https://www.remotion.pro/license
