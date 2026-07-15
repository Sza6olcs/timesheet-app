const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const entryRoutes = require("./routes/entries");
const auditRoutes = require("./routes/audit");
const settingsRoutes = require("./routes/settings");
const exportRoutes = require("./routes/export");
const locationRoutes = require("./routes/locations");
const departmentRoutes = require("./routes/departments");

const app = express();

// Éles környezetben állítsd be a CORS_ORIGIN env változót a frontend valódi
// URL-jére (pl. https://timesheet.cegednev.hu), hogy csak onnan fogadjon kérést.
// Ha nincs beállítva, fejlesztés közben mindenhonnan fogad (kényelmi alapértelmezés).
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/audit-log", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/departments", departmentRoutes);

// Egységes hibakezelő
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Szerverhiba történt." });
});

module.exports = app;
