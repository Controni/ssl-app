const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("SSL SERVER RUNNING");
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.USER && password === process.env.PASS) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// LEADS
const leads = require("./leads.json");

app.get("/leads", (req, res) => {
  res.json(leads);
});

// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
