import axios from "axios";

const getDefaultApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
};

const API_BASE_URL = getDefaultApiBaseUrl();

export const getApiStreamUrl = (path) => {
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${path || ""}`;

  if (API_BASE_URL.endsWith("/api")) {
    return `${API_BASE_URL}${normalizedPath}`;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
};

const DEFAULT_TIMEOUT = 8000; // ms

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("dashboardToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // central place to add toast/notification or log to monitoring
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

// Simple retry wrapper with exponential backoff for idempotent GETs
async function requestWithRetry(fn, { retries = 2, delay = 300 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      const shouldRetry =
        attempt <= retries && (!err.response || err.response.status >= 500);
      if (!shouldRetry) throw err;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt - 1)));
    }
  }
}

// API Endpoints
export const decisionAPI = {
  analyze: (payload) => api.post("/decision/analyze", payload),
};

export const authAPI = {
  login: (payload) => api.post("/auth/login", payload),
  me: () => requestWithRetry(() => api.get("/auth/me")),
};

export const logsAPI = {
  getAll: (params) => requestWithRetry(() => api.get("/logs", { params })),
  getById: (id) => requestWithRetry(() => api.get(`/logs/${id}`)),
  getStats: () => requestWithRetry(() => api.get("/logs/stats")),
  getDdos: (params) =>
    requestWithRetry(() => api.get("/logs/ddos", { params })),
  getDdosStats: () => requestWithRetry(() => api.get("/logs/ddos/stats")),
};

export const presentationAPI = {
  startSimulation: () => api.post("/presentation/simulate"),
};

export const alertsAPI = {
  getAll: () => requestWithRetry(() => api.get("/alerts")),
  test: () => api.post("/alerts/test"),
};

export const policyAPI = {
  get: () => requestWithRetry(() => api.get("/policy")),
  update: (payload) => api.put("/policy", payload),
};

export const reportsAPI = {
  getRequests: (params) =>
    requestWithRetry(() => api.get("/reports/requests", { params })),
};

export default api;
