const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  expected: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  }
});

const ChallengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    language: {
      type: String,
      default: 'javascript'
    },
    difficulty: {
      type: String,
      default: 'Medium'
    },
    difficultyLevel: {
      type: Number,
      default: 2,
      min: 1,
      max: 5
    },
    description: {
      type: String,
      required: true
    },
    bugDescription: {
      type: String
    },
    solution: {
      type: String
    },
    buggyCode: {
      type: String,
      required: true
    },
    functionName: {
      type: String,
      required: true
    },
    visibleTests: [TestCaseSchema],
    hiddenTests: [TestCaseSchema],
    hints: [String],
    tags: [String]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Challenge', ChallengeSchema);
