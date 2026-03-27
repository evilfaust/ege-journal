/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d4fd',
          500: '#4f6ef7',
          600: '#3d57e8',
          700: '#3246cc',
          900: '#1e2a7a',
        },
      },
    },
  },
  plugins: [],
}
