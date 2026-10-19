/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: "#0B120E",
        foreground: "#F1F5F3",
        muted: "#8FA597",
        panel: { DEFAULT: "#13211B", 2: "#192E25" },
        sidebar: { DEFAULT: "#0E1813", accent: "#1A2E25", border: "#1F3329" },
        line: "#253D32",
        turf: "#10B981",
        gold: "#D97706",
        warn: "#FBBF24",
        destructive: "#F87171",
        track: "#070E0A",
      },
      fontFamily: {
        heading: ["'Outfit Variable'", "system-ui", "sans-serif"],
        sans: ["'DM Sans Variable'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono Variable'", "ui-monospace", "monospace"],
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-ring": { "0%,100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.4)" }, "50%": { boxShadow: "0 0 0 6px rgba(16,185,129,0)" } },
      },
      animation: {
        rise: "rise 150ms ease-out both",
        "pulse-ring": "pulse-ring 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
