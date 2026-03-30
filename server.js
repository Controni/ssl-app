const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
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

// SEND EMAIL
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

app.listen(3000, () => console.log("Server running on 3000"));
