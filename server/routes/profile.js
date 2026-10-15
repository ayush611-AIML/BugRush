const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/profile/me
 * @desc    Get detailed current user profile with match history
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const matches = await Match.find({
      $or: [
        { 'player1.userId': user._id },
        { 'player2.userId': user._id },
        { 'players.userId': user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const winRate = user.matches > 0 ? Math.round((user.wins / user.matches) * 100) : 0;

    res.json({
      user,
      stats: {
        rating: user.rating,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws || 0,
        matches: user.matches,
        winRate: `${winRate}%`
      },
      matches
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * @route   GET /api/profile/:username
 * @desc    Get user profile with Elo rating, win/loss/draw stats, and 10 most recent matches
 */
router.get('/:username', async (req, res) => {
  try {
    const usernameParam = req.params.username.trim();
    const user = await User.findOne({
      username: new RegExp(`^${usernameParam}$`, 'i')
    }).select('-password -email');

    if (!user) {
      return res.status(404).json({ error: `User '${usernameParam}' not found` });
    }

    const matches = await Match.find({
      $or: [
        { 'player1.userId': user._id },
        { 'player2.userId': user._id },
        { 'players.userId': user._id },
        { 'player1.username': user.username },
        { 'player2.username': user.username }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const totalMatches = user.matches || (user.wins + user.losses + (user.draws || 0));
    const winRate = totalMatches > 0 ? Math.round((user.wins / totalMatches) * 100) : 0;

    res.json({
      username: user.username,
      rating: user.rating,
      stats: {
        rating: user.rating,
        wins: user.wins || 0,
        losses: user.losses || 0,
        draws: user.draws || 0,
        matches: totalMatches,
        winRate: `${winRate}%`
      },
      matches
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch public profile' });
  }
});

module.exports = router;
