import { staticFile } from "remotion";
import type { BrandingSnapshot, FontRef } from "./types";

const loaded = new Map<string, Promise<void>>();
export const brandFontFamily = (font: FontRef) =>
  `Brand_${font.sha256.slice(0, 20)}_${font.weight.replace(/\W/g, "")}_${font.style}`;
export function loadBrandFonts(
  branding?: Pick<BrandingSnapshot, "fonts">,
): Promise<void> {
  if (!branding) return Promise.resolve();
  if (!branding.fonts.primary)
    return Promise.reject(new Error("Wybierz i zaimportuj font brandingu."));
  return Promise.all(
    [branding.fonts.primary, branding.fonts.emphasis]
      .filter((x): x is FontRef => Boolean(x))
      .map((font) => {
        const key = brandFontFamily(font);
        if (!loaded.has(key)) {
          const pending = new FontFace(
            key,
            `url(${JSON.stringify(staticFile(font.file))})`,
            { weight: font.weight, style: font.style },
          )
            .load()
            .then((face) => {
              document.fonts.add(face);
            })
            .catch((e) => {
              loaded.delete(key);
              throw e;
            });
          loaded.set(key, pending);
        }
        return loaded.get(key)!;
      }),
  ).then(() => {});
}
