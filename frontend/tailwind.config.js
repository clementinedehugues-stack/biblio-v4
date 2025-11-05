/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-dark': '#1A1A1A',
        'custom-red': '#8B0000',
      },
    },
  },
  plugins: [],
}