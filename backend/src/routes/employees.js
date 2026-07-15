const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

function toPublic(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    role: row.role,
    supervisorId: row.supervisor_id,
    defaultLanguage: row.default_language,
    active: !!row.active,
  };
}

// Mindenki lekérheti a listát (a UI-nak szüksége van rá pl. csoportvezető kiválasztásához),
// de csak a szükséges mezőket kapja meg — jelszó-hash soha nem kerül ki.
router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM employees WHERE active = 1 ORDER BY name").all();
  res.json(rows.map(toPublic));
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, code, role, supervisorId, password, defaultLanguage } = req.body || {};
  if (!name || !code || !role || !password) {
    return res.status(400).json({ error: "Név, kód, szerepkör és jelszó megadása kötelező." });
  }
  if (!["employee", "supervisor", "admin", "superadmin"].includes(role)) {
    return res.status(400).json({ error: "Érvénytelen szerepkör." });
  }
  if (role === "superadmin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Csak super admin hozhat létre másik super admin felhasználót." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "A jelszónak legalább 6 karakter hosszúnak kell lennie." });
  }
  const dup = db.prepare("SELECT id FROM employees WHERE code = ?").get(code);
  if (dup) return res.status(409).json({ error: "Ez a dolgozói kód már foglalt." });

  const row = {
    id: uuid(),
    name,
    code,
    password_hash: bcrypt.hashSync(password, 10),
    role,
    supervisor_id: role === "employee" ? supervisorId || null : null,
    default_language: defaultLanguage || "hu",
    created_at: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO employees (id, name, code, password_hash, role, supervisor_id, default_language, active, created_at)
    VALUES (@id, @name, @code, @password_hash, @role, @supervisor_id, @default_language, 1, @created_at)
  `).run(row);

  res.status(201).json(toPublic({ ...row, active: 1 }));
});

// Meglévő felhasználó adatainak szerkesztése (pl. név, dolgozói kód, szerepkör).
router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const emp = db.prepare("SELECT * FROM employees WHERE id = ?").get(id);
  if (!emp) return res.status(404).json({ error: "Felhasználó nem található." });

  const { name, code, role, supervisorId, defaultLanguage } = req.body || {};
  if (role && !["employee", "supervisor", "admin", "superadmin"].includes(role)) {
    return res.status(400).json({ error: "Érvénytelen szerepkör." });
  }
  if (role === "superadmin" && emp.role !== "superadmin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Csak super admin léptethet elő másik felhasználót super adminná." });
  }
  if (code && code !== emp.code) {
    const dup = db.prepare("SELECT id FROM employees WHERE code = ? AND id != ?").get(code, id);
    if (dup) return res.status(409).json({ error: "Ez a dolgozói kód már foglalt." });
  }

  const nextRole = role || emp.role;
  const updated = {
    name: name && name.trim() ? name.trim() : emp.name,
    code: code && code.trim() ? code.trim() : emp.code,
    role: nextRole,
    supervisor_id: nextRole === "employee" ? (supervisorId !== undefined ? supervisorId || null : emp.supervisor_id) : null,
    default_language: defaultLanguage || emp.default_language,
  };

  db.prepare(`
    UPDATE employees SET name=@name, code=@code, role=@role, supervisor_id=@supervisor_id, default_language=@default_language
    WHERE id=@id
  `).run({ ...updated, id });

  res.json(toPublic({ ...emp, ...updated, active: 1 }));
});

// Soft delete: inaktiválja a felhasználót, a korábbi bejegyzései és az auditnapló megmarad.
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: "Saját magadat nem távolíthatod el." });
  }
  const emp = db.prepare("SELECT id, role FROM employees WHERE id = ?").get(id);
  if (!emp) return res.status(404).json({ error: "Felhasználó nem található." });
  if (emp.role === "superadmin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Csak super admin távolíthat el másik super admint." });
  }

  db.prepare("UPDATE employees SET active = 0 WHERE id = ?").run(id);
  // A rá hivatkozó dolgozók csoportvezetőjét is felszabadítjuk, hogy ne mutasson inaktív vezetőre.
  db.prepare("UPDATE employees SET supervisor_id = NULL WHERE supervisor_id = ?").run(id);
  res.json({ ok: true });
});

module.exports = router;
