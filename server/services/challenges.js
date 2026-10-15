const Challenge = require('../models/Challenge');

/**
 * Get random challenge that neither player has seen (or random fallback)
 */
async function getRandomChallenge(excludedIds = []) {
  const query = excludedIds.length > 0 ? { _id: { $nin: excludedIds } } : {};
  const count = await Challenge.countDocuments(query);

  if (count === 0) {
    // If all challenges were seen, fall back to any random challenge
    const totalCount = await Challenge.countDocuments();
    if (totalCount === 0) return null;
    const random = Math.floor(Math.random() * totalCount);
    return await Challenge.findOne().skip(random);
  }

  const random = Math.floor(Math.random() * count);
  return await Challenge.findOne(query).skip(random);
}

/**
 * Strips hidden tests and solutions for safe client transmission
 */
function sanitizeChallengeForClient(challenge) {
  if (!challenge) return null;
  const doc = challenge.toObject ? challenge.toObject() : { ...challenge };
  delete doc.hiddenTests;
  delete doc.solution;
  return {
    id: doc._id?.toString() || doc.id,
    title: doc.title,
    language: doc.language || 'javascript',
    difficulty: doc.difficulty,
    difficultyLevel: doc.difficultyLevel || 2,
    description: doc.description,
    bugDescription: doc.bugDescription,
    functionName: doc.functionName,
    buggyCode: doc.buggyCode,
    visibleTests: doc.visibleTests || [],
    hints: doc.hints || [],
    tags: doc.tags || [],
    totalTests: (doc.visibleTests?.length || 0) + (challenge.hiddenTests?.length || 0)
  };
}

module.exports = {
  getRandomChallenge,
  sanitizeChallengeForClient
};
