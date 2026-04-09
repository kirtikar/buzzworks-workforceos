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
        teal: {
          300: "#5EECD4",
          400: "#33DDB5",
          500: "#00D4A5",
          600: "#00B089",
        },
        violet: {
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        coral: {
          400: "#FF8E8E",
          500: "#FF6B6B",
          600: "#FF4848",
        },
        mint: {
          400: "#34D399",
          500: "#10B981",
        },
        amber: {
          400: "#FBB64A",
          500: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config
