import express from "express";
import crowdingRoutes from "./routes/crowdingRoutes";

const app = express();

app.use(express.json());
app.use("/api", crowdingRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Crowding Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
