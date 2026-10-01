/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        soft: token("soft"),
        line: token("line"),
        ink: token("ink"),
        mute: token("mute"),
        brand: token("brand"),
        onbrand: token("onbrand"),
        sun: "#FFC83D",
        sunink: "#14123A",
        danger: token("danger"),
        ok: token("ok"),
      },
      fontFamily: {
        display: ["'Secular One'", "Heebo", "sans-serif"],
        body: ["Heebo", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 1px 0 rgb(var(--line) / 0.6), 0 18px 40px -26px rgb(var(--shadow) / 0.5)",
      },
    },
  },
  plugins: [],
};
