const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');

/**
 * @route   GET /api/challenges
 * @desc    Get all challenges (hidden tests stripped)
 */
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .select('-hiddenTests')
      .sort({ difficulty: 1, title: 1 });
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve challenges' });
  }
});

/**
 * @route   GET /api/challenges/:id
 * @desc    Get single challenge by id or slug (hidden tests stripped)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const challenge = await Challenge.findOne(query).select('-hiddenTests');
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json({ challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

module.exports = router;
