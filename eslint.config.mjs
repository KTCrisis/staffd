import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Underscore-prefixed args/vars/catch bindings are intentionally unused
  // (e.g. signature-position params kept for callers).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
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
