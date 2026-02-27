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
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Presentation Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Live detection view (SSE stream)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-xl border text-sm font-semibold backdrop-blur-sm ${
              streamStatus === "connected"
                ? "border-success-600/50 bg-success-900/30 text-success-200"
                : streamStatus === "connecting"
                ? "border-warning-600/50 bg-warning-900/30 text-warning-200"
                : "border-danger-600/50 bg-danger-900/30 text-danger-200"
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
            className="px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-200 hover:bg-gray-800 transition-all"
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
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-6 bg-gray-900/60 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📡</span> Live Feed
            </h2>
            <div className="text-sm text-gray-300">
              Latest RPS: {latestRps !== undefined ? latestRps.toFixed(2) : "—"}
            </div>
          </div>

          <div className="divide-y divide-gray-700 max-h-[520px] overflow-auto">
            {logs.length === 0 ? (
              <div className="p-6 text-gray-400">No logs yet.</div>
            ) : (
              logs.slice(0, 50).map((log) => {
                const isActive = selected?._id === log?._id;
                const decision = (log?.decision || "").toLowerCase();
                const badgeClass =
                  decision === "block"
                    ? "bg-danger-900/40 text-danger-200 border-danger-700/50"
                    : decision === "alert"
                    ? "bg-warning-900/40 text-warning-200 border-warning-700/50"
                    : "bg-success-900/30 text-success-200 border-success-700/50";

                return (
                  <button
                    key={log?._id}
                    onClick={() => setSelected(log)}
                    className={`w-full text-left p-4 hover:bg-gray-800/40 transition-colors ${
                      isActive ? "bg-gray-800/50" : "bg-transparent"
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
                          <span className="text-gray-200 font-semibold truncate">
                            {log?.ip || "Unknown IP"}
                          </span>
                        </div>
                        <div className="text-gray-400 text-sm mt-1 truncate">
                          {log?.payload || "(no payload)"}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-white font-bold">
                          {formatPct(log?.threatScore)}
                        </div>
                        <div className="text-xs text-gray-400">
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

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-6 bg-gray-900/60 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🔎</span> Selected Log
            </h2>
          </div>

          {!selected ? (
            <div className="p-6 text-gray-400">Select a log from the feed.</div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                  <div className="text-sm text-gray-400">Decision</div>
                  <div className="text-2xl font-bold text-white">
                    {selected.decision}
                  </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                  <div className="text-sm text-gray-400">Threat Score</div>
                  <div className="text-2xl font-bold text-white">
                    {formatPct(selected.threatScore)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-2">Model Scores</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="text-gray-200">
                    payload: <span className="font-bold">{formatPct(selected?.prediction?.payload)}</span>
                  </div>
                  <div className="text-gray-200">
                    xss: <span className="font-bold">{formatPct(selected?.prediction?.xss)}</span>
                  </div>
                  <div className="text-gray-200">
                    bot: <span className="font-bold">{formatPct(selected?.prediction?.bot)}</span>
                  </div>
                  <div className="text-gray-200">
                    ddos: <span className="font-bold">{formatPct(selected?.prediction?.ddos)}</span>
                  </div>
                  <div className="text-gray-200">
                    behavior: <span className="font-bold">{formatPct(selected?.prediction?.behavior)}</span>
                  </div>
                  <div className="text-gray-200">
                    rps: <span className="font-bold">{selected?.prediction?.traffic?.rps?.toFixed?.(2) ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-2">Details</div>
                <pre className="text-xs text-gray-200 overflow-auto max-h-60">
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
