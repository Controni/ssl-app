const express = require("express");
const cors = require("cors");
require("dotenv").config();

const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const OpenAI = require("openai");

const app = express();

// ===== OPENAI =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== MIDDLEWARE =====
app.use(cors({ origin: "*" }));
app.use(express.json());

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("SSL AI CRM ACTIVE");
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// ===== AI ANALYSIS =====
async function analyzeEmailAI(text){

  try {

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a senior B2B sales strategist for a medical aesthetics company.

Your job is to understand REAL commercial intent from email conversations.

Classification rules:

- NDA, forecast, pricing, registration → NEGOTIATION
- Active discussion → NEGOTIATION
- Waiting reply → FOLLOW-UP
- First intro only → FIRST CONTACT

IMPORTANT:
Do NOT classify everything as FIRST CONTACT.

Return ONLY JSON:

{
  "stage": "FIRST CONTACT | NEGOTIATION | FOLLOW-UP",
  "next_action": "very specific action",
  "status": "➡️ NOI | ⏳ LORO",
  "score": number (0-100),
  "alerts": ["risks if any"]
}
`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content);

  } catch (e) {
    console.log("AI ERROR:", e.message);
    return null;
  }
}

// ===== EMAIL GENERATOR =====
app.post("/generate-email", (req, res) => {

  const { company, market, stage, next_action, alerts, score, status } = req.body;

  let email = `Dear ${company} Team,\n\n`;

  let urgency = score >= 70 || (status && status.includes("➡️ NOI"));
  let competitive = alerts && alerts.some(a => a.includes("Exclusivity"));

  if (stage === "NEGOTIATION") {
    email += `Following our recent discussions regarding the ${market} market, we are now moving into the operational phase of partner selection.\n\n`;

    if (next_action === "Send price list") {
      email += `Please find attached our preliminary pricing structure for your review.\n\n`;
    }

    if (next_action === "Schedule call") {
      email += `I would suggest scheduling a short call to align on strategy, positioning and regulatory aspects.\n\n`;
    }

    if (next_action === "Request forecast") {
      email += `To proceed with the evaluation, we kindly ask you to share your expected forecast volumes and initial order planning.\n\n`;
    }

    if (competitive) {
      email += `We are currently evaluating multiple partners for this market, and timing will be an important factor.\n\n`;
    }

    if (urgency) {
      email += `We would appreciate your feedback in the coming days to proceed efficiently.\n\n`;
    }
  }

  else if (stage === "FIRST CONTACT") {
    email += `It was a pleasure connecting with you.\n\n`;
    email += `Swiss Scientific Lab is a Swiss-based company specialized in premium aesthetic medical solutions.\n\n`;
    email += `We would be glad to introduce our portfolio and explore a potential collaboration in the ${market} market.\n\n`;
  }

  else if (stage === "FOLLOW-UP") {
    email += `I just wanted to follow up on our previous discussion.\n\n`;
    email += `Please let me know if you had the opportunity to review the information shared.\n\n`;
  }

  email += `I remain available for a short call to align on next steps.\n\n`;

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
    const boxes = await connection.getBoxes();

    let leads = [];

    async function scanBoxes(boxes, path = "") {
      for (let box in boxes) {

        let fullName = path ? `${path}${box}` : box;

        if (fullName.includes(" - ")) {

          let parts = fullName.split(" - ");
          let market = parts[0]?.trim();
          let company = parts[1]?.trim();

          try {
            await connection.openBox(fullName);

            const messages = await connection.search(["ALL"], {
              bodies: [""],
              struct: true
            });

            if (messages.length === 0) continue;

            let last = messages[messages.length - 1];
            let part = last.parts.find(p => p.which === "");
            let parsed = await simpleParser(part.body);

            // ===== FIX CONTEXT AI =====
            let subject = parsed.subject || "";
            let body = (parsed.text || "").slice(0, 1500);

            let fullContext = `
SUBJECT: ${subject}

EMAIL:
${body}
`;

            let ai = await analyzeEmailAI(fullContext);

            let stage = ai?.stage || "FIRST CONTACT";
            let next_action = ai?.next_action || "Send introduction email";
            let status = ai?.status || "➡️ NOI";
            let score = ai?.score || 50;
            let alerts = ai?.alerts || [];

            leads.push({
              company,
              market,
              stage,
              next_action,
              status,
              score,
              alerts,
              last_email: parsed.subject || "",
              date: parsed.date || ""
            });

          } catch (e) {
            console.log("Skip:", fullName);
          }
        }

        if (boxes[box].children) {
          await scanBoxes(boxes[box].children, fullName + ".");
        }
      }
    }

    await scanBoxes(boxes);

    res.json(leads);

  } catch (err) {
    console.error("AUTO CRM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== START =====
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
