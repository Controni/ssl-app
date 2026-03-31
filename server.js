const express = require("express");

const app = express();
const cors = require("cors");

app.use(cors({
  origin: "*",
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());
