/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#171717",
        border: "#2C2C2C",
        background_dark: "#0B0B0B",
        hover_color: "#222222",
        click_color: "#0B0B0B",
        click_question: "#171717",
        section_g_start: "#9A2EFF",
        section_g_end: "#6E35A2",
        inactive: "#414141",
        focus_color: "#9747FF",
        secondary: "rgba(255, 255, 255, 0.5)",
        secondary_hover: "rgba(255, 255, 255, 0.75)",
      },
      boxShadow: {
        "5xl": "0 0 35px 0 rgba(151, 71, 255, 0.75)",
        "5xl-m": "0 0 35px 0 rgba(151, 71, 255, 0.90)",
      },
      fontFamily: {
        primary: ["var(--font-rubik)", "sans-serif"],
      },
      screens: {
        "smw-mdh": { raw: "(min-width: 640px) and (min-height: 768px)" },
        "sm-h": { raw: "(min-height: 640px)" },
        "md-h": { raw: "(min-height: 768px)" },
        "lg-h": { raw: "(min-height: 1024px)" },
        "xl-h": { raw: "(min-height: 1280px)" },
        "2xl-h": { raw: "(min-height: 1536px)" },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
