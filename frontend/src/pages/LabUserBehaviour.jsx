import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";
import { decisionAPI } from "../services/api";
import { createBehaviourEvent, newSessionId } from "../utils/labTelemetry";

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
    const onClick = () => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName: "Click",
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

    const onKeydown = () => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName: "Keypress",
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

    const onScroll = () => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName: "Scroll",
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

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
      setError(
        err.response?.data?.message || "Failed to analyze behaviour sessions"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      <div>
        <h1 className="text-3xl font-bold text-[var(--app-text)]">
          Lab: User Behaviour Analysis
        </h1>
        <p className="text-muted mt-1">
          Record a simple event timeline and analyze with the behaviour model.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--app-text)] flex items-center gap-2">
            🧾 Session
          </h2>

          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-2">
              IP Address
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {!recording ? (
              <button
                onClick={startRecording}
                className="btn-primary py-2 px-4 rounded-lg transition-all font-medium"
              >
                ⏺ Start Session
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn bg-amber-500 text-white"
              >
                ⏹ Stop Session
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={events.length === 0 || loading}
              className="btn bg-emerald-600 text-white"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Session"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="panel-muted p-3">
              <p className="text-xs text-muted">Session ID</p>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
                {sessIdRef.current}
              </p>
            </div>
            <div className="panel-muted p-3">
              <p className="text-xs text-muted">Events</p>
              <p className="text-lg font-bold text-[var(--app-text)]">
                {events.length}
              </p>
            </div>
          </div>

          <div className="panel-muted p-3">
            <p className="text-xs text-muted mb-1">Sessions JSON</p>
            <pre className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-all max-h-80 overflow-auto">
              {JSON.stringify(
                [
                  {
                    sessn_id: sessIdRef.current,
                    events: events.slice(0, 20),
                  },
                ],
                null,
                2
              )}
            </pre>
            {events.length > 20 && (
              <div className="text-xs text-muted mt-2">
                Showing first 20 events (will send up to 60).
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing behaviour session..." />}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <span
                  className={`px-6 py-3 text-lg font-bold rounded-full shadow-xl ${
                    result.decision === "block"
                      ? "badge badge-block"
                      : result.decision === "alert"
                      ? "badge badge-alert"
                      : "badge badge-allow"
                  }`}
                >
                  {result.decision?.toUpperCase()}
                </span>
              </div>

              <div className="panel-muted p-4">
                <p className="text-sm text-muted mb-1">Threat Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        result.threatScore > 0.7
                          ? "bg-danger-600"
                          : result.threatScore > 0.4
                          ? "bg-warning-600"
                          : "bg-success-600"
                      }`}
                      style={{ width: `${(result.threatScore || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-[var(--app-text)]">
                    {((result.threatScore || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="panel-muted space-y-2 p-4">
                <p className="text-sm font-medium text-[var(--app-text)] flex items-center gap-2">
                  🤖 Model Scores
                </p>
                {Object.entries(result.modelScores).map(([model, score]) => (
                  <div
                    key={model}
                    className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2"
                  >
                    <span className="text-sm text-[var(--app-text)] capitalize">
                      {model}
                    </span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-200">
                      {(Number(score) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="text-sm text-[var(--app-text-muted)]">
              Start a session and analyze to see behaviour confidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabUserBehaviour;


