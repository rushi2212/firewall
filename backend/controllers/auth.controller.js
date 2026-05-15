import { ENV } from "../config/env.js";
import {
  createDashboardToken,
  verifyAdminPassword,
} from "../utils/dashboardAuth.js";

const publicUser = ({ username, role, tenantId }) => ({
  username,
  role,
  tenantId,
});

export const login = (req, res) => {
  const { username = "", password = "", tenantId = "default" } = req.body || {};

  if (!verifyAdminPassword(String(username), String(password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const role = ENV.ADMIN_ROLE || "owner";
  const token = createDashboardToken({ username, role, tenantId });
  return res.json({
    token,
    user: publicUser({ username, role, tenantId }),
  });
};

export const me = (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  return res.json({
    user: publicUser({
      username: req.user.sub,
      role: req.user.role,
      tenantId: req.tenantId,
    }),
  });
};
