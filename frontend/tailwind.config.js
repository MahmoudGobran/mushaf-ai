/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Amiri', 'serif'],
        kufi: ['Amiri Quran', 'serif'],
        sans: ['Amiri', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        mushaf: {
          primary: '#0F766E',
          secondary: '#14B8A6',
          light: '#F0FDFA',
          dark: '#134E4A',
        },
      },
      boxShadow: {
        'teal': '0 10px 25px -5px rgba(13, 148, 136, 0.3)',
        'purple': '0 10px 25px -5px rgba(124, 58, 237, 0.3)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out',
        'slideInRight': 'slideInRight 0.5s ease-out',
        'slideInLeft': 'slideInLeft 0.5s ease-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      borderRadius: {
        'xl': '20px',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}