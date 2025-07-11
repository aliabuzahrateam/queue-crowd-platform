import express from "express";
import notificationRoutes from "./routes/notificationRoutes";

const app = express();

app.use(express.json());
app.use("/api", notificationRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Notification Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
