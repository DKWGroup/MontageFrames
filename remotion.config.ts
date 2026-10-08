// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);

// Osobne węzły JSX potrzebne do edycji każdego bloku w inspektorze.
import { createRequire } from "node:module";
import path from "node:path";
const requireStudio = createRequire(path.join(process.cwd(), "package.json"));
if (process.argv.includes("studio")) {
  requireStudio("./scripts/studio-sync.mjs").watchStudio();
} else {
  requireStudio("./scripts/studio-sync.mjs").syncStudio();
}
