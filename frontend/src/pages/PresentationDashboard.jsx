import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";
import { getApiStreamUrl, logsAPI, presentationAPI } from "../services/api";

const MAX_LOGS = 200;

const getDecisionCounts = (logs) => {
  const counts = { total: 0, allowed: 0, alerted: 0, blocked: 0 };
  if (!Array.isArray(logs)) return counts;
  for (const log of logs) {
    counts.total += 1;
    const decision = String(log?.decision || "").toLowerCase();
    if (decision === "allow" || decision === "allowed") counts.allowed += 1;
    else if (decision === "alert" || decision === "alerted")
      counts.alerted += 1;
    else if (decision === "block" || decision === "blocked")
      counts.blocked += 1;
  }
  return counts;
};

const formatPct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const decisionBadgeClass = (decision = "") => {
  const value = String(decision).toLowerCase();
  if (value === "block") return "badge-block";
  if (value === "alert") return "badge-alert";
  return "badge-allow";
};

const isPresentationRoute = (log) =>
  String(log?.path || "").startsWith("/presentation");

const mergeLogs = (incoming, existing = []) => {
  const seen = new Set();
  return [...(incoming || []), ...(existing || [])]
    .filter((log) => {
      const id =
        log?._id ||
        `${log?.createdAt || ""}:${log?.ip || ""}:${log?.path || ""}:${log?.decision || ""}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_LOGS);
};

const scoreFillClass = (score) => {
  const value = Number(score || 0);
  if (value >= 0.75) return "bg-rose-500";
  if (value >= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
};

const StatTile = ({ label, value, tone = "neutral", helper }) => {
  const toneClass =
    tone === "danger"
      ? "text-[var(--app-danger)]"
      : tone === "warning"
        ? "text-[var(--app-warning)]"
        : tone === "success"
          ? "text-[var(--app-success)]"
          : "text-[var(--app-text)]";

  return (
    <div className="panel p-4">
      <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
      {helper && (
        <p className="mt-1 text-xs text-[var(--app-text-muted)]">{helper}</p>
      )}
    </div>
  );
};

const ScoreRow = ({ label, value }) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
      <span className="capitalize text-[var(--app-text)]">{label}</span>
      <span className="font-mono text-xs text-[var(--app-text-muted)]">
        {formatPct(value)}
      </span>
    </div>
    <div className="progress-track">
      <div
        className={`progress-fill ${scoreFillClass(value)}`}
        style={{ width: `${Math.min(Number(value || 0) * 100, 100)}%` }}
      />
    </div>
  </div>
);

const PresentationDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState("connecting");
  const [simulationStatus, setSimulationStatus] = useState("idle");
  const [simulationOutput, setSimulationOutput] = useState("");
  const eventSourceRef = useRef(null);

  const stats = useMemo(() => getDecisionCounts(logs), [logs]);
  const presentationLogs = useMemo(
    () => logs.filter(isPresentationRoute),
    [logs],
  );
  const presentationStats = useMemo(
    () => getDecisionCounts(presentationLogs),
    [presentationLogs],
  );
  const latest = logs?.[0];
  const latestRps = latest?.prediction?.traffic?.rps;
  const latestDdos = latest?.prediction?.ddos;
  const blockRate = stats.total ? stats.blocked / stats.total : 0;
  const alertRate = stats.total ? stats.alerted / stats.total : 0;
  const presentationBlockRate = presentationStats.total
    ? presentationStats.blocked / presentationStats.total
    : 0;
  const latestPresentation = presentationLogs?.[0];
  const selectedScores = selected?.prediction || {};
  const aiDecision = selected?.prediction?.aiDecision;

  const fetchLogs = async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const resp = await logsAPI.getAll();
      const data = Array.isArray(resp.data) ? resp.data : [];
      setLogs((prev) => mergeLogs(data, prev));
      setSelected((prev) => prev ?? data[0] ?? null);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchInitial = () => fetchLogs({ showLoading: true });

  const startPresentationSimulation = async () => {
    setSimulationStatus("running");
    setSimulationOutput("Launching presentation DDoS simulation...");
    try {
      const response = await presentationAPI.startSimulation();
      setSimulationStatus(
        response?.data?.status === "started" ? "done" : "failed",
      );
      setSimulationOutput(response?.data?.message || "Simulation started.");
      window.setTimeout(() => {
        fetchLogs();
      }, 2000);
    } catch (error) {
      setSimulationStatus("failed");
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to start simulation.";
      setSimulationOutput(message);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchLogs();
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const es = new EventSource(getApiStreamUrl("/logs/stream"));
    eventSourceRef.current = es;
    setStreamStatus("connecting");

    es.addEventListener("status", () => {
      setStreamStatus("connected");
    });

    es.addEventListener("log", (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        setLogs((prev) => {
          return mergeLogs([parsed], prev);
        });
        setSelected(parsed);
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
    <div className="animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Presentation Dashboard</h1>
          <p className="page-subtitle">
            Live request decisions, detector scores, and selected-log analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`badge ${
              streamStatus === "connected"
                ? "badge-allow"
                : streamStatus === "connecting"
                  ? "badge-alert"
                  : "badge-block"
            }`}
          >
            {streamStatus === "connected"
              ? "Live connected"
              : streamStatus === "connecting"
                ? "Connecting"
                : "Disconnected"}
          </span>
          <button onClick={fetchInitial} className="btn btn-primary">
            Refresh
          </button>
          <button
            onClick={startPresentationSimulation}
            className="btn btn-secondary"
            disabled={simulationStatus === "running"}
          >
            {simulationStatus === "running"
              ? "Running simulation..."
              : "Run presentation DDoS"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatTile
          label="Total"
          value={stats.total}
          helper="Recent logs loaded"
        />
        <StatTile
          label="Blocked"
          value={stats.blocked}
          tone="danger"
          helper={formatPct(blockRate)}
        />
        <StatTile
          label="Alerts"
          value={stats.alerted}
          tone="warning"
          helper={formatPct(alertRate)}
        />
        <StatTile label="Allowed" value={stats.allowed} tone="success" />
        <StatTile
          label="Latest DDoS"
          value={latestDdos !== undefined ? formatPct(latestDdos) : "-"}
          tone={Number(latestDdos || 0) >= 0.5 ? "danger" : "neutral"}
        />
        <StatTile
          label="Latest RPS"
          value={latestRps !== undefined ? Number(latestRps).toFixed(2) : "-"}
        />
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Presentation Route DDoS</h2>
            <p className="hint">
              Burst traffic against{" "}
              <span className="font-mono">/presentation</span> now shows a
              realistic ramp-up: some requests pass first, then the limiter
              starts returning blocks once the rate stays high.
            </p>
          </div>
          <span
            className={`badge ${presentationStats.blocked > 0 ? "badge-alert" : "badge-allow"}`}
          >
            {presentationStats.blocked > 0
              ? "Burst detected"
              : "Normal traffic"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
          {[
            ["Route", "/presentation"],
            ["Attempts", presentationStats.total],
            ["Blocked", presentationStats.blocked],
            ["Block rate", formatPct(presentationBlockRate)],
          ].map(([label, value]) => (
            <div key={label} className="panel-muted p-4">
              <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                {label}
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--app-text)]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--app-border)] bg-[var(--app-surface-raised)] px-5 py-4 text-sm text-[var(--app-text-muted)]">
          {latestPresentation ? (
            <>
              Latest source IP{" "}
              <span className="font-mono text-[var(--app-text)]">
                {latestPresentation.ip || "Unknown"}
              </span>{" "}
              hit the route with a{" "}
              <span className="font-mono text-[var(--app-text)]">
                {latestPresentation.decision || "-"}
              </span>{" "}
              decision at{" "}
              {latestPresentation.createdAt
                ? new Date(latestPresentation.createdAt).toLocaleTimeString()
                : "unknown time"}
              .
            </>
          ) : (
            <>
              No{" "}
              <span className="font-mono text-[var(--app-text)]">
                /presentation
              </span>{" "}
              traffic has been logged yet.
            </>
          )}
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="panel-title">Simulation Control</h2>
            <p className="hint">
              Launch the local{" "}
              <span className="font-mono">ddostest/strongddos.py</span> script
              to generate realistic burst traffic against{" "}
              <span className="font-mono">/presentation</span>.
            </p>
          </div>
          <span
            className={`badge ${simulationStatus === "done" ? "badge-allow" : simulationStatus === "failed" ? "badge-block" : simulationStatus === "running" ? "badge-alert" : "badge-neutral"}`}
          >
            {simulationStatus === "running"
              ? "Running"
              : simulationStatus === "done"
                ? "Completed"
                : simulationStatus === "failed"
                  ? "Failed"
                  : "Idle"}
          </span>
        </div>
        <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 text-xs text-[var(--app-text-muted)]">
          {simulationOutput || "No simulation output yet."}
        </pre>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Live Feed</h2>
              <p className="hint">
                Newest requests appear first. Select a row to inspect it.
              </p>
            </div>
            <span className="badge badge-neutral">
              {Math.min(logs.length, 50)} shown
            </span>
          </div>

          <div className="max-h-[620px] overflow-auto divide-y divide-[var(--app-border)]">
            {logs.length === 0 ? (
              <div className="p-6 text-sm text-[var(--app-text-muted)]">
                No logs yet.
              </div>
            ) : (
              logs.slice(0, 50).map((log) => {
                const isActive = selected?._id === log?._id;
                const decision = String(log?.decision || "").toLowerCase();

                return (
                  <button
                    key={log?._id}
                    onClick={() => setSelected(log)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-[var(--app-surface-muted)] ${
                      isActive
                        ? "bg-[var(--app-surface-muted)]"
                        : "bg-transparent"
                    }`}
                  >
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span className={`badge ${decisionBadgeClass(decision)}`}>
                        {decision || "-"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-[var(--app-text)]">
                            {log?.ip || "Unknown IP"}
                          </span>
                          <span className="text-xs text-[var(--app-text-muted)]">
                            {log?.method || "POST"}{" "}
                            {log?.path || "/api/decision/analyze"}
                          </span>
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-[var(--app-text-muted)]">
                          {log?.payload || log?.path || ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[var(--app-text)]">
                          {formatPct(log?.threatScore)}
                        </div>
                        <div className="text-xs text-[var(--app-text-muted)]">
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
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Selected Log</h2>
              <p className="hint">
                Decision context, AI explanation, and detector scores.
              </p>
            </div>
            {selected && (
              <span
                className={`badge ${decisionBadgeClass(selected.decision)}`}
              >
                {selected.decision}
              </span>
            )}
          </div>

          {!selected ? (
            <div className="p-6 text-sm text-[var(--app-text-muted)]">
              Select a log from the feed.
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                    IP
                  </p>
                  <p className="mt-1 break-all font-semibold text-[var(--app-text)]">
                    {selected.ip || "Unknown"}
                  </p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                    Threat Score
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                    {formatPct(selected.threatScore)}
                  </p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                    DDoS RPS
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                    {selectedScores?.traffic?.rps?.toFixed?.(2) ?? "-"}
                  </p>
                </div>
              </div>

              {aiDecision && (
                <div className="panel-muted p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="badge badge-neutral">
                      Signal: {aiDecision.primarySignal}
                    </span>
                    <span className="badge badge-neutral">
                      Confidence: {formatPct(aiDecision.confidence)}
                    </span>
                    {aiDecision.source && (
                      <span className="badge badge-neutral">
                        Source: {aiDecision.source}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-[var(--app-text)]">
                    {aiDecision.analysis?.summary ||
                      aiDecision.reasons?.[0] ||
                      "No AI summary recorded."}
                  </p>
                  {aiDecision.analysis?.recommendedAction && (
                    <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                      <span className="font-semibold text-[var(--app-text)]">
                        Recommended action:{" "}
                      </span>
                      {aiDecision.analysis.recommendedAction}
                    </p>
                  )}
                </div>
              )}

              <div className="panel-muted p-4">
                <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">
                  Model Scores
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ScoreRow label="payload" value={selectedScores.payload} />
                  <ScoreRow label="xss" value={selectedScores.xss} />
                  <ScoreRow label="bot" value={selectedScores.bot} />
                  <ScoreRow label="ddos" value={selectedScores.ddos} />
                  <ScoreRow label="behavior" value={selectedScores.behavior} />
                  <ScoreRow label="rules" value={selectedScores.rules} />
                </div>
              </div>

              <div className="panel-muted p-4">
                <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">
                  Request
                </h3>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                      Path
                    </dt>
                    <dd className="mt-1 break-all text-[var(--app-text)]">
                      {selected.path || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                      User Agent
                    </dt>
                    <dd className="mt-1 break-all text-[var(--app-text)]">
                      {selected.ua || "-"}
                    </dd>
                  </div>
                </dl>
                {selected.payload ? (
                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                      Payload
                    </div>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 text-xs text-[var(--app-text)]">
                      {selected.payload}
                    </pre>
                  </div>
                ) : null}
              </div>

              <details className="panel-muted p-4">
                <summary className="cursor-pointer text-sm font-bold text-[var(--app-text)]">
                  Full log JSON
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs text-[var(--app-text-muted)]">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PresentationDashboard;
