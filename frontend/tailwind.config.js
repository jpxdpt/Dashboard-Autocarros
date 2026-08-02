/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        label: 'var(--label)',
        'label-secondary': 'var(--label-secondary)',
        'label-tertiary': 'var(--label-tertiary)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        separator: 'var(--separator)',
        fill: 'var(--fill)',
        'system-green': 'var(--green)',
        'system-orange': 'var(--orange)',
        'system-red': 'var(--red)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        sheet: 'var(--shadow-sheet)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI',
          'Roboto', 'Helvetica Neue', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
