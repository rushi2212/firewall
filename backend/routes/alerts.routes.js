// alerts.routes.js
import express from "express";
import { triggerTestAlert } from "../controllers/alerts.controller.js";
const router = express.Router();

router.get("/test", triggerTestAlert);

export default router;
