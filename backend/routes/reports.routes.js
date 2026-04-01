import express from "express";
import { getRequestsReport } from "../controllers/reports.controller.js";

const router = express.Router();

// GET /api/reports/requests?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Also supports: /api/reports/requests?date=YYYY-MM-DD
router.get("/requests", getRequestsReport);

export default router;
