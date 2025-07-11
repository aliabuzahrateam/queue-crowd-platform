import { Router } from "express";
const router = Router();

// Branches
router.post("/branches", (req, res) => {
  res.send("Create branch endpoint");
});
router.get("/branches", (req, res) => {
  res.send("List branches endpoint");
});
router.put("/branches/:id", (req, res) => {
  res.send("Update branch endpoint");
});

// Counters
router.post("/counters", (req, res) => {
  res.send("Create counter endpoint");
});
router.get("/counters", (req, res) => {
  res.send("List counters endpoint");
});

// Service Types
router.post("/services", (req, res) => {
  res.send("Create service type endpoint");
});
router.get("/services", (req, res) => {
  res.send("List service types endpoint");
});

export default router; 