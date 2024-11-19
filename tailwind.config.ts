import { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "index.html"],
  theme: {
    extend: {
      width: {
        52: "3.25rem",
      },
      height: {
        52: "3.25rem",
      },
      colors: {
        pagebg: "rgba(var(--color-pagebg) / <alpha-value>)",
        sidebar: "rgba(var(--color-sidebar) / <alpha-value>)",
        popup: "rgba(var(--color-popup) / <alpha-value>)",
        primary: {
          DEFAULT: "rgba(var(--color-primary) / <alpha-value>)",
          hover: "rgba(var(--color-primary-hover) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgba(var(--color-secondary) / <alpha-value>)",
          hover: "rgba(var(--color-secondary-hover) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgba(var(--color-border) / <alpha-value>)",
          hover: "rgba(var(--color-border-hover) / <alpha-value>)",
        },
        inactive: "rgba(var(--color-inactive) / <alpha-value>)",
        icon: {
          main: "rgba(var(--color-icon) / <alpha-value>)",
          hover: "rgba(var(--color-icon-hover) / <alpha-value>)",
        },
        text: {
          main: "rgba(var(--color-text) / <alpha-value>)",
          secondary: "rgba(var(--color-text-secondary) / <alpha-value>)",
        },
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
