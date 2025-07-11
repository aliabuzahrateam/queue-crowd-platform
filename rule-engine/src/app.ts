import express from "express";
import ruleRoutes from "./routes/ruleRoutes";

const app = express();

app.use(express.json());
app.use("/api", ruleRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Rule Engine Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
