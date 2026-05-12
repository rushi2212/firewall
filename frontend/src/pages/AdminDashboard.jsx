import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { logsAPI, reportsAPI } from "../services/api";
import LogsTable from "../components/LogsTable";
import Button from "../components/ui/Button";
import Loader from "../components/Loader";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logRes, statsRes] = await Promise.all([logsAPI.getAll(), logsAPI.getStats()]);
      setLogs(Array.isArray(logRes.data) ? logRes.data : []);
      setStats(statsRes.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const response = await reportsAPI.getRequests({ date });
      setReport(response.data);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <Loader size="lg" text="Loading admin console..." />;

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Console</h1>
          <p className="page-subtitle">
            Signed in as {user?.username || "admin"} with {user?.role || "viewer"} access.
          </p>
        </div>
        <Button onClick={fetchData}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Total", stats?.total || logs.length, "badge-neutral"],
          ["Allowed", stats?.allowed || 0, "badge-allow"],
          ["Alerts", stats?.alerted || 0, "badge-alert"],
          ["Blocked", stats?.blocked || 0, "badge-block"],
        ].map(([label, value, badge]) => (
          <section key={label} className="panel p-4">
            <span className={`badge ${badge}`}>{label}</span>
            <div className="mt-3 text-3xl font-bold text-[var(--app-text)]">{value}</div>
          </section>
        ))}
      </div>

      <section className="panel p-5">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="panel-title">Request Report</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">Generate a daily operational summary.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="input h-10 py-0" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Button onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
        {report && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="panel-muted p-3">
              <div className="text-sm text-[var(--app-text-muted)]">Average threat</div>
              <div className="text-xl font-bold text-[var(--app-text)]">
                {((report.summary?.avgThreatScore || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="panel-muted p-3">
              <div className="text-sm text-[var(--app-text-muted)]">Peak hour UTC</div>
              <div className="text-xl font-bold text-[var(--app-text)]">
                {report.summary?.peakHourUtc?.hour ?? 0}:00
              </div>
            </div>
            <div className="panel-muted p-3">
              <div className="text-sm text-[var(--app-text-muted)]">Overrides</div>
              <div className="text-xl font-bold text-[var(--app-text)]">{report.summary?.overrideCount || 0}</div>
            </div>
          </div>
        )}
      </section>

      <LogsTable logs={logs} loading={loading} />
    </div>
  );
};

export default AdminDashboard;
