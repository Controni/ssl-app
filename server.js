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
  res.send("SSL AI CRM DEBUG MODE");
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// ===== AI ANALYSIS (DEBUG) =====
async function analyzeEmailAI(text){

  try {

    console.log("------ AI INPUT START ------");
    console.log(text.substring(0, 500));
    console.log("------ AI INPUT END ------");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a senior B2B sales strategist.

Classify business emails:

- NDA, pricing, forecast → NEGOTIATION
- Follow-up → FOLLOW-UP
- Intro → FIRST CONTACT

Return ONLY JSON:

{
  "stage": "FIRST CONTACT | NEGOTIATION | FOLLOW-UP",
  "next_action": "action",
  "status": "➡️ NOI | ⏳ LORO",
  "score": number,
  "alerts": []
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

    const raw = response.choices[0].message.content;

    console.log("🔥 AI RAW RESPONSE:");
    console.log(raw);

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.log("❌ JSON PARSE ERROR:", err.message);
      return null;
    }

    return parsed;

  } catch (e) {
    console.log("🔥 AI FULL ERROR:");
    console.log(e);
    return null;
  }
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

            // ===== CONTEXT =====
            let subject = parsed.subject || "";
            let body = (parsed.text || "").slice(0, 1500);

            let fullContext = `
SUBJECT: ${subject}

EMAIL:
${body}
`;

            // ===== AI =====
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
