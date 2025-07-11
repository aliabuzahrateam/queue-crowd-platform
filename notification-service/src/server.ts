import app from "./app";

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Notification Service listening on port ${PORT}`);
});
