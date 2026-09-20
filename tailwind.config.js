/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './public/**/*.{html,js}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        guild: {
          gold: '#f59e0b',
          goldHover: '#d97706',
          goldLight: '#fde68a'
        }
      }
    }
  },
  plugins: [],
}
