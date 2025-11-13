import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/logs", label: "Logs", icon: "📝" },
    { path: "/test", label: "Test Payload", icon: "🧪" },
    { path: "/alerts", label: "Alerts", icon: "🚨" },
    { path: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="gradient-text text-3xl font-bold flex items-center gap-3 animate-float">
                <span className="text-4xl animate-glow">🛡️</span>
                AI-Powered WAF
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 transform scale-105"
                      : "text-white/80 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/10 glass-hover"
                  }`}
                >
                  <span className="text-lg group-hover:animate-bounce">
                    {item.icon}
                  </span>
                  <span className="relative">
                    {item.label}
                    {/* Underline animation */}
                    <span
                      className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ${
                        isActive ? "w-full" : "group-hover:w-full"
                      }`}
                    ></span>
                  </span>
                </Link>
              );
            })}

            {/* Admin Button */}
            {user ? (
              <Link
                to="/admin/dashboard"
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                  location.pathname === "/admin/dashboard"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 transform scale-105"
                    : "bg-gradient-to-r from-amber-600 to-orange-700 text-white hover:from-amber-500 hover:to-orange-600 hover:shadow-lg hover:shadow-amber-500/30 glass-hover"
                }`}
              >
                <span className="text-lg group-hover:animate-bounce">👑</span>
                <span className="relative">
                  Admin
                  <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-green-500/30 glass-hover"
              >
                <span className="text-lg group-hover:animate-bounce">🔐</span>
                <span className="relative">
                  Login
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded transition-opacity duration-300"></span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
