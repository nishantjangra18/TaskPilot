/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border-color': 'var(--border-color)',
        'accent-color': 'var(--accent-color)',
        slate: {
          950: '#0A0A0B', // Background
          900: '#18181B', // Cards
          850: '#111214', // Sidebar
          800: '#1F1F23', // Elevated surfaces (Modals, Popovers)
          750: '#27272A', // Hover highlight helper
          400: '#A1A1AA', // Secondary text
          50: '#FAFAFA',  // Primary text
        }
      }
    },
  },
  plugins: [],
}

