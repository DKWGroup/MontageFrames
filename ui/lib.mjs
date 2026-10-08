// Czyste funkcje panelu (bez dysku i procesów). Testy: ui/lib.test.mjs
import path from "node:path";

// Nazwy rolek i klientów to slugi jak w scripts/prep.mjs — nic innego nie trafia do ścieżek.
export const isName = (s) => typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(s);

// Ścieżka względna po rozwinięciu musi zostać w `root` (blokuje ../ i ścieżki bezwzględne).
export const inside = (root, rel) => {
  const abs = path.resolve(root, rel);
  return abs.startsWith(root + path.sep) ? abs : null;
};

// Nazwa wgrywanego pliku: bez folderów, bez ukrytych plików.
export const fileName = (raw) => {
  const base = path.basename(String(raw ?? ""));
  return base && !base.startsWith(".") ? base : null;
};

export const maskKey = (k) => (k ? `••••${k.slice(-4)}` : "");

export const LOGIN_HINT = "Zaloguj operatora: w Terminalu wpisz `claude auth login` (albo podaj klucz API w Ustawieniach panelu).";
const AUTH = /authenticat|log ?in|oauth|api key|401/i;

// Operator AI = Claude Code bez okna. Konto: logowanie z `claude auth login`; klucz: ANTHROPIC_API_KEY (płatność za tokeny).
// Tryb auto + brak pytań o zgodę: bezpieczne kroki idą same, reszta jest odrzucana zamiast wisieć.
// Bez ustawień użytkownika (hooki, wtyczki) — montaż prowadzi CLAUDE.md projektu.
export function operatorCommand(settings, prompt, sessionId, env = process.env) {
  const args = [
    "-p", prompt,
    "--output-format", "stream-json", "--verbose",
    "--permission-mode", "auto", "--permission-prompts", "none",
    "--setting-sources", "project,local",
  ];
  if (sessionId) args.push("--resume", sessionId);
  if (settings.model) args.push("--model", settings.model);
  const { ANTHROPIC_API_KEY: _ignored, ...rest } = env;
  return {
    cmd: "claude",
    args,
    env: settings.operator === "claude-api-key" ? { ...rest, ANTHROPIC_API_KEY: settings.apiKey } : rest,
  };
}

const STEPS = [
  [/npm run reel|scripts\/prep\.mjs/, "Transkrypcja i szkic"],
  [/remotion still/, "Kontrola klatki"],
  [/remotion render/, "Render"],
  [/hyperframes transcribe/, "Transkrypcja fragmentu"],
  [/ffmpeg|ffprobe/, "ffmpeg"],
];
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const rel = (p = "") => p.replace(/^.*?\/MontageFrames\//, "");

function describeTool({ name, input = {} }) {
  if (name === "Bash") {
    const cmd = input.command ?? "";
    return `${STEPS.find(([re]) => re.test(cmd))?.[1] ?? "Komenda"}: ${short(cmd, 120)}`;
  }
  if (["Edit", "Write", "MultiEdit"].includes(name)) return `Edycja ${rel(input.file_path)}`;
  if (name === "Read") return `Czytam ${rel(input.file_path)}`;
  if (["Glob", "Grep"].includes(name)) return "Szukam w plikach";
  if (["WebSearch", "WebFetch"].includes(name)) return "Szukam w sieci";
  if (name === "Skill") return `Skill: ${input.skill ?? ""}`;
  return `Narzędzie: ${name}`;
}

// Jedno zdarzenie z `claude -p --output-format stream-json` -> linia logu dla panelu (albo null).
export function describeEvent(ev) {
  if (ev.type === "system" && ev.subtype === "init") return `Operator gotowy (${ev.model})`;
  if (ev.type === "assistant") {
    const lines = (ev.message?.content ?? []).map((b) =>
      b.type === "text" ? short(b.text.trim(), 600) || null : b.type === "tool_use" ? describeTool(b) : null,
    );
    return lines.filter(Boolean).join("\n") || null;
  }
  if (ev.type === "user") {
    const err = (Array.isArray(ev.message?.content) ? ev.message.content : []).find((b) => b.type === "tool_result" && b.is_error);
    if (!err) return null;
    const text = typeof err.content === "string" ? err.content : (err.content ?? []).map((c) => c.text ?? "").join(" ");
    return `⚠ ${short(text.trim(), 200)}`;
  }
  if (ev.type === "result") {
    if (ev.is_error) return `Błąd operatora: ${ev.result ?? ev.subtype}${AUTH.test(ev.result ?? "") ? `\n${LOGIN_HINT}` : ""}`;
    const cost = ev.total_cost_usd ? ` (≈ ${ev.total_cost_usd.toFixed(2)} USD wg cennika API)` : "";
    return `Gotowe w ${Math.round((ev.duration_ms ?? 0) / 1000)} s${cost}`;
  }
  return null;
}

// Linia z prepa (transkrypcja wypisuje JSON) -> komunikat dla panelu albo null.
export function prepLine(line) {
  if (line.startsWith("npm warn exec")) return "Pobieram narzędzie do transkrypcji (tylko za pierwszym razem)…";
  if (line.startsWith("Podgląd:")) return null; // podpowiedź dla terminala; panel ma przycisk Render
  if (!line.startsWith("{")) return line;
  try {
    const ev = JSON.parse(line);
    return ev.type === "progress" && ev.status === "completed" ? "Transkrypcja gotowa" : null;
  } catch {
    return null;
  }
}

// Linia z `npx remotion render` -> postęp 0–100 (bundling 0–10, klatki 10–95, kodowanie 95–100).
export function renderProgress(line) {
  let m = line.match(/^Bundling (\d+)%/);
  if (m) return Math.round(+m[1] / 10);
  m = line.match(/^Rendered (\d+)\/(\d+)/);
  if (m) return 10 + Math.round((85 * +m[1]) / +m[2]);
  m = line.match(/^Encoded (\d+)\/(\d+)/);
  if (m) return 95 + Math.round((5 * +m[1]) / +m[2]);
  return null;
}

export function montagePrompt({ reel, client, render, out }) {
  return [
    `Zmontuj rolkę „${reel}”${client ? ` dla klienta ${client}` : ""} zgodnie z CLAUDE.md (workflow jednej rolki).`,
    `Szkic jest gotowy: public/reels/${reel}/reel.json — prep już uruchomiony, nie uruchamiaj go ponownie.`,
    `Przeczytaj PREFERENCJE.md${client ? `, klienci/${client}/PREFERENCJE.md` : ""} i frame.md, zrób redakcję reel.json (krok 3) i kontrolę kilku klatek (krok 4).`,
    client ? `Przebitki i materiały klienta: klienci/${client}/przebitki/ (jeśli są).` : "",
    render ? `Na końcu wyrenderuj: npx remotion render ${reel} "${out}".` : "Nie renderuj — podgląd jest w panelu.",
    "Pracujesz bez okna czatu: nie zadawaj pytań, nie commituj, nie wysyłaj plików. Na koniec napisz po polsku 2–4 zdania podsumowania.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function chatPrompt({ reel, client, message }) {
  return [
    `Poprawka do rolki „${reel}”${client ? ` (klient ${client})` : ""}, plik public/reels/${reel}/reel.json:`,
    message,
    "Jeśli to zasada na przyszłość, najpierw dopisz ją do PREFERENCJE.md (albo do pliku klienta) zgodnie z CLAUDE.md.",
    "Nie renderuj, chyba że o to poproszono — podgląd jest w panelu. Nie commituj. Odpowiedz krótko po polsku.",
  ].join("\n");
}
