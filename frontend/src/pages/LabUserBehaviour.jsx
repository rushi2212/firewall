import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";
import { decisionAPI } from "../services/api";
import { createBehaviourEvent, newSessionId } from "../utils/labTelemetry";

const formatPct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const scoreFillClass = (score) => {
  const value = Number(score || 0);
  if (value >= 0.75) return "bg-rose-500";
  if (value >= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
};

const scoreBadgeClass = (score) => {
  const value = Number(score || 0);
  if (value >= 0.75) return "badge-block";
  if (value >= 0.5) return "badge-alert";
  return "badge-allow";
};

const decisionBadgeClass = (decision = "") => {
  const value = String(decision).toLowerCase();
  if (value === "block") return "badge-block";
  if (value === "alert") return "badge-alert";
  return "badge-allow";
};

const eventNameOf = (event) => event.event_name || event.eventName || "Event";
const pageNameOf = (event, fallback) => event.page_name || event.pageName || fallback;

const LabUserBehaviour = () => {
  const sessIdRef = useRef(newSessionId());

  const [ip, setIp] = useState("192.168.1.100");
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pageName = useMemo(() => {
    const path = window.location.pathname || "";
    if (path.includes("/lab/behaviour")) return "LabBehaviour";
    if (path.includes("/lab")) return "Lab";
    return "Unknown";
  }, []);

  useEffect(() => {
    const record = (eventName) => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName,
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

    const onClick = () => record("Click");
    const onKeydown = () => record("Keypress");
    const onScroll = () => record("Scroll");

    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pageName, recording]);

  const startRecording = () => {
    setError(null);
    setResult(null);
    sessIdRef.current = newSessionId();
    setEvents([
      createBehaviourEvent({
        eventName: "View",
        pageName,
        userAgent: navigator.userAgent,
      }),
    ]);
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sessions = [
        {
          sessn_id: sessIdRef.current,
          events: events.slice(0, 60),
        },
      ];

      const response = await decisionAPI.analyze({
        ip,
        ua: navigator.userAgent,
        payload: "user_behaviour_lab",
        sessions,
      });

      const prediction = response.data?.log?.prediction || {};
      const modelScores = {
        behavior: prediction.behavior ?? 0,
        payload: prediction.payload ?? 0,
        xss: prediction.xss ?? 0,
        bot: prediction.bot ?? 0,
        ddos: prediction.ddos ?? 0,
      };

      setResult({
        ...response.data.log,
        modelScores,
        sessions,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze behaviour sessions");
    } finally {
      setLoading(false);
    }
  };

  const eventCounts = useMemo(
    () =>
      events.reduce((acc, event) => {
        const name = eventNameOf(event);
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {}),
    [events]
  );

  const latestEvents = events.slice(-8).reverse();
  const canAnalyze = events.length > 0 && !loading;
  const aiDecision = result?.prediction?.aiDecision;

  return (
    <div className="mx-auto max-w-7xl animate-fadeIn space-y-6 p-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Behaviour Analysis</h1>
          <p className="page-subtitle">
            Capture a short browser session, then send the event timeline to the behaviour detector.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${recording ? "badge-alert" : "badge-neutral"}`}>
            {recording ? "Recording" : "Idle"}
          </span>
          <span className="badge badge-neutral">{events.length} events</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel p-5">
          <div className="mb-5">
            <h2 className="panel-title">Session Capture</h2>
            <p className="hint">Clicks, keypresses, scrolls, and page views are counted while recording.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">IP Address</label>
              <input
                type="text"
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!recording ? (
                <button onClick={startRecording} className="btn btn-primary">
                  Start session
                </button>
              ) : (
                <button onClick={stopRecording} className="btn bg-amber-500 text-white">
                  Stop session
                </button>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="btn bg-emerald-600 text-white"
              >
                {loading ? "Analyzing..." : "Analyze session"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="panel-muted p-3">
                <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">Session ID</p>
                <p className="mt-1 break-all font-mono text-xs text-[var(--app-text)]">
                  {sessIdRef.current}
                </p>
              </div>
              <div className="panel-muted p-3">
                <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">Captured</p>
                <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">{events.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["View", "Click", "Keypress", "Scroll"].map((name) => (
                <div key={name} className="panel-muted p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">{name}</p>
                  <p className="mt-1 text-xl font-bold text-[var(--app-text)]">{eventCounts[name] || 0}</p>
                </div>
              ))}
            </div>

            <div className="panel-muted p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[var(--app-text)]">Recent Timeline</h3>
                <span className="text-xs text-[var(--app-text-muted)]">Last {latestEvents.length || 0}</span>
              </div>
              {latestEvents.length === 0 ? (
                <p className="text-sm text-[var(--app-text-muted)]">
                  Start a session and interact with the page to build a timeline.
                </p>
              ) : (
                <div className="space-y-2">
                  {latestEvents.map((event, index) => (
                    <div
                      key={`${event.timestamp || index}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[var(--app-text)]">
                          {eventNameOf(event)}
                        </div>
                        <div className="text-xs text-[var(--app-text-muted)]">
                          {pageNameOf(event, pageName)}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--app-text-muted)]">
                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "Now"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-5">
            <h2 className="panel-title">Analysis Result</h2>
            <p className="hint">The final decision combines behaviour probability with other WAF scores.</p>
          </div>

          {loading && <Loader text="Analyzing behaviour session..." />}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
              {error}
            </div>
          )}

          {!loading && result && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">Decision</p>
                  <span className={`badge mt-2 ${decisionBadgeClass(result.decision)}`}>
                    {result.decision || "allow"}
                  </span>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">Threat Score</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                    {formatPct(result.threatScore)}
                  </p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">Behaviour Score</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                    {formatPct(result.modelScores?.behavior)}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-[var(--app-text)]">Threat score</span>
                  <span className="text-[var(--app-text-muted)]">{formatPct(result.threatScore)}</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${scoreFillClass(result.threatScore)}`}
                    style={{ width: `${Math.min(Number(result.threatScore || 0) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {aiDecision && (
                <div className="panel-muted p-4">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="badge badge-neutral">Signal: {aiDecision.primarySignal}</span>
                    <span className="badge badge-neutral">AI confidence: {formatPct(aiDecision.confidence)}</span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--app-text)]">
                    {aiDecision.analysis?.summary ||
                      aiDecision.reasons?.[0] ||
                      "The AI decision details were recorded in the log."}
                  </p>
                </div>
              )}

              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">Model Scores</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(result.modelScores).map(([model, score]) => (
                    <div key={model} className="panel-muted p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold capitalize text-[var(--app-text)]">{model}</span>
                        <span className={`badge ${scoreBadgeClass(score)}`}>{formatPct(score)}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${scoreFillClass(score)}`}
                          style={{ width: `${Math.min(Number(score || 0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <details className="panel-muted p-4">
                <summary className="cursor-pointer text-sm font-bold text-[var(--app-text)]">
                  Session JSON sent to analyzer
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-[var(--app-text-muted)]">
                  {JSON.stringify(result.sessions, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="panel-muted p-6 text-sm text-[var(--app-text-muted)]">
              <p className="font-semibold text-[var(--app-text)]">No analysis yet</p>
              <p className="mt-1">
                Start a session, interact with the page, then analyze to see behaviour confidence and the final WAF decision.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LabUserBehaviour;
