/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2952e3',
          dark: '#1c3aa9'
        }
      }
    }
  },
  plugins: []
};
