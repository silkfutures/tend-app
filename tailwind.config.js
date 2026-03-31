/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: "#F7F5F2",
          surface: "#FFFFFF",
          "surface-alt": "#F0EDE8",
          border: "#E5E0D8",
          "border-strong": "#C8C0B4",
          accent: "#1A1A1A",
          "accent-dim": "#4A4A4A",
          text: "#1A1A1A",
          muted: "#8A8278",
          light: "#B5B0A8",
          reset: "#2563EB",
          reframe: "#7C3AED",
          rebuild: "#047857",
          release: "#C2410C",
          rise: "#B45309",
          danger: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "'Helvetica Neue'", "sans-serif"],
        mono: ["'DM Mono'", "'Courier New'", "monospace"],
      },
    },
  },
  plugins: [],
};
