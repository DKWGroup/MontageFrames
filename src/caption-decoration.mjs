import keywords from "./emoji-data/pl-keywords.mjs";
const icons = [
  [/^polsk(?:a|ę|ą|i|ie|iej|ich|im|imi|iego|iemu)?$/u, "🇵🇱"],
  [/^(?:niemcy|niemiec|niemczech|niemcom|niemcami|niemieck[\p{L}]*)$/u, "🇩🇪"],
  [/^franc(?:j|us)[\p{L}]*$/u, "🇫🇷"],
  [
    /^(?:włoch(?:y|om|ami|ach)?|włos(?:ki|ka|kie|kich|kiej|kim|kimi|kiego))$/u,
    "🇮🇹",
  ],
  [/^hiszpa(?:ni|ńsk)[\p{L}]*$/u, "🇪🇸"],
  [/^(?:czechy|czech|czechach|czesk[\p{L}]*)$/u, "🇨🇿"],
  [/^słowac(?:j|k)[\p{L}]*$/u, "🇸🇰"],
  [/^ukrai(?:n|ńsk)[\p{L}]*$/u, "🇺🇦"],
  [/^ros(?:j|yjs)[\p{L}]*$/u, "🇷🇺"],
  [/^(?:usa|amerykańsk[\p{L}]*)$/u, "🇺🇸"],
  [/^kanad[\p{L}]*$/u, "🇨🇦"],
  [/^(?:japon[\p{L}]*|japońsk[\p{L}]*)$/u, "🇯🇵"],
  [/^(?:chiny|chin|chinach|chinami|chińsk[\p{L}]*)$/u, "🇨🇳"],
  [/^portugal[\p{L}]*$/u, "🇵🇹"],
  [/^szwe(?:cj|dzk)[\p{L}]*$/u, "🇸🇪"],
  [/^norwe(?:gi|sk)[\p{L}]*$/u, "🇳🇴"],
  [/^(?:finland|fińsk)[\p{L}]*$/u, "🇫🇮"],
  [/^austri(?:a|i|ę|ą|ack[\p{L}]*)$/u, "🇦🇹"],
  [/^szwajcar[\p{L}]*$/u, "🇨🇭"],
  [/^gre(?:cj|ck)[\p{L}]*$/u, "🇬🇷"],
  [/^tur(?:cj|eck)[\p{L}]*$/u, "🇹🇷"],
  [/^brazyl[\p{L}]*$/u, "🇧🇷"],
  [/^austral[\p{L}]*$/u, "🇦🇺"],
  [/^trzmiel[\p{L}]*$/u, "🐝"],
  [/^pszcz[oó]ł/u, "🐝"],
  [/^skuter(?:a|em|y|ze|ów|ami|ach)?$/u, "🛵"],
  [/^rower(?:em|u|y|ze|ów|ami|ach)?$/u, "🚲"],
  [/^samolot(?:em|u|y|ów|ami|ach)?$/u, "✈️"],
  [/^rakiet(?:a|ę|y|ą|ami)?$/u, "🚀"],
  [/^kaw(?:a|ę|y|ą|ie)?$/u, "☕"],
  [/^pizz(?:a|ę|y|ą|ie)?$/u, "🍕"],
  [/^kot(?:a|y|em|ów|ami)?$/u, "🐈"],
  [/^ps(?:a|y|em|ów|ami)$/u, "🐕"],
  [/^telefon(?:em|u|y|ów|ami)?$/u, "📱"],
  [/^książ(?:ka|kę|ki|ką|ce|ek)$/u, "📚"],
  [/^serc(?:e|a|em|u)$/u, "❤️"],
  [/^mózg(?:u|iem|i|ów)?$/u, "🧠"],
  [/^słońc(?:e|a|em|u)$/u, "☀️"],
  [/^kwiat(?:ek|ku|kach|kami|ki|y|ów|em|ami)?$/u, "🌸"],
  [/^(?:śpi[\p{L}]*|spać|zasypi[\p{L}]*|sen|snu)$/u, "😴"],
  [/^(?:noc|nocy|wiecz[\p{L}]*|późno)$/u, "🌙"],
  [/^ran(?:o|a|ek|kiem)$/u, "🌅"],
  [/^dom(?:u|em|y|ów|ach|ami)?$/u, "🏠"],
  [/^dzie(?:ń|nia|niem)$/u, "☀️"],
  [/^nektar[\p{L}]*$/u, "🍯"],
  [/^firm(?:a|ę|y|ą|ie|om)?$/u, "🏢"],
  [/^zakład(?:y|ów|em|u|ach|ami)?$/u, "🏭"],
  [/^polity(?:ka|kę|ki|ką|ce)$/u, "🏛️"],
  [/^zarzut[\p{L}]*$/u, "⚖️"],
  [/^premier[\p{L}]*$/u, "🏛️"],
  [/^(?:sprzed[\p{L}]*|rozprzed[\p{L}]*)$/u, "💸"],
  [/^kupi(?:ł|ła|li|ć|ę|ą|ło|ły)$/u, "🛒"],
  [/^cisz(?:a|ę|y|ą)$/u, "🤫"],
  [/^gospodar(?:ka|ki|kę|ce|ką)$/u, "📊"],
  [/^miesi(?:ąc|ące|ąca|ącu|ęcy)$/u, "📅"],
  [/^słysz[\p{L}]*$/u, "👂"],
  [/^zdję(?:cie|cia|ciu|ciami|ciach|ć)$/u, "📷"],
  [/^(?:news|newsa|newsy|wiadomość|wiadomości)$/u, "📰"],
];
const stop = new Set(
  "jasność europejski europejska europejskie dwa trzy cztery pięć sześć siedem osiem dziewięć dziesięć jakoś bardzo właśnie nagle który która które którego kiedy teraz tutaj sobie tylko takie także dobra może jeszcze jeden drugie trzecie pierwszy drugi trzeci trochę będzie będą było jest jestem mamy mają robi żeby chcę wiem wiecie wiesz okazuje podobnie regularny".split(
    " ",
  ),
);
// Enclosed CJK/letter buttons are dictionary annotations, not topic illustrations.
const safeEmoji = (emoji) => typeof emoji === "string" &&
  /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})/u.test(emoji) &&
  !/[\p{L}\p{N}\u{1F100}-\u{1F1E5}\u{1F200}-\u{1F2FF}]/u.test(emoji);
