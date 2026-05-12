# UI Component Library Documentation

## Overview

This document describes the production-ready UI component primitives available in `src/components/ui/`.

---

## Components

### Spinner

Loading indicator with animated spin animation.

```jsx
import Spinner from "src/components/ui/Spinner";

// Default 24px
<Spinner />

// Custom size
<Spinner size={36} />
<Spinner size="48px" />

// With custom class
<Spinner className="text-green-600" />
```

**Props:**
- `size` (number | string): Size in pixels or CSS string. Default: `24`
- `className` (string): Tailwind classes to override color/style

**Accessibility:** Uses `aria-hidden="true"` for screen readers.

---

### Button

Accessible button with variant support and keyboard focus states.

```jsx
import Button from "src/components/ui/Button";

// Primary variant (default)
<Button onClick={handleClick}>Save</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Danger
<Button variant="danger">Delete</Button>

// Custom class
<Button className="text-sm">Action</Button>
```

**Props:**
- `children` (ReactNode): Button label
- `onClick` (function): Click handler
- `variant` ("primary" | "secondary" | "danger"): Style variant. Default: `"primary"`
- `type` ("button" | "submit" | "reset"): HTML button type. Default: `"button"`
- `className` (string): Additional Tailwind classes
- `...props`: All standard HTML button attributes

**Accessibility:**
- Keyboard focus states via `focus:ring-2 focus:ring-offset-2`
- Focus ring color matches variant theme

---

### Card

Container for grouped content with optional title and consistent styling.

```jsx
import Card from "src/components/ui/Card";

// Basic
<Card>
  <p>Content here</p>
</Card>

// With title
<Card title="Recent Activity">
  <p>Content here</p>
</Card>

// Custom class
<Card title="Stats" className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-slate-900">
  <div>...</div>
</Card>
```

**Props:**
- `children` (ReactNode): Card content
- `title` (string): Optional card heading
- `className` (string): Additional Tailwind classes

**Styling:**
- Light: `bg-white` with slate borders
- Dark: `bg-slate-800` with slate-700 borders
- Applies consistent `rounded-lg p-4`

---

### Modal

Accessible dialog with keyboard escape support and backdrop click-to-close.

```jsx
import Modal from "src/components/ui/Modal";
import { useState } from "react";

const [open, setOpen] = useState(false);

<>
  <button onClick={() => setOpen(true)}>Open</button>
  <Modal open={open} onClose={() => setOpen(false)} title="Confirm Action">
    <p>Are you sure?</p>
  </Modal>
</>
```

**Props:**
- `open` (boolean): Modal visibility state
- `onClose` (function): Callback when modal should close (Escape, backdrop, Close button)
- `title` (string): Optional modal heading
- `children` (ReactNode): Modal body content

**Accessibility:**
- `role="dialog"` and `aria-modal="true"`
- Escape key closes modal
- Backdrop click closes modal
- Focus trap recommended (future enhancement)

---

### Toast

Notification container for alerts, messages, and feedback.

```jsx
import Toast from "src/components/ui/Toast";

// Default
<Toast>Operation successful</Toast>

// With custom styling
<Toast className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100">
  ✓ Saved successfully
</Toast>
```

**Props:**
- `children` (ReactNode): Toast content
- `className` (string): Additional Tailwind classes

**Common Variants:**
```jsx
// Success
<Toast className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100">
  ✓ Success
</Toast>

// Error
<Toast className="bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
  ✗ Error
</Toast>

// Info
<Toast className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100">
  ℹ Info
</Toast>
```

**Note:** For persistent toast management, wrap in a context-based notification service (future enhancement).

---

## Non-UI Support Components

### ErrorBoundary

Catches React errors and displays a graceful fallback UI.

