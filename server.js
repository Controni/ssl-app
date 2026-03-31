const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ===== MIDDLEWARE =====
app.use(cors({ origin: "*" }));
app.use(express.json());

// ===== ROOT TEST =====
app.get("/", (req, res) => {
  res.send("SSL SERVER OK");
});

// ===== LOGIN (semplice) =====
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// ===== LEADS =====
const leads = require("./leads.json");

app.get("/leads", (req, res) => {
  res.json(leads);
});

// ===== GENERATE EMAIL =====
app.post("/generate-email", (req, res) => {

  const { company, market, stage, next_action } = req.body;

  let email = `Dear ${company} Team,\n\n`;

  // ===== NEGOTIATION =====
  if (stage === "NEGOTIATION") {
    email += `Following our ongoing discussions regarding the ${market} market, we would like to proceed with the next steps.\n\n`;

    if (next_action === "Request forecast") {
      email += `Kindly share your expected forecast volumes and initial order planning, so we can evaluate the structure of our potential cooperation.\n\n`;
    }

    if (next_action === "Send price list") {
      email += `We would be pleased to share our pricing structure. Please confirm your expected volumes and positioning so we can align accordingly.\n\n`;
    }
  }

  // ===== FIRST CONTACT =====
  if (stage === "FIRST CONTACT") {
    email += `It was a pleasure connecting with you.\n\n`;
    email += `We are a Swiss company specialized in premium aesthetic medical solutions and we are currently expanding in the ${market} market.\n\n`;
    email += `I would be glad to introduce our portfolio and explore a potential collaboration.\n\n`;
  }

  // ===== FOLLOW-UP =====
  if (stage === "FOLLOW-UP") {
    email += `I just wanted to follow up regarding our previous communication.\n\n`;
    email += `Please let me know if you had the opportunity to review the information shared.\n\n`;
  }

  // ===== DEFAULT =====
  if (email.trim() === `Dear ${company} Team,`) {
    email += `We would be pleased to explore a potential collaboration with your company.\n\n`;
  }

  // ===== SIGNATURE =====
  email += `Best regards,\n`;
  email += `Swiss Scientific Lab\n\n`;
  email += `Giancarlo Bonagura\n`;
  email += `Key Account Manager\n\n`;
  email += `SWISS SCIENTIFIC LAB GmbH\n`;
  email += `Viale Carlo Cattaneo, 21\n`;
  email += `6900 Lugano – Switzerland\n\n`;
  email += `Telephone +41 76 510 06 29\n`;
  email += `Personal +39 331 800 4630\n`;
  email += `Website https://swissscientificlab.ch\n`;
  email += `Instagram @swiss_scientific_lab\n`;
  email += `Facebook Swiss Scientific Lab GmbH`;

  res.json({ email });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
