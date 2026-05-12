import React, { useEffect, useMemo, useRef, useState } from "react";
import ThreatCard from "../components/ThreatCard";
import Loader from "../components/Loader";
import { logsAPI } from "../services/api";

const MAX_LOGS = 200;

const getDecisionCounts = (logs) => {
  const counts = { total: 0, allowed: 0, alerted: 0, blocked: 0 };
  if (!Array.isArray(logs)) return counts;
  for (const log of logs) {
    counts.total++;
    const decision = (log?.decision || "").toLowerCase();
    if (decision === "allow" || decision === "allowed") counts.allowed++;
    else if (decision === "alert" || decision === "alerted") counts.alerted++;
    else if (decision === "block" || decision === "blocked") counts.blocked++;
  }
  return counts;
};

const formatPct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;

const PresentationDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState("connecting");
  const eventSourceRef = useRef(null);

  const stats = useMemo(() => getDecisionCounts(logs), [logs]);
  const latest = logs?.[0];
  const latestRps = latest?.prediction?.traffic?.rps;
  const latestDdos = latest?.prediction?.ddos;

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const resp = await logsAPI.getAll();
      const data = Array.isArray(resp.data) ? resp.data : [];
      setLogs(data);
      setSelected(data[0] ?? null);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
      setLogs([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/logs/stream");
    eventSourceRef.current = es;
    setStreamStatus("connecting");

    es.addEventListener("status", () => {
      setStreamStatus("connected");
    });

    es.addEventListener("log", (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        setLogs((prev) => {
          const id = parsed?._id;
          const next = Array.isArray(prev) ? prev : [];
          if (id && next.some((l) => l?._id === id)) return next;
          const merged = [parsed, ...next].slice(0, MAX_LOGS);
          return merged;
        });
        setSelected((prev) => prev ?? parsed);
      } catch (e) {
        console.error("Bad SSE log payload:", e);
      }
    });

    es.onerror = () => {
      setStreamStatus("disconnected");
    };

    return () => {
      es.close();
    };
  }, []);

  if (loading) {
    return <Loader size="lg" text="Loading presentation dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--app-text)]">
            Presentation Dashboard
          </h1>
          <p className="text-muted mt-1">
            Live detection view (SSE stream)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-xl border text-sm font-semibold ${
              streamStatus === "connected"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                : streamStatus === "connecting"
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200"
            }`}
          >
            {streamStatus === "connected"
              ? "Live: Connected"
              : streamStatus === "connecting"
              ? "Live: Connecting"
              : "Live: Disconnected"}
          </div>

          <button
            onClick={fetchInitial}
            className="btn btn-primary"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <ThreatCard title="Total" value={stats.total} icon="📊" color="primary" />
        <ThreatCard title="Blocked" value={stats.blocked} icon="🛡️" color="danger" />
        <ThreatCard title="Alerts" value={stats.alerted} icon="⚠️" color="warning" />
        <ThreatCard title="Allowed" value={stats.allowed} icon="✅" color="success" />
        <ThreatCard
          title="Latest DDoS"
          value={latestDdos !== undefined ? formatPct(latestDdos) : "—"}
          icon="📡"
          color={Number(latestDdos || 0) >= 0.5 ? "danger" : "primary"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-lg font-semibold text-[var(--app-text)] flex items-center gap-2">
              <span className="text-2xl">📡</span> Live Feed
            </h2>
            <div className="text-sm text-muted">
              Latest RPS: {latestRps !== undefined ? latestRps.toFixed(2) : "—"}
            </div>
          </div>

          <div className="divide-y divide-[var(--app-border)] max-h-[520px] overflow-auto">
            {logs.length === 0 ? (
              <div className="p-6 text-muted">No logs yet.</div>
            ) : (
              logs.slice(0, 50).map((log) => {
                const isActive = selected?._id === log?._id;
                const decision = (log?.decision || "").toLowerCase();
                const badgeClass =
                  decision === "block"
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700"
                    : decision === "alert"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700";

                return (
                  <button
                    key={log?._id}
                    onClick={() => setSelected(log)}
                    className={`w-full text-left p-4 hover:bg-[var(--app-surface-muted)] transition-colors ${
                      isActive ? "bg-[var(--app-surface-muted)]" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase ${badgeClass}`}
                          >
                            {decision || "—"}
                          </span>
                          <span className="text-[var(--app-text)] font-semibold truncate">
                            {log?.ip || "Unknown IP"}
                          </span>
                        </div>
                        <div className="text-muted text-sm mt-1 truncate">
                          {log?.payload || "(no payload)"}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[var(--app-text)] font-bold">
                          {formatPct(log?.threatScore)}
                        </div>
                        <div className="text-xs text-muted">
                          {log?.createdAt
                            ? new Date(log.createdAt).toLocaleTimeString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-lg font-semibold text-[var(--app-text)] flex items-center gap-2">
              <span className="text-2xl">🔎</span> Selected Log
            </h2>
          </div>

          {!selected ? (
            <div className="p-6 text-muted">Select a log from the feed.</div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="panel-muted p-4">
                  <div className="text-sm text-muted">Decision</div>
                  <div className="text-2xl font-bold text-[var(--app-text)]">
                    {selected.decision}
                  </div>
                </div>
                <div className="panel-muted p-4">
                  <div className="text-sm text-muted">Threat Score</div>
                  <div className="text-2xl font-bold text-[var(--app-text)]">
                    {formatPct(selected.threatScore)}
                  </div>
                </div>
              </div>

              <div className="panel-muted p-4">
                <div className="text-sm text-muted mb-2">Model Scores</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="text-slate-700 dark:text-slate-200">
                    payload: <span className="font-bold">{formatPct(selected?.prediction?.payload)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200">
                    xss: <span className="font-bold">{formatPct(selected?.prediction?.xss)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200">
                    bot: <span className="font-bold">{formatPct(selected?.prediction?.bot)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200">
                    ddos: <span className="font-bold">{formatPct(selected?.prediction?.ddos)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200">
                    behavior: <span className="font-bold">{formatPct(selected?.prediction?.behavior)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200">
                    rps: <span className="font-bold">{selected?.prediction?.traffic?.rps?.toFixed?.(2) ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="panel-muted p-4">
                <div className="text-sm text-muted mb-2">Details</div>
                <pre className="text-xs text-slate-700 dark:text-slate-200 overflow-auto max-h-60">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentationDashboard;

