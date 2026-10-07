// 2D Lottery server: no installs needed, just Node 22.13 or newer.
// Run:  ADMIN_PASSWORD=yourpassword node server.js
const http = require("node:http"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";
const MAX_NUMBER = 40;
const DRAWS = ["morning", "afternoon", "night"];
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "lottery.db");

const db = new DatabaseSync(DB_FILE);
db.exec(`CREATE TABLE IF NOT EXISTS results (
  date TEXT NOT NULL, draw TEXT NOT NULL, n1 TEXT NOT NULL, n2 TEXT NOT NULL,
  PRIMARY KEY (date, draw))`);
const sessions = new Set();

function today() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function allResults() {
  const out = {};
  for (const r of db.prepare("SELECT date, draw, n1, n2 FROM results").all()) (out[r.date] ||= {})[r.draw] = [r.n1, r.n2];
  return out;
}
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise(ok => {
    let s = ""; req.on("data", c => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch { ok({}); } });
  });
}
const isAdmin = req => sessions.has((req.headers.authorization || "").replace("Bearer ", ""));

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/api/results" && req.method === "GET") return send(res, 200, allResults());

    if (url.pathname === "/api/login" && req.method === "POST") {
      const { password } = await body(req);
      const a = Buffer.from(String(password || "")), b = Buffer.from(ADMIN_PASSWORD);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: "Wrong password." });
      const t = crypto.randomUUID(); sessions.add(t); return send(res, 200, { token: t });
    }

    if (url.pathname === "/api/results" && req.method === "POST") {
      if (!isAdmin(req)) return send(res, 401, { error: "Please sign in again." });
      const { date, draws } = await body(req);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return send(res, 400, { error: "Choose a valid date." });
      if (date > today()) return send(res, 400, { error: "Future dates are not allowed." });
      const rows = [];
      for (const [k, v] of Object.entries(draws || {})) {
        if (!DRAWS.includes(k) || !Array.isArray(v) || v.length !== 2 || !v.every(n => /^\d{1,2}$/.test(String(n)) && +n <= MAX_NUMBER))
          return send(res, 400, { error: `Numbers must be 00 to ${MAX_NUMBER}.` });
        rows.push([k, ...v.map(n => String(n).padStart(2, "0"))]);
      }
      if (!rows.length) return send(res, 400, { error: "Enter at least one draw." });
      const up = db.prepare("INSERT OR REPLACE INTO results (date, draw, n1, n2) VALUES (?,?,?,?)");
      for (const r of rows) up.run(date, ...r);
      return send(res, 200, { ok: true });
    }

    if (url.pathname.startsWith("/api/results/") && req.method === "DELETE") {
      if (!isAdmin(req)) return send(res, 401, { error: "Please sign in again." });
      db.prepare("DELETE FROM results WHERE date = ?").run(url.pathname.split("/").pop());
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(__dirname, "public", "index.html")));
    }
    send(res, 404, { error: "Not found" });
  } catch (e) { console.error(e); send(res, 500, { error: "Server error." }); }
}).listen(PORT, () => {
  console.log(`Lottery running at http://localhost:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) console.log("Using the default admin password 'admin1234'. Set ADMIN_PASSWORD to change it.");
});
