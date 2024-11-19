import { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "index.html"],
  theme: {
    extend: {
      colors: {
        pagebg: "rgba(var(--color-pagebg) / <alpha-value>)",
        floating: "rgba(var(--color-floating) / <alpha-value>)",
        primary: {
          DEFAULT: "rgba(var(--color-primary) / <alpha-value>)",
          hover: "rgba(var(--color-primary-hover) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgba(var(--color-secondary) / <alpha-value>)",
          hover: "rgba(var(--color-secondary-hover) / <alpha-value>)",
        },
        inactive: "rgba(var(--color-inactive) / <alpha-value>)",
        contrast: "rgba(var(--color-contrast) / <alpha-value>)",
        brand: {
          violet: "rgba(var(--color-brand-violet) / <alpha-value>)",
          gradient: {
            start: "rgba(var(--color-brand-gradient-start) / <alpha-value>)",
            end: "rgba(var(--color-brand-gradient-end) / <alpha-value>)",
          },
        },
      },
      fontFamily: {
        rubik: ["Rubik Variable", "sans-serif"],
        handwritten: ["Fuzzy Bubbles", "sans-serif"],
      },
      screens: {
        "lgw-smh": { raw: "(min-width: 1024px) and (min-height: 600px)" },
        "4xl": { raw: "(min-width: 2048px)" },
      },
      typography: {
        // Remove blockquote styling from Tailwind Typography
        // Use as "prose-quoteless"
        quoteless: {
          css: {
            "blockquote p:first-of-type::before": { content: "none" },
            "blockquote p:first-of-type::after": { content: "none" },
          },
        },
      },
    },
  },
  darkMode: ["class"],
  plugins: [
    require("@iconify/tailwind").addDynamicIconSelectors(),
    require("@tailwindcss/container-queries"),
    require("@tailwindcss/typography"),
  ],
};
export default config;
