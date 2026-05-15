// alerts.routes.js
import express from "express";
import {
	getAlerts,
	triggerTestAlert,
} from "../controllers/alerts.controller.js";
import { requireRole } from "../middleware/auth.js";
const router = express.Router();

router.get("/", getAlerts);
router.post("/test", requireRole("owner", "admin"), triggerTestAlert);
router.get("/test", requireRole("owner", "admin"), triggerTestAlert);

export default router;
