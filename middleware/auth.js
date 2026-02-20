// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('JWT Authentication Error: No bearer token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.slice(7);

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      req.user = decoded;
      console.log('JWT Authentication Success:', decoded.email);
      next();
    });

  } catch (err) {
    console.error('JWT Authentication Error:', err);
    return res.status(401).json({ error: 'Access token required' });
  }
};

module.exports = { authenticateToken };