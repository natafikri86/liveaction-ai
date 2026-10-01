
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "LiveAction AI Backend",
    status: "online",
    message: "Backend aktif. Mesin AI belum terhubung."
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "LiveAction AI"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LiveAction AI backend berjalan di port ${PORT}`);
});
