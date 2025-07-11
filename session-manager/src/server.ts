import app from "./app";

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  console.log(`Session Manager Service listening on port ${PORT}`);
});
