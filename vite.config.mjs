// Panel MontageFrames w przeglądarce: `npm run ui` -> http://127.0.0.1:3100 (PANEL.md)
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { panelApi } from "./ui/server.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "ui",
  publicDir: "../public", // te same ścieżki co staticFile() w Remotion
  plugins: [panelApi()],
  server: {
    host: "127.0.0.1", // tylko ten komputer — udostępnianie pod linkiem to osobna decyzja (PANEL.md)
    port: 3100,
    strictPort: true,
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        path.resolve(__dirname, ".."),
        path.resolve(__dirname),
        "/Users/wskopek/Library/CloudStorage/GoogleDrive-wskopek.all@gmail.com/Mój dysk/Wspólny dysk MAC/Github projekty/MontageFrames",
        "/Users/wskopek/Library/CloudStorage/GoogleDrive-wskopek.all@gmail.com/Mój dysk/Wspólny dysk MAC/Github projekty/MontageFrames",
        "/Volumes/t7 blck bad",
      ],
    },
    // public/ musi być obserwowane: nowe rolki i przebitki operatora pojawiają się w trakcie pracy serwera
  },
});
