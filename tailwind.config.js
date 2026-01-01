/** @type {import('tailwindcss').Config} */
const { heroui } = require("@heroui/react");

module.exports = {
  darkMode: ['class', '[class~="dark"], [class~="bloomberg"]'],
  content: [
    './node_modules/@heroui/**/node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx,mjs}',
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
        // Semantic Theme Colors - Mapped to CSS variables in globals.css
        surface: {
          DEFAULT: 'var(--bg-level-0)',
          0: 'var(--bg-level-0)',
          1: 'var(--bg-level-1)',
          2: 'var(--bg-level-2)',
          3: 'var(--bg-level-3)',
          inverted: 'var(--bg-surface-inverted)',
        },
        // Semantic text colors (using 'content' to avoid conflict with text- size utilities if needed, 
        // but 'text-primary' is standard pattern so we'll use a specific key if needed or just use these)
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-content-inverse)',
        },
        // Semantic border colors
        line: {
          subtle: 'var(--border-subtle)',
          emphasis: 'var(--border-emphasis)',
          active: 'var(--border-active)',
        },
        // Semantic accent colors
        accent: {
          DEFAULT: 'var(--accent-color)',
          subtle: 'var(--accent-bg-subtle)',
        },
        // Semantic status colors
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error: 'var(--status-error)',
          info: 'var(--status-info)',
          'success-bg': 'var(--status-success-bg)',
          'warning-bg': 'var(--status-warning-bg)',
          'error-bg': 'var(--status-error-bg)',
          'info-bg': 'var(--status-info-bg)',
        },
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
        // Status Bar Colors (Documented per requirements)
        // Light mode text: #212121 (Dark Gray)
        // Dark mode background: #121212 (Darker Gray/Near Black)
        // Dark mode text: #FFFFFF (White)
        'status-bar': {
          light: {
            text: '#212121',
          },
          dark: {
            bg: '#121212',
            text: '#FFFFFF',
          }
        },
      },
      backgroundColor: {
        // Black mode overrides - pure black backgrounds
        'black-bg': '#000000',
        'black-card': '#0a0a0a',
        'black-hover': '#111111',
      },
    },
  },
  plugins: [heroui()],
}




