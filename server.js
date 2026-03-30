const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.USER && password === process.env.PASS) {
    return res.json({ success: true, token: "ssl-token" });
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
    email += `Kindly share your expected forecast volumes and initial order planning, so we can evaluate the structure of our potential cooperation.\n\n`;
  }

  email += `We remain available to organize a call to align on all operational and regulatory aspects.\n\n`;
  email += `Best regards,\nSwiss Scientific Lab`;

  res.json({ email });
});

// SEND EMAIL (opzionale)
app.post("/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      host: "mail.swissscientificlab.ch",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: body
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
