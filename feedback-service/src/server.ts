import app from "./app";

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Feedback Service listening on port ${PORT}`);
});
