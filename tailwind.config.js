module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
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
        focus_color: "#9747FF"

      },
      fontFamily: {
        primary1: ["Rubik", "sans-serif"],
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
    require('tw-elements/dist/plugin')
  ],
}