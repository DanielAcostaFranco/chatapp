const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─────────────────────────────────────────
// POST /api/conversations
// Creates a new conversation between two users
// Uses the conversation_participants table to register both
// Body: { user1_id, user2_id }
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const { user1_id, user2_id } = req.body;

  if (!user1_id || !user2_id) {
    return res.status(400).json({ error: 'user1_id and user2_id are required' });
  }

  try {
    // Check if a conversation between these two users already exists
    // by looking for shared entries in conversation_participants
    const existing = await pool.query(
      `SELECT cp1.conversation_id AS id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
      [user1_id, user2_id]
    );

    // If it already exists, return it instead of creating a duplicate
    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0]);
    }

    // Create a new conversation in the conversations table
    const conv = await pool.query(
      'INSERT INTO conversations DEFAULT VALUES RETURNING id, created_at'
    );
    const conversationId = conv.rows[0].id;

    // Register both users as participants
    await pool.query(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [conversationId, user1_id, user2_id]
    );

    res.status(201).json({ id: conversationId, created_at: conv.rows[0].created_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/conversations/:userId
// Returns all conversations for a given user
// Includes the other participant's username
// ─────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user's conversations and JOIN to get the other participant's info
    const result = await pool.query(
      `SELECT 
         c.id,
         c.created_at,
         u.id AS other_user_id,
         u.username AS other_user
       FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
       JOIN users u ON cp2.user_id = u.id
       WHERE cp1.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
