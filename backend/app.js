// app.js
import express from "express";
import cors from "cors";
import decisionRoutes from "./routes/decision.routes.js";
import logsRoutes from "./routes/logs.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/decision", decisionRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/alerts", alertsRoutes);

export default app;
