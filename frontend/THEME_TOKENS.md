# Theme Tokens & Design System

## Color Palette

### Light Theme

| Token                | Value                                 | Purpose              |
| -------------------- | ------------------------------------- | -------------------- |
| `--app-bg`         | `#ffffff`                           | Main background      |
| `--app-surface`    | `#f8fafc`                           | Secondary surface    |
| `--app-border`     | `#e2e8f0`                           | Border color         |
| `--app-text`       | `#0f172a`                           | Primary text         |
| `--app-text-muted` | `#64748b`                           | Muted/secondary text |
| `--app-primary`    | `#1d4ed8`                           | Primary action color |
| `--app-success`    | `#10b981`                           | Success state        |
| `--app-warning`    | `#f59e0b`                           | Warning state        |
| `--app-danger`     | `#ef4444`                           | Error/danger state   |
| `--app-info`       | `#3b82f6`                           | Info state           |
| `--app-muted-bg`   | `#f1f5f9`                           | Muted backgrounds    |
| `--app-divider`    | `#cbd5e1`                           | Divider lines        |
| `--app-shadow-sm`  | `0 1px 2px 0 rgba(0, 0, 0, 0.05)`   | Light shadow         |
| `--app-shadow-md`  | `0 4px 6px -1px rgba(0, 0, 0, 0.1)` | Medium shadow        |

### Dark Theme

| Token                | Value                                 | Purpose              |
| -------------------- | ------------------------------------- | -------------------- |
| `--app-bg`         | `#0f172a`                           | Main background      |
| `--app-surface`    | `#1e293b`                           | Secondary surface    |
| `--app-border`     | `#334155`                           | Border color         |
| `--app-text`       | `#e5edf7`                           | Primary text         |
| `--app-text-muted` | `#94a3b8`                           | Muted/secondary text |
| `--app-primary`    | `#60a5fa`                           | Primary action color |
| `--app-success`    | `#34d399`                           | Success state        |
| `--app-warning`    | `#fbbf24`                           | Warning state        |
| `--app-danger`     | `#f87171`                           | Error/danger state   |
| `--app-info`       | `#60a5fa`                           | Info state           |
| `--app-muted-bg`   | `#1e293b`                           | Muted backgrounds    |
| `--app-divider`    | `#475569`                           | Divider lines        |
| `--app-shadow-sm`  | `0 1px 2px 0 rgba(0, 0, 0, 0.3)`    | Light shadow         |
| `--app-shadow-md`  | `0 4px 6px -1px rgba(0, 0, 0, 0.4)` | Medium shadow        |

---

## Usage in CSS

### CSS Variables

```css
body {
  color: var(--app-text);
  background-color: var(--app-bg);
}

.card {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
  color: var(--app-text);
}

.muted {
  color: var(--app-text-muted);
}

.btn-primary {
  background-color: var(--app-primary);
}
```

### Tailwind Classes

The project uses Tailwind CSS with the following structure:

```jsx
// Direct Tailwind utilities
<div className="bg-white dark:bg-slate-800">
  <h1 className="text-slate-900 dark:text-slate-100">Heading</h1>
  <p className="text-slate-600 dark:text-slate-400">Muted text</p>
</div>

// Using CSS variables within Tailwind
<div className="bg-[var(--app-surface)]">
  Content
</div>
```

---

## Tailwind Color Mapping

| Semantic Token | Light Tailwind                        | Dark Tailwind                                   |
| -------------- | ------------------------------------- | ----------------------------------------------- |
| Primary        | `text-blue-600` / `bg-blue-600`   | `dark:text-blue-400` / `dark:bg-blue-500`   |
| Success        | `text-green-600` / `bg-green-600` | `dark:text-green-400` / `dark:bg-green-500` |
| Warning        | `text-amber-600` / `bg-amber-600` | `dark:text-amber-400` / `dark:bg-amber-500` |
| Danger         | `text-red-600` / `bg-red-600`     | `dark:text-red-400` / `dark:bg-red-500`     |
| Text           | `text-slate-900`                    | `dark:text-slate-100`                         |
| Text Muted     | `text-slate-600`                    | `dark:text-slate-400`                         |
| Surface        | `bg-white`                          | `dark:bg-slate-800`                           |
| Border         | `border-slate-200`                  | `dark:border-slate-700`                       |

---

## Spacing Scale

Based on Tailwind's default spacing scale (4px base):

```
px-1, px-2, px-3, px-4  → 4px, 8px, 12px, 16px
py-1, py-2, py-3, py-4  → 4px, 8px, 12px, 16px
gap-1, gap-2, gap-3, gap-4, gap-5, gap-6  → 4px, 8px, 12px, 16px, 20px, 24px
m-1, m-2, m-4, m-8  → 4px, 8px, 16px, 32px
```

### Recommended Spacing

- **Padding** (internal content): `p-4`, `p-6`
- **Gaps** (between elements): `gap-2`, `gap-4`
- **Margins** (external spacing): Rarely needed with flexbox/grid
- **Sections**: `space-y-6` between major sections

---

## Typography

### Font Sizes

