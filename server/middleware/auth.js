const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'bugrush-secret-jwt-key-2026';

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      rating: user.rating
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Express HTTP middleware
async function authMiddleware(req, res, next) {
  try {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server authentication error' });
  }
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  generateToken,
  authMiddleware
};
