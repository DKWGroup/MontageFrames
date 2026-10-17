import { defineConfig } from "vite";
import { readFile } from "node:fs/promises";

// Explicit public assets: never copy the local video workspace to a public host.
export const siteFonts = ["CabinetGrotesk-Variable.woff2", "Fustat.ttf"];
export default defineConfig({
  root: "site",
  publicDir: false,
  build: { outDir: "../dist-site", emptyOutDir: true },
  plugins: [
    {
      name: "public-site-fonts",
      async generateBundle() {
        for (const name of siteFonts)
          this.emitFile({
            type: "asset",
            fileName: `fonts/${name}`,
            source: await readFile(
              new URL(`./public/fonts/${name}`, import.meta.url),
            ),
          });
      },
    },
  ],
});
