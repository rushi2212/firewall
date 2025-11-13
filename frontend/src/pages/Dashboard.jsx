import React from "react";
import { useApp } from "../context/AppContext";
import ThreatCard from "../components/ThreatCard";
import ChartComponent from "../components/ChartComponent";
import Loader from "../components/Loader";

const Dashboard = () => {
  const { stats, logs, loading } = useApp();

  if (loading && !stats) {
    return <Loader size="lg" text="Loading dashboard..." />;
  }

  // Calculate trend percentages (mock for now - would need historical data)
  const trends = {
    blocked: "+12%",
    alerted: "-5%",
    allowed: "+3%",
  };

  // Prepare chart data
  const decisionData = [
    { name: "Allowed", value: stats?.allowed || 0, color: "#10b981" },
    { name: "Alerted", value: stats?.alerted || 0, color: "#f59e0b" },
    { name: "Blocked", value: stats?.blocked || 0, color: "#ef4444" },
  ];

  // Last 10 logs for trend chart
  const recentLogs = logs.slice(0, 10).reverse();
  const trendData = recentLogs.map((log, idx) => ({
    name: `${idx + 1}`,
    score: (log.threatScore * 100).toFixed(1),
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="glass p-8 rounded-2xl border border-white/20">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold gradient-text animate-float">
              Security Dashboard
            </h1>
            <p className="text-white/70 text-lg">
              Real-time threat monitoring and protection analytics
            </p>
          </div>

          <div className="glass-hover p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-4 h-4 bg-green-500 rounded-full animate-pulse inline-block"></span>
                <span className="w-4 h-4 bg-green-500 rounded-full absolute top-0 left-0 animate-ping inline-block"></span>
              </div>
              <div className="text-right">
                <div className="text-white/90 font-semibold">System Active</div>
                <div className="text-white/60 text-sm">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group glass-hover p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 transform hover:scale-105 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-white/70 text-sm font-medium">
                Total Requests
              </div>
              <div className="text-3xl font-bold text-white">
                {stats?.total || 0}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                <span className="text-white/60">Live monitoring</span>
              </div>
            </div>
            <div className="text-4xl group-hover:animate-bounce">📊</div>
          </div>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 w-full animate-shimmer"></div>
          </div>
        </div>

        <div className="group glass-hover p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/10 to-pink-500/10 transform hover:scale-105 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-white/70 text-sm font-medium">
                Blocked Threats
              </div>
              <div className="text-3xl font-bold text-white">
                {stats?.blocked || 0}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-red-400">{trends.blocked}</span>
                <span className="text-white/60">vs last hour</span>
              </div>
            </div>
            <div className="text-4xl group-hover:animate-bounce">🛡️</div>
          </div>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-400 to-pink-400 w-full animate-shimmer"></div>
          </div>
        </div>

        <div className="group glass-hover p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 transform hover:scale-105 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-white/70 text-sm font-medium">
                Alerts Generated
              </div>
              <div className="text-3xl font-bold text-white">
                {stats?.alerted || 0}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-yellow-400">{trends.alerted}</span>
                <span className="text-white/60">vs last hour</span>
              </div>
            </div>
            <div className="text-4xl group-hover:animate-bounce">⚠️</div>
          </div>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 w-full animate-shimmer"></div>
          </div>
        </div>

        <div className="group glass-hover p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 transform hover:scale-105 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-white/70 text-sm font-medium">
                Allowed Requests
              </div>
              <div className="text-3xl font-bold text-white">
                {stats?.allowed || 0}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-400">{trends.allowed}</span>
                <span className="text-white/60">vs last hour</span>
              </div>
            </div>
            <div className="text-4xl group-hover:animate-bounce">✅</div>
          </div>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400 w-full animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-hover p-6 rounded-2xl border border-white/10 transform hover:scale-[1.02] transition-all duration-500">
          <ChartComponent
            type="pie"
            data={decisionData}
            dataKey="value"
            title="Decision Distribution"
            colors={["#10b981", "#f59e0b", "#ef4444"]}
          />
        </div>

        <div className="glass-hover p-6 rounded-2xl border border-white/10 transform hover:scale-[1.02] transition-all duration-500">
          <ChartComponent
            type="line"
            data={trendData}
            dataKey="score"
            xKey="name"
            title="Recent Threat Scores"
            colors={["#3b82f6"]}
          />
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="glass p-6 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-2xl">📡</div>
          <h3 className="text-xl font-semibold text-white">
            Real-time Activity
          </h3>
          <div className="flex-1"></div>
          <div className="glass-hover px-4 py-2 rounded-lg border border-white/10">
            <span className="text-white/70 text-sm">Last 5 events</span>
          </div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
          {logs.slice(0, 5).map((log, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-4 glass-hover rounded-xl border border-white/5"
            >
              <div
                className={`w-3 h-3 rounded-full animate-pulse ${
                  log.decision === "blocked"
                    ? "bg-red-500"
                    : log.decision === "alerted"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              ></div>
              <div className="flex-1">
                <div className="text-white/90 font-medium">{log.ip}</div>
                <div className="text-white/60 text-sm">
                  {log.payload.substring(0, 50)}...
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-medium ${
                    log.decision === "blocked"
                      ? "text-red-400"
                      : log.decision === "alerted"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {log.decision.toUpperCase()}
                </div>
                <div className="text-white/50 text-xs">
                  {((log.threatScore || 0) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
