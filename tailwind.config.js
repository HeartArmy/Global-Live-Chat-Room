/** @type {import('tailwindcss').Config} */
import { withUt } from 'uploadthing/tw'

export default withUt({
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'apple-blue': '#007AFF',
        'apple-gray': '#F2F2F7',
        'apple-dark': '#1C1C1E',
        // Dark pastel palette
        'shimmer-white': '#1b1c1f', // deep, soft off-white for dark backgrounds
        'pastel-ink': '#0f1115',
        'pastel-gray': '#2a2c33',
        'pastel-blue': '#7aa2ff',
        'pastel-lilac': '#b8a1ff',
        'pastel-teal': '#7fd1c7',
        'pastel-rose': '#f2a7b8',
        'pastel-gold': '#f5d08a',
        'apple-light-gray': '#8E8E93',
      },
      fontFamily: {
        'sf-pro': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
})
