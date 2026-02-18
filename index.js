// index.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth'); // auth routes

const app = express();
app.use(express.json());

// ===============================
// SUPABASE DATABASE CONNECTION
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log('✅ Connected to Supabase database'))
  .catch(err => console.error('❌ Database connection failed:', err.message));

// ===============================
// MOUNT AUTH ROUTES
// ===============================
app.use('/auth', authRoutes);

// ===============================
// TEST ROUTE / HEALTHCHECK
// ===============================
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: "Yelpia Backend Running 🚀",
      database_time: result.rows[0].now
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ===============================
// JWT PROTECTED EXAMPLE
// ===============================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

app.get('/protected', authMiddleware, (req, res) => {
  res.json({
    message: "You are authenticated 🔐",
    user: req.user
  });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Export pool for auth routes
module.exports = { pool, bcrypt, jwt };
