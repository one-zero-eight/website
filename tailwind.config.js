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
        light_base: "#FFFFFF",
        light_primary: "#F2F3F5",
        light_primary_hover: "#DFE1E5",
        light_secondary: "#E3E5E8",
        light_secondary_hover: "#D2D4D8",
        light_border: "#D3D3D3",
        light_disabled: "#414141",
        light_icon: "rgba(0, 0, 0, 0.5)",
        light_icon_hover: "rgba(0, 0, 0, 0.75)",
        base: "#0B0B0B",
        primary: "#171717",
        primary_hover: "#222222",
        secondary: "#222222",
        secondary_hover: "#282828",
        border: "#2C2C2C",
        disabled: "#2B2B2B",
        inactive: "#414141",
        icon: "rgba(255, 255, 255, 0.5)",
        icon_hover: "rgba(255, 255, 255, 0.75)",
        text: "#FFFFFF",
        text_secondary: "rgba(255, 255, 255, 0.75)",
        text_transparent: "rgba(255, 255, 255, 0.5)",
        section_g_start: "#9A2EFF",
        section_g_end: "#6E35A2",
        focus_color: "#9747FF",
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
      spacing: {
        "18p": "4.5rem",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
