/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trading-dark': '#0f1419',
        'trading-darker': '#0a0e13',
        'trading-card': '#1a1f2e',
        'trading-border': '#2d3748',
        'trading-green': '#10b981',
        'trading-red': '#ef4444',
        'trading-amber': '#f59e0b',
        'trading-blue': '#3b82f6',
      },
      fontFamily: {
        'mono': ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
