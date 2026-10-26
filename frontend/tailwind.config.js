/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf9',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // warm friendly teal
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        warm: {
          50: '#fffbf5',
          100: '#fef3e2',
          200: '#fde4bf',
          300: '#fbd093',
          400: '#f7b258',
          500: '#f29528',
          600: '#d77617',
          700: '#b05615',
          800: '#8d4419',
          900: '#733917',
        }
      },
    },
  },
  plugins: [],
}
