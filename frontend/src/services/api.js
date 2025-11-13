import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Endpoints
export const decisionAPI = {
  analyze: (payload) => api.post("/decision/analyze", payload),
};

export const logsAPI = {
  getAll: (params) => api.get("/logs", { params }),
  getById: (id) => api.get(`/logs/${id}`),
  getStats: () => api.get("/logs/stats"),
};

export const alertsAPI = {
  getAll: () => api.get("/alerts"),
  test: () => api.post("/alerts/test"),
};

export default api;
