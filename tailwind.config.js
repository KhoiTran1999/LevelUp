/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './public/index.html',
    './public/vendor/**/*.js',
    './src/**/*.{html,js,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-roboto-flex)', 'var(--font-be-vietnam-pro)', '"Roboto Flex"', '"Roboto"', '"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        guild: {
          gold: 'var(--md-custom-color-gold, #f59e0b)',
          goldHover: 'var(--md-custom-color-gold-hover, #d97706)',
          goldLight: 'var(--md-custom-color-gold-container, #fde68a)'
        },
        md: {
          primary: 'var(--md-sys-color-primary)',
          'on-primary': 'var(--md-sys-color-on-primary)',
          'primary-container': 'var(--md-sys-color-primary-container)',
          'on-primary-container': 'var(--md-sys-color-on-primary-container)',
          'inverse-primary': 'var(--md-sys-color-inverse-primary)',

          secondary: 'var(--md-sys-color-secondary)',
          'on-secondary': 'var(--md-sys-color-on-secondary)',
          'secondary-container': 'var(--md-sys-color-secondary-container)',
          'on-secondary-container': 'var(--md-sys-color-on-secondary-container)',

          tertiary: 'var(--md-sys-color-tertiary)',
          'on-tertiary': 'var(--md-sys-color-on-tertiary)',
          'tertiary-container': 'var(--md-sys-color-tertiary-container)',
          'on-tertiary-container': 'var(--md-sys-color-on-tertiary-container)',

          error: 'var(--md-sys-color-error)',
          'on-error': 'var(--md-sys-color-on-error)',
          'error-container': 'var(--md-sys-color-error-container)',
          'on-error-container': 'var(--md-sys-color-on-error-container)',

          surface: 'var(--md-sys-color-surface)',
          'surface-dim': 'var(--md-sys-color-surface-dim)',
          'surface-bright': 'var(--md-sys-color-surface-bright)',
          'surface-variant': 'var(--md-sys-color-surface-variant)',
          'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
          'surface-container-low': 'var(--md-sys-color-surface-container-low)',
          'surface-container': 'var(--md-sys-color-surface-container)',
          'surface-container-high': 'var(--md-sys-color-surface-container-high)',
          'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',

          'on-surface': 'var(--md-sys-color-on-surface)',
          'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',

          outline: 'var(--md-sys-color-outline)',
          'outline-variant': 'var(--md-sys-color-outline-variant)',

          'inverse-surface': 'var(--md-sys-color-inverse-surface)',
          'inverse-on-surface': 'var(--md-sys-color-inverse-on-surface)',

          'surface-tint': 'var(--md-sys-color-surface-tint)',
          scrim: 'var(--md-sys-color-scrim)',
          shadow: 'var(--md-sys-color-shadow)',

          // Custom Harmonized RPG Tokens
          gold: 'var(--md-custom-color-gold)',
          'gold-container': 'var(--md-custom-color-gold-container)',
          'on-gold': 'var(--md-custom-color-on-gold)',
          'on-gold-container': 'var(--md-custom-color-on-gold-container)',

          mana: 'var(--md-custom-color-mana)',
          'mana-container': 'var(--md-custom-color-mana-container)',
          'on-mana': 'var(--md-custom-color-on-mana)',
          'on-mana-container': 'var(--md-custom-color-on-mana-container)',

          streak: 'var(--md-custom-color-streak)',
          'streak-container': 'var(--md-custom-color-streak-container)',
          'on-streak': 'var(--md-custom-color-on-streak)',
          'on-streak-container': 'var(--md-custom-color-on-streak-container)',

          xp: 'var(--md-custom-color-xp)',
          'xp-container': 'var(--md-custom-color-xp-container)',
          'on-xp': 'var(--md-custom-color-on-xp)',
          'on-xp-container': 'var(--md-custom-color-on-xp-container)',
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
