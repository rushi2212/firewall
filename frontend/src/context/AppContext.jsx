import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { logsAPI } from "../services/api";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    allowed: 0,
    blocked: 0,
    alerted: 0,
  });
  const emptyDdosStats = {
    totalAttempts: 0,
    uniqueAttackerIps: 0,
    successfulBlocks: 0,
    blockRate: 0,
    currentlyTrackedIps: 0,
    currentlyBlockedIps: 0,
    topAttackers: [],
  };
  const [ddosStats, setDdosStats] = useState(emptyDdosStats);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2 seconds for real-time feel
  const [apiUrl, setApiUrl] = useState("/api");
  const [isRealTime, setIsRealTime] = useState(true);
  const wsRef = useRef(null);

  const getWsBaseUrl = () => {
    const explicit = import.meta.env.VITE_WS_URL;
    if (explicit) return explicit;
    const apiBase = apiUrl || import.meta.env.VITE_API_URL || "/api";
    const baseUrl = new URL(apiBase, window.location.origin);
    const wsUrl = new URL("/ws", baseUrl);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    return wsUrl.toString();
  };

  const getWsUrl = () => {
    const url = new URL(getWsBaseUrl());
    const token = localStorage.getItem("dashboardToken");
    if (token) url.searchParams.set("token", token);
    return url.toString();
  };

  const updateStatsFromLog = (prev, log) => {
    const next = prev || { total: 0, allowed: 0, blocked: 0, alerted: 0 };
    const decision = String(log?.decision || log?.effectiveDecision || "").toLowerCase();
    const updated = { ...next, total: next.total + 1 };
    if (decision === "block" || decision === "blocked") updated.blocked += 1;
    else if (decision === "alert" || decision === "alerted") updated.alerted += 1;
    else if (decision === "allow" || decision === "allowed") updated.allowed += 1;
    else updated.allowed += 1;
    return updated;
  };

  const fetchLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await logsAPI.getAll({ limit: 500 }); // Fetch 500 logs for dashboard
      console.log("Fetched logs response:", response);

      // Handle array response directly
      const logsArray = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setLogs(logsArray);

      // Calculate stats from logs if no separate stats endpoint
      calculateStatsFromLogs(logsArray);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setLogs([]);
      // Set fallback stats
      setStats({ total: 0, allowed: 0, blocked: 0, alerted: 0 });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const calculateStatsFromLogs = (logsData) => {
    if (!Array.isArray(logsData) || logsData.length === 0) {
      setStats({ total: 0, allowed: 0, blocked: 0, alerted: 0 });
      return;
    }

    const calculatedStats = logsData.reduce(
      (acc, log) => {
        acc.total++;

        // Handle different possible decision values
        const decision = (log.decision || log.action || "").toLowerCase();

        switch (decision) {
          case "blocked":
          case "block":
            acc.blocked++;
            break;
          case "alerted":
          case "alert":
          case "warning":
            acc.alerted++;
            break;
          case "allowed":
          case "allow":
          case "passed":
          case "accepted":
            acc.allowed++;
            break;
          default:
            // If no decision, categorize by threat score
            const threatScore = log.threatScore || log.threat_score || 0;
            if (threatScore > 0.8) {
              acc.blocked++;
            } else if (threatScore > 0.5) {
              acc.alerted++;
            } else {
              acc.allowed++;
            }
        }
        return acc;
      },
      { total: 0, allowed: 0, blocked: 0, alerted: 0 }
    );

    console.log("Calculated stats:", calculatedStats);
    setStats(calculatedStats);
  };

  const fetchStats = async () => {
    try {
      const response = await logsAPI.getStats();
      console.log("Fetched stats response:", response);

      const statsData = response.data || response;
      if (statsData && typeof statsData === "object") {
        setStats({
          total: statsData.total || 0,
          allowed: statsData.allowed || statsData.allow || 0,
          blocked: statsData.blocked || statsData.block || 0,
          alerted: statsData.alerted || statsData.alert || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      // Don't override if we already calculated from logs
    }
  };

  const fetchDdosStats = async () => {
    try {
      const response = await logsAPI.getDdosStats();
      const ddosData = response.data || response;
      if (ddosData && typeof ddosData === "object") {
        setDdosStats(ddosData);
      }
    } catch (error) {
      console.error("Failed to fetch DDoS stats:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchDdosStats();
  }, []);

  useEffect(() => {
    if (!isRealTime) return undefined;

    let closed = false;
    let reconnectTimer = null;

    const connect = () => {
      if (closed) return;
      try {
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message?.type === "snapshot") {
              setLogs(Array.isArray(message.data?.logs) ? message.data.logs : []);
              setStats(message.data?.stats || { total: 0, allowed: 0, blocked: 0, alerted: 0 });
              setDdosStats(message.data?.ddosStats || emptyDdosStats);
              setLoading(false);
              return;
            }
            if (message?.type === "log") {
              const log = message.data;
              if (!log) return;
              setLogs((prev) => {
                const next = Array.isArray(prev) ? prev : [];
                if (log?._id && next.some((l) => l?._id === log._id)) return next;
                return [log, ...next].slice(0, 500);
              });
              setStats((prev) => updateStatsFromLog(prev, log));
              return;
            }
            if (message?.type === "ddosStats") {
              if (message.data) setDdosStats(message.data);
              return;
            }
          } catch (error) {
            console.error("Bad websocket payload:", error);
          }
        };

        ws.onclose = () => {
          if (!closed) {
            reconnectTimer = setTimeout(connect, 2000);
          }
        };
      } catch (error) {
        console.error("WebSocket connect failed:", error);
      }
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isRealTime, apiUrl]);

  const value = {
    logs,
    stats,
    ddosStats,
    loading,
    refreshInterval,
    setRefreshInterval,
    apiUrl,
    setApiUrl,
    isRealTime,
    setIsRealTime,
    fetchLogs,
    fetchStats,
    fetchDdosStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
