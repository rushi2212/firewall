import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import Button from "../components/ui/Button";

const Settings = () => {
  const { apiUrl, setApiUrl, refreshInterval, setRefreshInterval, isRealTime, setIsRealTime } = useApp();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiUrl(localApiUrl);
    setRefreshInterval(localRefreshInterval);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Control dashboard refresh behavior and API connectivity.</p>
        </div>
      </div>

      {saved && (
        <div className="panel-muted px-4 py-3 text-sm font-semibold text-[var(--app-success)]">
          Settings saved successfully.
        </div>
      )}

      <section className="panel p-5">
        <h2 className="panel-title mb-5">API Configuration</h2>
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

          <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
            <span>
              <span className="block font-semibold text-[var(--app-text)]">Real-time refresh</span>
              <span className="text-sm text-[var(--app-text-muted)]">Automatically pull new log and stats data.</span>
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

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save settings</Button>
      </div>
    </div>
  );
};

export default Settings;
