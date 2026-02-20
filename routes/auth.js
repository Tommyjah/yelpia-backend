// routes/auth.js

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// ===============================
// LOGGING MIDDLEWARE FOR AUTH
// ===============================
router.use((req, res, next) => {
  console.log(`Auth Route Hit: ${req.method} ${req.originalUrl}`);
  next();
});

// ===============================
// AUTH ROUTES
// ===============================

// Register (Email + Password)
router.post('/register', async (req, res, next) => {
  console.log("Registration request received");
  next();
}, register);

// Login (Email + Password)
router.post('/login', async (req, res, next) => {
  console.log("Login request received");
  next();
}, login);

// ===============================
// EXPORT ROUTER (MUST BE LAST)
// ===============================
module.exports = router;