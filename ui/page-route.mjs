const sections = new Set([
  "#tresc",
  "#jak-dziala",
  "#czas",
  "#integracje",
  "#porownanie",
  "#cennik",
  "#faq",
]);
export function pageRoute(pathname, hash) {
  if (pathname === "/panel" || pathname.startsWith("/panel/")) return "panel";
  if (hash && hash !== "#" && !sections.has(hash)) return "legacy-panel";
  return "landing";
}
