import express from "express";
import feedbackRoutes from "./routes/feedbackRoutes";

const app = express();

app.use(express.json());
app.use("/api", feedbackRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Feedback Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
