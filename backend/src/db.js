const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
require("dotenv").config();

const dbFile = process.env.DB_FILE || "./data/timesheet.db";
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee','supervisor','admin')),
  supervisor_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  default_language TEXT NOT NULL DEFAULT 'hu',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  worked_hours REAL NOT NULL,
  shift_code TEXT NOT NULL CHECK (shift_code IN ('day','night')),
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  plant_name TEXT NOT NULL,
  comment TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','approved','returned','corrected')),
  approved_by TEXT REFERENCES employees(id),
  approved_at TEXT,
  last_modified_by TEXT REFERENCES employees(id),
  last_modified_at TEXT,
  extra_allowance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_audit_log (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES timesheet_entries(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL REFERENCES employees(id),
  changed_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  old_value_json TEXT NOT NULL,
  new_value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_employee ON timesheet_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_entries_status ON timesheet_entries(status);
CREATE INDEX IF NOT EXISTS idx_audit_entry ON entry_audit_log(entry_id);
`);

// Migráció: extra_allowance oszlop pótlása már létező adatbázisokon
// (a fenti CREATE TABLE IF NOT EXISTS nem érinti a már létrehozott táblát).
const entryCols = db.prepare("PRAGMA table_info(timesheet_entries)").all().map((c) => c.name);
if (!entryCols.includes("extra_allowance")) {
  db.exec("ALTER TABLE timesheet_entries ADD COLUMN extra_allowance REAL NOT NULL DEFAULT 0");
}

// Default settings if missing
const defaults = { allowance_per_day: "4500", expected_monthly_hours: "168" };
const upsert = db.prepare(
  "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING"
);
for (const [k, v] of Object.entries(defaults)) upsert.run(k, v);

module.exports = db;
