// app.js
import express from "express";
import cors from "cors";
import decisionRoutes from "./routes/decision.routes.js";
import logsRoutes from "./routes/logs.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";
import path from "path"; // Import path module
import { fileURLToPath } from "url"; // Needed for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/decision", decisionRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/alerts", alertsRoutes);

app.use(express.static(path.join(__dirname, "../frontend", "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
});
export default app;
