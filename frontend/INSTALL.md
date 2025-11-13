# Frontend Installation Commands

## Required Dependencies

The following packages need to be installed for the frontend to work:

```bash
npm install react-router-dom recharts axios
```

## Individual Package Details

### react-router-dom (v6.22.0)

**Purpose**: Client-side routing for navigation between pages
**Used in**: App.jsx, Navbar.jsx

```bash
npm install react-router-dom
```

### recharts (v2.12.0)

**Purpose**: Data visualization library for charts
**Used in**: Dashboard.jsx (via ChartComponent.jsx)

```bash
npm install recharts
```

### axios (v1.6.7)

**Purpose**: HTTP client for API requests
**Used in**: services/api.js

```bash
npm install axios
```

## Already Installed

These packages are already in your package.json:

- `react` (^19.2.0)
- `react-dom` (^19.2.0)
- `@tailwindcss/vite` (^4.1.17)
- `tailwindcss` (^4.1.17)
- `vite` (^7.2.2)
- `@vitejs/plugin-react` (^5.1.0)

## Full Installation Process

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install all dependencies**:

   ```bash
   npm install
   ```

   This will install all packages from package.json.

3. **Verify installation**:

   ```bash
   npm list react-router-dom recharts axios
   ```

   You should see the version numbers for each package.

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### "Cannot find module 'react-router-dom'"

```bash
npm install react-router-dom
```

### "Cannot find module 'recharts'"

```bash
npm install recharts
```

### "Cannot find module 'axios'"

```bash
npm install axios
```

### "peer dependency warnings"

These are usually safe to ignore. If needed:

```bash
npm install --legacy-peer-deps
```

### Clean install

If you encounter issues, try a clean install:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Package.json Verification

Your `package.json` dependencies section should look like:

```json
"dependencies": {
  "@tailwindcss/vite": "^4.1.17",
  "axios": "^1.6.7",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^6.22.0",
  "recharts": "^2.12.0",
  "tailwindcss": "^4.1.17"
}
```

## Next Steps After Installation

1. Start the frontend:

   ```bash
   npm run dev
   ```

2. Open browser to: **http://localhost:5173**

3. Ensure backend is running on port 5000

4. Test the application!
