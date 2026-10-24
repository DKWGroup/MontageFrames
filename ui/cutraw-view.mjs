// Logika ekranu CutRaw bez Reacta — testowana w node (ui/cutraw-view.test.mjs).
// Operacje na cięciach (przełącz, przywróć rodzaj, własne cięcie, cenzura) są wspólne z LongForm: ui/longform-view.mjs.

export function parseCrHash(hash) {
  const m = /^#cr(?:\/([a-z0-9-]+))?$/.exec(hash);
  return m ? { id: m[1] ?? null } : null;
}

// Podgląd „po cięciach”: z chwili t → dokąd przeskoczyć (początek następnego fragmentu), null = graj dalej, -1 = koniec.
// `eps` wyprzedza koniec fragmentu, bo pętla klatek widzi czas z opóźnieniem — inaczej słychać początek cięcia.
export function playbackJump(t, segments, eps = 0.03) {
  for (const s of segments) {
    if (t < s.start) return s.start;
    if (t < s.end - eps) return null;
  }
  return -1;
}

export const mutedAt = (t, mutes) => mutes.some((m) => t >= m.start - (m.ramp ?? 0) && t < m.end);

export const clock = (s) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const mm = String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(t % 60).padStart(2, "0")}`;
};

export const formatOffset = (s) => (s ? `${s > 0 ? "+" : "−"}${Math.abs(s).toFixed(3).replace(".", ",")} s` : "0 s");

// Długość klatki z fps ffprobe („25/1”, „30000/1001”) — krok ręcznej synchronizacji.
export function frameLength(fps) {
  const [n, d = 1] = String(fps).split("/").map(Number);
  return n > 0 && d > 0 ? d / n : 1 / 25;
}

export function syncLabel(source, reference) {
  if (source.id === reference) return "wyznacza czas";
  if (!source.sync) return "jeszcze nie zsynchronizowane";
  const base = source.sync.manual ? "ustawione ręcznie" : source.sync.confident ? "pewna" : "do sprawdzenia";
  return source.sync.k ? `${base} · dryf ${Math.round(source.sync.k * 1e6)} ppm skorygowany` : base;
}

// Koszt AI zmierzony w projekcie; brak danych w którymkolwiek zapytaniu = nie udajemy sumy.
export function costLabel(usage = []) {
  if (!usage.length) return null;
  if (usage.some((u) => u.costMicroUsd == null)) return "brak pełnych danych o koszcie";
  return `${(usage.reduce((n, u) => n + u.costMicroUsd, 0) / 1e6).toFixed(4).replace(".", ",")} USD`;
}

// Fala do osi źródeł: dB co 0,1 s → wysokości 0–1 dla `width` kolumn (maksimum w kolumnie, dolny próg −60 dB).
export function waveColumns(levels, width) {
  const out = new Float32Array(Math.max(0, width));
  if (!levels?.length) return out;
  for (let x = 0; x < width; x++) {
    const a = Math.floor((x * levels.length) / width);
    const b = Math.max(a + 1, Math.floor(((x + 1) * levels.length) / width));
    let max = -90;
    for (let i = a; i < b; i++) max = Math.max(max, levels[i]);
    out[x] = Math.min(1, Math.max(0, (max + 60) / 60));
  }
  return out;
}

export const plural = (n, one, few, many) =>
  `${n} ${n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many}`;

export const ROLE_LABEL = { camera: "Kamera", mic: "Mikrofon" };
export const PACE_LABEL = { spokojne: "Spokojne — tnie pauzy od 0,6 s", standard: "Standard — od 0,4 s", "gęste": "Gęste — od 0,28 s" };
export const AI_LABEL = {
  openai: "GPT‑6 Luna (OpenAI API)",
  claude: "Claude Code na koncie",
  codex: "Codex na koncie",
  none: "Bez AI — tylko cisza i „yyy”",
};
export const STAGE_LABEL = {
  sync: "Synchronizacja po dźwięku",
  levels: "Miks mowy i poziomy",
  transcribe: "Transkrypcja",
  detect: "Cisza i wtrącenia",
  ai: "Redakcja i kontrola sensu",
  snap: "Najcichsza klatka i cenzura",
  preview: "Podgląd",
  export: "Eksport do Premiere",
};
