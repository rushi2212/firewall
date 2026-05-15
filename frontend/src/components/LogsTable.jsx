import React, { useMemo, useState } from "react";
import Loader from "./Loader";

const decisionMeta = {
  allow: { label: "Allowed", badge: "badge-allow" },
  allowed: { label: "Allowed", badge: "badge-allow" },
  alert: { label: "Alert", badge: "badge-alert" },
  alerted: { label: "Alert", badge: "badge-alert" },
  block: { label: "Blocked", badge: "badge-block" },
  blocked: { label: "Blocked", badge: "badge-block" },
};

const getDecision = (value = "") =>
  decisionMeta[String(value).toLowerCase()] || { label: value || "Unknown", badge: "badge-neutral" };

const scoreTone = (score = 0) => {
  if (score >= 0.75) return "bg-rose-500";
  if (score >= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
};

const LogsTable = ({ logs = [], loading = false }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const decision = String(log.decision || "").toLowerCase();
      const matchesFilter =
        filter === "all" ||
        (filter === "allow" && ["allow", "allowed"].includes(decision)) ||
        (filter === "alert" && ["alert", "alerted"].includes(decision)) ||
        (filter === "block" && ["block", "blocked"].includes(decision));
      const matchesSearch =
        !query ||
        String(log.ip || "").toLowerCase().includes(query) ||
        String(log.path || "").toLowerCase().includes(query) ||
        String(log.payload || "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [logs, filter, search]);

  if (loading) {
    return (
      <div className="panel">
        <Loader text="Loading request logs..." />
      </div>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header flex-wrap">
        <div>
          <h2 className="panel-title">Request events</h2>
          <p className="text-sm text-[var(--app-text-muted)]">{filtered.length} of {logs.length} logs</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["all", "allow", "alert", "block"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`btn h-9 px-3 text-xs ${filter === item ? "btn-primary" : "btn-secondary"}`}
            >
              {item}
            </button>
          ))}
          <input
            className="input h-9 min-w-56 py-0 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search IP, path, payload"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>IP</th>
              <th>Request</th>
              <th>Score</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-[var(--app-text-muted)]">
                  No logs match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((log, index) => {
                const decision = getDecision(log.decision);
                const score = Number(log.threatScore || 0);
                const payload = String(log.payload || "No payload captured");
                const isExpanded = expanded === index;

                return (
                  <React.Fragment key={log._id || index}>
                    <tr>
                      <td className="whitespace-nowrap text-[var(--app-text-muted)]">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown"}
                      </td>
                      <td className="font-mono text-sm">{log.ip || "Unknown"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : index)}
                          className="max-w-xl truncate text-left text-sm text-[var(--app-text)] hover:text-[var(--app-primary)]"
                        >
                          {log.method || "REQ"} {log.path || payload}
                        </button>
                      </td>
                      <td className="min-w-40">
                        <div className="flex items-center gap-3">
                          <div className="progress-track w-24">
                            <div className={`progress-fill ${scoreTone(score)}`} style={{ width: `${Math.min(score * 100, 100)}%` }} />
                          </div>
                          <span className="font-semibold">{(score * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${decision.badge}`}>{decision.label}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="5" className="bg-[var(--app-surface-muted)]">
                          <pre className="whitespace-pre-wrap break-words rounded-lg p-3 font-mono text-xs text-[var(--app-text-muted)]">
                            {payload}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default LogsTable;
