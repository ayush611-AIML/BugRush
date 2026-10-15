const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user using argon2 for password hashing
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Explicit argon2 hash verification as requested in auth routes
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1
    });

    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      rating: 1000,
      avatar: `cyber-${Math.floor(Math.random() * 8) + 1}`
    });

    await user.save();

    const token = generateToken(user);
    const userJson = user.toObject();
    delete userJson.password;

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userJson
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Error creating user account' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and verify password with argon2
 */
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Please provide email/username and password' });
    }

    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { username: login }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Authoritative argon2 password verification in auth route
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    const userJson = user.toObject();
    delete userJson.password;

    res.json({
      message: 'Login successful',
      token,
      user: userJson
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * @route   POST /api/auth/guest
 * @desc    Instant guest login for seamless 1v1 testing and gameplay
 */
router.post('/guest', async (req, res) => {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `Hunter#${randomSuffix}`;
    const guestEmail = `guest_${Date.now()}_${randomSuffix}@bugrush.dev`;
    const randomPass = Math.random().toString(36).slice(2) + 'Secret!';

    const hashedPassword = await argon2.hash(randomPass);

    const user = new User({
      username: guestUsername,
      email: guestEmail,
      password: hashedPassword,
      rating: 1000,
      avatar: `cyber-${Math.floor(Math.random() * 8) + 1}`
    });

    await user.save();

    const token = generateToken(user);
    const userJson = user.toObject();
    delete userJson.password;

    res.json({
      message: 'Guest session created',
      token,
      user: userJson
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 */
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
