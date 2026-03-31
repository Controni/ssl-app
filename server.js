const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS (importantissimo)
app.use(cors({
  origin: "*"
}));

app.use(express.json());

// TEST ROOT
app.get("/", (req, res) => {
  res.send("OK");
});

// LOGIN (temporaneo safe)
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// LEADS
const leads = require("./leads.json");

app.get("/leads", (req, res) => {
  res.json(leads);
});

// START SERVER
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
