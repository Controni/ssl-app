const express = require("express");
const cors = require("cors");
require("dotenv").config();

const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

const app = express();

// ===== MIDDLEWARE =====
app.use(cors({ origin: "*" }));
app.use(express.json());

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("SSL ADVANCED SERVER OK");
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// ===== LEADS =====
const leads = require("./leads.json");

app.get("/leads", (req, res) => {
  res.json(leads);
});

// ===== EMAIL ENGINE =====
app.post("/generate-email", (req, res) => {

  const { company, market, stage, next_action, alerts, score, status } = req.body;

  let email = `Dear ${company} Team,\n\n`;

  let urgency = false;
  let competitive = false;

  if (alerts && alerts.some(a => a.includes("Exclusivity"))) {
    competitive = true;
  }

  if (score >= 70) urgency = true;
  if (status && status.includes("➡️ NOI")) urgency = true;

  // NEGOTIATION
  if (stage === "NEGOTIATION") {
    email += `Following our recent discussions regarding the ${market} market, we are now moving into the operational phase of partner selection.\n\n`;

    if (next_action === "Request forecast") {
      email += `To proceed with the evaluation, we kindly ask you to share your expected forecast volumes and initial order planning.\n\n`;
    }

    email += `This will allow us to assess alignment in terms of capacity allocation, pricing structure, and market positioning.\n\n`;

    if (competitive) {
      email += `Please note that we are currently evaluating multiple potential partners for this market, and timing will be a key factor in defining the final structure.\n\n`;
    }

    if (urgency) {
      email += `We would appreciate receiving your feedback in the coming days to proceed efficiently.\n\n`;
    }
  }

  // FIRST CONTACT
  else if (stage === "FIRST CONTACT") {
    email += `It was a pleasure connecting with you.\n\n`;
    email += `Swiss Scientific Lab is a Swiss-based company specialized in high-end aesthetic medical solutions, currently expanding into selected strategic markets such as ${market}.\n\n`;
    email += `Given your positioning, we believe there could be strong potential for a structured collaboration.\n\n`;
    email += `I would be glad to present our portfolio and explore how we could build a differentiated positioning together.\n\n`;
  }

  // FOLLOW-UP
  else if (stage === "FOLLOW-UP") {
    email += `I just wanted to follow up regarding our previous communication.\n\n`;

    if (urgency) {
      email += `As we are currently progressing with planning activities, your feedback would be important to align next steps.\n\n`;
    } else {
      email += `Please let me know if you had the opportunity to review the information shared.\n\n`;
    }
  }

  // DEFAULT
  else {
    email += `We would be pleased to explore a potential collaboration with your company in the ${market} market.\n\n`;
  }

  email += `I remain available for a short call to align on the next steps.\n\n`;

  // SIGNATURE
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

// ===== IMAP FETCH EMAILS (FIX TLS) =====
app.get("/fetch-emails", async (req, res) => {

  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: "mail.swissscientificlab.ch",
      port: 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: {
        rejectUnauthorized: false
      }
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const messages = await connection.search(["UNSEEN"], {
      bodies: [""],
      markSeen: false
    });

    let emails = [];

    for (let item of messages) {
      let all = item.parts.find(part => part.which === "");
      let parsed = await simpleParser(all.body);

      emails.push({
        from: parsed.from?.text || "",
        subject: parsed.subject || "",
        date: parsed.date || "",
        text: parsed.text || ""
      });
    }

    res.json(emails);

  } catch (err) {
    console.error("IMAP FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== START =====
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
