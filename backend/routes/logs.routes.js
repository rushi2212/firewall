// logs.routes.js
import express from "express";
import {
	getLogs,
	getLogById,
	getLogStats,
	streamLogs,
} from "../controllers/logs.controller.js";
const router = express.Router();

router.get("/stream", streamLogs);
router.get("/", getLogs);
router.get("/stats", getLogStats);
router.get("/:id", getLogById);

export default router;
