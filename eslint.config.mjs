import { config } from "@remotion/eslint-config-flat";
export default [
  ...config,
  { ignores: ["src/studio/**", "scripts/build_reel_*.mjs"] },
  {
    files: ["ui/**/*.tsx"],
    rules: { "@remotion/warn-native-media-tag": "off" },
  },
  {
    files: ["scripts/**/*.mjs", "ui/**/*.mjs"],
    languageOptions: {
      globals: Object.fromEntries(
        [
          "process",
          "Buffer",
          "console",
          "URL",
          "AbortController",
          "setTimeout",
          "clearTimeout",
          "setInterval",
          "clearInterval",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
