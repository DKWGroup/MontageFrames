export function emojiForWord(text: string): string | null;
export function titleHighlight(
  text: string,
  highlight: string | undefined,
): string | null;

export function emojiForCaptionWord(
  word: { text: string; start: number },
  overlays?: { type: string; label?: string; start: number; emoji?: string }[],
): string | null;

export function captionEmojis(
  words: { text: string; start: number }[],
  overlays?: { type: string; label?: string; start: number; emoji?: string }[],
): (string | null)[];
