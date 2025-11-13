import React, { useState } from "react";
import { decisionAPI } from "../services/api";
import Loader from "../components/Loader";

const TestPayload = () => {
  const [formData, setFormData] = useState({
    ip: "192.168.1.100",
    payload: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testPayloads = [
    { name: "Normal - Query", payload: "/api/books?search=harry+potter&page=1" },
    { name: "Normal - Empty", payload: "" },
    { name: "SQL Injection - classic", payload: "' OR '1'='1' --" },
    { name: "SQL Injection - stacked", payload: "1; DROP TABLE users; --" },
    { name: "XSS - plain script", payload: '<script>alert("XSS")</script>' },
    {
      name: "XSS - encoded",
      payload: "%3Cscript%3Ealert('xss')%3C%2Fscript%3E",
    },
    { name: "Command Injection", payload: "username=admin; rm -rf /tmp/uploads || true" },
    { name: "Path Traversal / LFI", payload: "../../../../../etc/passwd" },
    {
      name: "SSRF - metadata access",
      payload: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    },
    { name: "Server-side template injection", payload: "{{7*7}}" },
    { name: "NoSQL Injection (Mongo)", payload: '{"$ne": null}' },
    {
      name: "Mixed vector (SQLi + XSS)",
      payload: "search=<script>document.cookie</script>&id=123 OR 1=1 --",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await decisionAPI.analyze(formData);
      console.log(response.data);

      const prediction = response.data.log.prediction || {};
      const modelScores = {
        payload: prediction.payload ?? 0,
        bot: prediction.bot ?? 0,
        ddos: prediction.ddos ?? 0,
        behavior: prediction.behavior ?? 0,
        xss: prediction.xss ?? 0,
      };

      setResult({
        ...response.data.log,
        modelScores,
        features: prediction.features || {},
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze payload");
    } finally {
      setLoading(false);
    }
  };

  const loadTestPayload = (payload) => setFormData({ ...formData, payload });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Test Payload
          </h1>
          <p className="text-gray-400 mt-1">
            Test normal and malicious payloads against your AI detection system.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Input Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
            🎯 Input
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* IP Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
              <input
                type="text"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Payload Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payload</label>
              <textarea
                value={formData.payload}
                onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent h-32 font-mono text-sm"
                placeholder="Enter payload to test..."
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all font-medium shadow-lg hover:shadow-xl hover:shadow-primary-600/50 transform hover:-translate-y-0.5"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Payload"}
            </button>
          </form>

          {/* Quick Payloads */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              ⚡ Quick Test Payloads
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {testPayloads.map((test) => (
                <button
                  key={test.name}
                  onClick={() => loadTestPayload(test.payload)}
                  className="w-full text-left px-3 py-2 bg-gray-900/50 border border-gray-700 hover:border-primary-600 hover:bg-gray-900 rounded-lg text-sm transition-all group"
                >
                  <span className="font-medium text-gray-300 group-hover:text-primary-400">
                    {test.name}
                  </span>
                  <p className="text-xs text-gray-500 font-mono truncate mt-1">{test.payload}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing payload..." />}

          {error && (
            <div className="bg-danger-900/30 border border-danger-600 text-danger-300 px-4 py-3 rounded-lg animate-shake">
              {error}
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              {/* Decision Badge */}
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

              {/* Threat Score */}
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
                      style={{ width: `${result.threatScore * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {(result.threatScore * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Model Scores */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  🤖 Model Scores
                </p>
                {Object.entries(result.modelScores).map(([model, score]) => (
                  <div
                    key={model}
                    className="flex justify-between items-center bg-gray-800/40 px-3 py-2 rounded-lg"
                  >
                    <span className="text-sm text-gray-300 capitalize">{model}</span>
                    <span
                      className={`text-sm font-semibold ${
                        score > 0.7
                          ? "text-danger-400"
                          : score > 0.4
                          ? "text-warning-400"
                          : "text-success-400"
                      }`}
                    >
                      {(score * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Feature Insights */}
              {result.features && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    🧠 Feature Insights
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Entropy:</p>
                      <p className="text-primary-400 font-semibold">{result.features.entropy}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Reputation Score:</p>
                      <p className="text-primary-400 font-semibold">
                        {result.features.reputation_score}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Country:</p>
                      <p className="text-primary-400 font-semibold">
                        {result.features.geo?.country || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">City:</p>
                      <p className="text-primary-400 font-semibold">
                        {result.features.geo?.city || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Tokens */}
                  {result.features.tokens && (
                    <div>
                      <p className="text-gray-400 mt-2 mb-1">Extracted Tokens:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.features.tokens.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded-lg"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4 opacity-50">📊</div>
              <p>Submit a payload to see analysis results</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(75, 85, 99);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default TestPayload;
