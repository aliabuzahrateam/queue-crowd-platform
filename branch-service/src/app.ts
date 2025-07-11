import express from "express";
import branchRoutes from "./routes/branchRoutes";

const app = express();

app.use(express.json());
app.use("/api", branchRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Branch Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
