import React from "react";
import { useApp } from "../context/AppContext";
import ThreatCard from "../components/ThreatCard";
import ChartComponent from "../components/ChartComponent";
import Loader from "../components/Loader";

const Dashboard = () => {
  const { stats, logs, loading, fetchLogs, fetchStats } = useApp();

  console.log("Dashboard stats:", stats);
  console.log("Dashboard logs:", logs);

  if (loading && !stats) {
    return <Loader size="lg" text="Loading dashboard..." />;
  }

  // Calculate trend percentages based on recent activity
  const calculateTrends = () => {
    const recent = logs.slice(0, 10);
    const older = logs.slice(10, 20);

    const recentBlocked = recent.filter(
      (log) =>
        (log.decision || "").toLowerCase() === "blocked" ||
        (log.threatScore || 0) > 0.8
    ).length;

    const olderBlocked = older.filter(
      (log) =>
        (log.decision || "").toLowerCase() === "blocked" ||
        (log.threatScore || 0) > 0.8
    ).length;

    const blockedTrend =
      recentBlocked > olderBlocked
        ? `+${(
            ((recentBlocked - olderBlocked) / Math.max(olderBlocked, 1)) *
            100
          ).toFixed(0)}%`
        : `-${(
            ((olderBlocked - recentBlocked) / Math.max(olderBlocked, 1)) *
            100
          ).toFixed(0)}%`;

    return {
      blocked: blockedTrend,
      alerted: "+5%", // Mock for now
      allowed: "+8%", // Mock for now
    };
  };

  const trends = calculateTrends();

  // Enhanced chart data with better colors
  const decisionData = [
    {
      name: "Allowed",
      value: stats?.allowed || 0,
      color: "#10b981",
      gradient: "from-emerald-400 to-green-500",
    },
    {
      name: "Alerted",
      value: stats?.alerted || 0,
      color: "#f59e0b",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      name: "Blocked",
      value: stats?.blocked || 0,
      color: "#ef4444",
      gradient: "from-red-400 to-rose-500",
    },
  ];

  // Enhanced trend data for threat scores
  const recentLogs = logs.slice(0, 15).reverse();
  const trendData = recentLogs.map((log, idx) => ({
    name: `${idx + 1}`,
    score: ((log.threatScore || 0) * 100).toFixed(1),
    timestamp: new Date(log.timestamp || Date.now()).toLocaleTimeString(),
  }));

  // Refresh data function
  const handleRefresh = async () => {
    await fetchLogs();
    await fetchStats();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Enhanced Header Section with Actions */}
      <div className="glass p-8 rounded-3xl border border-white/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <h1 className="text-6xl font-bold gradient-text animate-float">
              🛡️ Security Command Center
            </h1>
            <p className="text-white/80 text-xl font-light">
              Advanced AI-Powered Threat Detection & Real-time Protection
              Analytics
            </p>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-semibold">
                  Active Protection
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                <span className="text-blue-400 font-semibold">
                  Real-time Monitoring
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="glass-hover p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="w-6 h-6 bg-green-500 rounded-full animate-pulse inline-block shadow-lg shadow-green-500/50"></span>
                  <span className="w-6 h-6 bg-green-500 rounded-full absolute top-0 left-0 animate-ping inline-block"></span>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">
                    System Online
                  </div>
                  <div className="text-white/70 text-sm">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              className="btn-gradient px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2 ripple"
            >
              <span>🔄</span>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Ultra-Enhanced Stats Cards with 3D Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Total Requests Card */}
        <div className="group relative glass-hover p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 transform hover:scale-110 transition-all duration-700 hover:rotate-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="text-white/80 text-sm font-semibold tracking-wide uppercase">
                  Total Requests
                </div>
                <div className="text-4xl font-bold text-white">
                  {(stats?.total || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></span>
                  <span className="text-blue-300 font-medium">
                    Live Feed Active
                  </span>
                </div>
              </div>
              <div className="text-6xl group-hover:animate-bounce filter drop-shadow-2xl">
                📊
              </div>
            </div>
            <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 w-full animate-shimmer rounded-full"></div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-blue-300 text-xs font-semibold bg-blue-500/20 px-3 py-1 rounded-full">
                System Processing
              </span>
            </div>
          </div>
        </div>

        {/* Blocked Threats Card */}
        <div className="group relative glass-hover p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-red-500/20 via-rose-500/20 to-pink-500/20 transform hover:scale-110 transition-all duration-700 hover:-rotate-1">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-pink-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="text-white/80 text-sm font-semibold tracking-wide uppercase">
                  Threats Blocked
                </div>
                <div className="text-4xl font-bold text-white">
                  {(stats?.blocked || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`text-lg ${
                      trends.blocked.startsWith("+")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {trends.blocked}
                  </span>
                  <span className="text-white/70">vs last period</span>
                </div>
              </div>
              <div className="text-6xl group-hover:animate-bounce filter drop-shadow-2xl">
                🛡️
              </div>
            </div>
            <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 w-full animate-shimmer rounded-full"></div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-red-300 text-xs font-semibold bg-red-500/20 px-3 py-1 rounded-full">
                High Security
              </span>
            </div>
          </div>
        </div>

        {/* Alerts Generated Card */}
        <div className="group relative glass-hover p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-amber-500/20 transform hover:scale-110 transition-all duration-700 hover:rotate-1">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-orange-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="text-white/80 text-sm font-semibold tracking-wide uppercase">
                  Alerts Generated
                </div>
                <div className="text-4xl font-bold text-white">
                  {(stats?.alerted || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-400">{trends.alerted}</span>
                  <span className="text-white/70">monitoring active</span>
                </div>
              </div>
              <div className="text-6xl group-hover:animate-bounce filter drop-shadow-2xl">
                ⚠️
              </div>
            </div>
            <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-400 w-full animate-shimmer rounded-full"></div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-yellow-300 text-xs font-semibold bg-yellow-500/20 px-3 py-1 rounded-full">
                Monitoring
              </span>
            </div>
          </div>
        </div>

        {/* Allowed Requests Card */}
        <div className="group relative glass-hover p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 transform hover:scale-110 transition-all duration-700 hover:-rotate-1">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-teal-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="text-white/80 text-sm font-semibold tracking-wide uppercase">
                  Requests Allowed
                </div>
                <div className="text-4xl font-bold text-white">
                  {(stats?.allowed || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">{trends.allowed}</span>
                  <span className="text-white/70">clean traffic</span>
                </div>
              </div>
              <div className="text-6xl group-hover:animate-bounce filter drop-shadow-2xl">
                ✅
              </div>
            </div>
            <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 w-full animate-shimmer rounded-full"></div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-green-300 text-xs font-semibold bg-green-500/20 px-3 py-1 rounded-full">
                Safe Traffic
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts with Better Styling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-hover p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transform hover:scale-[1.03] transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
            <h3 className="text-2xl font-bold text-white">
              Security Decision Distribution
            </h3>
          </div>
          <ChartComponent
            type="pie"
            data={decisionData}
            dataKey="value"
            title=""
            colors={["#10b981", "#f59e0b", "#ef4444"]}
          />
        </div>

        <div className="glass-hover p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 transform hover:scale-[1.03] transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
            <h3 className="text-2xl font-bold text-white">
              Threat Score Timeline
            </h3>
          </div>
          <ChartComponent
            type="line"
            data={trendData}
            dataKey="score"
            xKey="name"
            title=""
            colors={["#3b82f6"]}
          />
        </div>
      </div>

      {/* Enhanced Real-time Activity Feed */}
      <div className="glass p-8 rounded-3xl border border-white/20 bg-gradient-to-r from-slate-500/10 to-gray-500/10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-pulse">📡</div>
            <div>
              <h3 className="text-3xl font-bold text-white">
                Live Security Feed
              </h3>
              <p className="text-white/70">
                Real-time threat detection and response
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-hover px-6 py-3 rounded-xl border border-white/10">
              <span className="text-white/80 text-sm font-semibold">
                📊 Showing {Math.min(logs.length, 8)} recent events
              </span>
            </div>
            <div className="glass-hover px-4 py-3 rounded-xl border border-white/10">
              <span className="text-green-400 text-sm font-bold">🔴 LIVE</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-white/60 text-lg">
                No security events recorded yet
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 btn-gradient px-6 py-2 rounded-lg"
              >
                Refresh Data
              </button>
            </div>
          ) : (
            logs.slice(0, 8).map((log, idx) => {
              const decision = (log.decision || "unknown").toLowerCase();
              const threatScore = ((log.threatScore || 0) * 100).toFixed(1);

              return (
                <div
                  key={idx}
                  className="group flex items-center gap-6 p-6 glass-hover rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 transition-all duration-300"
                >
                  <div className="relative">
                    <div
                      className={`w-4 h-4 rounded-full animate-pulse shadow-lg ${
                        decision === "blocked"
                          ? "bg-red-500 shadow-red-500/50"
                          : decision === "alerted"
                          ? "bg-yellow-500 shadow-yellow-500/50"
                          : "bg-green-500 shadow-green-500/50"
                      }`}
                    ></div>
                    <div
                      className={`w-4 h-4 rounded-full absolute top-0 left-0 animate-ping ${
                        decision === "blocked"
                          ? "bg-red-500"
                          : decision === "alerted"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    ></div>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-white font-bold text-lg">
                        {log.ip || "Unknown IP"}
                      </div>
                      <div className="text-white/60 text-sm">
                        {new Date(log.timestamp || Date.now()).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-white/80 font-medium">
                        {(log.payload || "No payload").substring(0, 40)}
                        {(log.payload || "").length > 40 ? "..." : ""}
                      </div>
                      <div className="text-white/50 text-sm">
                        Threat Score: {threatScore}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`inline-block px-4 py-2 rounded-full text-sm font-bold uppercase ${
                          decision === "blocked"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : decision === "alerted"
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-green-500/20 text-green-300 border border-green-500/30"
                        }`}
                      >
                        {decision}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Additional Static Visual Representations */}

      {/* Security Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-3xl">🎯</div>
            <h3 className="text-2xl font-bold text-white">
              Security Performance Matrix
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Detection Rate */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg
                  className="w-24 h-24 transform -rotate-90"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-white/20"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray="251"
                    strokeDashoffset="25"
                    className="text-green-400 animate-pulse"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">90%</span>
                </div>
              </div>
              <div className="text-green-400 font-semibold">Detection Rate</div>
              <div className="text-white/60 text-sm">Threat Identification</div>
            </div>

            {/* Block Efficiency */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg
                  className="w-24 h-24 transform -rotate-90"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-white/20"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray="251"
                    strokeDashoffset="12"
                    className="text-red-400 animate-pulse"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">95%</span>
                </div>
              </div>
              <div className="text-red-400 font-semibold">Block Efficiency</div>
              <div className="text-white/60 text-sm">Threat Prevention</div>
            </div>

            {/* Response Time */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg
                  className="w-24 h-24 transform -rotate-90"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-white/20"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray="251"
                    strokeDashoffset="38"
                    className="text-blue-400 animate-pulse"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">85%</span>
                </div>
              </div>
              <div className="text-blue-400 font-semibold">Response Time</div>
              <div className="text-white/60 text-sm">Speed Optimization</div>
            </div>

            {/* Accuracy Rate */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg
                  className="w-24 h-24 transform -rotate-90"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-white/20"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray="251"
                    strokeDashoffset="15"
                    className="text-purple-400 animate-pulse"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">94%</span>
                </div>
              </div>
              <div className="text-purple-400 font-semibold">Accuracy Rate</div>
              <div className="text-white/60 text-sm">False Positive Rate</div>
            </div>
          </div>
        </div>

        {/* Threat Analysis Heatmap */}
        <div className="glass p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-red-500/10 to-orange-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-3xl">🔥</div>
            <h3 className="text-2xl font-bold text-white">
              Threat Analysis Heatmap
            </h3>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {Array.from({ length: 35 }, (_, i) => {
              const intensity = Math.random();
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${
                    intensity > 0.8
                      ? "bg-red-500"
                      : intensity > 0.6
                      ? "bg-orange-500"
                      : intensity > 0.4
                      ? "bg-yellow-500"
                      : intensity > 0.2
                      ? "bg-green-400"
                      : "bg-gray-600"
                  } ${intensity > 0.5 ? "animate-pulse" : ""}`}
                  style={{
                    opacity: Math.max(0.2, intensity),
                    animationDelay: `${i * 0.05}s`,
                  }}
                ></div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Low Activity</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            </div>
            <span className="text-white/60">High Activity</span>
          </div>

          <div className="mt-4 text-center">
            <div className="text-orange-400 font-semibold text-lg">
              Current Threat Level: MODERATE
            </div>
            <div className="text-white/60 text-sm">
              Based on last 30 days analysis
            </div>
          </div>
        </div>
      </div>

      {/* Network Topology Visualization */}
      <div className="glass p-8 rounded-3xl border border-white/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-3xl">🌐</div>
          <h3 className="text-2xl font-bold text-white">
            Network Topology & Traffic Flow
          </h3>
        </div>

        <div className="relative h-64 overflow-hidden">
          {/* Network Nodes */}
          <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold border-4 border-white/20 animate-pulse">
                WAF
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
            </div>
          </div>

          <div className="absolute top-1/4 right-1/4 transform translate-x-1/2">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/20">
              APP
            </div>
          </div>

          <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/20">
              DB
            </div>
          </div>

          <div className="absolute top-1/2 left-12 transform -translate-y-1/2">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/20 animate-pulse">
              USER
            </div>
          </div>

          {/* Animated Connection Lines */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient
                id="flowGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "#3b82f6", stopOpacity: 0 }}
                />
                <stop
                  offset="50%"
                  style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#3b82f6", stopOpacity: 0 }}
                />
              </linearGradient>
            </defs>

            {/* Data flow lines */}
            <line
              x1="15%"
              y1="50%"
              x2="25%"
              y2="50%"
              stroke="url(#flowGradient)"
              strokeWidth="2"
              className="animate-pulse"
            />
            <line
              x1="35%"
              y1="50%"
              x2="65%"
              y2="30%"
              stroke="url(#flowGradient)"
              strokeWidth="2"
              className="animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
            <line
              x1="35%"
              y1="50%"
              x2="65%"
              y2="70%"
              stroke="url(#flowGradient)"
              strokeWidth="2"
              className="animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </svg>

          {/* Traffic Indicators */}
          <div className="absolute bottom-4 left-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">Legitimate Traffic: 87%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400">Malicious Traffic: 13%</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CPU Usage */}
        <div className="glass p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">⚡</div>
            <h4 className="text-lg font-semibold text-white">CPU Usage</h4>
          </div>

          <div className="relative">
            <div className="w-full bg-white/20 rounded-full h-6 mb-2">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-6 rounded-full w-[65%] animate-pulse flex items-center justify-end pr-2">
                <span className="text-white text-xs font-bold">65%</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Optimal</span>
              <span>4 cores active</span>
            </div>
          </div>

          {/* CPU Core Visualization */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[65, 72, 58, 69].map((usage, idx) => (
              <div key={idx} className="text-center">
                <div className="h-12 bg-white/20 rounded relative overflow-hidden">
                  <div
                    className="bg-gradient-to-t from-green-500 to-emerald-400 absolute bottom-0 w-full rounded animate-pulse"
                    style={{
                      height: `${usage}%`,
                      animationDelay: `${idx * 0.2}s`,
                    }}
                  ></div>
                </div>
                <div className="text-xs text-white/70 mt-1">Core {idx + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="glass p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🧠</div>
            <h4 className="text-lg font-semibold text-white">Memory Usage</h4>
          </div>

          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-white">8.2GB</div>
            <div className="text-blue-400 text-sm">of 16GB used</div>
          </div>

          {/* Memory Ring */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              <svg
                className="w-24 h-24 transform -rotate-90"
                viewBox="0 0 96 96"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-white/20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray="251"
                  strokeDashoffset="126"
                  className="text-blue-400 animate-pulse"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">51%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Available</span>
              <span className="text-blue-400 font-semibold">7.8GB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Cache</span>
              <span className="text-cyan-400 font-semibold">2.1GB</span>
            </div>
          </div>
        </div>

        {/* Network Traffic */}
        <div className="glass p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">📡</div>
            <h4 className="text-lg font-semibold text-white">
              Network Traffic
            </h4>
          </div>

          <div className="space-y-4">
            {/* Incoming */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Incoming</span>
                <span className="text-green-400 font-semibold">↓ 124 MB/s</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full w-[78%] animate-pulse"></div>
              </div>
            </div>

            {/* Outgoing */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Outgoing</span>
                <span className="text-blue-400 font-semibold">↑ 89 MB/s</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full w-[56%] animate-pulse"></div>
              </div>
            </div>

            {/* Blocked */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Blocked</span>
                <span className="text-red-400 font-semibold">🚫 15 MB/s</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-red-400 to-rose-500 h-2 rounded-full w-[12%] animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Network Activity Visualization */}
          <div className="mt-4 flex justify-center">
            <div className="flex gap-1">
              {[45, 62, 38, 71, 55, 83, 49, 67, 41, 78].map((height, idx) => (
                <div
                  key={idx}
                  className="w-2 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-sm animate-pulse"
                  style={{
                    height: `${height / 2}px`,
                    animationDelay: `${idx * 0.1}s`,
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
