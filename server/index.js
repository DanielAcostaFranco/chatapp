const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const pool = require('./db');

// Import routes
const messageRoutes = require('./routes/messages.js');
const userRoutes = require('./routes/users.js');
const conversationRoutes = require('./routes/conversations.js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────
// Serve static frontend files from /client
// Visiting http://localhost:3000 opens the chat UI
// ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../client')));

// ─────────────────────────────────────────
// Register API routes
// ─────────────────────────────────────────
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);

// Root route — serves the frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: "Connected 🚀",
      server_time: result.rows[0].current_time
    });
  } catch (err) {
    res.status(500).json({
      status: "Connection error ❌",
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});