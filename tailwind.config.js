/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#16305C', dark: '#0E2140', light: '#2A487F' },
        accent: { DEFAULT: '#D98C3F', dark: '#B8712E' },
        success: '#2F8F5B',
        ink: { 900: '#14181F', 700: '#3C4453', 500: '#6B7280', 300: '#9CA3AF' },
        surface: '#F3EEE3',
        card: '#FFFFFF',
        border: '#E3DCCC'
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};
