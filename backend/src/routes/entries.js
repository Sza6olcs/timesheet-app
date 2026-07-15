const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

function toPublic(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.work_date,
    start: row.start_time,
    end: row.end_time,
    hours: row.worked_hours,
    shift: row.shift_code,
    country: row.country,
    city: row.city,
    plant: row.plant_name,
    comment: row.comment,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    lastModifiedBy: row.last_modified_by,
    lastModifiedAt: row.last_modified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function computeHours(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function getEmployee(id) {
  return db.prepare("SELECT * FROM employees WHERE id = ?").get(id);
}

// true, ha a bejelentkezett vezető/admin láthatja/kezelheti a targetEmployeeId dolgozó rekordjait
function canManage(user, targetEmployeeId) {
  if (user.role === "admin") return true;
  if (user.role === "supervisor") {
    const target = getEmployee(targetEmployeeId);
    return !!target && target.supervisor_id === user.id;
  }
  return false;
}

router.get("/", requireAuth, (req, res) => {
  const { employeeId, month, status } = req.query;
  let rows = db.prepare("SELECT * FROM timesheet_entries ORDER BY work_date DESC").all();

  if (req.user.role === "employee") {
    rows = rows.filter((r) => r.employee_id === req.user.id);
  } else if (req.user.role === "supervisor") {
    const teamIds = new Set(
      db.prepare("SELECT id FROM employees WHERE supervisor_id = ?").all(req.user.id).map((e) => e.id)
    );
    rows = rows.filter((r) => teamIds.has(r.employee_id) || r.employee_id === req.user.id);
  }
  // admin: no filtering by ownership

  if (employeeId) rows = rows.filter((r) => r.employee_id === employeeId);
  if (month) rows = rows.filter((r) => r.work_date.slice(0, 7) === month);
  if (status) rows = rows.filter((r) => r.status === status);

  res.json(rows.map(toPublic));
});

router.post("/", requireAuth, (req, res) => {
  const { date, start, end, shift, country, city, plant, comment, submit } = req.body || {};
  if (!date || !start || !end || !shift || !country || !city || !plant) {
    return res.status(400).json({ error: "Hiányzó kötelező mező." });
  }
  const now = new Date().toISOString();
  const row = {
    id: uuid(),
    employee_id: req.user.id,
    work_date: date,
    start_time: start,
    end_time: end,
    worked_hours: computeHours(start, end),
    shift_code: shift,
    country,
    city,
    plant_name: plant,
    comment: comment || "",
    status: submit ? "submitted" : "draft",
    approved_by: null,
    approved_at: null,
    last_modified_by: null,
    last_modified_at: null,
    created_at: now,
    updated_at: now,
  };
  db.prepare(`
    INSERT INTO timesheet_entries
      (id, employee_id, work_date, start_time, end_time, worked_hours, shift_code, country, city, plant_name, comment, status, approved_by, approved_at, last_modified_by, last_modified_at, created_at, updated_at)
    VALUES
      (@id, @employee_id, @work_date, @start_time, @end_time, @worked_hours, @shift_code, @country, @city, @plant_name, @comment, @status, @approved_by, @approved_at, @last_modified_by, @last_modified_at, @created_at, @updated_at)
  `).run(row);

  res.status(201).json(toPublic(row));
});

// Piszkozat szerkesztése / beküldése a tulajdonos dolgozó által (csak draft vagy returned állapotból)
router.patch("/:id", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Bejegyzés nem található." });
  if (existing.employee_id !== req.user.id) return res.status(403).json({ error: "Nincs jogosultságod ehhez a bejegyzéshez." });
  if (!["draft", "returned"].includes(existing.status)) {
    return res.status(409).json({ error: "Csak piszkozat vagy visszaküldött bejegyzés szerkeszthető." });
  }

  const { date, start, end, shift, country, city, plant, comment, submit } = req.body || {};
  const now = new Date().toISOString();
  const updated = {
    work_date: date ?? existing.work_date,
    start_time: start ?? existing.start_time,
    end_time: end ?? existing.end_time,
    shift_code: shift ?? existing.shift_code,
    country: country ?? existing.country,
    city: city ?? existing.city,
    plant_name: plant ?? existing.plant_name,
    comment: comment ?? existing.comment,
    status: submit ? "submitted" : "draft",
    updated_at: now,
  };
  updated.worked_hours = computeHours(updated.start_time, updated.end_time);

  db.prepare(`
    UPDATE timesheet_entries SET
      work_date=@work_date, start_time=@start_time, end_time=@end_time, worked_hours=@worked_hours,
      shift_code=@shift_code, country=@country, city=@city, plant_name=@plant_name, comment=@comment,
      status=@status, updated_at=@updated_at
    WHERE id = @id
  `).run({ ...updated, id: req.params.id });

  res.json(toPublic(db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id)));
});

