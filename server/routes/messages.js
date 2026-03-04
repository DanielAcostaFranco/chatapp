const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─────────────────────────────────────────
// GET /api/messages/:conversationId
// Returns all messages in a conversation
// ordered from oldest to newest
// ─────────────────────────────────────────
router.get('/:conversationId', async (req, res) => {
  const { conversationId } = req.params;

  try {
    // JOIN with users to get the sender's username
    // The timestamp column in the DB is created_at
    const result = await pool.query(
      `SELECT m.id, m.content, u.username, m.created_at AS sent_at
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/messages
// Sends a new message in a conversation
// Body: { sender_id, content, conversation_id }
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const { sender_id, content, conversation_id } = req.body;

  // Validate that all required fields were provided
  if (!sender_id || !content || !conversation_id) {
    return res.status(400).json({ error: 'sender_id, content and conversation_id are required' });
  }

  try {
    // Insert the message and return the created record
    const result = await pool.query(
      'INSERT INTO messages (sender_id, content, conversation_id) VALUES ($1, $2, $3) RETURNING *',
      [sender_id, content, conversation_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// DELETE /api/messages/:id
// Deletes a message by its ID
// ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Attempt to delete the message with the given ID
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 RETURNING *',
      [id]
    );

    // If no message was found with that ID, return 404
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;