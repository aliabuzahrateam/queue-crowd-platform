import express from "express";
import sessionRoutes from "./routes/sessionRoutes";

const app = express();

app.use(express.json());
app.use("/api", sessionRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Session Manager Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
