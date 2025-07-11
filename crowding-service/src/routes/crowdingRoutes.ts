import { Router } from "express";
const router = Router();

// Metrics
router.get("/metrics", (req, res) => {
  res.send("List crowd metrics endpoint");
});

// Virtual Queue
router.post("/virtual-queue", (req, res) => {
  res.send("Add to virtual queue endpoint");
});
router.get("/virtual-queue/:userId", (req, res) => {
  res.send("Get user virtual queue status endpoint");
});

export default router; 