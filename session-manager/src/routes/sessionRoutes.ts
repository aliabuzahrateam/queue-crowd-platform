import { Router } from "express";
import { createSession, listSessions, revokeSession } from "../controllers/sessionController";
const router = Router();

// Create session
router.post("/sessions", createSession);

// List sessions
router.get("/sessions", listSessions);

// Revoke session
router.post("/sessions/:id/revoke", revokeSession);

export default router; 