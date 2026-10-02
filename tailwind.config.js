/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      scale: {
        '115': '1.15',
      },
      colors: {
        background: '#090D16',
        surface: 'rgba(15, 23, 42, 0.75)',
        'surface-border': 'rgba(255, 255, 255, 0.1)',
        'orb-glow': '#38bdf8',
        'orb-pulse': '#818cf8',
        'danger-glow': '#ef4444',
        'warning-glow': '#f59e0b',
      },
      animation: {
        'breathe': 'breathe 3s ease-in-out infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.32s cubic-bezier(0.32, 0.72, 0, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
