const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

function toPublic(row) {
  return { id: row.id, name: row.name };
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM departments ORDER BY name").all();
  res.json(rows.map(toPublic));
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "A részleg nevének megadása kötelező." });
  }
  const row = { id: uuid(), name: name.trim(), created_at: new Date().toISOString() };
  db.prepare("INSERT INTO departments (id, name, created_at) VALUES (@id, @name, @created_at)").run(row);
  res.status(201).json(toPublic(row));
});

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Részleg nem található." });

  const { name } = req.body || {};
  const updatedName = name && name.trim() ? name.trim() : existing.name;
  db.prepare("UPDATE departments SET name = ? WHERE id = ?").run(updatedName, id);
  res.json(toPublic({ ...existing, name: updatedName }));
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT id FROM departments WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Részleg nem található." });
  db.prepare("DELETE FROM departments WHERE id = ?").run(id);
  res.json({ ok: true });
});

module.exports = router;
