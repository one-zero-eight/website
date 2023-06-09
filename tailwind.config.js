/** @type {import('tailwindcss').Config} */
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
      fontFamily: {
        primary: ["Rubik", "sans-serif"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
