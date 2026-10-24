import { getRemotionEnvironment, getStaticFiles, staticFile } from "remotion";

// Fonty z public/fonts. Wpis bez pliku na dysku jest pomijany,
// więc styl spada na następny font z listy font-family.
import { fontCatalog as FONTS, type FontBinding } from "./font-catalog.mjs";

const loading = new Map<string, Promise<unknown>>();

export const loadFonts = (bindings?: FontBinding[]) => {
  // W Playerze (panel ui/) getStaticFiles() zwraca pustą listę — próbujemy wszystkie fonty, brakujący plik pomijamy.
  const present = getRemotionEnvironment().isPlayer
    ? null
    : new Set(getStaticFiles().map((f) => f.name));
  const key = JSON.stringify(bindings ?? FONTS);
  if (loading.has(key)) return loading.get(key)!;
  const pending = Promise.all(
    (bindings ?? FONTS)
      .filter((f) => bindings || !present || present.has(f.file))
      .map(async (f) => {
        const face = new FontFace(f.family, `url('${staticFile(f.file)}')`, {
          weight: f.weight,
          style: f.style ?? "normal",
        });
        try {
          document.fonts.add(await face.load());
        } catch (e) {
          if (present || bindings) throw e; // w Studio i renderze zepsuty font to błąd
        }
      }),
  );
  loading.set(key, pending);
  pending.catch(() => loading.delete(key));
  return pending;
};
