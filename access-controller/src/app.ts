import express from "express";
import accessRoutes from "./routes/accessRoutes";

const app = express();

app.use(express.json());
app.use("/api", accessRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Access Controller Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
