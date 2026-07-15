const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

function toPublic(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
    reason: row.reason,
    oldValue: JSON.parse(row.old_value_json),
    newValue: JSON.parse(row.new_value_json),
  };
}

// Admin mindent lát; a vezető csak a saját csapatára vonatkozó bejegyzések naplóját.
router.get("/", requireAuth, requireRole("supervisor", "admin"), (req, res) => {
  let rows = db.prepare("SELECT * FROM entry_audit_log ORDER BY changed_at DESC").all();

  if (req.user.role === "supervisor") {
    const teamIds = new Set(
      db.prepare("SELECT id FROM employees WHERE supervisor_id = ?").all(req.user.id).map((e) => e.id)
    );
    const entryOwner = new Map(
      db.prepare("SELECT id, employee_id FROM timesheet_entries").all().map((e) => [e.id, e.employee_id])
    );
    rows = rows.filter((r) => teamIds.has(entryOwner.get(r.entry_id)));
  }

  res.json(rows.map(toPublic));
});

module.exports = router;
