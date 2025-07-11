import express from "express";

const app = express();

app.use(express.json());

// Example route
app.get("/", (req, res) => {
  res.send("Queue Service is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
