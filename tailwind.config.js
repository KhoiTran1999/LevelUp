/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './public/**/*.{html,js}',
    './src/**/*.{html,js}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Roboto Flex"', '"Roboto"', '"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        guild: {
          gold: '#f59e0b',
          goldHover: '#d97706',
          goldLight: '#fde68a'
        },
        md: {
          primary: '#f59e0b',
          'on-primary': '#ffffff',
          'primary-container': '#fef3c7',
          'on-primary-container': '#78350f',
          surface: '#f8fafc',
          'on-surface': '#0f172a',
          'surface-variant': '#f1f5f9',
          'on-surface-variant': '#475569',
          outline: '#94a3b8',
          'outline-variant': '#cbd5e1'
        }
      },
      screens: {
        xs: '380px',
      },
      spacing: {
        '0.2': '1px',
      },
      scale: {
        '98': '0.98',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'md-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'md-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'md-4': '0px 2px 3px 0px rgba(0, 0, 0, 0.30), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
        'md-5': '0px 4px 4px 0px rgba(0, 0, 0, 0.30), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'xs': '4px',
        'md-xs': '4px',
        'md-sm': '8px',
        'md-md': '12px',
        'md-lg': '16px',
        'md-xl': '28px',
        'md-full': '9999px',
      }
    }
  },
  plugins: [],
}
