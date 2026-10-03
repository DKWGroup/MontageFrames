import { getStaticFiles, staticFile } from "remotion";

// Fonty z public/fonts. Wpis bez pliku na dysku jest pomijany,
// więc styl spada na następny font z listy font-family.
const FONTS: {
  family: string;
  file: string;
  weight: string;
  style?: string;
}[] = [
  { family: "Montserrat", file: "fonts/Montserrat.ttf", weight: "100 900" },
  { family: "Libre Baskerville", file: "fonts/LibreBaskerville.ttf", weight: "400 700" },
  { family: "Libre Baskerville", file: "fonts/LibreBaskerville-Italic.ttf", weight: "400 700", style: "italic" },
  { family: "Poppins", file: "fonts/Poppins-Medium.ttf", weight: "500" },
  { family: "Poppins", file: "fonts/Poppins-Black.ttf", weight: "900" },
  { family: "Nunito", file: "fonts/Nunito.ttf", weight: "200 1000" },
  { family: "Fustat", file: "fonts/Fustat.ttf", weight: "200 800" },
  // Font marki Persony — wrzuć pliki z madetype.com pod tymi nazwami, a styl "persona" sam go użyje.
  {
    family: "MADE Tommy Soft",
    file: "fonts/MADETommySoft-Bold.otf",
    weight: "700",
  },
  {
    family: "MADE Tommy Soft",
    file: "fonts/MADETommySoft-ExtraBold.otf",
    weight: "800",
  },
  {
    family: "MADE Tommy Soft",
    file: "fonts/MADETommySoft-Black.otf",
    weight: "900",
  },
];

let loading: Promise<unknown> | null = null;

export const loadFonts = () => {
  const present = new Set(getStaticFiles().map((f) => f.name));
  loading ??= Promise.all(
    FONTS.filter((f) => present.has(f.file)).map(async (f) => {
      const face = new FontFace(f.family, `url('${staticFile(f.file)}')`, {
        weight: f.weight,
        style: f.style ?? "normal",
      });
      document.fonts.add(await face.load());
    }),
  );
  return loading;
};
