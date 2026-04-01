import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { logsAPI, reportsAPI } from "../services/api";
import ChartComponent from "../components/ChartComponent";
import Loader from "../components/Loader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLive, setIsLive] = useState(true);
  const logsEndRef = useRef(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [reportStartDate, setReportStartDate] = useState(todayIso);
  const [reportEndDate, setReportEndDate] = useState(todayIso);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchData();

    // Real-time polling (we'll upgrade to WebSocket later)
    const interval = setInterval(() => {
      if (isLive) {
        fetchData(true);
      }
    }, 2000); // Poll every 2 seconds for real-time feel

    return () => clearInterval(interval);
  }, [isLive]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [logsData, statsData] = await Promise.all([
        logsAPI.getAll(),
        logsAPI.getStats(),
      ]);

      const logsArray = Array.isArray(logsData)
        ? logsData
        : Array.isArray(logsData?.data)
        ? logsData.data
        : [];

      setLogs(logsArray);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setLogs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const formatPct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

  const generateReport = async () => {
    try {
      setReportLoading(true);
      setReportError(null);
      setReportData(null);

      const res = await reportsAPI.getRequests({
        startDate: reportStartDate,
        endDate: reportEndDate,
      });

      const data = res?.data ?? res;
      setReportData(data);
    } catch (e) {
      console.error("Failed to generate report:", e);
      setReportError(e?.response?.data?.error || e?.message || "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReportPdf = () => {
    if (!reportData) return;

    const meta = reportData?.meta || {};
    const summary = reportData?.summary || {};
    const topIps = Array.isArray(reportData?.topIps) ? reportData.topIps : [];
    const topThreats = Array.isArray(reportData?.topThreats)
      ? reportData.topThreats
      : [];
    const modelAverages = reportData?.modelAverages || {};
    const hourly = Array.isArray(reportData?.hourly) ? reportData.hourly : [];

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const title = "WAF Requests Report";
    doc.setFontSize(18);
    doc.text(title, 40, 50);

    doc.setFontSize(10);
    const subtitle = `Range (UTC): ${meta.start || reportStartDate} → ${meta.end || reportEndDate}`;
    doc.text(subtitle, 40, 70);
    doc.text(`Generated: ${new Date(meta.generatedAt || Date.now()).toISOString()}`, 40, 85);

    autoTable(doc, {
      startY: 105,
      head: [["Metric", "Value"]],
      body: [
        ["Total requests", String(summary.total ?? 0)],
        ["Allowed", `${summary.allowed ?? 0} (${formatPct(summary.decisionPercentages?.allowed)})`],
        ["Blocked", `${summary.blocked ?? 0} (${formatPct(summary.decisionPercentages?.blocked)})`],
        ["Alerted", `${summary.alerted ?? 0} (${formatPct(summary.decisionPercentages?.alerted)})`],
        ["Overrides", String(summary.overrideCount ?? 0)],
        ["Avg threat score", `${((summary.avgThreatScore ?? 0) * 100).toFixed(1)}%`],
        ["Max threat score", `${((summary.maxThreatScore ?? 0) * 100).toFixed(1)}%`],
        ["Peak hour (UTC)", `${summary.peakHourUtc?.hour ?? 0}:00 (${summary.peakHourUtc?.count ?? 0} req)`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    const afterSummaryY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : 240;

    autoTable(doc, {
      startY: afterSummaryY,
      head: [["Model", "Average confidence"]],
      body: [
        ["Payload", `${(Number(modelAverages.payload || 0) * 100).toFixed(1)}%`],
        ["XSS", `${(Number(modelAverages.xss || 0) * 100).toFixed(1)}%`],
        ["Bot", `${(Number(modelAverages.bot || 0) * 100).toFixed(1)}%`],
        ["DDoS", `${(Number(modelAverages.ddos || 0) * 100).toFixed(1)}%`],
        ["Behavior", `${(Number(modelAverages.behavior || 0) * 100).toFixed(1)}%`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    const afterModelsY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : afterSummaryY + 120;

    autoTable(doc, {
      startY: afterModelsY,
      head: [["Top IP", "Requests", "Avg threat", "Max threat", "Blocked", "Alerted"]],
      body: topIps.map((row) => [
        String(row.ip ?? "unknown"),
        String(row.count ?? 0),
        `${(Number(row.avgThreatScore || 0) * 100).toFixed(1)}%`,
        `${(Number(row.maxThreatScore || 0) * 100).toFixed(1)}%`,
        String(row.blocked ?? 0),
        String(row.alerted ?? 0),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    const afterIpsY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : afterModelsY + 180;

    autoTable(doc, {
      startY: afterIpsY,
      head: [["Time (UTC)", "IP", "Decision", "Threat", "Payload snippet"]],
      body: topThreats.map((row) => [
        row?.createdAt ? new Date(row.createdAt).toISOString().slice(0, 19).replace("T", " ") : "",
        String(row?.ip ?? "unknown"),
        String(row?.decision ?? "").toUpperCase(),
        `${(Number(row?.threatScore || 0) * 100).toFixed(0)}%`,
        String(row?.payloadSnippet ?? ""),
      ]),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: { 4: { cellWidth: 220 } },
    });

    // Add a simple hourly chart table (compact)
    const afterThreatsY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : afterIpsY + 200;
    const topHours = hourly
      .slice()
      .sort((a, b) => (b?.count || 0) - (a?.count || 0))
      .slice(0, 6)
      .map((h) => [`${h.hour}:00`, String(h.count || 0)]);

    autoTable(doc, {
      startY: afterThreatsY,
      head: [["Busiest hours (UTC)", "Requests"]],
      body: topHours,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    const safeStart = String(reportStartDate || "").replaceAll(":", "-");
    const safeEnd = String(reportEndDate || "").replaceAll(":", "-");
    doc.save(`waf-report-${safeStart}-to-${safeEnd}.pdf`);
  };

  // Remove auto-scroll on load to prevent jumping
  // const scrollToBottom = () => {
  //   logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  // useEffect(() => {
  //   if (isLive && logs.length > 0) {
  //     scrollToBottom();
  //   }
  // }, [logs, isLive]);

  const filteredLogs = Array.isArray(logs)
    ? logs.filter((log) => {
        const safeIp = log.ip?.toString().toLowerCase() || "";
        const safePayload = log.payload?.toString().toLowerCase() || "";
        const term = searchTerm?.toLowerCase() || "";
        const matchesFilter = filter === "all" || log.decision === filter;
        const matchesSearch =
          safeIp.includes(term) || safePayload.includes(term);
        return matchesFilter && matchesSearch;
      })
    : [];

  // Calculate real-time stats from logs
  const calculatedStats = {
    total: logs.length,
    blocked: logs.filter((log) => log.decision === "block").length,
    alerted: logs.filter((log) => log.decision === "alert").length,
    allowed: logs.filter((log) => log.decision === "allow").length,
  };

  // Use calculated stats if API stats are empty/zero
  const displayStats = stats?.total > 0 ? stats : calculatedStats;

  const recentLogs = logs.slice(0, 20);
  const avgThreatScore =
    recentLogs.length > 0
      ? (recentLogs.reduce((sum, log) => sum + log.threatScore, 0) /
          recentLogs.length) *
        100
      : 0;

  const threatDistribution = [
    {
      name: "Low (0-40%)",
      value: logs.filter((l) => l.threatScore < 0.4).length,
      color: "#10b981",
    },
    {
      name: "Medium (40-70%)",
      value: logs.filter((l) => l.threatScore >= 0.4 && l.threatScore < 0.7)
        .length,
      color: "#f59e0b",
    },
    {
      name: "High (70-100%)",
      value: logs.filter((l) => l.threatScore >= 0.7).length,
      color: "#ef4444",
    },
  ];

  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = new Date().getHours() - (11 - i);
    return {
      name: `${hour >= 0 ? hour : 24 + hour}:00`,
      requests: Math.floor(Math.random() * 50) + 10, // Mock data - replace with real
    };
  });

  if (loading) {
    return <Loader size="lg" text="Loading admin dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-gray-400">
              Welcome back, <span className="font-semibold text-gray-200">{user?.username}</span>
            </p>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-800/70 text-gray-300 border border-gray-700">
              Admin Mode
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-900/30 text-primary-200 border border-primary-700/30">
              Live monitoring
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="px-6 py-3 bg-linear-to-r from-danger-600 to-danger-700 text-white rounded-xl hover:from-danger-700 hover:to-danger-800 transition-all font-medium flex items-center gap-2 shadow-lg hover:shadow-xl hover:shadow-danger-600/50 transform hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/50"
        >
          <span>🚪</span> Logout
        </button>
      </div>

      {/* Real-time Stats Grid */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            Overview
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Key security + traffic signals (live)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-linear-to-br from-primary-600/90 to-primary-700/90 backdrop-blur-sm rounded-xl shadow-xl p-6 text-white transform transition-all border border-primary-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📊</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <p className="text-4xl font-bold mb-1">{displayStats?.total || 0}</p>
          <p className="text-primary-100 text-sm">Total Requests</p>
          {isLive && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
              Live
            </div>
          )}
        </div>

        <div className="bg-linear-to-br from-danger-600/90 to-danger-700/90 backdrop-blur-sm rounded-xl shadow-xl p-6 text-white transform transition-all border border-danger-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-danger-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🛡️</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              Blocked
            </span>
          </div>
          <p className="text-4xl font-bold mb-1">
            {displayStats?.blocked || 0}
          </p>
          <p className="text-danger-100 text-sm">Threats Blocked</p>
          <p className="text-xs mt-2 text-danger-100">
            {displayStats?.total > 0
              ? ((displayStats.blocked / displayStats.total) * 100).toFixed(1)
              : 0}
            % of total
          </p>
        </div>

        <div className="bg-linear-to-br from-warning-600/90 to-warning-700/90 backdrop-blur-sm rounded-xl shadow-xl p-6 text-white transform transition-all border border-warning-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-warning-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">⚠️</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              Alerts
            </span>
          </div>
          <p className="text-4xl font-bold mb-1">
            {displayStats?.alerted || 0}
          </p>
          <p className="text-warning-100 text-sm">Alerts Generated</p>
          <p className="text-xs mt-2 text-warning-100">
            Avg Score: {avgThreatScore.toFixed(1)}%
          </p>
        </div>

        <div className="bg-linear-to-br from-success-600/90 to-success-700/90 backdrop-blur-sm rounded-xl shadow-xl p-6 text-white transform transition-all border border-success-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-success-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">✅</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              Allowed
            </span>
          </div>
          <p className="text-4xl font-bold mb-1">
            {displayStats?.allowed || 0}
          </p>
          <p className="text-success-100 text-sm">Requests Allowed</p>
          <p className="text-xs mt-2 text-success-100">
            {displayStats?.total > 0
              ? ((displayStats.allowed / displayStats.total) * 100).toFixed(1)
              : 0}
            % of total
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="transform hover:scale-[1.02] transition-transform">
          <ChartComponent
            type="pie"
            data={threatDistribution}
            dataKey="value"
            title="Threat Level Distribution"
            colors={["#10b981", "#f59e0b", "#ef4444"]}
          />
        </div>
        <div className="transform hover:scale-[1.02] transition-transform">
          <ChartComponent
            type="bar"
            data={hourlyData}
            dataKey="requests"
            xKey="name"
            title="Requests per Hour (Last 12h)"
            colors={["#3b82f6"]}
          />
        </div>
      </div>

      {/* Datewise Request Report */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-all">
        <div className="p-6 bg-linear-to-r from-gray-900/80 via-gray-900/60 to-gray-900/80 border-b border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-primary-600/20 to-primary-700/20 rounded-xl border border-primary-600/30">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🧾</span> Datewise Request Report
                </h2>
              </div>
              <p className="text-sm text-gray-400">
                Generate a PDF summary for a specific date range.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto items-end">
              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1 font-bold">
                  Start date
                </label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all hover:border-gray-500 focus-visible:outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1 font-bold">
                  End date
                </label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all hover:border-gray-500 focus-visible:outline-none"
                />
              </div>

              <button
                onClick={generateReport}
                disabled={reportLoading}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all transform hover:scale-105 ${
                  reportLoading
                    ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                    : "bg-linear-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/50"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 active:scale-[0.99]`}
              >
                {reportLoading ? "Generating…" : "Generate"}
              </button>

              <button
                onClick={downloadReportPdf}
                disabled={!reportData}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all transform hover:scale-105 ${
                  reportData
                    ? "bg-linear-to-r from-success-600 to-success-700 text-white shadow-lg shadow-success-600/50"
                    : "bg-gray-800/50 text-gray-500 border border-gray-700 cursor-not-allowed"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500/40 active:scale-[0.99]`}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {reportError && (
            <div className="p-4 rounded-xl border border-danger-600/40 bg-danger-900/20 text-danger-200">
              <p className="font-bold">Report error</p>
              <p className="text-sm mt-1">{reportError}</p>
            </div>
          )}

          {reportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-400 font-bold">Total</p>
                <p className="text-3xl font-bold text-white mt-1">{reportData?.summary?.total ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Requests in range</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-400 font-bold">Blocked</p>
                <p className="text-3xl font-bold text-danger-400 mt-1">{reportData?.summary?.blocked ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPct(reportData?.summary?.decisionPercentages?.blocked)} of total</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-400 font-bold">Alerted</p>
                <p className="text-3xl font-bold text-warning-400 mt-1">{reportData?.summary?.alerted ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPct(reportData?.summary?.decisionPercentages?.alerted)} of total</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-400 font-bold">Avg Threat</p>
                <p className="text-3xl font-bold text-primary-400 mt-1">
                  {((reportData?.summary?.avgThreatScore ?? 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Peak hour (UTC): {reportData?.summary?.peakHourUtc?.hour ?? 0}:00
                </p>
              </div>
            </div>
          )}

          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/40 rounded-xl border border-gray-700 p-5">
                <h3 className="text-lg font-bold text-white mb-3">Top IPs</h3>
                <div className="space-y-2">
                  {(reportData?.topIps || []).slice(0, 6).map((row) => (
                    <div key={row.ip} className="flex justify-between items-center bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-primary-300">{row.ip}</p>
                        <p className="text-xs text-gray-500">
                          Blocked: {row.blocked ?? 0} · Alerted: {row.alerted ?? 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{row.count ?? 0}</p>
                        <p className="text-xs text-gray-500">Avg: {(Number(row.avgThreatScore || 0) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                  {(!reportData?.topIps || reportData.topIps.length === 0) && (
                    <p className="text-sm text-gray-500">No IP data for this range.</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-900/40 rounded-xl border border-gray-700 p-5">
                <h3 className="text-lg font-bold text-white mb-3">Model Averages</h3>
                <div className="space-y-3">
                  {Object.entries(reportData?.modelAverages || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300 font-bold capitalize">{k}</span>
                      <span className="text-sm text-gray-400 font-mono">{(Number(v || 0) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Useful to see which detectors contributed most during this period.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Logs */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-all">
        <div className="p-6 bg-linear-to-r from-gray-900/80 via-gray-900/60 to-gray-900/80 border-b border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-primary-600/20 to-primary-700/20 rounded-xl border border-primary-600/30">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">📡</span> Real-time Logs
                </h2>
              </div>
              <button
                onClick={() => setIsLive(!isLive)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.99] ${
                  isLive
                    ? "bg-linear-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/50 animate-pulse"
                    : "bg-gray-800 text-gray-400 border-2 border-gray-600 hover:border-gray-500"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isLive ? "bg-white animate-ping absolute" : "bg-gray-500"
                    }`}
                  ></span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isLive ? "bg-white relative" : "bg-gray-500"
                    }`}
                  ></span>
                  {isLive ? "LIVE" : "PAUSED"}
                </span>
              </button>
              <div className="px-4 py-2 bg-linear-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                <span className="text-sm text-gray-400">
                  <span className="font-bold text-primary-400 text-lg">
                    {filteredLogs.length}
                  </span>{" "}
                  logs
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              {["all", "allow", "alert", "block"].map((option) => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 active:scale-[0.99] ${
                    filter === option
                      ? "bg-linear-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/50"
                      : "bg-gray-800/50 text-gray-300 hover:bg-gray-700 border border-gray-600 hover:border-gray-500"
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
              <input
                type="text"
                placeholder="🔍 Search IP or payload..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm placeholder-gray-500 transition-all hover:border-gray-500 focus-visible:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-700/50">
              <thead className="bg-linear-to-r from-gray-900 via-gray-900/95 to-gray-900 sticky top-0 z-10 shadow-lg">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-b-2 border-primary-600/30">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">⏰</span> Time
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-b-2 border-primary-600/30">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">🌐</span> IP Address
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-b-2 border-primary-600/30">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">📦</span> Payload
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-b-2 border-primary-600/30">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">⚡</span> Threat Score
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-b-2 border-primary-600/30">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">🎯</span> Decision
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-7xl mb-4 opacity-30 animate-pulse">
                          📋
                        </div>
                        <p className="text-gray-400 text-lg font-medium">
                          No logs found
                        </p>
                        <p className="text-gray-600 text-sm mt-2">
                          Logs will appear here in real-time
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr
                      key={log._id || log.id || index}
                      className="hover:bg-linear-to-r hover:from-gray-700/40 hover:via-gray-700/20 hover:to-transparent transition-all duration-300 group animate-fadeIn border-l-4 border-transparent hover:border-primary-600"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 group-hover:text-gray-300 font-mono">
                            {new Date(
                              log.createdAt || log.timestamp
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                          <code className="text-sm font-bold text-primary-400 bg-primary-900/30 px-3 py-1 rounded-lg border border-primary-600/30 group-hover:border-primary-500/50 transition-all">
                            {log.ip}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="relative group/payload">
                          <code className="block bg-linear-to-r from-gray-900 to-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-xs text-gray-300 truncate group-hover:text-white transition-all font-mono shadow-inner">
                            {log.payload}
                          </code>
                          <div className="absolute hidden group-hover/payload:block bg-gray-900 border border-gray-600 px-4 py-2 rounded-lg text-xs text-gray-200 z-20 top-full mt-2 left-0 max-w-md shadow-2xl">
                            {log.payload}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[120px]">
                            <div className="relative w-full bg-gray-700/50 rounded-full h-3 overflow-hidden border border-gray-600 shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
                                  log.threatScore > 0.7
                                    ? "bg-linear-to-r from-danger-600 via-danger-500 to-danger-600 shadow-lg shadow-danger-600/50"
                                    : log.threatScore > 0.4
                                    ? "bg-linear-to-r from-warning-600 via-warning-500 to-warning-600 shadow-lg shadow-warning-600/50"
                                    : "bg-linear-to-r from-success-600 via-success-500 to-success-600 shadow-lg shadow-success-600/50"
                                }`}
                                style={{ width: `${log.threatScore * 100}%` }}
                              >
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-bold min-w-[45px] text-right ${
                              log.threatScore > 0.7
                                ? "text-danger-400"
                                : log.threatScore > 0.4
                                ? "text-warning-400"
                                : "text-success-400"
                            }`}
                          >
                            {(log.threatScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-4 py-2 inline-flex items-center gap-2 text-xs font-bold rounded-xl transition-all transform group-hover:scale-105 ${
                            log.decision === "block"
                              ? "bg-linear-to-r from-danger-900/40 to-danger-800/40 text-danger-300 border-2 border-danger-600 shadow-lg shadow-danger-600/30"
                              : log.decision === "alert"
                              ? "bg-linear-to-r from-warning-900/40 to-warning-800/40 text-warning-300 border-2 border-warning-600 shadow-lg shadow-warning-600/30"
                              : "bg-linear-to-r from-success-900/40 to-success-800/40 text-success-300 border-2 border-success-600 shadow-lg shadow-success-600/30"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.decision === "block"
                                ? "bg-danger-400 animate-pulse"
                                : log.decision === "alert"
                                ? "bg-warning-400 animate-pulse"
                                : "bg-success-400"
                            }`}
                          ></span>
                          {log.decision?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                <tr ref={logsEndRef} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #2563eb);
          border-radius: 10px;
          border: 2px solid rgba(31, 41, 55, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #1d4ed8);
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
