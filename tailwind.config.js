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
        hover_color: "#2B2B2B",
        click_color: "#0B0B0B",
        click_question: "#171717",
        section_g_start: "#9A2EFF",
        section_g_end: "#6E35A2",
        inactive: "#414141",
        focus_color: "#9747FF",
      },
      boxShadow: {
        "5xl": "0 0 35px 0 rgba(151, 71, 255, 0.75)",
        "5xl-m": "0 0 35px 0 rgba(151, 71, 255, 0.90)",
      },
      fontFamily: {
        primary: ["var(--font-rubik)", "sans-serif"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
