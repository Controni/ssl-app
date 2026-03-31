const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("FORCE DEPLOY");
const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

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

// EMAIL GENERATOR
app.post("/generate-email", (req, res) => {
  const { company, market, stage, next_action } = req.body;

  let email = `Dear ${company} Team,\n\n`;

  if (stage === "NEGOTIATION") {
    email += `Following our ongoing discussions regarding the ${market} market, we would like to proceed with the next steps.\n\n`;
  }

  if (next_action === "Request forecast") {
    email += `Kindly share your expected forecast volumes and initial order planning.\n\n`;
  }

  email += `Best regards,\nSwiss Scientific Lab`;

  res.json({ email });
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
