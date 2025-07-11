import { Router } from "express";
const router = Router();

// Feedback
router.post("/feedback", (req, res) => {
  res.send("Submit feedback endpoint");
});
router.get("/feedback", (req, res) => {
  res.send("List feedback endpoint");
});

export default router; 