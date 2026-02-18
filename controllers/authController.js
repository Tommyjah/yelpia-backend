// controllers/authController.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const register = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Please provide email, password, and name' });
  }

  try {
    // Check if user exists
    const userExists = await pool.query('SELECT * FROM profile WHERE email=$1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into DB
    const newUser = await pool.query(
      'INSERT INTO profile (email, name, password_hash) VALUES ($1, $2, $3) RETURNING user_id, email, name',
      [email, name, hashedPassword]
    );

    // Generate JWT token
    const token = jwt.sign(
      { user_id: newUser.rows[0].user_id, email: newUser.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: newUser.rows[0], token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const user = await pool.query('SELECT * FROM profile WHERE email=$1', [email]);

    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.rows[0].user_id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user: { user_id: user.rows[0].user_id, email: user.rows[0].email, name: user.rows[0].name }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login };
