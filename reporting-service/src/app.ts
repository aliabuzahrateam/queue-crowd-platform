import express from "express";
import reportRoutes from "./routes/reportRoutes";

const app = express();

app.use(express.json());
app.use("/api", reportRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Reporting Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
