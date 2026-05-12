import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { path: "/", label: "Dashboard", mark: "D" },
  { path: "/logs", label: "Logs", mark: "L" },
  { path: "/test", label: "Payload Lab", mark: "P" },
  { path: "/lab", label: "Simulation", mark: "S" },
  { path: "/alerts", label: "Alerts", mark: "A" },
  { path: "/settings", label: "Settings", mark: "C" },
];

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[var(--app-surface)]/94 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex min-w-fit items-center gap-3 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
        >
          <span className="icon-box font-bold">W</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-[var(--app-text)]">AI-WAF</span>
            <span className="block text-xs text-[var(--app-text-muted)]">Security console</span>
          </span>
        </Link>

        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                    : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded border border-[var(--app-border)] text-[10px]">
                  {item.mark}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-secondary h-10 w-10 p-0"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "L" : "D"}
          </button>

          {user && (
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 md:flex">
              <span className="text-xs font-semibold text-[var(--app-text)]">{user.username}</span>
              <span className="badge badge-neutral">{user.role}</span>
            </div>
          )}

          <button type="button" onClick={logout} className="btn btn-secondary">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
