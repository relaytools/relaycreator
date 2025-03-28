/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    extend: {
      fontFamily: {
        jetbrains: ["var(--font-jetbrains)"],
        sans: ["var(--font-open-sans)"],
        mono: ["var(--font-roboto-mono)"],
        roboto: ["var(--font-roboto)"],
        condensed: ["var(--font-roboto-condensed)"],
      },
    },
    fontSize: {
        base: '1.25rem', // 20px
        lg: '1.38rem',
        xl: '1.625rem',
        '2xl': '2rem', // 32px
        '5xl': '3rem', 
    }
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
}
