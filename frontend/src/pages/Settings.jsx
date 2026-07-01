import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import Button from "../components/ui/Button";
import { policyAPI } from "../services/api";

const defaultPolicy = {
  blockThreshold: 0.75,
  alertThreshold: 0.5,
  overrideThreshold: 0.9,
  shadowMode: false,
  allowIps: [],
  blockIps: [],
};

const listToText = (items = []) => items.join("\n");

const textToList = (value = "") =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const percentLabel = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const Settings = () => {
  const { apiUrl, setApiUrl, refreshInterval, setRefreshInterval, isRealTime, setIsRealTime } = useApp();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval);
  const [policy, setPolicy] = useState(defaultPolicy);
  const [allowIpsText, setAllowIpsText] = useState("");
  const [blockIpsText, setBlockIpsText] = useState("");
  const [saved, setSaved] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const overlap = useMemo(() => {
    const allow = new Set(textToList(allowIpsText));
    return textToList(blockIpsText).filter((item) => allow.has(item));
  }, [allowIpsText, blockIpsText]);

  const updatePolicyField = (field, value) => {
    setPolicy((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    let active = true;
    const loadPolicy = async () => {
      try {
        setLoadingPolicy(true);
        const response = await policyAPI.get();
        if (!active) return;
        const nextPolicy = { ...defaultPolicy, ...(response.data?.policy || {}) };
        setPolicy(nextPolicy);
        setAllowIpsText(listToText(nextPolicy.allowIps));
        setBlockIpsText(listToText(nextPolicy.blockIps));
      } catch (err) {
        if (active) setError(err.response?.data?.error || "Could not load firewall policy.");
      } finally {
        if (active) setLoadingPolicy(false);
      }
    };

    loadPolicy();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setError("");
    setSaved(false);

    if (Number(policy.blockThreshold) < Number(policy.alertThreshold)) {
      setError("Block threshold must be greater than or equal to alert threshold.");
      return;
    }

    if (overlap.length > 0) {
      setError(`Remove duplicate IP entries from allow and block lists: ${overlap.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      setApiUrl(localApiUrl);
      setRefreshInterval(localRefreshInterval);

      const payload = {
        ...policy,
        blockThreshold: Number(policy.blockThreshold),
        alertThreshold: Number(policy.alertThreshold),
        overrideThreshold: Number(policy.overrideThreshold),
        allowIps: textToList(allowIpsText),
        blockIps: textToList(blockIpsText),
      };

      const response = await policyAPI.update(payload);
      const nextPolicy = { ...defaultPolicy, ...(response.data?.policy || payload) };
      setPolicy(nextPolicy);
      setAllowIpsText(listToText(nextPolicy.allowIps));
      setBlockIpsText(listToText(nextPolicy.blockIps));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Tune AI scoring thresholds, enforcement mode, and trusted or blocked IP sources.</p>
        </div>
        <div className="panel-muted px-4 py-2 text-sm text-[var(--app-text-muted)]">
          Policy: <span className="font-bold text-[var(--app-text)]">{loadingPolicy ? "Loading" : "Ready"}</span>
        </div>
      </div>

      {saved && (
        <div className="panel-muted px-4 py-3 text-sm font-semibold text-[var(--app-success)]">
          Settings saved successfully.
        </div>
      )}

      {error && (
        <div className="panel-muted border-[rgba(220,38,38,0.35)] px-4 py-3 text-sm font-semibold text-[var(--app-danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="panel p-5">
          <h2 className="panel-title mb-5">Dashboard Configuration</h2>
          <div className="space-y-5">
            <div>
              <label className="label">Backend API URL</label>
              <input
                className="input"
                type="text"
                value={localApiUrl}
                onChange={(event) => setLocalApiUrl(event.target.value)}
                placeholder="/api"
              />
              <p className="hint">Use a relative path in production when the backend serves the frontend.</p>
            </div>

            <div>
              <label className="label">Refresh Interval</label>
              <input
                className="input"
                type="number"
                value={localRefreshInterval / 1000}
                min="1"
                max="60"
                onChange={(event) => setLocalRefreshInterval(Number(event.target.value) * 1000)}
              />
              <p className="hint">Controls logs and stats polling while real-time mode is enabled.</p>
            </div>

            <label className="setting-toggle">
              <span>
                <span className="block font-semibold text-[var(--app-text)]">Real-time refresh</span>
                <span className="text-sm text-[var(--app-text-muted)]">Automatically pull new logs and scoring stats.</span>
              </span>
              <input
                type="checkbox"
                checked={isRealTime}
                onChange={(event) => setIsRealTime(event.target.checked)}
                className="h-5 w-5 accent-[var(--app-primary)]"
              />
            </label>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="panel-title">AI Decision Policy</h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">These thresholds are applied to the combined trained model score.</p>
            </div>
            <span className="badge badge-neutral">BILSTM + XSS + Bot + Behaviour</span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label>
              <span className="label">Alert Threshold</span>
              <input
                className="input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={policy.alertThreshold}
                onChange={(event) => updatePolicyField("alertThreshold", event.target.value)}
              />
              <span className="hint">Current: {percentLabel(policy.alertThreshold)}</span>
            </label>

            <label>
              <span className="label">Block Threshold</span>
              <input
                className="input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={policy.blockThreshold}
                onChange={(event) => updatePolicyField("blockThreshold", event.target.value)}
              />
              <span className="hint">Current: {percentLabel(policy.blockThreshold)}</span>
            </label>

            <label>
              <span className="label">Model Override</span>
              <input
                className="input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={policy.overrideThreshold}
                onChange={(event) => updatePolicyField("overrideThreshold", event.target.value)}
              />
              <span className="hint">Blocks when a trained detector is highly confident.</span>
            </label>
          </div>

          <label className="setting-toggle mt-5">
            <span>
              <span className="block font-semibold text-[var(--app-text)]">Shadow mode</span>
              <span className="text-sm text-[var(--app-text-muted)]">Record block decisions as alerts while testing a new threshold.</span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(policy.shadowMode)}
              onChange={(event) => updatePolicyField("shadowMode", event.target.checked)}
              className="h-5 w-5 accent-[var(--app-primary)]"
            />
          </label>
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4">
            <h2 className="panel-title">IP Allow List</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">Requests from these IPs or CIDR ranges are allowed before AI enforcement.</p>
          </div>
          <textarea
            className="textarea min-h-44 font-mono text-sm"
            value={allowIpsText}
            onChange={(event) => setAllowIpsText(event.target.value)}
            placeholder={"127.0.0.1\n10.0.0.0/24"}
          />
        </div>

        <div className="panel p-5">
          <div className="mb-4">
            <h2 className="panel-title">IP Block List</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">Requests from these IPs or CIDR ranges are blocked immediately.</p>
          </div>
          <textarea
            className="textarea min-h-44 font-mono text-sm"
            value={blockIpsText}
            onChange={(event) => setBlockIpsText(event.target.value)}
            placeholder={"203.0.113.10\n198.51.100.0/24"}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loadingPolicy}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
