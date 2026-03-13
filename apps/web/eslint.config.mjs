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
  ]),
  // TanStack Table's useReactTable returns functions that React Compiler cannot
  // memoize — this is a known library limitation, not a code issue.
  {
    files: ["src/components/data-table.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
