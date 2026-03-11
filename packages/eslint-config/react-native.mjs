import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [".expo/**", "dist/**", "android/**", "ios/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
]);
