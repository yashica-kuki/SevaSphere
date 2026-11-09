/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#123B32",
        ivory: "#F7F5EF",
        gold: "#D6AD60",
        sage: "#E5EEE8",
        charcoal: "#26332F",
        border: "#E6E9E4"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      boxShadow: {
        soft: "0 4px 24px rgba(18, 59, 50, 0.06)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      }
    }
  },
  plugins: []
};