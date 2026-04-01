import React, { useState } from "react";

const LogsTable = ({ logs, loading }) => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  const filteredLogs = logs
    .filter((log) => {
      const matchesFilter = filter === "all" || log.decision === filter;
      const matchesSearch =
        log.ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.payload?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "timestamp") {
        aValue = new Date(a.createdAt || a.timestamp);
        bValue = new Date(b.createdAt || b.timestamp);
      } else if (sortBy === "threatScore") {
        aValue = a.threatScore || 0;
        bValue = b.threatScore || 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getDecisionBadge = (decision) => {
    const badges = {
      allow:
        "bg-linear-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30 shadow-lg shadow-green-500/20",
      alert:
        "bg-linear-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30 shadow-lg shadow-yellow-500/20",
      block:
        "bg-linear-to-r from-red-500/20 to-rose-500/20 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/20",
      blocked:
        "bg-linear-to-r from-red-500/20 to-rose-500/20 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/20",
      allowed:
        "bg-linear-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30 shadow-lg shadow-green-500/20",
      alerted:
        "bg-linear-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30 shadow-lg shadow-yellow-500/20",
    };
    return (
      badges[decision?.toLowerCase()] ||
      "bg-linear-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border border-gray-500/30"
    );
  };

  const getThreatScoreColor = (score) => {
    if (score > 0.8)
      return "text-red-300 bg-red-500/20 border border-red-500/30";
    if (score > 0.6)
      return "text-orange-300 bg-orange-500/20 border border-orange-500/30";
    if (score > 0.4)
      return "text-yellow-300 bg-yellow-500/20 border border-yellow-500/30";
    if (score > 0.2)
      return "text-blue-300 bg-blue-500/20 border border-blue-500/30";
    return "text-green-300 bg-green-500/20 border border-green-500/30";
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  if (loading) {
    return (
      <div className="glass p-12 rounded-3xl border border-white/20 animate-fadeIn">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-white mb-2">
              Loading Security Logs
            </div>
            <div className="text-white/60">Analyzing threat data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Enhanced Header with Stats */}
      <div className="glass p-6 rounded-3xl border border-white/20 bg-linear-to-r from-slate-500/10 to-gray-500/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-pulse">📊</div>
            <div>
              <h2 className="text-3xl font-bold gradient-text">
                Security Event Logs
              </h2>
              <p className="text-white/70 mt-1">
                Real-time threat monitoring and analysis
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="glass-hover px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">
                  {
                    logs.filter((log) =>
                      (log.decision || "").toLowerCase().includes("allow")
                    ).length
                  }
                </div>
                <div className="text-green-400 text-xs font-semibold">
                  ALLOWED
                </div>
              </div>
            </div>
            <div className="glass-hover px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  {
                    logs.filter((log) =>
                      (log.decision || "").toLowerCase().includes("alert")
                    ).length
                  }
                </div>
                <div className="text-yellow-400 text-xs font-semibold">
                  ALERTED
                </div>
              </div>
            </div>
            <div className="glass-hover px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-300">
                  {
                    logs.filter((log) =>
                      (log.decision || "").toLowerCase().includes("block")
                    ).length
                  }
                </div>
                <div className="text-red-400 text-xs font-semibold">
                  BLOCKED
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-3">
            {[
              { key: "all", label: "All Events", icon: "📋", color: "blue" },
              { key: "allow", label: "Allowed", icon: "✅", color: "green" },
              { key: "alert", label: "Alerts", icon: "⚠️", color: "yellow" },
              { key: "block", label: "Blocked", icon: "🚫", color: "red" },
            ].map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`group flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  filter === key
                    ? `bg-linear-to-r from-${color}-500 to-${color}-600 text-white shadow-lg shadow-${color}-500/30 scale-105`
                    : "glass-hover text-white/80 border border-white/20 hover:border-white/40"
                }`}
              >
                <span className="text-lg group-hover:animate-bounce">
                  {icon}
                </span>
                <span>{label}</span>
                {filter === key && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-white/60 text-lg">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search by IP address or payload..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/20 placeholder-white/60 backdrop-blur-sm transition-all w-80"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="glass rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-linear-to-r from-slate-800/80 to-gray-800/80 border-b border-white/10">
              <tr>
                {[
                  { key: "timestamp", label: "Timestamp", icon: "🕐" },
                  { key: "ip", label: "IP Address", icon: "🌐" },
                  { key: "payload", label: "Request Payload", icon: "📦" },
                  { key: "threatScore", label: "Threat Score", icon: "⚡" },
                  { key: "decision", label: "Decision", icon: "🛡️" },
                  { key: "actions", label: "Actions", icon: "⚙️" },
                ].map(({ key, label, icon }) => (
                  <th
                    key={key}
                    className={`px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider ${
                      key !== "actions" && key !== "payload"
                        ? "cursor-pointer hover:bg-white/10 transition-colors"
                        : ""
                    }`}
                    onClick={() =>
                      key !== "actions" && key !== "payload" && handleSort(key)
                    }
                  >
                    <div className="flex items-center gap-2 group">
                      <span className="text-lg">{icon}</span>
                      <span>{label}</span>
                      {key !== "actions" && key !== "payload" && (
                        <div className="flex flex-col">
                          <div
                            className={`w-0 h-0 border-l-2 border-r-2 border-transparent ${
                              sortBy === key && sortOrder === "asc"
                                ? "border-b-2 border-b-blue-400"
                                : "border-b-2 border-b-white/30"
                            } transition-colors`}
                          ></div>
                          <div
                            className={`w-0 h-0 border-l-2 border-r-2 border-transparent ${
                              sortBy === key && sortOrder === "desc"
                                ? "border-t-2 border-t-blue-400"
                                : "border-t-2 border-t-white/30"
                            } transition-colors`}
                          ></div>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-8xl opacity-30 animate-bounce">
                        📋
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-white">
                          No Security Events Found
                        </div>
                        <div className="text-white/60">
                          {searchTerm || filter !== "all"
                            ? "Try adjusting your filters or search terms"
                            : "Security logs will appear here when events are detected"}
                        </div>
                      </div>
                      {(searchTerm || filter !== "all") && (
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setFilter("all");
                          }}
                          className="btn-gradient px-6 py-3 rounded-xl text-white font-semibold"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const decision = (log.decision || "unknown").toLowerCase();
                  const threatScore = log.threatScore || 0;

                  return (
                    <tr
                      key={log._id || log.id || index}
                      className="group hover:bg-white/5 transition-all duration-300 hover:shadow-lg"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full animate-pulse ${
                              decision.includes("block")
                                ? "bg-red-500"
                                : decision.includes("alert")
                                ? "bg-yellow-500"
                                : decision.includes("allow")
                                ? "bg-green-500"
                                : "bg-gray-500"
                            }`}
                          ></div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {new Date(
                                log.createdAt || log.timestamp
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-white/60">
                              {new Date(
                                log.createdAt || log.timestamp
                              ).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-lg">🌐</div>
                          <div>
                            <div className="text-sm font-mono text-blue-300 font-semibold">
                              {log.ip || "Unknown IP"}
                            </div>
                            <div className="text-xs text-white/60">
                              {log.location || "Location Unknown"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="group/payload relative">
                          <div className="text-sm text-white/80 font-mono truncate group-hover/payload:text-white transition-colors">
                            {log.payload || "No payload"}
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            {log.method || "GET"} • {(log.payload || "").length}{" "}
                            chars
                          </div>
                          {log.payload && log.payload.length > 50 && (
                            <div className="absolute left-0 top-full mt-2 p-3 bg-gray-900/95 border border-white/20 rounded-lg text-xs font-mono text-white max-w-md z-10 opacity-0 group-hover/payload:opacity-100 transition-opacity pointer-events-none">
                              {log.payload}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-3 py-2 rounded-lg font-bold text-sm ${getThreatScoreColor(
                              threatScore
                            )}`}
                          >
                            {(threatScore * 100).toFixed(1)}%
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  threatScore > 0.7
                                    ? "bg-red-500"
                                    : threatScore > 0.4
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${threatScore * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-white/60 text-center">
                              {threatScore > 0.7
                                ? "HIGH"
                                : threatScore > 0.4
                                ? "MED"
                                : "LOW"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-4 py-2 inline-flex items-center gap-2 text-sm leading-5 font-bold rounded-xl uppercase ${getDecisionBadge(
                              decision
                            )}`}
                          >
                            <span className="text-lg">
                              {decision.includes("block")
                                ? "🚫"
                                : decision.includes("alert")
                                ? "⚠️"
                                : decision.includes("allow")
                                ? "✅"
                                : "❓"}
                            </span>
                            {decision}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors group/btn">
                            <span className="text-lg group-hover/btn:animate-bounce">
                              👁️
                            </span>
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors group/btn">
                            <span className="text-lg group-hover/btn:animate-bounce">
                              📋
                            </span>
                          </button>
                          <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group/btn">
                            <span className="text-lg group-hover/btn:animate-bounce">
                              🚫
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="glass p-4 border-t border-white/10 bg-linear-to-r from-slate-800/50 to-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/70">
                Showing {filteredLogs.length} of {logs.length} security events
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Events per page:</span>
                <select className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1 text-sm">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTable;
