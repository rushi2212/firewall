// logs.routes.js
import express from "express";
import {
	getLogs,
	getLogById,
	getLogStats,
	streamLogs,
	getDdosLogs,
	getDdosStats,
} from "../controllers/logs.controller.js";
const router = express.Router();

router.get("/stream", streamLogs);
router.get("/ddos/stats", getDdosStats);
router.get("/ddos", getDdosLogs);
router.get("/stats", getLogStats);
router.get("/", getLogs);
router.get("/:id", getLogById);

export default router;
