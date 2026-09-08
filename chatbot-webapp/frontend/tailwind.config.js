/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "#F6F3EC",
        ink: "#1E2A25",
        muted: "#5B6B63",
        line: "#DDD6C7",
        teal: {
          DEFAULT: "#3D6B66",
          dark: "#2A4C48",
          light: "#7FA39D",
          tint: "#E7EFEC",
        },
        clay: "#B65C4A",
        sand: "#EDE7D8",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(30, 42, 37, 0.06)",
      },
    },
  },
  plugins: [],
};