router.post("/:id/approve", requireAuth, requireRole("supervisor", "admin"), (req, res) => {
  const existing = db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Bejegyzés nem található." });
  if (!canManage(req.user, existing.employee_id)) return res.status(403).json({ error: "Nem a te csapatod bejegyzése." });
  if (existing.status !== "submitted") return res.status(409).json({ error: "Csak beküldött bejegyzés hagyható jóvá." });

  const now = new Date().toISOString();
  db.prepare("UPDATE timesheet_entries SET status='approved', approved_by=?, approved_at=?, updated_at=? WHERE id=?")
    .run(req.user.id, now, now, req.params.id);

  res.json(toPublic(db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id)));
});

router.post("/:id/return", requireAuth, requireRole("supervisor", "admin"), (req, res) => {
  const { reason } = req.body || {};
  if (!reason || !reason.trim()) return res.status(400).json({ error: "A visszaküldés indoklása kötelező." });

  const existing = db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Bejegyzés nem található." });
  if (!canManage(req.user, existing.employee_id)) return res.status(403).json({ error: "Nem a te csapatod bejegyzése." });
  if (existing.status !== "submitted") return res.status(409).json({ error: "Csak beküldött bejegyzés küldhető vissza." });

  const now = new Date().toISOString();
  db.prepare("UPDATE timesheet_entries SET status='returned', comment=?, updated_at=? WHERE id=?")
    .run(reason, now, req.params.id);

  db.prepare(`
    INSERT INTO entry_audit_log (id, entry_id, changed_by, changed_at, reason, old_value_json, new_value_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), req.params.id, req.user.id, now, reason, JSON.stringify({ status: existing.status }), JSON.stringify({ status: "returned" }));

  res.json(toPublic(db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id)));
});

// Jóváhagyott/javított rekord utólagos korrekciója — csak vezető/admin, kötelező indoklással
router.post("/:id/correct", requireAuth, requireRole("supervisor", "admin"), (req, res) => {
  const { date, start, end, shift, country, city, plant, reason } = req.body || {};
  if (!reason || !reason.trim()) return res.status(400).json({ error: "A javítás indoklása kötelező." });

  const existing = db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Bejegyzés nem található." });
  if (!canManage(req.user, existing.employee_id)) return res.status(403).json({ error: "Nem a te csapatod bejegyzése." });
  if (!["approved", "corrected"].includes(existing.status)) {
    return res.status(409).json({ error: "Csak jóváhagyott vagy korábban javított rekord javítható." });
  }

  const oldValue = {
    date: existing.work_date, start: existing.start_time, end: existing.end_time,
    shift: existing.shift_code, country: existing.country, city: existing.city, plant: existing.plant_name,
  };
  const newValue = {
    date: date ?? existing.work_date,
    start: start ?? existing.start_time,
    end: end ?? existing.end_time,
    shift: shift ?? existing.shift_code,
    country: country ?? existing.country,
    city: city ?? existing.city,
    plant: plant ?? existing.plant_name,
  };
  const hours = computeHours(newValue.start, newValue.end);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE timesheet_entries SET
      work_date=@date, start_time=@start, end_time=@end, worked_hours=@hours, shift_code=@shift,
      country=@country, city=@city, plant_name=@plant, status='corrected',
      last_modified_by=@userId, last_modified_at=@now, updated_at=@now
    WHERE id=@id
  `).run({ ...newValue, hours, userId: req.user.id, now, id: req.params.id });

  db.prepare(`
    INSERT INTO entry_audit_log (id, entry_id, changed_by, changed_at, reason, old_value_json, new_value_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), req.params.id, req.user.id, now, reason, JSON.stringify(oldValue), JSON.stringify(newValue));

  res.json(toPublic(db.prepare("SELECT * FROM timesheet_entries WHERE id = ?").get(req.params.id)));
});

module.exports = router;
