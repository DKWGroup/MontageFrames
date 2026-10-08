// Panel MontageFrames w przeglądarce: `npm run ui` -> http://127.0.0.1:3100 (PANEL.md)
import { defineConfig } from "vite";
import { panelApi } from "./ui/server.mjs";

export default defineConfig({
  root: "ui",
  publicDir: "../public", // te same ścieżki co staticFile() w Remotion
  plugins: [panelApi()],
  server: {
    host: "127.0.0.1", // tylko ten komputer — udostępnianie pod linkiem to osobna decyzja (PANEL.md)
    port: 3100,
    strictPort: true,
    // public/ musi być obserwowane: nowe rolki i przebitki operatora pojawiają się w trakcie pracy serwera
  },
});
