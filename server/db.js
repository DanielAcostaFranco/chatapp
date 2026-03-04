require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test the database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to the database:', err);
  } else {
    console.log('✅ Connected to PostgreSQL:', res.rows[0]);
  }
});

module.exports = pool;