import React, { useState, useEffect } from "react";
import { alertsAPI } from "../services/api";
import Loader from "../components/Loader";

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await alertsAPI.getAll();
      // Safely extract the alerts array
      const alertsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.alerts)
        ? data.alerts
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setAlerts(alertsArray);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setAlerts([]); // fallback to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTestLoading(true);
    setTestMessage(null);
    try {
      const response = await alertsAPI.test();
      setTestMessage({
        type: "success",
        text: response.message || "Test alert sent successfully!",
      });
    } catch (error) {
      setTestMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to send test alert",
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return <Loader size="lg" text="Loading alerts..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Alerts
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor security alerts and notifications
          </p>
        </div>
        <button
          onClick={handleTestAlert}
          disabled={testLoading}
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl hover:shadow-primary-600/50 transform hover:-translate-y-0.5"
        >
          {testLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>🔔</span>
              Test Alert
            </span>
          )}
        </button>
      </div>

      {testMessage && (
        <div
          className={`px-4 py-3 rounded-lg border ${
            testMessage.type === "success"
              ? "bg-success-900/30 border-success-600 text-success-300"
              : "bg-danger-900/30 border-danger-600 text-danger-300"
          }`}
        >
          {testMessage.text}
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <span>📜</span> Alert History
          </h2>
        </div>

        <div className="divide-y divide-gray-700">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-6xl mb-3 opacity-50">🔔</div>
              <p>No alerts found</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert._id || alert.id}
                className="p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          alert.severity === "critical"
                            ? "bg-danger-900/30 text-danger-400 border border-danger-600"
                            : alert.severity === "high"
                            ? "bg-warning-900/30 text-warning-400 border border-warning-600"
                            : "bg-primary-900/30 text-primary-400 border border-primary-600"
                        }`}
                      >
                        {alert.severity?.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(
                          alert.createdAt || alert.timestamp
                        ).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-200 mb-1">
                      {alert.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {alert.message}
                    </p>
                    {alert.ip && (
                      <p className="text-xs font-mono text-primary-400">
                        Source: {alert.ip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Configuration */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span>⚙️</span> Alert Configuration
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div>
              <p className="font-medium text-gray-200">Email Notifications</p>
              <p className="text-sm text-gray-400">Receive alerts via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div>
              <p className="font-medium text-gray-200">Critical Alerts Only</p>
              <p className="text-sm text-gray-400">
                Only receive critical severity alerts
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Threshold (Threat Score %)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="70"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
