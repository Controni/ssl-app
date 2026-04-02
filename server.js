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
  res.send("SSL CRM LIVE");
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  res.json({ success: true });
});

// ===== AUTO CRM (SMART VERSION) =====
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

        // 👉 SOLO cartelle con clienti
        if (fullName.includes(" - ")) {

          let parts = fullName.split(" - ");
          let market = parts[0]?.replace("INBOX.Archive.", "").trim();
          let company = parts[1]?.trim();

          try {
            await connection.openBox(fullName);

            // 👉 SOLO ultimi 7 giorni
            const messages = await connection.search(
              ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)],
              {
                bodies: [""],
                struct: true
              }
            );

            if (!messages || messages.length === 0) continue;

            // 👉 prendi email più rilevante
            let last = messages.reverse().find(m => {
              let part = m.parts.find(p => p.which === "");
              return part && part.body && part.body.length > 50;
            }) || messages[messages.length - 1];

            let part = last.parts.find(p => p.which === "");
            let parsed = await simpleParser(part.body);

            let subject = parsed.subject || "";
            let text = (parsed.text || "").toLowerCase();

            // ===== LOGICA INTELLIGENTE (NO AI) =====

            let stage = "FIRST CONTACT";
            let next_action = "Send introduction email";
            let status = "➡️ NOI";
            let score = 50;
            let alerts = [];

            if (
              text.includes("nda") ||
              text.includes("agreement") ||
              subject.toLowerCase().includes("nda")
            ) {
              stage = "NEGOTIATION";
              next_action = "Follow NDA completion";
              score = 75;
            }

            if (
              text.includes("forecast") ||
              subject.toLowerCase().includes("forecast")
            ) {
              stage = "NEGOTIATION";
              next_action = "Review forecast & propose order";
              score = 85;
            }

            if (
              text.includes("price") ||
              text.includes("pricing") ||
              text.includes("quotation")
            ) {
              stage = "NEGOTIATION";
              next_action = "Send pricing / negotiate";
              score = 80;
            }

            if (
              text.includes("call") ||
              text.includes("meeting")
            ) {
              stage = "NEGOTIATION";
              next_action = "Schedule call";
              score = 80;
            }

            if (
              text.includes("thank you") ||
              text.includes("please let me know")
            ) {
              stage = "FOLLOW-UP";
              next_action = "Follow-up email";
              status = "⏳ LORO";
              score = 60;
            }

            if (
              text.includes("exclusive") ||
              text.includes("exclusivity")
            ) {
              alerts.push("⚠️ Exclusivity risk");
              score += 5;
            }

            leads.push({
              company,
              market,
              stage,
              next_action,
              status,
              score,
              alerts,
              last_email: subject,
              date: parsed.date || ""
            });

          } catch (e) {
            console.log("Skip:", fullName);
          }
        }

        // recursion subfolders
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
