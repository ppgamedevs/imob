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
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Poppins"', "Inter", "sans-serif"],
      },
      boxShadow: {
        "card-lg": "0 10px 30px rgba(8,15,30,0.12)",
        glass: "0 6px 18px rgba(11,20,40,0.08)",
      },
      borderRadius: {
        "lg-2": "14px",
      },
    },
  },
  plugins: [],
};
