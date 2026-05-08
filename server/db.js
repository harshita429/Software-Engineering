// =====================================================================
// db.js
// One Postgres connection pool, shared by every route in the server.
// A "pool" keeps a few connections open and reuses them, instead of
// opening a fresh connection for every query (which would be slow).
// =====================================================================

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// If the pool fires an error event we log it loudly. Without this,
// errors on idle connections can crash the whole server silently.
pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client:", err);
});

// `query` is the only thing the rest of the app needs. It takes a
// SQL string and an optional array of parameters, and returns the
// result. Always use parameters ($1, $2, ...) instead of string
// concatenation — that's what prevents SQL injection.
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // exported in case we ever need a transaction
};