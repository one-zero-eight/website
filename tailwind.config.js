module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#171717",
        border: "#2C2C2C"

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