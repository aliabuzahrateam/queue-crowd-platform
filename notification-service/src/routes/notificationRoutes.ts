import { Router } from "express";
const router = Router();

// Notifications
router.post("/notifications", (req, res) => {
  res.send("Send notification endpoint");
});
router.get("/notifications", (req, res) => {
  res.send("List notifications endpoint");
});

// Templates
router.post("/templates", (req, res) => {
  res.send("Create notification template endpoint");
});
router.get("/templates", (req, res) => {
  res.send("List notification templates endpoint");
});

export default router; 