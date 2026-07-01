import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const ChartComponent = ({
  type = "bar",
  data,
  dataKey,
  xKey,
  title,
  colors = ["#3b82f6", "#ef4444", "#22c55e"],
}) => {
  // Custom label for pie chart with theme-aware text
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="var(--app-text)"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        style={{ fontSize: "12px", fontWeight: "700" }}
      >
        {value}
      </text>
    );
  };

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
              <XAxis dataKey={xKey} stroke="var(--app-text-muted)" />
              <YAxis stroke="var(--app-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--app-surface)",
                  border: "1px solid var(--app-border)",
                  borderRadius: "8px",
                  color: "var(--app-text)",
                }}
                labelStyle={{ color: "var(--app-text)" }}
                itemStyle={{ color: "var(--app-text)" }}
              />
              <Legend wrapperStyle={{ color: "var(--app-text-muted)" }} />
              <Bar dataKey={dataKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--app-surface)",
                  border: "1px solid var(--app-border)",
                  borderRadius: "8px",
                  color: "var(--app-text)",
                }}
                labelStyle={{ color: "var(--app-text)" }}
                itemStyle={{ color: "var(--app-text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
              <XAxis dataKey={xKey} stroke="var(--app-text-muted)" />
              <YAxis stroke="var(--app-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--app-surface)",
                  border: "1px solid var(--app-border)",
                  borderRadius: "8px",
                  color: "var(--app-text)",
                }}
                labelStyle={{ color: "var(--app-text)" }}
                itemStyle={{ color: "var(--app-text)" }}
              />
              <Legend wrapperStyle={{ color: "var(--app-text-muted)" }} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ fill: colors[0], r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="panel min-w-0 overflow-hidden p-5">
      {title && (
        <h3 className="mb-4 text-sm font-bold text-[var(--app-text)]">
          {title}
        </h3>
      )}
      {renderChart()}
    </div>
  );
};

export default ChartComponent;
