const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM app_settings").all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value));
  res.json({
    allowancePerDay: Number(out.allowance_per_day || 4500),
    expectedMonthlyHours: Number(out.expected_monthly_hours || 168),
  });
});

router.put("/", requireAuth, requireRole("admin"), (req, res) => {
  const { allowancePerDay, expectedMonthlyHours } = req.body || {};
  const upsert = db.prepare(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  if (allowancePerDay !== undefined) {
    const val = Math.max(0, Number(allowancePerDay) || 0);
    upsert.run("allowance_per_day", String(val));
  }
  if (expectedMonthlyHours !== undefined) {
    const val = Math.max(0, Number(expectedMonthlyHours) || 0);
    upsert.run("expected_monthly_hours", String(val));
  }
  const rows = db.prepare("SELECT key, value FROM app_settings").all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value));
  res.json({
    allowancePerDay: Number(out.allowance_per_day),
    expectedMonthlyHours: Number(out.expected_monthly_hours),
  });
});

module.exports = router;
