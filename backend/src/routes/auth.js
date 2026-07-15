const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware");

const router = express.Router();

router.post("/login", (req, res) => {
  const { code, password } = req.body || {};
  if (!code || !password) return res.status(400).json({ error: "Add meg a felhasználói kódot és a jelszót." });

  const emp = db.prepare("SELECT * FROM employees WHERE code = ? AND active = 1").get(code);
  if (!emp) return res.status(401).json({ error: "Hibás felhasználói kód vagy jelszó." });

  const ok = bcrypt.compareSync(password, emp.password_hash);
  if (!ok) return res.status(401).json({ error: "Hibás felhasználói kód vagy jelszó." });

  const payload = { id: emp.id, code: emp.code, name: emp.name, role: emp.role, supervisorId: emp.supervisor_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

  res.json({ token, user: payload });
});

// Bejelentkezett felhasználó saját jelszavának megváltoztatása
router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Az új jelszónak legalább 6 karakter hosszúnak kell lennie." });
  }
  const emp = db.prepare("SELECT * FROM employees WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, emp.password_hash)) {
    return res.status(401).json({ error: "A jelenlegi jelszó nem megfelelő." });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE employees SET password_hash = ? WHERE id = ?").run(hash, req.user.id);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
