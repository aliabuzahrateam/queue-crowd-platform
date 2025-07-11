import { Router } from "express";
import { logAccess, listAccessLogs } from "../controllers/accessController";
const router = Router();

// Log access
router.post("/access", logAccess);

// List access logs
router.get("/access", listAccessLogs);

export default router; 