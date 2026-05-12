import React from "react";
import { useApp } from "../context/AppContext";
import LogsTable from "../components/LogsTable";

const Logs = () => {
  const { logs, loading } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Request Logs</h1>
          <p className="page-subtitle">Search, filter, and inspect incoming requests.</p>
        </div>
        <div className="panel-muted px-4 py-2 text-sm text-[var(--app-text-muted)]">
          Total:{" "}
          <span className="font-bold text-[var(--app-text)]">
            {logs.length}
          </span>{" "}
          logs
        </div>
      </div>

      <LogsTable logs={logs} loading={loading} />
    </div>
  );
};

export default Logs;
