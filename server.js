const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS
app.use(cors({ origin: "*" }));
app.use(express.json());

// TEST ROOT
app.get("/", (req, res) => {
  res.send("OK");
});

// LOGIN
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// LEADS
const leads = require("./leads.json");

app.get("/leads", (req, res) => {
  res.json(leads);
});

// GENERATE EMAIL
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
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
