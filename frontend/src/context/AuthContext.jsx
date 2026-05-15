import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("adminUser");
    const token = localStorage.getItem("dashboardToken");
    if (!storedUser || !token) {
      setLoading(false);
      return;
    }

    setUser(JSON.parse(storedUser));
    authAPI
      .me()
      .then((response) => {
        setUser(response.data.user);
        localStorage.setItem("adminUser", JSON.stringify(response.data.user));
      })
      .catch(() => {
        localStorage.removeItem("adminUser");
        localStorage.removeItem("dashboardToken");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const response = await authAPI.login({ username, password });
    const { user: userData, token } = response.data;
    setUser(userData);
    localStorage.setItem("adminUser", JSON.stringify(userData));
    localStorage.setItem("dashboardToken", token);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("adminUser");
    localStorage.removeItem("dashboardToken");
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
