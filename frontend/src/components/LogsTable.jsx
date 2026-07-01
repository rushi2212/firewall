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

const modelLabels = {
  payload: "Payload BiLSTM",
  xss: "XSS BiLSTM",
  bot: "Bot models",
  behavior: "Behaviour LSTM",
  ddos: "Traffic score",
  rules: "Rule context",
};

const getTopModel = (prediction = {}) => {
  const entries = Object.entries(modelLabels)
    .map(([key, label]) => [key, label, Number(prediction?.[key] || 0)])
    .filter(([, , score]) => score > 0);
  if (!entries.length) return "Clean";
  return entries.sort((a, b) => b[2] - a[2])[0][1];
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
        <Loader text="Loading payload logs..." />
      </div>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header flex-wrap">
        <div>
          <h2 className="panel-title">Payload events</h2>
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

      <div className="w-full overflow-hidden">
        <table className="data-table logs-table">
          <colgroup>
            <col className="logs-col-time" />
            <col className="logs-col-ip" />
            <col className="logs-col-payload" />
            <col className="logs-col-signal" />
            <col className="logs-col-score" />
            <col className="logs-col-decision" />
          </colgroup>
          <thead>
            <tr>
              <th>Time</th>
              <th>IP</th>
              <th>Payload</th>
              <th>Top Signal</th>
              <th>Score</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-[var(--app-text-muted)]">
                  No logs match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((log, index) => {
                const decision = getDecision(log.decision);
                const score = Number(log.threatScore || 0);
                const payload = String(log.payload || "No payload captured");
                const isExpanded = expanded === index;
                const prediction = log.prediction || {};
                const topSignal = getTopModel(prediction);

                return (
                  <React.Fragment key={log._id || index}>
                    <tr>
                      <td className="text-[var(--app-text-muted)]">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown"}
                      </td>
                      <td className="break-all font-mono text-sm">{log.ip || "Unknown"}</td>
                      <td className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : index)}
                          className="block w-full whitespace-normal break-all text-left font-mono text-sm leading-5 text-[var(--app-text)] hover:text-[var(--app-primary)]"
                        >
                          {payload}
                        </button>
                      </td>
                      <td className="break-words text-sm text-[var(--app-text-muted)]">{topSignal}</td>
                      <td>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <div className="progress-track min-w-16 flex-1">
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
                        <td colSpan="6" className="bg-[var(--app-surface-muted)]">
                          <div className="grid min-w-0 gap-4 p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                            <div className="min-w-0">
                              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
                                Payload
                              </div>
                              <pre className="max-w-full whitespace-pre-wrap break-all rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 font-mono text-xs text-[var(--app-text-muted)]">
                                {payload}
                              </pre>
                              <div className="mt-2 break-all text-xs text-[var(--app-text-muted)]">
                                {log.method || "REQ"} {log.path || "Unknown path"}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
                                Model Scores
                              </div>
                              <div className="space-y-2">
                                {Object.entries(modelLabels).map(([key, label]) => {
                                  const modelScore = Number(prediction?.[key] || 0);
                                  return (
                                    <div key={key} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                                        <span className="font-semibold text-[var(--app-text)]">{label}</span>
                                        <span className="font-mono text-[var(--app-text-muted)]">{(modelScore * 100).toFixed(1)}%</span>
                                      </div>
                                      <div className="progress-track">
                                        <div className={`progress-fill ${scoreTone(modelScore)}`} style={{ width: `${Math.min(modelScore * 100, 100)}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {log.override && (
                                <div className="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-xs text-[var(--app-text-muted)]">
                                  Override: <span className="font-semibold text-[var(--app-text)]">{log.override.model}</span>
                                </div>
                              )}
                            </div>
                          </div>
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
