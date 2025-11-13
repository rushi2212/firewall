import React from "react";

const ThreatCard = ({ title, value, icon, color = "primary", trend }) => {
  const colorClasses = {
    primary:
      "bg-gradient-to-br from-primary-900/50 to-primary-800/30 border-primary-600/50 text-primary-300 shadow-lg shadow-primary-900/20",
    danger:
      "bg-gradient-to-br from-danger-900/50 to-danger-800/30 border-danger-600/50 text-danger-300 shadow-lg shadow-danger-900/20",
    success:
      "bg-gradient-to-br from-success-900/50 to-success-800/30 border-success-600/50 text-success-300 shadow-lg shadow-success-900/20",
    warning:
      "bg-gradient-to-br from-warning-900/50 to-warning-800/30 border-warning-600/50 text-warning-300 shadow-lg shadow-warning-900/20",
  };

  const glowClasses = {
    primary: "hover:shadow-xl hover:shadow-primary-600/30",
    danger: "hover:shadow-xl hover:shadow-danger-600/30",
    success: "hover:shadow-xl hover:shadow-success-600/30",
    warning: "hover:shadow-xl hover:shadow-warning-600/30",
  };

  return (
    <div
      className={`rounded-xl border-2 p-6 ${colorClasses[color]} ${glowClasses[color]} transition-all duration-300 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-4xl font-bold mt-2 text-white">{value}</p>
          {trend && (
            <p className="text-xs mt-2 text-gray-400">
              {trend.startsWith("+") ? "↗" : "↘"} {trend} from last hour
            </p>
          )}
        </div>
        <div className="text-5xl opacity-70">{icon}</div>
      </div>
    </div>
  );
};

export default ThreatCard;
