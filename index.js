require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./utils/db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// ===============================
// ROUTES
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// ===============================
// HEALTH CHECK
// ===============================
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: "Yelpia Backend Running 🔥",
      database_time: result.rows[0].now
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ===============================
// ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Yelpia Backend running on port ${PORT}`);
});