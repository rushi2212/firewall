# Frontend Architecture & Best Practices

## Folder Structure

```
frontend/
├── public/                         # Static assets
├── src/
│   ├── main.jsx                   # Entry point with providers
│   ├── App.jsx                    # Router setup (lazy routes)
│   ├── index.css                  # Global styles + Tailwind imports
│   ├── App.css                    # App-level styles
│   │
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Design system primitives
│   │   │   ├── Button.jsx         # Button component
│   │   │   ├── Card.jsx           # Card container
│   │   │   ├── Spinner.jsx        # Loading spinner
│   │   │   ├── Modal.jsx          # Dialog modal
│   │   │   └── Toast.jsx          # Notification toast
│   │   │
│   │   ├── ErrorBoundary.jsx      # Error boundary wrapper
│   │   ├── ProtectedRoute.jsx     # Auth guard for routes
│   │   ├── Navbar.jsx             # Navigation bar
│   │   ├── ChartComponent.jsx     # Chart wrapper (Recharts)
│   │   ├── LogsTable.jsx          # Logs table
│   │   ├── ThreatCard.jsx         # Threat metric card
│   │   └── Loader.jsx             # (Legacy, use Spinner)
│   │
│   ├── pages/                     # Page/route components (lazy-loaded)
│   │   ├── Dashboard.jsx          # Main dashboard
│   │   ├── Logs.jsx               # Request logs page
│   │   ├── Alerts.jsx             # Alerts page
│   │   ├── TestPayload.jsx        # Test payload page
│   │   ├── Login.jsx              # Auth login
│   │   ├── Settings.jsx           # User settings
│   │   ├── Lab.jsx                # Lab experiments
│   │   ├── Lab*.jsx               # Lab sub-pages
│   │   ├── AdminDashboard.jsx     # Admin panel
│   │   └── PresentationDashboard.jsx
│   │
│   ├── context/                   # React Context providers
│   │   ├── ThemeContext.jsx       # Dark/light theme
│   │   ├── AuthContext.jsx        # User authentication
│   │   └── AppContext.jsx         # App-level state (logs, stats)
│   │
│   ├── services/                  # API clients and external services
│   │   └── api.js                 # Axios HTTP client + endpoints
│   │
│   ├── hooks/                     # Custom React hooks (future)
│   │   ├── useAsync.js            # Generic async hook
│   │   └── useApi.js              # API fetching hook
│   │
│   ├── utils/                     # Utility functions
│   │   ├── labTelemetry.js        # Lab interaction tracking
│   │   └── formatters.js          # (Future: date, number formatting)
│   │
│   ├── styles/                    # Global stylesheets
│   │   └── animations.css         # Keyframe animations
│   │
│   └── assets/                    # Images, icons, SVGs
│       └── react.svg
│
├── package.json
├── tailwind.config.js             # Tailwind configuration
├── vite.config.js                 # Vite bundler configuration
├── index.html                     # HTML entry point
├── eslint.config.js               # ESLint configuration
├── COMPONENT_LIBRARY.md           # UI component documentation
├── THEME_TOKENS.md                # Design tokens reference
└── ARCHITECTURE.md                # This file
```

---

## Provider Stack

### Entry Point (`main.jsx`)

```jsx
<StrictMode>
  <ErrorBoundary>           {/* Catch and handle React errors */}
    <ThemeProvider>         {/* Dark/light mode context */}
      <AuthProvider>        {/* User auth state and token */}
        <AppProvider>       {/* App data: logs, stats, polling */}
          <Suspense fallback={<Spinner/>}>
            <App />
          </Suspense>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
</StrictMode>
```

**Why this order:**
1. **ErrorBoundary** (outer): Catches errors from all inner components
2. **ThemeProvider** (theme): Sets up CSS variables and Tailwind class
3. **AuthProvider** (auth): Initializes user session and token
4. **AppProvider** (data): Sets up data polling and shared state

---

## Routing Architecture

### Route Protection

