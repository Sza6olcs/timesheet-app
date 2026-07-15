const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

function toPublic(row) {
  return {
    id: row.id,
    country: row.country,
    city: row.city,
    plant: row.plant_name,
  };
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM locations ORDER BY country, city, plant_name").all();
  res.json(rows.map(toPublic));
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { country, city, plant } = req.body || {};
  if (!country || !city || !plant) {
    return res.status(400).json({ error: "Ország, város és gyárnév megadása kötelező." });
  }
  const row = { id: uuid(), country, city, plant_name: plant, created_at: new Date().toISOString() };
  db.prepare(`
    INSERT INTO locations (id, country, city, plant_name, created_at) VALUES (@id, @country, @city, @plant_name, @created_at)
  `).run(row);
  res.status(201).json(toPublic(row));
});

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM locations WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Telephely nem található." });

  const { country, city, plant } = req.body || {};
  const updated = {
    country: country && country.trim() ? country.trim() : existing.country,
    city: city && city.trim() ? city.trim() : existing.city,
    plant_name: plant && plant.trim() ? plant.trim() : existing.plant_name,
  };
  db.prepare("UPDATE locations SET country=@country, city=@city, plant_name=@plant_name WHERE id=@id")
    .run({ ...updated, id });
  res.json(toPublic({ ...existing, ...updated }));
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT id FROM locations WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Telephely nem található." });
  db.prepare("DELETE FROM locations WHERE id = ?").run(id);
  res.json({ ok: true });
});

module.exports = router;
