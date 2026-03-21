/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#030712',
        }
      }
    },
  },
  plugins: [],
}
