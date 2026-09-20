/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6f7ec',
          100: '#c2ecd0',
          200: '#99dfb1',
          300: '#6fd191',
          400: '#4dc67a',
          500: '#2dba64',
          600: '#1a9850',
          700: '#0f7040',
          800: '#0f5132',
          900: '#0a3a24',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
