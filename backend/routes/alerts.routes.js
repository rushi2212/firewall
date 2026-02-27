// alerts.routes.js
import express from "express";
import {
	getAlerts,
	triggerTestAlert,
} from "../controllers/alerts.controller.js";
const router = express.Router();

router.get("/", getAlerts);
router.post("/test", triggerTestAlert);
router.get("/test", triggerTestAlert);

export default router;
