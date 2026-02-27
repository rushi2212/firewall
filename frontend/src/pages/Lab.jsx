import React from "react";
import { Link } from "react-router-dom";

const Lab = () => {
  const cards = [
    {
      title: "Login Portal (SQLi / XSS)",
      description:
        "Sample login form to inject SQL injection and XSS payloads and send them through the WAF analyzer.",
      path: "/lab/login",
      icon: "🔐",
    },
    {
      title: "Bot Detection",
      description:
        "Records browser interaction patterns and sends a TrafficFlow to the bot detector.",
      path: "/lab/bot",
      icon: "🤖",
    },
    {
      title: "User Behaviour Analysis",
      description:
        "Records a simple session timeline and sends it to the behaviour model.",
      path: "/lab/behaviour",
      icon: "🧠",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Lab
        </h1>
        <p className="text-gray-400 mt-1">
          Sample test pages to exercise SQLi/XSS, Bot Detection, and Behaviour
          Analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <Link
            key={c.path}
            to={c.path}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6 hover:border-primary-600 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{c.icon}</span>
              <h2 className="text-lg font-bold text-gray-200">{c.title}</h2>
            </div>
            <p className="text-sm text-gray-400">{c.description}</p>
            <div className="mt-4 text-primary-400 font-medium">Open →</div>
          </Link>
        ))}
      </div>

      <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 text-sm text-gray-400">
        These pages are for testing only. They send data to
        <span className="font-mono"> /api/decision/analyze</span>.
      </div>
    </div>
  );
};

export default Lab;
