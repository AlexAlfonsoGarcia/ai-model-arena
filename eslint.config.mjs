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
    // Temporary debugging files
    "test-local-mock.js",
    "test-local-mock2.js",
    "test-manual-mock-validation.js",
    "test-manual-mock-working.js",
    "test-manual-mock.js",
    "test-mock-check.js",
    "test-mock-simple.js",
    "test-node-require.js",
    "test-vitest-mock.js",
    "debug-import.test.ts",
    "debug-next-resolution.ts",
    "simple.test.ts",
  ]),
]);

export default eslintConfig;
