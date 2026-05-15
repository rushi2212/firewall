import React, { useEffect, useState } from "react";
import { alertsAPI } from "../services/api";
import Loader from "../components/Loader";
import Button from "../components/ui/Button";

const alertBadge = (decision = "") => {
  const value = String(decision).toLowerCase();
  if (value.includes("block")) return "badge-block";
  if (value.includes("alert")) return "badge-alert";
  return "badge-neutral";
};

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchAlerts = async () => {
    try {
      const response = await alertsAPI.getAll();
      const data = response.data;
      setAlerts(Array.isArray(data) ? data : data?.alerts || data?.data || []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleTestAlert = async () => {
    setTestLoading(true);
    setMessage(null);
    try {
      await alertsAPI.test();
      setMessage({ type: "success", text: "Test alert request completed." });
      await fetchAlerts();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.error || "Failed to send test alert." });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) return <Loader size="lg" text="Loading alerts..." />;

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Review blocked and suspicious security events.</p>
        </div>
        <Button onClick={handleTestAlert} disabled={testLoading}>
          {testLoading ? "Sending..." : "Test alert"}
        </Button>
      </div>

      {message && (
        <div className={`panel-muted px-4 py-3 text-sm ${message.type === "error" ? "text-[var(--app-danger)]" : "text-[var(--app-success)]"}`}>
          {message.text}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <h2 className="panel-title">Alert History</h2>
          <span className="text-sm text-[var(--app-text-muted)]">{alerts.length} events</span>
        </div>
        <div className="divide-y divide-[var(--app-border)]">
          {alerts.length === 0 ? (
            <div className="p-10 text-center text-[var(--app-text-muted)]">No alerts found.</div>
          ) : (
            alerts.map((alert) => {
              const decision = alert.decision || alert.severity || "alert";
              return (
                <article key={alert._id || alert.id} className="p-4 hover:bg-[var(--app-surface-muted)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`badge ${alertBadge(decision)}`}>{decision}</span>
                        <span className="text-xs text-[var(--app-text-muted)]">
                          {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown time"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-[var(--app-text)]">
                        {alert.title || `${alert.method || "Request"} ${alert.path || "threat detected"}`}
                      </h3>
                      <p className="mt-1 truncate text-sm text-[var(--app-text-muted)]">
                        {alert.message || alert.payload || "No payload details captured."}
                      </p>
                    </div>
                    {alert.ip && <span className="font-mono text-xs text-[var(--app-text-muted)]">{alert.ip}</span>}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Alerts;
