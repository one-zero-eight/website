import { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "index.html"],
  theme: {
    extend: {
      width: {
        52: "3.25rem",
        256: "64rem",
      },
      height: {
        52: "3.25rem",
      },
      colors: {
        base: "rgba(var(--color-base) / <alpha-value>)",
        sidebar: "rgba(var(--color-sidebar) / <alpha-value>)",
        popup: "rgba(var(--color-popup) / <alpha-value>)",
        primary: {
          main: "rgba(var(--color-primary) / <alpha-value>)",
          hover: "rgba(var(--color-primary-hover) / <alpha-value>)",
          tgresult: "#F3F4F6",
          mdlresult: "#FFFFFF",
        },
        secondary: {
          main: "rgba(var(--color-secondary) / <alpha-value>)",
          hover: "rgba(var(--color-secondary-hover) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgba(var(--color-border) / <alpha-value>)",
          hover: "rgba(var(--color-border-hover) / <alpha-value>)",
        },
        disabled: "rgba(var(--color-disabled) / <alpha-value>)",
        inactive: "rgba(var(--color-inactive) / <alpha-value>)",
        icon: {
          main: "rgba(var(--color-icon) / <alpha-value>)",
          hover: "rgba(var(--color-icon-hover) / <alpha-value>)",
        },
        text: {
          main: "rgba(var(--color-text) / <alpha-value>)",
          secondary: "rgba(var(--color-text-secondary) / <alpha-value>)",
          transparent: "rgba(var(--color-text-transparent) / <alpha-value>)",
        },
        section_g_start: "rgba(var(--color-section-g-start) / <alpha-value>)",
        section_g_end: "rgba(var(--color-section-g-end) / <alpha-value>)",
        focus: "rgba(var(--color-focus) / <alpha-value>)",
        breadcrumbs: "#93bd58",
        default: "#9CA3AF",
      },
      boxShadow: {
        "5xl": "0 0 35px 0 rgba(151, 71, 255, 0.75)",
        "5xl-m": "0 0 35px 0 rgba(151, 71, 255, 0.90)",
        "search-btn": "0px 0px 4px 0px #00000040",
      },
      fontFamily: {
        rubik: ["Rubik Variable", "sans-serif"],
        primary: ["Rubik Variable", "sans-serif"],
        handwritten: ["Fuzzy Bubbles", "sans-serif"],
      },
      screens: {
        "lgw-smh": { raw: "(min-width: 1024px) and (min-height: 600px)" },
        "sm-h": { raw: "(min-height: 640px)" },
        "md-h": { raw: "(min-height: 768px)" },
        "lg-h": { raw: "(min-height: 1024px)" },
        "xl-h": { raw: "(min-height: 1280px)" },
        "2xl-h": { raw: "(min-height: 1536px)" },
        "4xl": { raw: "(min-width: 2048px)" },
      },
      spacing: {
        "18p": "4.5rem",
      },
      typography: {
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
