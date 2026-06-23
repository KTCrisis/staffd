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
    // Artefacts de build OpenNext/Cloudflare (gitignorés) — sinon ~20k faux positifs
    // sur du JS minifié noyaient le lint du code source.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