export function emojiForWord(text) {
  const word = text
    .toLocaleLowerCase("pl")
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (stop.has(word)) return null;
  const emoji = icons.find(([pattern]) => pattern.test(word))?.[1] ?? keywords[word];
  // No fuzzy stems: e.g. a financial term must not inherit an unrelated icon.
  return safeEmoji(emoji) ? emoji : null;
}
export function titleHighlight(text, highlight) {
  return typeof highlight === "string" &&
    highlight.trim() &&
    !/^(?:#[\da-f]{3,8}|rgba?\(|hsla?\()/i.test(highlight) &&
    text.includes(highlight)
    ? highlight
    : null;
}

export function emojiForCaptionWord(word, overlays = []) {
  const anchored = overlays.find(
    (o) =>
      o.type === "emoji" &&
      o.label === "word" &&
      Math.abs(o.start - word.start) < 0.001 &&
      typeof o.emoji === "string" &&
      safeEmoji(o.emoji),
  );
  return anchored?.emoji ?? emojiForWord(word.text);
}

export function captionEmojis(words, overlays = []) {
  const seen = new Set();
  let count = 0;
  return words.map((word) => {
    const emoji = emojiForCaptionWord(word, overlays);
    if (!emoji || seen.has(emoji)) return null;
    const flag = /^\p{Regional_Indicator}{2}$/u.test(emoji);
    if (!flag && count >= 2) return null;
    seen.add(emoji);
    count++;
    return emoji;
  });
}
