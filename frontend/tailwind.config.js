/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffde7',
          100: '#fff9c2',
          200: '#fff071',
          300: '#f8df3a',
          400: '#e8c915',
          500: '#c8a80a',
          600: '#947a05',
          700: '#6d5a06',
          800: '#4b3f08',
          900: '#332c08',
        },
      },
    },
  },
  plugins: [],
};
