/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[class~="dark"], [class~="bloomberg"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        eurostile: ['Oxygen', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        bloomberg: ['Courier New', 'Courier', 'Liberation Mono', 'Consolas', 'monospace'],
      },
      colors: {
        corporate: {
          blue: '#1e40af',
          'blue-light': '#3b82f6',
          'blue-dark': '#1e3a8a',
          gray: '#6b7280',
          'gray-light': '#f3f4f6',
          'gray-dark': '#374151',
        },
        bloomberg: {
          green: '#00ff41',
          'green-bright': '#39ff14',
          'green-dim': '#00cc33',
          orange: '#ff8800',
          blue: '#0088ff',
          black: '#000000',
        },
      },
    },
  },
  plugins: [],
}




