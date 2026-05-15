import React from "react";
import Card from "./ui/Card";
import { useApp } from "../context/AppContext";

export const DdosStats = () => {
  const { ddosStats = {} } = useApp();
  const topAttackers = ddosStats.topAttackers || [];

  return (
    <Card title="DDoS Monitor">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Total Attempts", ddosStats.totalAttempts || 0, "badge-block"],
          ["Blocked IPs", ddosStats.currentlyBlockedIps || 0, "badge-alert"],
          ["Block Rate", `${Number(ddosStats.blockRate || 0).toFixed(1)}%`, "badge-allow"],
          ["Unique Attackers", ddosStats.uniqueAttackerIps || 0, "badge-neutral"],
        ].map(([label, value, badge]) => (
          <div key={label} className="panel-muted p-3">
            <div className={`badge ${badge}`}>{label}</div>
            <div className="mt-3 text-2xl font-bold text-[var(--app-text)]">{value}</div>
          </div>
        ))}
      </div>

      {topAttackers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th className="text-right">Attempts</th>
                <th className="text-right">Max RPS</th>
              </tr>
            </thead>
            <tbody>
              {topAttackers.map((attacker, idx) => (
                <tr key={idx}>
                  <td className="font-mono">{attacker._id}</td>
                  <td className="text-right">{attacker.count}</td>
                  <td className="text-right font-semibold text-[var(--app-danger)]">
                    {(attacker.maxRps || 0).toFixed(1)} RPS
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--app-text-muted)]">
          No DDoS attacks detected yet.
        </div>
      )}
    </Card>
  );
};
