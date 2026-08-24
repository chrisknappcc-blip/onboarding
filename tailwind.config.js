/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Care Continuity brand palette
        navy: { DEFAULT: '#1B3868', dark: '#132A4F', light: '#2A487F' },
        ccblue: { DEFAULT: '#2F8FD1', dark: '#2678B3' },
        teal: { DEFAULT: '#2BB6C4', dark: '#219AA6' },
        lime: { DEFAULT: '#8DC63F', dark: '#76AB2F' },
        accent: { DEFAULT: '#2F8FD1', dark: '#2678B3' }, // kept as alias so existing classes still work
        success: '#2F8F5B',
        ink: { 900: '#14181F', 700: '#3C4453', 500: '#6B7280', 300: '#9CA3AF' },
        surface: '#F4F6F9',
        card: '#FFFFFF',
        border: '#E3E8EF'
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};