```jsx
import ErrorBoundary from "src/components/ErrorBoundary";

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

**Features:**
- Displays error message and stack trace in development
- Provides "Reload" button for recovery
- Logs errors to console (TODO: send to monitoring service)

**Wrap at these levels:**
- Root level (in `main.jsx`): Catches app-wide errors
- Page level: Isolates error to a single route
- Feature level: Isolates error to a specific feature

---

## Theming & Dark Mode

### Using Theme Context

```jsx
import { useTheme } from "src/context/ThemeContext";

export function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Theme: {theme}
    </button>
  );
}
```

### Styling with Dark Mode

All components support Tailwind's dark mode class prefix.

```jsx
// Light: text-slate-900, Dark: text-slate-100
<div className="text-slate-900 dark:text-slate-100">
  Text content
</div>

// Backgrounds
<div className="bg-white dark:bg-slate-800">
  Surface
</div>

// Borders
<div className="border border-slate-200 dark:border-slate-700">
  Card with border
</div>
```

### Theme Tokens

See `THEME_TOKENS.md` for CSS variables and Tailwind color mapping.

---

## Best Practices

### 1. Consistency

Use the component library for all UI interactions:
- ✅ `<Button />` for clickable actions
- ❌ `<button className="...">` for custom buttons

### 2. Dark Mode

Always test components in both light and dark themes:
```jsx
// ✅ Good: explicit dark class support
<div className="bg-white dark:bg-slate-800">

// ❌ Poor: no dark variant
<div className="bg-white">
```

### 3. Accessibility

- Use semantic HTML (buttons, links, forms)
- Test keyboard navigation
- Include ARIA labels where necessary
- Use `aria-hidden="true"` for decorative elements

### 4. Tailwind Classes

- Prefer Tailwind utility classes over inline CSS
- Keep custom CSS minimal (in `.css` files only)
- Use spacing scale: `p-4`, `gap-6`, `mb-2`

### 5. Responsive Design

- Mobile-first: start with base classes, add `md:`, `lg:`, `xl:` for larger screens
- Example: `<div className="w-full md:w-1/2 lg:w-1/3">`

---

## Component Roadmap (Future Enhancements)

- [ ] Input, Select, Textarea primitives
- [ ] Tabs, Accordion components
- [ ] Toast manager with stacking
- [ ] Notification center
- [ ] Tooltip component
- [ ] Popover component
- [ ] Form validation helpers
- [ ] Skeleton loaders (shimmer effect)
- [ ] Data table with sorting/filtering
- [ ] Breadcrumb navigation

---

## Examples

### Dashboard Card Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card title="Total Requests">
    <p className="text-2xl font-bold">1,234</p>
  </Card>
  <Card title="Blocked">
    <p className="text-2xl font-bold text-red-600">42</p>
  </Card>
  <Card title="Allowed">
    <p className="text-2xl font-bold text-green-600">1,192</p>
  </Card>
</div>
```

### Action Buttons

```jsx
<div className="flex gap-2">
  <Button onClick={save}>Save</Button>
  <Button variant="secondary" onClick={cancel}>Cancel</Button>
  <Button variant="danger" onClick={delete}>Delete</Button>
</div>
```

### Modal with Form

```jsx
const [open, setOpen] = useState(false);

<>
  <Button onClick={() => setOpen(true)}>New Policy</Button>
  <Modal open={open} onClose={() => setOpen(false)} title="Create Policy">
    <form onSubmit={(e) => { e.preventDefault(); /* save */ setOpen(false); }}>
      <input className="w-full border rounded px-3 py-2 mb-4" placeholder="Name" />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit">Create</Button>
      </div>
    </form>
  </Modal>
</>
```

---

## Contributing

When adding new components:

1. Create file in `src/components/ui/ComponentName.jsx`
2. Export default function with clear prop types in JSDoc
3. Support both light and dark themes
4. Test with Tailwind `dark:` prefix
5. Update this documentation with usage examples
6. Add accessibility features (ARIA, keyboard support)

---

**Last Updated:** 2026-05-01  
**Maintained by:** AI-WAF Frontend Team
