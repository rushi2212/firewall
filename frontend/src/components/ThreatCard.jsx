import React from "react";

const toneMap = {
  primary: { line: "bg-blue-500", text: "text-blue-600 dark:text-blue-300" },
  danger: { line: "bg-rose-500", text: "text-rose-600 dark:text-rose-300" },
  success: { line: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-300" },
  warning: { line: "bg-amber-500", text: "text-amber-600 dark:text-amber-300" },
};

const ThreatCard = ({ title, value, icon, color = "primary", trend }) => {
  const tone = toneMap[color] || toneMap.primary;

  return (
    <section className="panel overflow-hidden">
      <div className={`h-1 ${tone.line}`} />
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--app-text-muted)]">{title}</p>
          <p className="mt-2 text-3xl font-bold leading-none text-[var(--app-text)]">{value}</p>
          {trend && (
            <p className="mt-3 text-xs font-medium text-[var(--app-text-muted)]">
              {trend} from recent traffic
            </p>
          )}
        </div>
        <div className={`icon-box ${tone.text}`}>
          <span className="text-sm font-black">{icon}</span>
        </div>
      </div>
    </section>
  );
};

export default ThreatCard;
