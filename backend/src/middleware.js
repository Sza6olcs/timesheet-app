const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Hiányzó hitelesítés." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, code, name, role, supervisorId }
    next();
  } catch {
    return res.status(401).json({ error: "Érvénytelen vagy lejárt munkamenet." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    // A superadmin minden szerepkör-ellenőrzésen átjut — ő az admin jogkör szuperhalmaza.
    if (!req.user || (req.user.role !== "superadmin" && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: "Nincs jogosultságod ehhez a művelethez." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
