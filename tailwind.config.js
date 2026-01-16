/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '360px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Robinhood-style dark theme colors
        'rh-black': '#000000',
        'rh-card': '#1c1c1e',
        'rh-card-hover': '#2c2c2e',
        'rh-accent': '#ff6b35',
        'rh-accent-gold': '#d4af37',
        'rh-positive': '#00c853',
        'rh-negative': '#ff5252',
        'rh-text': '#ffffff',
        'rh-text-secondary': '#8e8e93',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
}