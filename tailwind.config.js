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
        condensed: ["var(--font-roboto-condensed)"],
      }
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
    //require('@tailwindcss/forms'),
    require("@tailwindcss/typography"),
    require("daisyui"),
  ],
  daisyui: {
    styled: true,
    utils: true,
    base: true,
    themes: [
      {
        light: {

          "primary": "#ff007c",
          //"primary": "#6c4ab6",
          "secondary": "#8d72e1",
          "accent": "#bd9fff",
          "neutral": "#1E293B",
          "base-100": "#ffffff",
          //"base-100": "#D3D3D3",

          //"--rounded-box": "0.1rem", // border radius rounded-box utility class, used in card and other large boxes
          "--rounded-btn": "0.1rem", // border radius rounded-btn utility class, used in buttons and similar element
          "--rounded-badge": "1.9rem", // border radius rounded-badge utility class, used in badges and similar
          "--animation-btn": "0.25s", // duration of animation when you click on button
          "--animation-input": "0.2s", // duration of animation for inputs like checkbox, toggle, radio, etc
          "--btn-text-case": "uppercase", // set default text transform for buttons
          "--btn-focus-scale": "0.95", // scale transform of button when you focus on it
          "--border-btn": "1px", // border width of buttons
          "--tab-border": "1px", // border width of tabs
          "--tab-radius": "0.5rem", // border radius of tabs
        },
      },
      {
        dark: {
          "primary": "#ff007c",
          //"primary": "#6c4ab6",
          "secondary": "#8d72e1",
          "accent": "#8d5edd",
          "neutral": "#1E293B",
          //"base-100": "#0F172A",
          "base-100": "#141641",
          "info": "#B9E0FF",
          //"success": "#FF007c",
          "warning": "#F4BF50",
          "error": "#FB7085",

          //"--rounded-box": "0.1rem", // border radius rounded-box utility class, used in card and other large boxes
          "--rounded-btn": "0.1rem", // border radius rounded-btn utility class, used in buttons and similar element
          "--rounded-badge": "1.9rem", // border radius rounded-badge utility class, used in badges and similar
          "--animation-btn": "0.25s", // duration of animation when you click on button
          "--animation-input": "0.2s", // duration of animation for inputs like checkbox, toggle, radio, etc
          "--btn-text-case": "uppercase", // set default text transform for buttons
          "--btn-focus-scale": "0.95", // scale transform of button when you focus on it
          "--border-btn": "1px", // border width of buttons
          "--tab-border": "1px", // border width of tabs
          "--tab-radius": "0.5rem", // border radius of tabs
        },
      },
    ],
  },
}
