/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brew: "#38bdf8",
        grow: "#34d399",
        bigb: "#c084fc",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      transitionDuration: { DEFAULT: "150ms" },
      boxShadow: {
        card: "0 1px 3px hsl(224 71% 2% / 0.4), 0 0 0 1px hsl(var(--border))",
        "card-hover": "0 4px 20px hsl(224 71% 2% / 0.6), 0 0 0 1px hsl(var(--ring))",
      },
    },
  },
  plugins: [],
}
