import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Primary (pink) ─── */
        primary: {
          50:  "#FFF1F6",
          100: "#FFE4EC",
          200: "#FFC7D8",
          300: "#FF9FBC",
          400: "#FF6F9F",
          500: "#FF3D7F",
          600: "#E62E6D",
          700: "#BF255A",
          800: "#991D47",
          900: "#66122F",
        },
        /* ── Neutral ─── */
        neutral: {
          50:  "#FAFAFB",
          100: "#F4F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
        /* ── Accent (charts & highlights only) ─── */
        accent: {
          mint:     "#2DD4BF",
          lavender: "#A78BFA",
          peach:    "#FFB4A2",
          yellow:   "#FACC15",
        },
        /* ── Semantic ─── */
        semantic: {
          success: "#22C55E",
          error:   "#EF4444",
          warning: "#F59E0B",
          info:    "#3B82F6",
        },
        /* ── Legacy aliases (existing code) ─── */
        coral:  { 400: "#FF8E8E", 500: "#FF6B6B", 600: "#FF4848" },
        mint:   { 400: "#34D399", 500: "#10B981" },
        amber:  { 400: "#FBB64A", 500: "#F59E0B" },
        teal:   { 300: "#5EECD4", 400: "#33DDB5", 500: "#00D4A5", 600: "#00B089" },
        violet: { 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
      },
    },
  },
  plugins: [],
}

export default config
