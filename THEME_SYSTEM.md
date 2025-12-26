# Theme System Documentation

## Overview

This application supports multiple visual themes that users can select from the settings page. The theme system is built using React Context, CSS variables, and Tailwind CSS classes, making it easily expandable to support additional themes.

## Current Themes

### 1. Light Theme (Default)
- Clean, bright interface with gray-900 text on white/gray-50 background
- Best for daytime use and well-lit environments
- Theme ID: `'light'`

### 2. Dark Theme
- Dark interface with gray-100 text on gray-950 background
- Reduces eye strain in low-light environments
- Theme ID: `'dark'`

### 3. Bloomberg Terminal Theme
- Retro green-on-black terminal aesthetic inspired by Bloomberg terminals
- Monospace fonts throughout for a professional financial terminal look
- Matrix-style green color scheme (#00ff41, #39ff14)
- High contrast for data readability
- Theme ID: `'bloomberg'`

## Architecture

### File Structure

```
frontend/
├── components/
│   └── ThemeProvider.tsx          # Theme context, provider, and useTheme hook
├── app/
│   ├── layout.tsx                 # Root layout with ThemeProvider wrapper
│   ├── globals.css                # Theme CSS variables and base styles
│   └── settings/
│       └── page.tsx               # Theme selection UI
└── tailwind.config.js             # Tailwind configuration for theme support
```

### Theme Flow

```
User Selection (Settings Page)
    ↓
useTheme().setTheme('theme-id')
    ↓
ThemeContext State Update
    ↓
localStorage Persistence
    ↓
HTML <html> element class update
    ↓
CSS Variables & Tailwind Classes Applied
    ↓
Visual Update Across Entire App
```

## Implementation Details

### 1. ThemeProvider Component

**Location:** `frontend/components/ThemeProvider.tsx`

**Responsibilities:**
- Manages current theme state using React Context
- Persists theme preference to localStorage (key: `'theme'`)
- Detects system preference on initial load
- Applies theme class to HTML root element
- Provides theme access via `useTheme()` hook

**Type Definition:**
```typescript
type Theme = 'light' | 'dark' | 'bloomberg';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void; // Cycles through themes
}
```

**Usage:**
```tsx
import { useTheme } from '@/components/ThemeProvider';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme('bloomberg')}>
      Switch to Bloomberg Theme
    </button>
  );
}
```

### 2. CSS Variables & Styles

**Location:** `frontend/app/globals.css`

Each theme defines CSS custom properties that are used throughout the application:

```css
/* Light Theme (Root) */
:root {
  --foreground-rgb: 17, 24, 39;
  --background-start-rgb: 255, 255, 255;
  --background-end-rgb: 249, 250, 251;
}

/* Dark Theme */
.dark {
  --foreground-rgb: 243, 244, 246;
  --background-start-rgb: 15, 23, 42;
  --background-end-rgb: 15, 23, 42;
}

/* Bloomberg Theme */
.bloomberg {
  --foreground-rgb: 0, 255, 65;
  --background-start-rgb: 0, 0, 0;
  --background-end-rgb: 0, 10, 0;
  --bloomberg-green: #00ff41;
  --bloomberg-green-bright: #39ff14;
  --bloomberg-green-dim: #00cc33;
}
```

### 3. Tailwind CSS Integration

**Location:** `frontend/tailwind.config.js`

Tailwind is configured to support multiple theme classes via the `darkMode` configuration:

```javascript
module.exports = {
  darkMode: ['class', '[class~="dark"], [class~="bloomberg"]'],
  // ... rest of config
}
```

This allows you to use theme-specific variants in your JSX:

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 bloomberg:bg-black bloomberg:text-[#00ff41]">
  Content
</div>
```

### 4. Root Layout Integration

**Location:** `frontend/app/layout.tsx`

The ThemeProvider wraps all application content in the root layout:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 bloomberg:bg-black bloomberg:text-[#00ff41] transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 5. Settings Page UI

**Location:** `frontend/app/settings/page.tsx`

The settings page provides the theme selection interface:

```tsx
const { theme, setTheme } = useTheme();

<div className="appearance-section">
  <h3>Theme</h3>
  <p>Choose your visual experience</p>

  <div className="theme-buttons">
    <button
      onClick={() => setTheme('light')}
      className={theme === 'light' ? 'active' : ''}
    >
      Light
    </button>
    <button
      onClick={() => setTheme('dark')}
      className={theme === 'dark' ? 'active' : ''}
    >
      Dark
    </button>
    <button
      onClick={() => setTheme('bloomberg')}
      className={theme === 'bloomberg' ? 'active' : ''}
    >
      Bloomberg
    </button>
  </div>
</div>
```

## Adding a New Theme

Follow these steps to add a new theme to the system:

### Step 1: Update Theme Type

**File:** `frontend/components/ThemeProvider.tsx`

Add your new theme to the type definition:

```typescript
type Theme = 'light' | 'dark' | 'bloomberg' | 'your-new-theme';
```

### Step 2: Define CSS Variables

**File:** `frontend/app/globals.css`

Add a new CSS class with your theme's color variables:

```css
.your-new-theme {
  --foreground-rgb: R, G, B;
  --background-start-rgb: R, G, B;
  --background-end-rgb: R, G, B;
  /* Add any custom variables */
  --your-custom-color: #hexcode;
}
```

### Step 3: Update Tailwind Config

**File:** `frontend/tailwind.config.js`

Add your theme class to the darkMode selector:

```javascript
darkMode: ['class', '[class~="dark"], [class~="bloomberg"], [class~="your-new-theme"]'],
```

Optionally extend the color palette:

```javascript
theme: {
  extend: {
    colors: {
      'your-theme-primary': '#hexcode',
      'your-theme-secondary': '#hexcode',
    }
  }
}
```

### Step 4: Update Root Layout Classes

**File:** `frontend/app/layout.tsx`

Add theme-specific classes to the body element:

```tsx
<body className="
  bg-white text-gray-900
  dark:bg-gray-950 dark:text-gray-100
  bloomberg:bg-black bloomberg:text-[#00ff41]
  your-new-theme:bg-custom your-new-theme:text-custom
  transition-colors duration-200
">
```

### Step 5: Add Theme to Settings Page

**File:** `frontend/app/settings/page.tsx`

Add a new button for your theme:

```tsx
<button
  onClick={() => setTheme('your-new-theme')}
  className={theme === 'your-new-theme' ? 'active-class' : 'inactive-class'}
>
  Your Theme Name
</button>
```

### Step 6: Update Component Styles (Optional)

For components that need theme-specific styling, use Tailwind's theme variants:

```tsx
<div className="
  bg-gray-100
  dark:bg-gray-800
  bloomberg:bg-black bloomberg:border bloomberg:border-[#00ff41]
  your-new-theme:bg-your-color
">
  Content
</div>
```

### Step 7: Test Your Theme

1. Clear localStorage: `localStorage.clear()`
2. Navigate to Settings page
3. Select your new theme
4. Verify:
   - Theme applies correctly across all pages
   - localStorage persists the selection
   - Page refresh maintains the theme
   - All UI components are readable and properly styled

## Best Practices

### 1. Use CSS Variables for Colors
Define colors as CSS variables in `globals.css` rather than hardcoding them. This makes themes easier to maintain.

```css
/* Good */
.bloomberg {
  --primary-text: #00ff41;
}
.my-component {
  color: rgb(var(--primary-text));
}

/* Avoid */
.bloomberg .my-component {
  color: #00ff41;
}
```

### 2. Leverage Tailwind Theme Variants
Use Tailwind's built-in theme variant system for conditional styling:

```tsx
{/* Good */}
<div className="text-gray-900 dark:text-gray-100 bloomberg:text-[#00ff41]">

{/* Avoid */}
<div style={{ color: theme === 'bloomberg' ? '#00ff41' : '#111827' }}>
```

### 3. Test Color Contrast
Ensure all themes meet WCAG accessibility standards for color contrast ratios:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Minimum 3:1 contrast ratio

### 4. Maintain Consistent Semantics
Keep semantic meaning consistent across themes. For example, if green means "positive" in one theme, it should mean "positive" in all themes.

### 5. Document Theme-Specific Variables
When adding custom CSS variables for a theme, document them in this file with their purpose.

## Theme Persistence

Themes are automatically persisted to localStorage and restored on page load:

- **Storage Key:** `'theme'`
- **Storage Value:** Theme ID string (e.g., `'bloomberg'`)
- **Fallback Order:**
  1. localStorage value
  2. System preference (`prefers-color-scheme`)
  3. Default theme (`'light'`)

## Troubleshooting

### Theme Not Applying
1. Check browser console for errors
2. Verify theme class is on `<html>` element (inspect DevTools)
3. Clear localStorage and try again
4. Ensure CSS is compiled (rebuild if necessary)

### Theme Not Persisting
1. Check browser localStorage in DevTools
2. Verify localStorage is enabled (not disabled by browser/extensions)
3. Check for errors in ThemeProvider component

### Colors Look Wrong
1. Verify CSS variables are defined in `globals.css`
2. Check Tailwind config includes your theme class
3. Ensure you're using correct Tailwind variant syntax
4. Run `npm run build` to rebuild Tailwind CSS

### New Theme Not Available
1. Confirm theme is added to Theme type in ThemeProvider
2. Check CSS class exists in globals.css
3. Verify button is added to settings page
4. Restart development server

## Future Enhancements

Potential improvements to the theme system:

1. **Custom Theme Builder:** Allow users to create custom themes with color pickers
2. **Import/Export Themes:** Share theme configurations as JSON files
3. **Time-Based Themes:** Automatically switch themes based on time of day
4. **Per-Page Themes:** Different themes for different sections of the app
5. **Theme Preview:** Show theme preview before applying
6. **Accessibility Themes:** High-contrast themes for visual accessibility
7. **Animations:** Theme-specific animations and transitions

## Maintenance Notes

- **Date Created:** 2025-12-25
- **Last Updated:** 2025-12-25
- **Current Themes:** 3 (Light, Dark, Bloomberg)
- **Maintainer:** Development Team

## Additional Resources

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [React Context API](https://react.dev/reference/react/createContext)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WCAG Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
