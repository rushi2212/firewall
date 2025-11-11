// decision.routes.js
import express from "express";
import { analyzeRequest } from "../controllers/decision.controller.js";
const router = express.Router();

router.post("/analyze", analyzeRequest);

export default router;
