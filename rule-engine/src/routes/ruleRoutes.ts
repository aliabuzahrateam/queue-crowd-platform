import { Router } from "express";
import { createRule, listRules, updateRule } from "../controllers/ruleController";
const router = Router();

// Create rule
router.post("/rules", createRule);

// List rules
router.get("/rules", listRules);

// Update rule
router.put("/rules/:id", updateRule);

export default router; 