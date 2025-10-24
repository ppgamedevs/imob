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
        // Design system tokens
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        primary: "var(--color-primary)",
        primaryFg: "var(--color-primary-foreground)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        adBg: "var(--ad-bg)",
        adBorder: "var(--ad-border)",
        adLabel: "var(--ad-label)",
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
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
        display: ['"Poppins"', "Inter", "sans-serif"],
      },
      boxShadow: {
        elev0: "var(--elev-0)",
        elev1: "var(--elev-1)",
        elev2: "var(--elev-2)",
        "card-lg": "0 10px 30px rgba(8,15,30,0.12)",
        glass: "0 6px 18px rgba(11,20,40,0.08)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
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
        emph: "var(--ease-emph)",
        inout: "var(--ease-in-out)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        med: "var(--dur-med)",
        slow: "var(--dur-slow)",
      },
    },
  },
  plugins: [],
};
