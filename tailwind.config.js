/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f4f3ee',
        surface: '#faebe6',
        'surface-light': '#e8e5f9',
        'text-main': '#2d3235',
        'text-muted': '#666c71',
        'accent-blue': '#64b4d2',
        'accent-blue-hover': '#1f87f4',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        serif: ['EB Garamond', 'serif'],
      },
    },
  },
  plugins: [],
}
