export const PLANS: {
  name: string;
  price: number;
  reels: number;
  tokens: number;
  for: string;
}[];
export const COMPETITORS: {
  name: string;
  price: string;
  limit: string;
  focus: string;
  href: string;
}[];
export function savings(
  count: number,
  manual: number,
  review: number,
  hourly: number,
): { minutes: number; hours: number; value: number };
