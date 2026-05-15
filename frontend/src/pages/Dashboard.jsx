import React from "react";
import { useApp } from "../context/AppContext";
import ThreatCard from "../components/ThreatCard";
import ChartComponent from "../components/ChartComponent";
import LogsTable from "../components/LogsTable";
import Loader from "../components/Loader";
import Button from "../components/ui/Button";

const Dashboard = () => {
  const { stats, logs, loading, fetchLogs, fetchStats } = useApp();

  if (loading && !stats) {
    return <Loader size="lg" text="Loading dashboard..." />;
  }

  const handleRefresh = async () => {
    await fetchLogs();
    await fetchStats();
  };

  const decisionData = [
    { name: "Allowed", value: stats?.allowed || 0 },
    { name: "Alerted", value: stats?.alerted || 0 },
    { name: "Blocked", value: stats?.blocked || 0 },
  ];

  const trendData = logs.slice(0, 15).reverse().map((log, idx) => ({
    name: `${idx + 1}`,
    score: Number(((log.threatScore || 0) * 100).toFixed(1)),
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">
            Monitor request decisions, threat scores, and recent WAF activity.
          </p>
        </div>
        <Button onClick={handleRefresh}>Refresh data</Button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ThreatCard title="Total Requests" value={(stats?.total || 0).toLocaleString()} icon="T" color="primary" />
        <ThreatCard title="Blocked" value={(stats?.blocked || 0).toLocaleString()} icon="B" color="danger" />
        <ThreatCard title="Alerts" value={(stats?.alerted || 0).toLocaleString()} icon="A" color="warning" />
        <ThreatCard title="Allowed" value={(stats?.allowed || 0).toLocaleString()} icon="O" color="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartComponent
          type="pie"
          data={decisionData}
          dataKey="value"
          title="Decision Distribution"
          colors={["#10b981", "#f59e0b", "#ef4444"]}
        />
        <ChartComponent
          type="line"
          data={trendData}
          dataKey="score"
          xKey="name"
          title="Threat Score Trend"
          colors={["#2563eb"]}
        />
      </div>

      <LogsTable logs={logs.slice(0, 8)} loading={loading} />
    </div>
  );
};

export default Dashboard;
