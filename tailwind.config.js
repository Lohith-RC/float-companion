/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
