import { Router } from "express";
const router = Router();

// Reports
router.get("/reports/wait-times", (req, res) => {
  res.send("Wait times report endpoint");
});
router.get("/reports/branches", (req, res) => {
  res.send("Branches report endpoint");
});
router.get("/reports/staff", (req, res) => {
  res.send("Staff report endpoint");
});

export default router; 