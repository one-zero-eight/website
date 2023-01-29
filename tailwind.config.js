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
        click_question: "171717"

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