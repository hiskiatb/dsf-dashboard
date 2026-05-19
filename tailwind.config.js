/** @type {import('tailwindcss').Config} */
// ============================================================
//  DSF DASHBOARD — Brand palette
//  #4D4D4F charcoal · #ED1C24 red · #FFCB05 yellow
//  #32BCAD teal     · #C6168D magenta · #EC008C pink
// ============================================================
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PRIMARY (magenta)
        brand: {
          50:  "#FCEAF3",
          100: "#F8D2E5",
          200: "#F2A7CD",
          300: "#EB7BB5",
          400: "#E54FA0",
          500: "#DE2890",
          600: "#C6168D",
          700: "#9B0F6E",
          800: "#6F0A4F",
          900: "#4A0735",
          DEFAULT: "#C6168D",
        },
        // ACCENT (pink)
        accent: {
          DEFAULT: "#EC008C",
          soft: "#FDE5F1",
        },
        // SUCCESS (teal)
        success: {
          50:  "#E1F6F3",
          100: "#C2EDE7",
          200: "#94DFD4",
          300: "#66D2C2",
          400: "#4AC7B7",
          500: "#32BCAD",
          600: "#2A9D91",
          700: "#1F7F76",
          800: "#16615A",
          900: "#0E423E",
          DEFAULT: "#32BCAD",
        },
        // WARNING (yellow)
        warning: {
          50:  "#FFF6D6",
          100: "#FFEEAD",
          200: "#FFE285",
          300: "#FFD85C",
          400: "#FFD133",
          500: "#FFCB05",
          600: "#D4A800",
          700: "#8A6A00",
          800: "#5C4700",
          900: "#2E2400",
          DEFAULT: "#FFCB05",
        },
        // DANGER (red)
        danger: {
          50:  "#FDE5E6",
          100: "#FACBCC",
          200: "#F69799",
          300: "#F26367",
          400: "#EE3F44",
          500: "#ED1C24",
          600: "#C5141B",
          700: "#B71219",
          800: "#800B11",
          900: "#4A0608",
          DEFAULT: "#ED1C24",
        },
        // INK (charcoal)
        ink: {
          50:  "#F7F7F8",
          100: "#F1F1F3",
          200: "#E5E5E8",
          300: "#C8C8CD",
          400: "#9C9CA1",
          500: "#76767A",
          600: "#5C5C5F",
          700: "#4D4D4F",
          800: "#2E2E30",
          900: "#1F1F20",
          DEFAULT: "#4D4D4F",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(77,77,79,.04), 0 1px 1px rgba(77,77,79,.04)",
        card: "0 4px 12px rgba(77,77,79,.06), 0 2px 4px rgba(77,77,79,.04)",
        pop:  "0 12px 32px rgba(77,77,79,.10), 0 4px 8px rgba(77,77,79,.04)",
      },
    },
  },
  plugins: [],
};
