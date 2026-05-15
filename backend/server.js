// server.js
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import { initWebSocketHub } from "./utils/wsHub.js";

connectDB();

const server = http.createServer(app);
initWebSocketHub(server);

server.listen(ENV.PORT, () => {
  console.log(`🚀 Backend running on port ${ENV.PORT}`);
});
