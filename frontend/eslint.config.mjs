import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      // Texte français : apostrophes et guillemets sont écrits tels quels dans le JSX, sans risque.
      "react/no-unescaped-entities": "off",
      // Mascotte et illustrations sont de petits fichiers locaux déjà optimisés ; next/image n'apporte rien ici.
      "@next/next/no-img-element": "off",
      // Dette technique connue (audit 2026-09-29) : visible en avertissement, à résorber fichier par fichier,
      // sans bloquer la CI tant que la règle n'est pas nettoyée.
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Brouillons locaux non suivis par git.
    "DashboardClient_reconstructed.tsx",
    "extract3.cjs",
    "**/*.cjs",
    // Build officiel de Scratch 3.0 (vendored, servi tel quel) : pas notre code.
    "public/scratch/**",
    // Runtime MediaPipe copié depuis node_modules par scripts/copy-mediapipe.mjs (code généré, tiers).
    "public/mediapipe/**",
  ]),
]);

export default eslintConfig;
