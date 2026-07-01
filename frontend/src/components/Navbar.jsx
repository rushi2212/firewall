import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Icon = ({ children }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    {children}
  </svg>
);

const icons = {
  dashboard: (
    <Icon>
      <path d="M3 13h8V3H3z" />
      <path d="M13 21h8V11h-8z" />
      <path d="M13 3h8v6h-8z" />
      <path d="M3 21h8v-6H3z" />
    </Icon>
  ),
  logs: (
    <Icon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </Icon>
  ),
  payload: (
    <Icon>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
      <path d="m14 4-4 16" />
    </Icon>
  ),
  simulation: (
    <Icon>
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="m5 5 14 14" />
      <path d="m19 5-14 14" />
    </Icon>
  ),
  alerts: (
    <Icon>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z" />
    </Icon>
  ),
  shield: (
    <Icon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-5" />
    </Icon>
  ),
  sun: (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.3 17.7-1.4 1.4" />
      <path d="m19.1 4.9-1.4 1.4" />
    </Icon>
  ),
  moon: (
    <Icon>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8z" />
    </Icon>
  ),
  signout: (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  ),
};

const navItems = [
  { path: "/", label: "Dashboard", icon: icons.dashboard },
  { path: "/logs", label: "Payload Logs", icon: icons.logs },
  { path: "/test", label: "Payload Lab", icon: icons.payload },
  { path: "/lab", label: "Simulation", icon: icons.simulation },
  { path: "/alerts", label: "Alerts", icon: icons.alerts },
  { path: "/settings", label: "Settings", icon: icons.settings },
];

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[var(--app-surface)]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex min-w-fit items-center gap-3 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
        >
          <span className="brand-mark">{icons.shield}</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-[var(--app-text)]">AI WAF Console</span>
            <span className="block text-xs text-[var(--app-text-muted)]">Model driven protection</span>
          </span>
        </Link>

        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--app-surface)] text-[var(--app-primary)] shadow-sm"
                    : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                }`}
                title={item.label}
              >
                {item.icon}
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
            {theme === "dark" ? icons.sun : icons.moon}
          </button>

          {user && (
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 md:flex">
              <span className="text-xs font-semibold text-[var(--app-text)]">{user.username}</span>
              <span className="badge badge-neutral">{user.role}</span>
            </div>
          )}

          <button type="button" onClick={logout} className="btn btn-secondary" title="Sign out">
            {icons.signout}
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
