import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";
import { decisionAPI } from "../services/api";
import {
  createInteractionRecorder,
  snapshotToTrafficFlow,
} from "../utils/labTelemetry";

const LabBotDetection = () => {
  const recorderRef = useRef(null);

  const [ip, setIp] = useState("192.168.1.100");
  const [recording, setRecording] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const flow = useMemo(() => {
    if (!snapshot) return null;
    return snapshotToTrafficFlow(snapshot);
  }, [snapshot]);

  useEffect(() => {
    recorderRef.current = createInteractionRecorder();
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const startRecording = () => {
    setResult(null);
    setError(null);
    recorderRef.current?.start();
    setRecording(true);
    setSnapshot(recorderRef.current?.snapshot());
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    setSnapshot(recorderRef.current?.snapshot());
  };

  const refreshSnapshot = () => {
    setSnapshot(recorderRef.current?.snapshot());
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const latest = recorderRef.current?.snapshot();
      setSnapshot(latest);

      const trafficFlow = snapshotToTrafficFlow(latest || snapshot || {});
      const response = await decisionAPI.analyze({
        ip,
        ua: navigator.userAgent,
        payload: "bot_detection_lab",
        flow: trafficFlow,
      });

      const prediction = response.data?.log?.prediction || {};
      const modelScores = {
        bot: prediction.bot ?? 0,
        payload: prediction.payload ?? 0,
        xss: prediction.xss ?? 0,
        ddos: prediction.ddos ?? 0,
        behavior: prediction.behavior ?? 0,
      };

      setResult({
        ...response.data.log,
        modelScores,
        flow: trafficFlow,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze bot flow");
    } finally {
      setLoading(false);
    }
  };

  const counters = snapshot?.counters || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      <div>
        <h1 className="text-3xl font-bold text-[var(--app-text)]">
          Lab: Bot Detection
        </h1>
        <p className="text-muted mt-1">
          Record browser interactions, convert to a TrafficFlow, and analyze.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--app-text)] flex items-center gap-2">
            🎛️ Recorder
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
                ⏺ Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn bg-amber-500 text-white"
              >
                ⏹ Stop Recording
              </button>
            )}

            <button
              onClick={refreshSnapshot}
              disabled={!recording}
              className="btn btn-secondary"
            >
              🔄 Refresh
            </button>

            <button
              onClick={handleAnalyze}
              disabled={!flow || loading}
              className="btn bg-emerald-600 text-white"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Flow"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="panel-muted p-3">
              <p className="text-xs text-muted">Clicks</p>
              <p className="text-lg font-bold text-[var(--app-text)]">
                {counters.click || 0}
              </p>
            </div>
            <div className="panel-muted p-3">
              <p className="text-xs text-muted">Keys</p>
              <p className="text-lg font-bold text-[var(--app-text)]">
                {counters.keydown || 0}
              </p>
            </div>
            <div className="panel-muted p-3">
              <p className="text-xs text-muted">Scroll</p>
              <p className="text-lg font-bold text-[var(--app-text)]">
                {counters.scroll || 0}
              </p>
            </div>
            <div className="panel-muted p-3">
              <p className="text-xs text-muted">Mousemove</p>
              <p className="text-lg font-bold text-[var(--app-text)]">
                {counters.mousemove || 0}
              </p>
            </div>
          </div>

          <div className="panel-muted p-3">
            <p className="text-xs text-muted mb-1">TrafficFlow JSON</p>
            <pre className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-all">
              {flow ? JSON.stringify(flow, null, 2) : "Record some events..."}
            </pre>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing bot flow..." />}

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
              Record then analyze to see bot confidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabBotDetection;


