/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{ts,tsx,js,jsx}",
    "./src/components/**/*.{ts,tsx,js,jsx}",
    "./src/lib/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system tokens (matching tokens.css)
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        primaryFg: "rgb(var(--primary-contrast) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warn) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        adBg: "rgb(var(--surface-2) / <alpha-value>)",
        adBorder: "rgb(var(--border) / <alpha-value>)",
        adLabel: "rgb(var(--ad-tint) / <alpha-value>)",
        // Legacy brand colors (keeping for compatibility)
        brand: {
          50: "#f6fbff",
          100: "#eaf6ff",
          200: "#cdecff",
          300: "#9bdbff",
          400: "#58c2ff",
          500: "#1aa6ff",
          600: "#148be6",
          700: "#0f68b4",
          800: "#0b497f",
          900: "#05283f",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ['"Poppins"', "Inter", "sans-serif"],
      },
      boxShadow: {
        elev0: "var(--elev0)",
        elev1: "var(--elev1)",
        elev2: "var(--elev2)",
        elev3: "var(--elev3)",
        "card-lg": "0 10px 30px rgba(8,15,30,0.12)",
        glass: "0 6px 18px rgba(11,20,40,0.08)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-md)",
        xl: "var(--r-xl)",
        "lg-2": "14px",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
      },
      transitionTimingFunction: {
        smooth: "var(--ease-smooth)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
    },
  },
  plugins: [],
};
