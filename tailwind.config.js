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
        // Palette principale CSE Divo — Bordeaux & Or
        cse: {
          50:  '#fdf3f3',
          100: '#fce4e4',
          200: '#f9cccc',
          300: '#f4a7a7',
          400: '#ec7474',
          500: '#e04848',
          600: '#cc2c2c',
          700: '#ab1f1f',
          800: '#8d1c1c',   // rouge bordeaux principal
          900: '#761b1b',
          950: '#450d0d',
        },
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',   // or principal
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Neutrals pour le layout
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card':   '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-md':'0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-lg':'0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
        'inner-sm':'inset 0 1px 2px rgba(0,0,0,0.06)',
        'glow-red':'0 0 20px rgba(141,28,28,0.25)',
        'glow-gold':'0 0 20px rgba(251,191,36,0.3)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.08)',
        'topbar':  '0 1px 0 rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'slide-in-up':   'slideInUp 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-sm':  'bounceSm 1s infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                    to: { opacity: '1' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideInUp:   { from: { opacity: '0', transform: 'translateY(8px)'  }, to: { opacity: '1', transform: 'translateY(0)'  } },
        bounceSm:    {
          '0%,100%': { transform: 'translateY(-2px)' },
          '50%':     { transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #8d1c1c 0%, #6b1515 60%, #450d0d 100%)',
        'cse-gradient':     'linear-gradient(135deg, #8d1c1c 0%, #ab1f1f 50%, #b45309 100%)',
        'gold-shimmer':     'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
        'card-shine':       'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '68': '17rem',
        '72': '18rem',
      },
    },
  },
  plugins: [],
}
