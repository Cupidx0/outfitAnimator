/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    // Spacing scale: 4, 8, 12, 16, 24, 32, 48. Nothing in between.
    spacing: {
      0: "0px",
      px: "1px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      6: "24px",
      8: "32px",
      12: "48px",
    },
    // Three sizes. Use font weight for any other hierarchy.
    fontSize: {
      base: ["16px", "24px"],
      lg: ["20px", "28px"],
      "2xl": ["32px", "40px"],
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
    },
    extend: {
      // Colour values live in src/index.css so light and dark mode share one set of names.
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        accent: { DEFAULT: "var(--accent)", hover: "var(--accent-hover)" },
        "on-accent": "var(--on-accent)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      borderColor: { DEFAULT: "var(--line)" },
    },
  },
  plugins: [],
};