```
/login                    {public, no navbar}
  ↓
/                         {protected, requires auth}
├── /dashboard           (lazy loaded)
├── /logs                (lazy loaded)
├── /alerts              (lazy loaded)
├── /test                (lazy loaded)
├── /lab/*               (lazy loaded)
├── /settings            (lazy loaded)
└── /admin/dashboard     (lazy loaded)
```

**ProtectedRoute** component:
- Checks for valid `dashboardToken` in localStorage
- Redirects unauthenticated users to `/login`
- Renders shared Navbar for authenticated routes
- Uses Suspense for lazy-loaded page fallback

---

## State Management

### Context API (Current)

**ThemeContext**
- Manages dark/light mode toggle
- Persists theme to `localStorage` (`aiwaf-theme`)
- Provides `useTheme()` hook

**AuthContext**
- Stores user token and profile
- Provides `useAuth()` hook for login/logout
- Intercepts API requests to inject token

**AppContext**
- Stores logs, stats, and streaming data
- Polls `/logs` and `/logs/stats` every 2 seconds (configurable)
- Provides `useApp()` hook

### Future: Zustand (Optional)

When AppContext becomes too large or polling becomes complex, migrate to Zustand:

```jsx
// src/state/useLogsStore.js
import create from "zustand";

const useLogsStore = create((set) => ({
  logs: [],
  stats: {},
  loading: false,
  setLogs: (logs) => set({ logs }),
  fetchLogs: async () => { /* ... */ },
}));
```

---

## API Integration

### Service Layer (`src/services/api.js`)

```javascript
// Centralized HTTP client with:
// - Base URL configuration
// - Timeout (8s default)
// - Auth token injection
// - Retry logic for idempotent GETs
// - Error logging

// Export organized endpoints
export const authAPI = { login, me }
export const logsAPI = { getAll, getById, getStats }
export const alertsAPI = { getAll, test }
```

### Usage

```jsx
import { logsAPI } from "src/services/api";

// In components/hooks
const data = await logsAPI.getAll({ limit: 50 });
```

### Error Handling

```javascript
// Automatic retry on 5xx errors (3 attempts max)
// Manual error handling in catch blocks
// TODO: Add toast notifications for user feedback
```

---

## Component Patterns

### 1. Functional Components with Hooks

```jsx
export default function MyComponent() {
  const { theme } = useTheme();
  const [state, setState] = React.useState(null);
  
  return <div>Content</div>;
}
```

### 2. Composition over Props Drilling

❌ **Bad:**
```jsx
<Layout user={user} theme={theme} auth={auth} />
```

✅ **Good:**
```jsx
<ThemeProvider>
  <AuthProvider>
    <Layout />  {/* Access via useTheme(), useAuth() */}
  </AuthProvider>
</ThemeProvider>
```

### 3. Dark Mode Support

All components must support dark mode:

```jsx
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
  Content
</div>
```

### 4. Responsive Design (Mobile-First)

```jsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 100% width on mobile, 50% on tablet, 33% on desktop */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Text size scales with viewport */}
</div>
```

---

## Performance Optimizations

### 1. Code Splitting (Lazy Routes)

All pages are lazy-loaded in `App.jsx`:

```jsx
const Dashboard = lazy(() => import("./pages/Dashboard"));

<Suspense fallback={<Spinner />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
  </Routes>
</Suspense>
```

**Benefit:** Only loads Dashboard code when user navigates to `/`

### 2. Memoization

For expensive components:

```jsx
import { memo } from "react";

const ChartComponent = memo(function ChartComponent({ data }) {
  return /* chart */;
});

export default ChartComponent;
```

### 3. API Polling Optimization

**Current:** Fixed 2s polling interval  
**Future:** Replace with WebSocket/SSE for real-time updates

### 4. Bundle Analysis

```bash
npm run build
npm run analyze  # (if available)
```

---

## Testing Strategy

### Unit Tests (Jest)

Test utility functions and hooks:

```bash
npm run test
```

