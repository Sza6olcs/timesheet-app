const express = require("express");
const ExcelJS = require("exceljs");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

function getSettings() {
  const rows = db.prepare("SELECT key, value FROM app_settings").all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value));
  return {
    allowancePerDay: Number(out.allowance_per_day || 4500),
    expectedMonthlyHours: Number(out.expected_monthly_hours || 168),
  };
}

function buildRows(month, group) {
  const settings = getSettings();
  let employees = db.prepare("SELECT * FROM employees WHERE active = 1 AND role != 'admin'").all();
  if (group && group !== "all") employees = employees.filter((e) => e.supervisor_id === group);

  const allEntries = db.prepare("SELECT * FROM timesheet_entries WHERE work_date LIKE ?").all(`${month}%`);
  const employeeById = new Map(db.prepare("SELECT * FROM employees").all().map((e) => [e.id, e]));

  return employees.map((emp) => {
    const empEntries = allEntries.filter(
      (e) => e.employee_id === emp.id && (e.status === "approved" || e.status === "corrected")
    );
    const worked = Math.round(empEntries.reduce((s, e) => s + e.worked_hours, 0) * 100) / 100;
    const diff = Math.round((settings.expectedMonthlyHours - worked) * 100) / 100;
    const days = new Set(empEntries.map((e) => e.work_date)).size;
    const allowance = days * settings.allowancePerDay;
    const approverIds = [...new Set(empEntries.map((e) => e.approved_by).filter(Boolean))];
    const approverName = approverIds.length ? employeeById.get(approverIds[0])?.name || "" : "";
    const mods = empEntries.filter((e) => e.last_modified_at).sort((a, b) => (a.last_modified_at < b.last_modified_at ? 1 : -1));
    const lastMod = mods[0];

    return {
      name: emp.name,
      expected: settings.expectedMonthlyHours,
      worked,
      diff,
      allowance,
      approverName,
      lastModDate: lastMod ? lastMod.last_modified_at.slice(0, 10) : "",
      lastModBy: lastMod ? employeeById.get(lastMod.last_modified_by)?.name || "" : "",
    };
  });
}

const HEADERS = ["Név", "Havi várható munkaidő", "Ledolgozott órák", "Különbség", "Napidíj", "Jóváhagyó neve", "Utolsó módosítás dátuma", "Utolsó módosítást végző"];

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[";\n,]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

router.get("/csv", requireAuth, requireRole("admin"), (req, res) => {
  const { month, group } = req.query;
  if (!month) return res.status(400).json({ error: "A 'month' paraméter (ÉÉÉÉ-HH) kötelező." });

  const rows = buildRows(month, group);
  const lines = [HEADERS.map(csvEscape).join(",")];
  rows.forEach((r) => {
    lines.push([r.name, r.expected, r.worked, r.diff, r.allowance, r.approverName, r.lastModDate, r.lastModBy].map(csvEscape).join(","));
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="timesheet_${month}.csv"`);
  res.send("\uFEFF" + lines.join("\n"));
});

router.get("/xlsx", requireAuth, requireRole("admin"), async (req, res) => {
  const { month, group } = req.query;
  if (!month) return res.status(400).json({ error: "A 'month' paraméter (ÉÉÉÉ-HH) kötelező." });

  const rows = buildRows(month, group);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(month);
  ws.addRow(HEADERS);
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => {
    ws.addRow([r.name, r.expected, r.worked, r.diff, r.allowance, r.approverName, r.lastModDate, r.lastModBy]);
  });
  ws.columns.forEach((col) => (col.width = 22));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="timesheet_${month}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
