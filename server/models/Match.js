const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    challengeTitle: String,
    players: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        username: String,
        passed: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        finishedAt: Date,
        ratingBefore: Number,
        ratingAfter: Number
      }
    ],
    player1: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String,
      ratingBefore: Number,
      ratingAfter: Number,
      passedTests: Number,
      totalTests: Number
    },
    player2: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String,
      ratingBefore: Number,
      ratingAfter: Number,
      passedTests: Number,
      totalTests: Number
    },
    winnerId: String,
    winner: {
      type: String // userId, or 'draw'
    },
    winnerUsername: String,
    endReason: {
      type: String,
      default: 'SOLVED_ALL_TESTS'
    },
    reason: {
      type: String,
      default: 'SOLVED_ALL_TESTS'
    },
    startedAt: Date,
    endedAt: Date,
    durationSeconds: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Match', MatchSchema);
