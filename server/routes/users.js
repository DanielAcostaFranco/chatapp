const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─────────────────────────────────────────
// POST /api/users/register
// Registers a new user
// Body: { username, email, password }
// ─────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validate that all required fields were provided
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  try {
    // Check if the username or email is already taken
    const exists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email is already in use' });
    }

    // Insert the new user (password_hash stores the password directly for now)
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, password]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/users/login
// Logs in with username and password
// Body: { username, password }
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate that all required fields were provided
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Look up the user by username and password_hash
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE username = $1 AND password_hash = $2',
      [username, password]
    );

    // If not found, credentials are invalid
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/users
// Returns a list of all registered users
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, created_at FROM users ORDER BY username ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
