import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Electron desktop app build output and its plain-Node (CommonJS) build
    // scripts — these aren't part of the Next.js/React app and intentionally
    // use require() rather than ES modules.
    "release/**",
    "electron/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
