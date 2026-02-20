// routes/profile.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// ===============================
// PROTECTED PROFILE ROUTE
// ===============================

router.get('/', authenticateToken, (req, res) => {
  try {
    res.json({
      message: "Protected route works",
      user: req.user
    });
  } catch (err) {
    console.error('Profile Route Error:', err);
    return res.status(500).json({ error: 'Server error while fetching profile' });
  }
});

// ===============================
// EXPORT ROUTER (MUST BE LAST)
// ===============================
module.exports = router;