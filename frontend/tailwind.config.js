/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3457d5",
          600: "#2a45b3",
          700: "#213690",
        },
      },
    },
  },
  plugins: [],
};
