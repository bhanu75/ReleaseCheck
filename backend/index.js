// backend/index.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── DB Init ──────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS releases (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      date        TIMESTAMPTZ NOT NULL,
      info        TEXT DEFAULT '',
      completed_steps INTEGER[] DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("DB ready");
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 9;

function computeStatus(completedSteps = []) {
  if (completedSteps.length === 0) return "planned";
  if (completedSteps.length >= TOTAL_STEPS) return "done";
  return "ongoing";
}

function toRelease(row) {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    info: row.info,
    completedSteps: row.completed_steps || [],
    status: computeStatus(row.completed_steps),
    createdAt: row.created_at,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /releases
app.get("/releases", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM releases ORDER BY created_at DESC");
    res.json(rows.map(toRelease));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /releases/:id
app.get("/releases/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM releases WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(toRelease(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /releases
app.post("/releases", async (req, res) => {
  const { id, name, date, info = "" } = req.body;
  if (!name || !date) return res.status(400).json({ error: "name and date are required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO releases (id, name, date, info) VALUES ($1, $2, $3, $4) RETURNING *",
      [id || require("crypto").randomUUID(), name, date, info]
    );
    res.status(201).json(toRelease(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /releases/:id/steps
app.patch("/releases/:id/steps", async (req, res) => {
  const { completedSteps } = req.body;
  if (!Array.isArray(completedSteps)) return res.status(400).json({ error: "completedSteps must be an array" });
  try {
    const { rows } = await pool.query(
      "UPDATE releases SET completed_steps = $1 WHERE id = $2 RETURNING *",
      [completedSteps, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(toRelease(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /releases/:id/info
app.patch("/releases/:id/info", async (req, res) => {
  const { info } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE releases SET info = $1 WHERE id = $2 RETURNING *",
      [info ?? "", req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(toRelease(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /releases/:id
app.delete("/releases/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM releases WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
initDb().then(() => app.listen(PORT, () => console.log(`API running on :${PORT}`)));
