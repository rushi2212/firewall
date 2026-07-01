import React from "react";
import { Link } from "react-router-dom";

const cards = [
  {
    title: "Login Portal",
    description:
      "Exercise SQL injection and XSS payloads through a login-style request.",
    path: "/lab/login",
    mark: "L",
  },
  {
    title: "Bot Detection",
    description:
      "Record browser interaction patterns and send TrafficFlow data to the analyzer.",
    path: "/lab/bot",
    mark: "B",
  },
  {
    title: "User Behaviour",
    description:
      "Create a session timeline and evaluate behavioral model scoring.",
    path: "/lab/behaviour",
    mark: "U",
  },
];

const Lab = () => (
  <div className="animate-fadeIn space-y-6">
    <div className="page-header">
      <div>
        <h1 className="page-title">Lab</h1>
        <p className="page-subtitle">
          Use controlled workflows to test WAF detection behavior.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.path}
          to={card.path}
          className="panel p-5 transition hover:border-[var(--app-primary)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-box font-bold">{card.mark}</span>
            <h2 className="text-lg font-bold text-[var(--app-text)]">
              {card.title}
            </h2>
          </div>
          <p className="text-sm text-[var(--app-text-muted)]">
            {card.description}
          </p>
          <div className="mt-5 text-sm font-semibold text-[var(--app-primary)]">
            Open lab
          </div>
        </Link>
      ))}
    </div>

    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Presentation Route DDoS</h2>
          <p className="hint">
            The <span className="font-mono">/presentation</span> route is the
            dedicated DDoS scenario. Run
            <span className="font-mono"> ddostest/strongddos.py</span> from the
            repository root to generate burst traffic and watch the route update
            in the dashboard.
          </p>
        </div>
        <Link to="/presentation" className="btn btn-primary">
          Open presentation route
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="panel-muted p-4">
          <p className="text-sm font-semibold text-[var(--app-text)]">
            Route-focused DDoS demo
          </p>
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">
            This section does not launch the attack itself. It points you to the
            <span className="font-mono"> /presentation</span> route, which is
            where the external <span className="font-mono">strongddos.py</span>
            traffic will be reflected in the live logs and limiter behavior.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
              What to do
            </p>
            <p className="mt-2 text-sm text-[var(--app-text)]">
              Open the route, then run the external simulator. The warmup phase
              should pass, the burst should trigger blocks, and the dashboard
              should show the effect on the same route.
            </p>
          </div>
          <span className="badge badge-neutral">External simulator only</span>
        </div>
      </div>
    </section>

    <div className="panel-muted p-4 text-sm text-[var(--app-text-muted)]">
      Lab pages are authenticated test tools and send traffic to
      <span className="font-mono"> /api/decision/analyze</span>.
    </div>
  </div>
);

export default Lab;
