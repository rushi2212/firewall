# AI-Powered WAF Frontend

React-based dashboard for the AI-Powered Web Application Firewall with real-time threat visualization and analytics.

## 🎨 Features

- **Real-time Dashboard**: Live threat monitoring with auto-refresh
- **Request Logs**: Filterable and searchable request history
- **Payload Testing**: Test payloads against ML models with detailed results
- **Alert Management**: View and configure security alerts
- **Settings Panel**: Configure API endpoints, refresh intervals, and security thresholds

## 📦 Technologies

- **React 19** - UI framework
- **Vite** - Build tool with fast HMR
- **Tailwind CSS 4** - Utility-first styling
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Axios** - HTTP client

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:5000/api` (or configure in Settings)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables (optional):**
   Create a `.env` file in the `frontend` directory:

   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── ThreatCard.jsx
│   │   ├── ChartComponent.jsx
│   │   ├── LogsTable.jsx
│   │   └── Loader.jsx
│   ├── pages/            # Main application pages
│   │   ├── Dashboard.jsx
│   │   ├── Logs.jsx
│   │   ├── TestPayload.jsx
│   │   ├── Alerts.jsx
│   │   └── Settings.jsx
│   ├── services/         # API service layer
│   │   └── api.js
│   ├── context/          # React context for state
│   │   └── AppContext.jsx
│   ├── App.jsx           # Root component with routing
│   └── main.jsx          # Entry point
├── tailwind.config.js    # Tailwind configuration
├── vite.config.js        # Vite configuration
└── package.json
```

## 🎯 Key Components

### Dashboard

- **Stats Cards**: Total requests, blocked, alerted, allowed
- **Charts**: Decision distribution (pie), threat score trends (line)
- **Recent Activity**: Last 5 requests with details

### Logs

- **Filter by decision**: All, Allow, Alert, Block
- **Search**: By IP address or payload content
- **Real-time updates**: Auto-refresh every 5 seconds

### Test Payload

- **Manual input**: Enter IP and payload
- **Quick tests**: Pre-loaded malicious/normal payloads
- **Results**: Decision, threat score, model scores, override reason

### Alerts

- **Alert history**: Severity-based color coding
- **Test alert**: Send test alert to verify email configuration
- **Configuration**: Toggle email notifications and alert thresholds

### Settings

- **API Configuration**: Backend URL and refresh interval
- **Security Settings**: Block/alert thresholds, auto-block toggle
- **Model Settings**: Enable/disable individual ML models

## 🔌 API Integration

The frontend communicates with the backend via the `api.js` service:

```javascript
// Analyze payload
decisionAPI.analyze({ ip, payload });

// Get all logs
logsAPI.getAll();

// Get statistics
logsAPI.getStats();

// Get alerts
alertsAPI.getAll();
```

Default API base URL: `http://localhost:5000/api`

## 🎨 Customization

### Tailwind Theme

Custom colors are defined in `tailwind.config.js`:

- **Primary**: Blue shades (primary-50 to primary-900)
- **Danger**: Red shades (for blocked threats)
- **Success**: Green shades (for allowed requests)
- **Warning**: Orange shades (for alerts)

### Refresh Interval

Configure auto-refresh in Settings or modify `AppContext.jsx`:

```javascript
const DEFAULT_REFRESH_INTERVAL = 5000; // 5 seconds
```

## 🐛 Troubleshooting

### CORS Errors

Ensure backend has CORS configured:

```javascript
app.use(cors({ origin: "http://localhost:5173" }));
```

### API Connection Failed

1. Check backend is running on port 5000
2. Verify `VITE_API_URL` in `.env`
3. Update API URL in Settings page

### Charts Not Rendering

Ensure `recharts` is installed:

```bash
npm install recharts
```

## 📝 NPM Scripts

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🔐 Security Notes

- API URL can be configured at runtime via Settings
- No sensitive data stored in localStorage
- All API calls use axios interceptors for error handling

## 📄 License

MIT License - See backend README for full project license

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions, please open an issue on GitHub.