### Component Tests (React Testing Library)

Test component rendering and interactions:

```jsx
import { render, screen } from "@testing-library/react";
import Button from "src/components/ui/Button";

test("Button renders and clicks", () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click me</Button>);
  
  screen.getByRole("button").click();
  expect(onClick).toHaveBeenCalled();
});
```

### Integration Tests

Test page-level flows (auth, navigation, data fetching).

### E2E Tests (Future: Playwright)

Test complete user workflows in real browser.

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

- [ ] Semantic HTML (buttons, links, inputs)
- [ ] ARIA labels where needed
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Color contrast ratios ≥ 4.5:1 for text
- [ ] Focus indicators visible on interactive elements
- [ ] Screen reader support
- [ ] Error messages associated with inputs

### Testing Tools

```bash
# Automated accessibility checks
npm install --save-dev axe-core @axe-core/react

# Manual testing
# 1. Browser DevTools > Accessibility
# 2. Keyboard-only navigation (Tab, Enter, Escape)
# 3. Screen reader (NVDA, JAWS, VoiceOver)
```

---

## Environment Configuration

### `.env.local` (Not in Git)

```
VITE_API_URL=http://localhost:5000/api
```

### Build Configuration

```javascript
// vite.config.js
export default {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:5000"  // Dev proxy
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,  // Disable in production
  }
}
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Run `npm run build` without errors
- [ ] Verify `dist/` folder is generated
- [ ] Test in production-like environment
- [ ] Check Lighthouse scores (90+)
- [ ] Verify dark mode works
- [ ] Test all routes and pages
- [ ] Check accessibility (axe-core)
- [ ] Verify API calls use correct base URL
- [ ] Clear browser cache and localStorage
- [ ] Test on mobile devices (iOS, Android)
- [ ] Verify images are optimized
- [ ] Check for console errors/warnings

---

## Common Issues & Solutions

### Issue: Dark mode not persisting

**Solution:** Check ThemeContext localStorage key (`aiwaf-theme`)

```jsx
// Debug in DevTools console
localStorage.getItem("aiwaf-theme");  // Should return "dark" or "light"
```

### Issue: API calls failing with CORS

**Solution:** Verify Vite proxy in `vite.config.js`:

```javascript
server: {
  proxy: {
    "/api": {
      target: "http://localhost:5000",
      changeOrigin: true
    }
  }
}
```

### Issue: Lazy routes not loading

**Solution:** Ensure Suspense fallback is provided:

```jsx
<Suspense fallback={<Spinner />}>
  <Routes>...</Routes>
</Suspense>
```

### Issue: Styles not applying in dark mode

**Solution:** Verify Tailwind `dark:` class is applied:

```jsx
// main.jsx: ThemeProvider sets this
document.documentElement.classList.add("dark");
```

---

## Performance Metrics

### Target Metrics

- **FCP** (First Contentful Paint): < 2.0s
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTL** (Time to Interactive): < 3.5s

### Monitoring

```bash
# Generate Lighthouse report
npm run build
lighthouse https://yourapp.com --output=html
```

---

## Contributing Guidelines

### 1. Branch Naming

```
feature/component-name
bugfix/issue-description
refactor/area-name
```

### 2. Component Checklist

Before submitting PR:

- [ ] Component works in light AND dark modes
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Accessible (keyboard, ARIA, contrast)
- [ ] Includes prop documentation
- [ ] Tested in browser
- [ ] No console errors/warnings
- [ ] Follows project style guide
- [ ] Updated COMPONENT_LIBRARY.md if new component

### 3. Code Style

- Use ES6+ syntax
- Functional components with hooks
- Tailwind for styling (no inline CSS)
- Clear variable/function names
- Comments for non-obvious logic

---

## Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Documentation](https://vitejs.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Performance](https://web.dev/performance/)

---

**Last Updated:** 2026-05-01  
**Framework Versions:** React 19, React Router 7.9, Tailwind 4.1, Vite 5
