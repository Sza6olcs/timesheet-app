require("dotenv").config();
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const db = require("./db");

const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin1234";

const existing = db.prepare("SELECT COUNT(*) AS n FROM employees").get();
if (existing.n > 0) {
  console.log("Már vannak felhasználók az adatbázisban — seed kihagyva.");
  process.exit(0);
}

const insert = db.prepare(`
  INSERT INTO employees (id, name, code, password_hash, role, supervisor_id, default_language, active, created_at)
  VALUES (@id, @name, @code, @password_hash, @role, @supervisor_id, @default_language, 1, @created_at)
`);

const now = new Date().toISOString();
const hash = (pw) => bcrypt.hashSync(pw, 10);

const admin = { id: uuid(), name: "Kovács Katalin", code: "E-1001", password_hash: hash(adminPassword), role: "admin", supervisor_id: null, default_language: "hu", created_at: now };
const sup1 = { id: uuid(), name: "Nagy Péter", code: "E-1002", password_hash: hash("supervisor123"), role: "supervisor", supervisor_id: null, default_language: "hu", created_at: now };
const sup2 = { id: uuid(), name: "Szabó Anna", code: "E-1003", password_hash: hash("supervisor123"), role: "supervisor", supervisor_id: null, default_language: "hu", created_at: now };

const employees = [
  admin,
  sup1,
  sup2,
  { id: uuid(), name: "Tóth Bence", code: "E-1004", password_hash: hash("employee123"), role: "employee", supervisor_id: sup1.id, default_language: "hu", created_at: now },
  { id: uuid(), name: "Varga Eszter", code: "E-1005", password_hash: hash("employee123"), role: "employee", supervisor_id: sup1.id, default_language: "hu", created_at: now },
  { id: uuid(), name: "Kiss Márk", code: "E-1006", password_hash: hash("employee123"), role: "employee", supervisor_id: sup1.id, default_language: "hu", created_at: now },
  { id: uuid(), name: "Molnár Zsófia", code: "E-1007", password_hash: hash("employee123"), role: "employee", supervisor_id: sup2.id, default_language: "hu", created_at: now },
  { id: uuid(), name: "Horváth Gábor", code: "E-1008", password_hash: hash("employee123"), role: "employee", supervisor_id: sup2.id, default_language: "hu", created_at: now },
];

const insertAll = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});
insertAll(employees);

console.log("Seed kész. Bejelentkezési adatok:");
console.log("  Admin:       E-1001 /", adminPassword);
console.log("  Vezető 1:    E-1002 / supervisor123");
console.log("  Vezető 2:    E-1003 / supervisor123");
console.log("  Dolgozók:    E-1004..E-1008 / employee123");
