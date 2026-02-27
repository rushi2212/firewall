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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Lab: Login Portal
        </h1>
        <p className="text-gray-400 mt-1">
          Sample login form for injecting SQLi/XSS payloads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
            🔐 Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter password"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-primary-600"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all font-medium shadow-lg hover:shadow-xl hover:shadow-primary-600/50 transform hover:-translate-y-0.5"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Login"}
            </button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              ⚡ Quick Inject
            </h3>
            <div className="space-y-2">
              {quickPayloads.map((q) => (
                <button
                  key={q.label}
                  onClick={() => applyQuick(q)}
                  className="w-full text-left px-3 py-2 bg-gray-900/50 border border-gray-700 hover:border-primary-600 hover:bg-gray-900 rounded-lg text-sm transition-all group"
                >
                  <span className="font-medium text-gray-300 group-hover:text-primary-400">
                    {q.label}
                  </span>
                  <p className="text-xs text-gray-500 font-mono truncate mt-1">
                    u={q.u} | p={q.p}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-gray-900/40 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Sent payload</p>
            <p className="text-xs font-mono text-gray-300 break-all">
              {buildPayloadString()}
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing login payload..." />}

          {error && (
            <div className="bg-danger-900/30 border border-danger-600 text-danger-300 px-4 py-3 rounded-lg animate-shake">
              {error}
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <span
                  className={`px-6 py-3 text-lg font-bold rounded-full shadow-xl ${
                    result.decision === "block"
                      ? "bg-danger-600 text-white border-2 border-danger-400 shadow-danger-600/50 animate-pulse"
                      : result.decision === "alert"
                      ? "bg-warning-600 text-white border-2 border-warning-400 shadow-warning-600/50"
                      : "bg-success-600 text-white border-2 border-success-400 shadow-success-600/50"
                  }`}
                >
                  {result.decision?.toUpperCase()}
                </span>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Threat Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
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
                  <span className="text-lg font-bold text-white">
                    {((result.threatScore || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  🤖 Model Scores
                </p>
                {Object.entries(result.modelScores).map(([model, score]) => (
                  <div
                    key={model}
                    className="flex justify-between items-center bg-gray-800/40 px-3 py-2 rounded-lg"
                  >
                    <span className="text-sm text-gray-300 capitalize">
                      {model}
                    </span>
                    <span className="text-sm font-mono text-gray-200">
                      {(Number(score) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="text-gray-400 text-sm">
              Submit the form to see model scores.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabLoginPortal;
