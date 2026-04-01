import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/logs", label: "Logs", icon: "📝" },
    { path: "/test", label: "Test Payload", icon: "🧪" },
    { path: "/lab", label: "Lab", icon: "🧰" },
    { path: "/alerts", label: "Alerts", icon: "🚨" },
    { path: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-slate-900/95 backdrop-blur-xl border-b border-white/20 shadow-2xl shadow-blue-500/10"
          : "bg-slate-900/80 backdrop-blur-md border-b border-white/10"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-all duration-500 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          {/* Logo Section - Enhanced */}
          <Link
            to="/"
            className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-2xl"
            aria-label="Go to Dashboard"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-35 group-hover:opacity-55 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3 px-6 py-3 bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-lg group-hover:border-white/15 transition-all">
                <span className="text-4xl filter drop-shadow-lg">
                  🛡️
                </span>
                <div className="flex flex-col leading-tight">
                  <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    AI-Powered WAF
                  </h1>
                  <span className="text-xs text-slate-400 font-medium">
                    Security Intelligence
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Navigation Items - Redesigned */}
          <div className="flex items-center gap-2 flex-1 justify-end overflow-x-auto no-scrollbar -mx-2 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2.5 overflow-hidden active:scale-[0.98] ${
                      isActive
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {/* Background gradient for active state */}
                    {isActive && (
                      <div className="absolute inset-0 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 opacity-100"></div>
                    )}

                    {/* Hover background */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}

                    {/* Border glow */}
                    <div
                      className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "border-2 border-white/30 shadow-lg shadow-purple-500/50"
                          : "border border-white/5 group-hover:border-white/20"
                      }`}
                    ></div>

                    {/* Content */}
                    <span className="relative text-xl transform group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </span>
                    <span className="relative font-medium tracking-wide">
                      {item.label}
                    </span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="relative w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* Divider */}
            <div className="w-px h-8 bg-linear-to-b from-transparent via-white/20 to-transparent mx-2"></div>

            {/* Admin/Login Button - Enhanced */}
            {user ? (
              <Link
                to="/admin/dashboard"
                className="relative group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl"
                aria-label="Admin Dashboard"
              >
                <div className="absolute inset-0 bg-linear-to-r from-amber-500 to-orange-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2.5 active:scale-[0.98] ${
                    location.pathname === "/admin/dashboard"
                      ? "bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/40 scale-105"
                      : "bg-linear-to-r from-amber-600 to-orange-700 text-white group-hover:from-amber-500 group-hover:to-orange-600 group-hover:shadow-xl group-hover:shadow-amber-500/40 group-hover:scale-105"
                  }`}
                >
                  <span className="text-xl transform group-hover:rotate-12 transition-transform duration-300">
                    👑
                  </span>
                  <span className="font-semibold tracking-wide">Admin</span>
                </div>
              </Link>
            ) : (
              <Link
                to="/login"
                className="relative group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl"
                aria-label="Login"
              >
                <div className="absolute inset-0 bg-linear-to-r from-emerald-500 to-teal-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative px-6 py-2.5 rounded-xl text-sm font-bold bg-linear-to-r from-emerald-600 to-teal-700 text-white group-hover:from-emerald-500 group-hover:to-teal-600 transition-all duration-300 flex items-center gap-2.5 group-hover:shadow-xl group-hover:shadow-emerald-500/40 group-hover:scale-105">
                  <span className="text-xl transform group-hover:scale-110 transition-transform duration-300">
                    🔐
                  </span>
                  <span className="font-semibold tracking-wide">Login</span>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-xl transition-colors duration-300"></div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-purple-500/50 to-transparent"></div>
    </nav>
  );
};

export default Navbar;
