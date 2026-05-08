// =====================================================================
// server.js
// The HTTP server. Two jobs:
//   1. Serve the static frontend files (HTML/CSS/JS) from /public
//   2. Expose a small REST API that runs SQL against Postgres
// =====================================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
require("dotenv").config();

const app = express();

// Built-in middleware:
//   express.json()       parses JSON request bodies into req.body
//   express.static(...)  serves files from /public as-is
//   cors()               lets the browser talk to us across origins
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));


// =====================================================================
// HEALTH CHECK
// Visit http://localhost:3000/api/health to confirm the server +
// database are both up.
// =====================================================================
app.get("/api/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// =====================================================================
// CURRENT USER
// In a real app this would come from a login session. For now we
// hardcode it to the Module Organiser, matching the original prototype.
// =====================================================================
app.get("/api/current-user", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT staff_id, name, role, primary_module
         FROM staff
        WHERE staff_id = $1`,
      ["STF-1042"]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Current user not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// =====================================================================
// MODULES (read-only — needed for the filter dropdown and modal)
// =====================================================================
app.get("/api/modules", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT code, name FROM modules ORDER BY code"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// =====================================================================
// ASSIGNMENTS
// This is the dashboard query — same JOIN you wrote in SWE_QUERY.sql
// =====================================================================
app.get("/api/assignments", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
          a.id,
          a.name,
          a.module_code,
          m.name        AS module_name,
          s.name        AS created_by_name,
          s.staff_id    AS created_by_id,
          a.date_set,
          a.due_date
        FROM assignments a
        JOIN modules m ON m.code     = a.module_code
        JOIN staff   s ON s.staff_id = a.created_by_id
       ORDER BY a.due_date
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE
app.post("/api/assignments", async (req, res) => {
  const { name, module_code, date_set, due_date, created_by_id } = req.body;

  // Basic validation. The DB has CHECK constraints too but failing
  // fast here gives a friendlier error message.
  if (!name || !module_code || !date_set || !due_date || !created_by_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await db.query(
      `INSERT INTO assignments (name, module_code, date_set, due_date, created_by_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, module_code, date_set, due_date, created_by_id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
app.put("/api/assignments/:id", async (req, res) => {
  const { id } = req.params;
  const { name, module_code, date_set, due_date } = req.body;

  if (!name || !module_code || !date_set || !due_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await db.query(
      `UPDATE assignments
          SET name = $1,
              module_code = $2,
              date_set = $3,
              due_date = $4
        WHERE id = $5`,
      [name, module_code, date_set, due_date, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete("/api/assignments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM assignments WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// =====================================================================
// ANNOUNCEMENTS
// =====================================================================
app.get("/api/announcements", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
          an.id,
          an.module_code,
          an.author_id,
          s.name AS author_name,
          an.title,
          an.body,
          an.posted_at
        FROM announcements an
        JOIN staff s ON s.staff_id = an.author_id
       ORDER BY an.posted_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/announcements", async (req, res) => {
  const { module_code, author_id, title, body } = req.body;
  if (!module_code || !author_id || !title || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await db.query(
      `INSERT INTO announcements (module_code, author_id, title, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [module_code, author_id, title, body]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// =====================================================================
// START
// =====================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check:    http://localhost:${PORT}/api/health`);
});