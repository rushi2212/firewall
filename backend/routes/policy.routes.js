import express from "express";
import { getPolicy, updatePolicy } from "../controllers/policy.controller.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getPolicy);
router.put("/", requireRole("owner", "admin"), updatePolicy);

export default router;
