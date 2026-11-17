/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard',
          'Pretendard Variable',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          950: '#070a10',
          900: '#0b1018',
          850: '#0e1520',
          800: '#121b28',
          750: '#182334',
          700: '#1f2d42',
        },
        lime: {
          300: '#bef264',
          400: '#a3e635',
        },
        emerald: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
        },
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 44px -28px rgba(0,0,0,0.95)',
        glow: '0 0 44px -12px rgba(52,211,153,0.6)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.86)' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 260ms ease-out',
        'toast-in': 'toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
