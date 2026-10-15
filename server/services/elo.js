/**
 * Elo Rating Calculation Service
 * K-factor: 32, Base Rating: 1000
 */

const K_FACTOR = 32;
const BASE_RATING = 1000;

/**
 * Calculate expected score for player A against player B
 * @param {number} ratingA
 * @param {number} ratingB
 * @returns {number}
 */
function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ratings after a match
 * @param {number} ratingA - Current rating of Player A
 * @param {number} ratingB - Current rating of Player B
 * @param {number} actualScoreA - 1 if A won, 0 if B won, 0.5 if draw
 * @returns {{ playerA: { oldRating, newRating, change }, playerB: { oldRating, newRating, change } }}
 */
function calculateElo(ratingA = BASE_RATING, ratingB = BASE_RATING, actualScoreA = 1) {
  const expectedA = getExpectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  const actualScoreB = 1 - actualScoreA;

  const changeA = Math.round(K_FACTOR * (actualScoreA - expectedA));
  const changeB = Math.round(K_FACTOR * (actualScoreB - expectedB));

  // Minimum rating clamp at 100
  const newRatingA = Math.max(100, ratingA + changeA);
  const newRatingB = Math.max(100, ratingB + changeB);

  return {
    playerA: {
      oldRating: ratingA,
      newRating: newRatingA,
      change: newRatingA - ratingA
    },
    playerB: {
      oldRating: ratingB,
      newRating: newRatingB,
      change: newRatingB - ratingB
    }
  };
}

module.exports = {
  K_FACTOR,
  BASE_RATING,
  getExpectedScore,
  calculateElo
};
