const express = require("express");
const cors = require("cors");
require("dotenv").config();

const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AUTO CRM ACTIVE");
});

// ===== EMAIL CLEANER =====
function cleanText(text) {
  if (!text) return "";

  return text
    .replace(/On .* wrote:/gi, "")
    .replace(/From:.*\n/gi, "")
    .replace(/Sent:.*\n/gi, "")
    .replace(/Subject:.*\n/gi, "")
    .replace(/-----Original Message-----/gi, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 2000);
}

// ===== LOGIC ENGINE =====
function analyzeEmail(subject, text) {

  subject = subject.toLowerCase();
  text = text.toLowerCase();

  let stage = "FIRST CONTACT";
  let next_action = "Send introduction email";
  let status = "➡️ NOI";
  let score = 50;
  let alerts = [];

  if (text.includes("nda") || subject.includes("nda")) {
    stage = "NEGOTIATION";
    next_action = "Follow NDA completion";
    score = 75;
  }

  if (text.includes("forecast")) {
    stage = "NEGOTIATION";
    next_action = "Review forecast";
    score = 85;
  }

  if (text.includes("price") || text.includes("quotation")) {
    stage = "NEGOTIATION";
    next_action = "Send pricing";
    score = 80;
  }

  if (text.includes("exclusive")) {
    alerts.push("⚠️ Exclusivity risk");
    score += 5;
  }

  if (text.includes("thank you") || text.includes("please let me know")) {
    status = "⏳ LORO";
    stage = "FOLLOW-UP";
    next_action = "Follow-up";
    score = 60;
  }

  return { stage, next_action, status, score, alerts };
}

// ===== AUTO CRM =====
app.get("/auto-leads", async (req, res) => {

  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: "mail.swissscientificlab.ch",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  };

  try {
    const connection = await imaps.connect(config);

    // 🔥 LEGGIAMO SOLO INBOX + ARCHIVE (più stabile)
    await connection.openBox("INBOX");

    const messages = await connection.search(
      ['ALL'],
      { bodies: [""], struct: true }
    );

    let leads = [];

    for (let item of messages.slice(-50)) { // ultime 50 email

      let part = item.parts.find(p => p.which === "");
      if (!part) continue;

      let parsed = await simpleParser(part.body);

      let subject = parsed.subject || "";
      let text = cleanText(parsed.text || "");

      let from = parsed.from?.text || "Unknown";

      // 👉 estrai nome azienda
      let company = from.split("<")[0].trim();

      let analysis = analyzeEmail(subject, text);

      leads.push({
        company,
        market: "AUTO",
        ...analysis,
        last_email: subject,
        date: parsed.date || ""
      });
    }

    res.json(leads);

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== START =====
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
