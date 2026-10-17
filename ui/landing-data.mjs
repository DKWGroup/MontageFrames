export const PLANS = [
  {
    name: "Solo",
    price: 129,
    reels: 15,
    tokens: 250000,
    for: "Gdy publikujesz we własnym rytmie.",
  },
  {
    name: "Creator",
    price: 299,
    reels: 50,
    tokens: 1000000,
    for: "Gdy regularnie tworzysz dla siebie i klientów.",
  },
  {
    name: "Studio",
    price: 699,
    reels: 150,
    tokens: 3000000,
    for: "Gdy montujesz dla kilku marek.",
  },
];
export function savings(count, manual, review, hourly) {
  const safe = (n) => (Number.isFinite(n) ? Math.max(0, n) : 0);
  const minutes = safe(count) * Math.max(0, safe(manual) - safe(review));
  return { minutes, hours: minutes / 60, value: (minutes / 60) * safe(hourly) };
}
export const COMPETITORS = [
  {
    name: "Submagic",
    price: "od 19 USD/mies.",
    limit:
      "Starter: 15 filmów; Pro: 39 USD / 40 filmów; Business: 69 USD / 100 filmów.",
    focus: "Napisy i automatyczny montaż krótkich filmów.",
    href: "https://www.submagic.co/pricing",
  },
  {
    name: "Captions",
    price: "od 24,99 USD/mies.",
    limit: "Max: 500 kredytów. Frontier: od 69,99 USD / 1400 kredytów.",
    focus: "AI Edit, generowanie i edytor czatowy. Cennik strony dotyczy iOS.",
    href: "https://captions.ai/pricing",
  },
  {
    name: "OpusClip",
    price: "od 15 USD/mies.",
    limit: "Starter: 150 kredytów. Pro: 29 USD / 300 kredytów.",
    focus: "Wybieranie krótkich fragmentów z długich nagrań.",
    href: "https://www.opus.pro/pricing",
  },
];
