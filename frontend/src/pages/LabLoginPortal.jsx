import React, { useMemo, useState } from "react";
import Loader from "../components/Loader";
import { decisionAPI } from "../services/api";

const LabLoginPortal = () => {
  const [ip, setIp] = useState("192.168.1.100");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const quickPayloads = useMemo(
    () => [
      { label: "Normal", u: "alice", p: "Password123!" },
      { label: "SQLi classic", u: "' OR '1'='1' --", p: "x" },
      { label: "SQLi stacked", u: "admin", p: "1; DROP TABLE users; --" },
      { label: "XSS script", u: '<script>alert("xss")</script>', p: "x" },
      {
        label: "XSS img onerror",
        u: '<img src=x onerror=alert(document.cookie) />',
        p: "x",
      },
    ],
    []
  );

  const buildPayloadString = () => {
    const u = encodeURIComponent(username);
    const p = encodeURIComponent(password);
    const r = remember ? "1" : "0";
    return `POST /login username=${u}&password=${p}&remember=${r}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = buildPayloadString();
      const response = await decisionAPI.analyze({
        ip,
        ua: navigator.userAgent,
        payload,
      });

      const prediction = response.data?.log?.prediction || {};
      const modelScores = {
        payload: prediction.payload ?? 0,
        xss: prediction.xss ?? 0,
        bot: prediction.bot ?? 0,
        ddos: prediction.ddos ?? 0,
        behavior: prediction.behavior ?? 0,
      };

      setResult({
        ...response.data.log,
        modelScores,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze login payload");
    } finally {
      setLoading(false);
    }
  };

  const applyQuick = (item) => {
    setUsername(item.u);
    setPassword(item.p);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      <div>
        <h1 className="text-3xl font-bold text-[var(--app-text)]">
          Lab: Login Portal
        </h1>
        <p className="text-muted mt-1">
          Sample login form for injecting SQLi/XSS payloads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            🔐 Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-[var(--app-text)] mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--app-text)] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter password"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-blue-600"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 px-4 rounded-lg disabled:opacity-50 transition-all font-medium"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Login"}
            </button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-[var(--app-text)] mb-3 flex items-center gap-2">
              ⚡ Quick Inject
            </h3>
            <div className="space-y-2">
              {quickPayloads.map((q) => (
                <button
                  key={q.label}
                  onClick={() => applyQuick(q)}
                  className="w-full text-left px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg text-sm transition-all group"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {q.label}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate mt-1">
                    u={q.u} | p={q.p}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 panel-muted p-3">
            <p className="text-xs text-muted mb-1">Sent payload</p>
            <p className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
              {buildPayloadString()}
            </p>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing login payload..." />}

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
              Submit the form to see model scores.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabLoginPortal;


