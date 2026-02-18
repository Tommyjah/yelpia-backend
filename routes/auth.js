// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

// ===============================
// DATABASE POOL
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// ===============================
// REGISTER (Email + Password)
// ===============================
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO profile (user_id, email, name, hashed_password)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING user_id, email, name`,
      [email, name, hashed]
    );

    return res.status(201).json({
      message: "User registered successfully ✅",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// LOGIN (Email + Password)
// ===============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const user = await pool.query(
      `SELECT * FROM profile WHERE email = $1`,
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(
      password,
      user.rows[0].hashed_password
    );

    if (!match) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      {
        user_id: user.rows[0].user_id,
        email: user.rows[0].email,
        name: user.rows[0].name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: "Login successful 🔑",
      token
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// SEND OTP (Phone Login)
// ===============================
router.post('/send-otp', async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO profile (user_id, phone_number, otp_code, otp_expiry)
       VALUES (gen_random_uuid(), $1, $2, $3)
       ON CONFLICT (phone_number)
       DO UPDATE SET otp_code = $2, otp_expiry = $3`,
      [phone_number, otp, expires]
    );

    console.log(`OTP for ${phone_number}: ${otp}`);

    return res.json({ message: "OTP sent successfully ✅" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// VERIFY OTP (Phone Login)
// ===============================
router.post('/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;

  if (!phone_number || !otp) {
    return res.status(400).json({ error: "Phone number and OTP required" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM profile
       WHERE phone_number = $1
       AND otp_code = $2
       AND otp_expiry > NOW()`,
      [phone_number, otp]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      {
        user_id: user.user_id,
        phone_number: user.phone_number
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await pool.query(
      `UPDATE profile
       SET otp_code = NULL, otp_expiry = NULL
       WHERE user_id = $1`,
      [user.user_id]
    );

    return res.json({
      message: "OTP verified, login successful 🔑",
      token
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// EXPORT ROUTER (MUST BE LAST)
// ===============================
module.exports = router;
