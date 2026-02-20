// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');

const register = async (req, res) => {
  try {
    const { email, password, name, phone_number } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Please provide email, password, and name' 
      });
    }

    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone_number, role, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING user_id, name, email, phone_number, role, created_at`,
      [name, email, hashedPassword, phone_number || null, 'user']
    );

    const token = jwt.sign(
      { 
        user_id: newUser.rows[0].user_id, 
        email: newUser.rows[0].email,
        name: newUser.rows[0].name,
        role: newUser.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      token 
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ 
      error: 'Server error during registration' 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const validPassword = await bcrypt.compare(
      password, 
      user.rows[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { 
        user_id: user.rows[0].user_id, 
        email: user.rows[0].email,
        name: user.rows[0].name,
        role: user.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ 
      user: { 
        user_id: user.rows[0].user_id, 
        email: user.rows[0].email, 
        name: user.rows[0].name 
      }, 
      token 
    });
    
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ 
        error: 'Phone number is required' 
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO profile (user_id, phone_number, otp_code, otp_expiry)
       VALUES (gen_random_uuid(), $1, $2, $3)
       ON CONFLICT (phone_number)
       DO UPDATE SET otp_code = $2, otp_expiry = $3`,
      [phone_number, otp, expires]
    );



    return res.json({ 
      message: 'OTP sent successfully ✅' 
    });
    
  } catch (err) {
    console.error('OTP sending error:', err);
    return res.status(500).json({ 
      error: 'Server error sending OTP' 
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({ 
        error: 'Phone number and OTP required' 
      });
    }

    const result = await pool.query(
      `SELECT * FROM profile
       WHERE phone_number = $1
       AND otp_code = $2
       AND otp_expiry > NOW()`,
      [phone_number, otp]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid or expired OTP' 
      });
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
      message: 'OTP verified, login successful 🔑',
      token
    });
    
  } catch (err) {
    console.error('OTP verification error:', err);
    return res.status(500).json({ 
      error: 'Server error verifying OTP' 
    });
  }
};

module.exports = { register, login, sendOtp, verifyOtp };
