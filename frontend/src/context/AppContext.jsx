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
      const data = await logsAPI.getAll();
      // Handle array response directly
      const logsArray = Array.isArray(data) ? data : data?.data || [];
      setLogs(logsArray);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setLogs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await logsAPI.getStats();
      setStats(data || { total: 0, allowed: 0, blocked: 0, alerted: 0 });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
