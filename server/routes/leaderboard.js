const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');

/**
 * @route   GET /api/leaderboard
 * @desc    Get top ranked players
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const users = await User.find()
      .select('username rating wins losses matches avatar createdAt')
      .sort({ rating: -1, wins: -1 })
      .limit(limit);

    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * @route   GET /api/leaderboard/recent-matches
 * @desc    Get recent 1v1 battle matches
 */
router.get('/recent-matches', async (req, res) => {
  try {
    const matches = await Match.find()
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent matches' });
  }
});

module.exports = router;
