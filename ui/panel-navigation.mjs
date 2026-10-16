// Rozdzielenie adresów modułów od nazw pojedynczych rolek.
export function panelModule(hash) {
  if (hash === "#motion" || hash === "#motion/") return "motion";
  if (hash === "#lf" || hash.startsWith("#lf/")) return "longform";
  if (hash === "#qc" || hash.startsWith("#qc/")) return "quickcontent";
  return "reels";
}
