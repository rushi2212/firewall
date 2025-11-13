import React from "react";
import { useApp } from "../context/AppContext";
import LogsTable from "../components/LogsTable";

const Logs = () => {
  const { logs, loading } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Request Logs
          </h1>
          <p className="text-gray-400 mt-1">Monitor all incoming requests</p>
        </div>
        <div className="text-sm text-gray-400 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
          Total:{" "}
          <span className="font-bold text-primary-400">{logs.length}</span> logs
        </div>
      </div>

      <LogsTable logs={logs} loading={loading} />
    </div>
  );
};

export default Logs;
