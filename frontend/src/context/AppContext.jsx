import React, { createContext, useContext, useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2 seconds for real-time feel
  const [apiUrl, setApiUrl] = useState("/api");
  const [isRealTime, setIsRealTime] = useState(true);

  const fetchLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await logsAPI.getAll();
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

  useEffect(() => {
    fetchLogs();
    fetchStats();

    if (isRealTime) {
      const interval = setInterval(() => {
        fetchLogs(true); // Silent fetch for real-time updates
        fetchStats();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, isRealTime]);

  const value = {
    logs,
    stats,
    loading,
    refreshInterval,
    setRefreshInterval,
    apiUrl,
    setApiUrl,
    isRealTime,
    setIsRealTime,
    fetchLogs,
    fetchStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
