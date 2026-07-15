const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

let token = localStorage.getItem("timesheet_token") || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("timesheet_token", t);
  else localStorage.removeItem("timesheet_token");
}

export function getToken() {
  return token;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    const err = new Error("Lejárt munkamenet, jelentkezz be újra.");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  if (!res.ok) {
    let msg = "Ismeretlen hiba történt.";
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function requestBlob(path) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error("Az export nem sikerült.");
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : "export";
  const blob = await res.blob();
  return { blob, filename };
}

export const api = {
  login: (code, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ code, password }) }),
  me: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  listEmployees: () => request("/employees"),
  addEmployee: (payload) => request("/employees", { method: "POST", body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) => request(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),

  listEntries: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/entries${qs ? `?${qs}` : ""}`);
  },
  createEntry: (payload) => request("/entries", { method: "POST", body: JSON.stringify(payload) }),
  updateEntry: (id, payload) => request(`/entries/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  approveEntry: (id) => request(`/entries/${id}/approve`, { method: "POST" }),
  returnEntry: (id, reason) => request(`/entries/${id}/return`, { method: "POST", body: JSON.stringify({ reason }) }),
  correctEntry: (id, payload) => request(`/entries/${id}/correct`, { method: "POST", body: JSON.stringify(payload) }),

  auditLog: () => request("/audit-log"),

  getSettings: () => request("/settings"),
  updateSettings: (payload) => request("/settings", { method: "PUT", body: JSON.stringify(payload) }),

  exportCsv: (month, group) => requestBlob(`/export/csv?month=${month}${group && group !== "all" ? `&group=${group}` : ""}`),
  exportXlsx: (month, group) => requestBlob(`/export/xlsx?month=${month}${group && group !== "all" ? `&group=${group}` : ""}`),
};

export function downloadBlob({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