```jsx
// Headings
<h1 className="text-3xl font-bold">Main title</h1>      // 30px, bold
<h2 className="text-2xl font-semibold">Section</h2>     // 24px, semibold
<h3 className="text-lg font-semibold">Subsection</h3>   // 18px, semibold

// Body
<p className="text-base">Regular text</p>               // 16px
<p className="text-sm">Small text</p>                   // 14px
<p className="text-xs">Extra small text</p>             // 12px
```

### Font Weights

- `font-light`: 300 (rare)
- `font-normal`: 400 (default)
- `font-medium`: 500 (labels, badges)
- `font-semibold`: 600 (headings, emphasis)
- `font-bold`: 700 (titles, strong emphasis)

---

## Shadow System

### Light Mode

```css
.shadow-sm  { box-shadow: var(--app-shadow-sm); }
.shadow-md  { box-shadow: var(--app-shadow-md); }
```

### Dark Mode (Increased depth)

```css
.dark .shadow-sm  { box-shadow: var(--app-shadow-sm); }
.dark .shadow-md  { box-shadow: var(--app-shadow-md); }
```

### Tailwind Shadow Classes

```jsx
<div className="shadow-sm">Light shadow</div>
<div className="shadow-md">Medium shadow</div>
<div className="shadow-lg">Large shadow (not in tokens, but available)</div>
```

---

## Interactive States

### Buttons

```jsx
// Hover
<button className="hover:opacity-90">Reduce opacity on hover</button>

// Focus (keyboard)
<button className="focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Focus ring</button>

// Active/Pressed
<button className="active:scale-95">Scale down on press</button>

// Disabled
<button disabled className="opacity-50 cursor-not-allowed">Disabled</button>
```

### Links

```jsx
<a className="text-blue-600 dark:text-blue-400 hover:underline">Link</a>
```

---

## Responsive Breakpoints

Tailwind default breakpoints used:

| Breakpoint    | Class Prefix | Min Width |
| ------------- | ------------ | --------- |
| Mobile        | (none)       | 0px       |
| Tablet        | `sm:`      | 640px     |
| Small Desktop | `md:`      | 768px     |
| Desktop       | `lg:`      | 1024px    |
| Large Desktop | `xl:`      | 1280px    |
| Extra Large   | `2xl:`     | 1536px    |

### Mobile-First Approach

```jsx
// Default (mobile) + tablets and up
<div className="w-full md:w-1/2 lg:w-1/3">
  Full width on mobile, 50% on tablet, 33% on desktop
</div>

<div className="text-sm md:text-base lg:text-lg">
  Font size scales with screen size
</div>
```

---

## Dark Mode Implementation

### Automatic Detection

```jsx
// ThemeContext.jsx handles:
// 1. Preference detection (prefers-color-scheme media query)
// 2. localStorage persistence
// 3. Class application to document.documentElement
```

### Manual Override

```jsx
import { useTheme } from "src/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

---

## Component Examples

### Card with Theme Support

```jsx
<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
  <h3 className="text-slate-900 dark:text-slate-100 font-semibold">Title</h3>
  <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">Description</p>
</div>
```

### Alert Box

```jsx
<div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
  <p className="text-blue-900 dark:text-blue-100">Info message</p>
</div>
```

### Stat Card

```jsx
<div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center">
  <p className="text-slate-600 dark:text-slate-400 text-sm">Label</p>
  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
    1,234
  </p>
  <p className="text-green-600 dark:text-green-400 text-sm mt-1">+12%</p>
</div>
```

---

## Animations

Available keyframe animations in `src/styles/animations.css`:

- `fadeIn`: Fade in effect
- `slideInUp`: Slide up from bottom
- `slideInDown`: Slide down from top
- `float`: Floating/hovering effect
- `pulse`: Pulsing opacity
- `shimmer`: Loading shimmer effect
- `blob`: Blob animation (for decorative elements)

### Usage

```jsx
<div className="animate-fadeIn">Fades in on load</div>
<div className="animate-pulse">Pulsing animation</div>
<div className="animate-float">Floating animation</div>
```

---

## Best Practices

### 1. Color Contrast

✅ **Good:** `text-slate-900 on bg-white` (WCAG AA compliant)
⚠️ **Poor:** `text-slate-400 on bg-white` (insufficient contrast)

Always test color combinations for accessibility.

### 2. Consistency

- Use semantic tokens for all colors
- Avoid hardcoded hex values in components
- Use Tailwind classes instead of custom CSS

### 3. Theme Testing

Always test components in both themes:

```bash
# Light theme (default)
npm run dev

# Dark theme
# Toggle via UI or check browser DevTools Accessibility
```

### 4. CSS Variables Fallback

All components should support CSS variables with Tailwind fallbacks:

```jsx
<div className="bg-[var(--app-surface)] dark:bg-slate-800">
  Fallback if CSS var fails
</div>
```

---

## Future Enhancements

- [ ] Add semantic color tokens (success-light, error-light, etc.)
- [ ] Extend Tailwind config with custom color scale
- [ ] Add animation duration/timing variables
- [ ] Create theme variants (e.g., high-contrast mode)
- [ ] Add gradient token system
- [ ] Create color accessibility checker

---

**Last Updated:** 2026-05-01
**Tailwind Version:** 4.1
**Dark Mode:** Class-based (`<html class="dark">`)
