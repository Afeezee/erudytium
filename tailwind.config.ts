import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1B4F72",
          foreground: "#F9FCFF"
        },
        accent: {
          DEFAULT: "#2E86C1",
          foreground: "#F7FBFF"
        },
        success: {
          DEFAULT: "#1E8449",
          foreground: "#F4FFF8"
        },
        warning: {
          DEFAULT: "#D68910",
          foreground: "#FFF9ED"
        },
        error: {
          DEFAULT: "#C0392B",
          foreground: "#FFF5F5"
        },
        neutral: {
          50: "#F7F9FA",
          100: "#ECF0F1",
          200: "#D5DBDB",
          300: "#BFC9CA",
          400: "#95A5A6",
          500: "#7F8C8D",
          600: "#5D6D6E",
          700: "#34495E",
          800: "#273746",
          900: "#17202A"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"]
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        shimmer: "shimmer 1.8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;