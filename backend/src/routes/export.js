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
    expectedMonthlyHours: Number(out.expected_monthly_hours || 168),
  };
}

// Hány naptári hónapot fed le a [from, to] tartomány (ÉÉÉÉ-HH formátumban), végpontokkal együtt.
function monthsInRange(from, to) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

function buildRows(from, to, group) {
  const settings = getSettings();
  let employees = db.prepare("SELECT * FROM employees WHERE active = 1 AND role NOT IN ('admin', 'superadmin', 'payroll')").all();
  if (group && group !== "all") employees = employees.filter((e) => e.supervisor_id === group);

  const months = monthsInRange(from, to);
  const expectedHours = settings.expectedMonthlyHours * months;

  const allEntries = db.prepare("SELECT * FROM timesheet_entries").all()
    .filter((e) => { const m = e.work_date.slice(0, 7); return m >= from && m <= to; });
  const employeeById = new Map(db.prepare("SELECT * FROM employees").all().map((e) => [e.id, e]));

  return employees.map((emp) => {
    const empEntries = allEntries.filter(
      (e) => e.employee_id === emp.id && (e.status === "approved" || e.status === "corrected")
    );
    const worked = Math.round(empEntries.reduce((s, e) => s + e.worked_hours, 0) * 100) / 100;
    const diff = Math.round((expectedHours - worked) * 100) / 100;
    const perDiemDays = new Set(empEntries.filter((e) => e.per_diem).map((e) => e.work_date)).size;
    const extraAllowanceHours = Math.round(empEntries.reduce((s, e) => s + (e.extra_allowance_hours || 0), 0) * 100) / 100;
    const extraAllowancePercent = extraAllowanceHours > 0
      ? Math.round((empEntries.reduce((s, e) => s + (e.extra_allowance || 0) * (e.extra_allowance_hours || 0), 0) / extraAllowanceHours) * 100) / 100
      : 0;
    const approverIds = [...new Set(empEntries.map((e) => e.approved_by).filter(Boolean))];
    const approverName = approverIds.length ? employeeById.get(approverIds[0])?.name || "" : "";
    const mods = empEntries.filter((e) => e.last_modified_at).sort((a, b) => (a.last_modified_at < b.last_modified_at ? 1 : -1));
    const lastMod = mods[0];

    return {
      name: emp.name,
      expected: expectedHours,
      worked,
      diff,
      perDiemDays,
      extraAllowancePercent,
      extraAllowanceHours,
      approverName,
      lastModDate: lastMod ? lastMod.last_modified_at.slice(0, 10) : "",
      lastModBy: lastMod ? employeeById.get(lastMod.last_modified_by)?.name || "" : "",
    };
  });
}

const HEADERS = ["Name", "Expected monthly hours", "Worked hours", "Difference", "Per diem days", "Extra allowance (weighted avg. %)", "Extra allowance hours", "Approver name", "Last modified date", "Last modified by"];
const XLSX_HEADERS = ["Name", "Expected monthly hours", "Worked hours", "Difference", "Per diem days", "Per diem rate (EUR)", "Per diem total (EUR)", "Extra allowance (weighted avg. %)", "Extra allowance hours", "Approver name", "Last modified date", "Last modified by"];

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[";\n,]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function parseRange(query) {
  const { from, to, month } = query;
  // Visszafelé kompatibilitás: ha csak a régi 'month' paramétert kapjuk, azt használjuk mindkét végpontnak.
  const fromMonth = from || month;
  const toMonth = to || month;
  if (!fromMonth || !toMonth) return null;
  return { fromMonth, toMonth };
}

router.get("/csv", requireAuth, requireRole("admin", "payroll"), (req, res) => {
  const range = parseRange(req.query);
  if (!range) return res.status(400).json({ error: "The 'from' and 'to' parameters (YYYY-MM) are required." });
  const { fromMonth, toMonth } = range;

  const rows = buildRows(fromMonth, toMonth, req.query.group);
  const lines = [HEADERS.map(csvEscape).join(",")];
  rows.forEach((r) => {
    lines.push([r.name, r.expected, r.worked, r.diff, r.perDiemDays, r.extraAllowancePercent, r.extraAllowanceHours, r.approverName, r.lastModDate, r.lastModBy].map(csvEscape).join(","));
  });

  const rangeLabel = fromMonth === toMonth ? fromMonth : `${fromMonth}_to_${toMonth}`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="timesheet_${rangeLabel}.csv"`);
  res.send("﻿" + lines.join("\n"));
});

router.get("/xlsx", requireAuth, requireRole("admin", "payroll"), async (req, res) => {
  const range = parseRange(req.query);
  if (!range) return res.status(400).json({ error: "The 'from' and 'to' parameters (YYYY-MM) are required." });
  const { fromMonth, toMonth } = range;

  const rows = buildRows(fromMonth, toMonth, req.query.group);
  const rangeLabel = fromMonth === toMonth ? fromMonth : `${fromMonth}_to_${toMonth}`;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(rangeLabel);
  ws.addRow(XLSX_HEADERS);
  ws.getRow(1).font = { bold: true };
  // A "Per diem rate" oszlopot a bérszámfejtő tölti ki, a "Per diem total" pedig
  // élő Excel-képlettel (napok × ráta) számolja ki magától, ha a ráta megváltozik.
  rows.forEach((r) => {
    const rowNumber = ws.rowCount + 1;
    ws.addRow([
      r.name, r.expected, r.worked, r.diff, r.perDiemDays, null,
      { formula: `E${rowNumber}*F${rowNumber}` },
      r.extraAllowancePercent, r.extraAllowanceHours, r.approverName, r.lastModDate, r.lastModBy,
    ]);
  });
  ws.columns.forEach((col) => (col.width = 22));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="timesheet_${rangeLabel}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
