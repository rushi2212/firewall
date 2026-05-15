import React, { useState } from "react";
import { decisionAPI } from "../services/api";
import Loader from "../components/Loader";
import Button from "../components/ui/Button";

const testPayloads = [
  ["Normal query", "/api/books?search=harry+potter&page=1"],
  ["SQL injection", "' OR '1'='1' --"],
  ["Stacked SQL", "1; DROP TABLE users; --"],
  ["XSS script", '<script>alert("XSS")</script>'],
  ["Encoded XSS", "%3Cscript%3Ealert('xss')%3C%2Fscript%3E"],
  ["Command injection", "username=admin; cat /etc/passwd"],
  ["Path traversal", "../../../../../etc/passwd"],
  ["SSRF metadata", "http://169.254.169.254/latest/meta-data/"],
  ["NoSQL injection", '{"$ne": null}'],
  ["Mixed vector", "search=<script>document.cookie</script>&id=123 OR 1=1 --"],
];

const scoreColor = (score) => {
  if (score >= 0.75) return "bg-rose-500";
  if (score >= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
};

const TestPayload = () => {
  const [formData, setFormData] = useState({ ip: "192.168.1.100", payload: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await decisionAPI.analyze(formData);
      const log = response.data.log || {};
      const prediction = log.prediction || {};
      setResult({
        ...log,
        effectiveDecision: response.data.effectiveDecision,
        modelScores: {
          rules: prediction.rules ?? 0,
          payload: prediction.payload ?? 0,
          xss: prediction.xss ?? 0,
          bot: prediction.bot ?? 0,
          ddos: prediction.ddos ?? 0,
          behavior: prediction.behavior ?? 0,
        },
        ruleMatches: prediction.ruleMatches || [],
        detectorStatus: prediction.detectorStatus || [],
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze payload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payload Lab</h1>
          <p className="page-subtitle">Send controlled payloads through the WAF decision engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="panel-title mb-5">Request Input</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">IP Address</label>
              <input
                className="input"
                value={formData.ip}
                onChange={(event) => setFormData({ ...formData, ip: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Payload</label>
              <textarea
                className="textarea min-h-36 font-mono text-sm"
                value={formData.payload}
                onChange={(event) => setFormData({ ...formData, payload: event.target.value })}
                placeholder="Enter request payload"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Analyzing..." : "Analyze payload"}
            </Button>
          </form>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">Quick payloads</h3>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {testPayloads.map(([name, payload]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFormData({ ...formData, payload })}
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 text-left transition hover:border-[var(--app-primary)]"
                >
                  <span className="block text-sm font-semibold text-[var(--app-text)]">{name}</span>
                  <span className="block truncate font-mono text-xs text-[var(--app-text-muted)]">{payload}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="panel-title mb-5">Analysis Result</h2>
          {loading && <Loader text="Analyzing payload..." />}
          {error && <div className="panel-muted px-4 py-3 text-sm text-[var(--app-danger)]">{error}</div>}

          {!loading && !error && !result && (
            <div className="py-16 text-center text-[var(--app-text-muted)]">
              Submit a payload to see the decision, model scores, and rule matches.
            </div>
          )}

          {!loading && result && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
                <span className="text-sm font-semibold text-[var(--app-text-muted)]">Decision</span>
                <span className={`badge ${result.decision === "block" ? "badge-block" : result.decision === "alert" ? "badge-alert" : "badge-allow"}`}>
                  {result.decision || "allow"}
                </span>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-[var(--app-text)]">Threat score</span>
                  <span className="text-[var(--app-text-muted)]">{((result.threatScore || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${scoreColor(result.threatScore || 0)}`} style={{ width: `${Math.min((result.threatScore || 0) * 100, 100)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.modelScores).map(([model, score]) => (
                  <div key={model} className="panel-muted p-3">
                    <div className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">{model}</div>
                    <div className="mt-1 text-lg font-bold text-[var(--app-text)]">{(score * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>

              <div className="panel-muted p-4">
                <h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">Rule matches</h3>
                {result.ruleMatches.length === 0 ? (
                  <p className="text-sm text-[var(--app-text-muted)]">No deterministic rules matched.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.ruleMatches.map((match) => (
                      <span key={match.id} className="badge badge-block">{match.category}: {match.id}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TestPayload;
