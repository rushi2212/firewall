// server.js
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";

connectDB();

app.listen(ENV.PORT, () => {
  console.log(`🚀 Backend running on port ${ENV.PORT}`);
});
