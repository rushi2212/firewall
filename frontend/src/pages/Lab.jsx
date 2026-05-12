import React from "react";
import { Link } from "react-router-dom";

const cards = [
  {
    title: "Login Portal",
    description: "Exercise SQL injection and XSS payloads through a login-style request.",
    path: "/lab/login",
    mark: "L",
  },
  {
    title: "Bot Detection",
    description: "Record browser interaction patterns and send TrafficFlow data to the analyzer.",
    path: "/lab/bot",
    mark: "B",
  },
  {
    title: "User Behaviour",
    description: "Create a session timeline and evaluate behavioral model scoring.",
    path: "/lab/behaviour",
    mark: "U",
  },
];

const Lab = () => (
  <div className="animate-fadeIn space-y-6">
    <div className="page-header">
      <div>
        <h1 className="page-title">Lab</h1>
        <p className="page-subtitle">Use controlled workflows to test WAF detection behavior.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.path} to={card.path} className="panel p-5 transition hover:border-[var(--app-primary)]">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-box font-bold">{card.mark}</span>
            <h2 className="text-lg font-bold text-[var(--app-text)]">{card.title}</h2>
          </div>
          <p className="text-sm text-[var(--app-text-muted)]">{card.description}</p>
          <div className="mt-5 text-sm font-semibold text-[var(--app-primary)]">Open lab</div>
        </Link>
      ))}
    </div>

    <div className="panel-muted p-4 text-sm text-[var(--app-text-muted)]">
      Lab pages are authenticated test tools and send traffic to <span className="font-mono">/api/decision/analyze</span>.
    </div>
  </div>
);

export default Lab;


