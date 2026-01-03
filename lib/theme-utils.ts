/**
 * Theme utility classes for consistent theming across the app
 * These use CSS variables to dynamically adapt to the selected theme
 */

/**
 * Background classes that respect theme CSS variables
 * Use these instead of hardcoded bg-white, bg-gray-50, etc.
 */
export const themeBg = {
  // Page backgrounds - subtle gradient
  page: "bg-gray-50 dark:bg-gray-900 bloomberg:bg-black",

  // Card/surface backgrounds - solid colors respecting theme
  card: "bg-white dark:bg-gray-800 bloomberg:bg-black",

  // Elevated surfaces (modals, dropdowns)
  elevated: "bg-white dark:bg-gray-900 bloomberg:bg-black",

  // Input backgrounds
  input: "bg-white dark:bg-gray-800 bloomberg:bg-black",

  // Hover states
  hoverLight: "hover:bg-gray-50 dark:hover:bg-gray-800 bloomberg:hover:bg-bloomberg-green/10",
  hoverCard: "hover:bg-gray-100 dark:hover:bg-gray-700 bloomberg:hover:bg-bloomberg-green/10",
} as const;

/**
 * Text color classes that respect theme CSS variables
 */
export const themeText = {
  // Primary text
  primary: "text-gray-900 dark:text-white bloomberg:text-bloomberg-green",

  // Secondary text
  secondary: "text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim",

  // Muted text
  muted: "text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim",

  // Headings
  heading: "text-gray-900 dark:text-white bloomberg:text-bloomberg-green",
} as const;

/**
 * Border classes that respect theme CSS variables
 */
export const themeBorder = {
  // Standard border
  default: "border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green",

  // Subtle border
  subtle: "border-gray-100 dark:border-gray-800 bloomberg:border-bloomberg-green-dim",

  // Divider
  divider: "border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green",
} as const;

/**
 * Get inline styles for backgrounds using CSS variables
 * Use this for complex backgrounds that can't be done with Tailwind utilities
 */
export const getThemeBackground = () => ({
  background: `linear-gradient(to bottom, transparent, rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb))`,
});

/**
 * Get inline styles for solid backgrounds using CSS variables
 */
export const getThemeSolidBg = () => ({
  backgroundColor: 'rgb(var(--background-start-rgb))',
});

/**
 * Get inline styles for borders using CSS variables
 */
export const getThemeBorder = (opacity: number = 0.15) => ({
  borderColor: `rgba(var(--foreground-rgb), ${opacity})`,
});
