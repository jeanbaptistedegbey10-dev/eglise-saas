import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Configuration ESLint (format plat, ESLint 9).
 *
 * `eslint-config-next` expose désormais ses configurations en format plat :
 * plus besoin du pont `FlatCompat` (qui sérialise la config en JSON et
 * échoue sur les structures circulaires des plugins React).
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
    ],
  },
];

export default eslintConfig;
