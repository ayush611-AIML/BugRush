require('dotenv').config();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const connectDB = require('../config/db');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Match = require('../models/Match');
const challengesData = require('./challenges');

async function seedDatabase() {
  console.log('--- [BugRush Seeding] Starting Database Seed ---');
  await connectDB();

  try {
    // 1. Clear existing challenges and seed fresh ones
    await Challenge.deleteMany({});
    console.log('[Seed] Cleared existing challenges.');

    const createdChallenges = await Challenge.insertMany(challengesData);
    console.log(`[Seed] Successfully inserted ${createdChallenges.length} JavaScript debugging challenges:`);
    createdChallenges.forEach((c) => {
      console.log(`  - [${c.difficulty}] ${c.title} (${c.visibleTests.length} visible, ${c.hiddenTests.length} hidden)`);
    });

    // 2. Seed Demo Leaderboard Users (hashed with argon2)
    const demoUsers = [
      {
        username: 'NeoHacker',
        email: 'neo@bugrush.dev',
        rating: 1540,
        wins: 42,
        losses: 8,
        matches: 50,
        avatar: 'cyber-1'
      },
      {
        username: 'CyberQueen',
        email: 'queen@bugrush.dev',
        rating: 1410,
        wins: 34,
        losses: 11,
        matches: 45,
        avatar: 'cyber-2'
      },
      {
        username: 'BugSlayer',
        email: 'slayer@bugrush.dev',
        rating: 1285,
        wins: 26,
        losses: 14,
        matches: 40,
        avatar: 'cyber-3'
      },
      {
        username: 'ByteWizard',
        email: 'wizard@bugrush.dev',
        rating: 1150,
        wins: 19,
        losses: 15,
        matches: 34,
        avatar: 'cyber-4'
      },
      {
        username: 'NullTerminator',
        email: 'null@bugrush.dev',
        rating: 980,
        wins: 9,
        losses: 16,
        matches: 25,
        avatar: 'cyber-5'
      }
    ];

    for (const u of demoUsers) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        const hashedPassword = await argon2.hash('BugRush2026!', {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        });
        await User.create({
          ...u,
          password: hashedPassword
        });
        console.log(`[Seed] Created demo user: ${u.username} (Rating: ${u.rating})`);
      }
    }

    // 3. Seed sample match history
    const allUsers = await User.find().limit(5);
    if (allUsers.length >= 2 && createdChallenges.length > 0) {
      await Match.deleteMany({});
      const challenge = createdChallenges[0];
      await Match.create({
        roomId: `room_demo_${Date.now()}`,
        challenge: challenge._id,
        challengeTitle: challenge.title,
        player1: {
          userId: allUsers[0]._id,
          username: allUsers[0].username,
          ratingBefore: 1524,
          ratingAfter: 1540,
          passedTests: 5,
          totalTests: 5
        },
        player2: {
          userId: allUsers[1]._id,
          username: allUsers[1].username,
          ratingBefore: 1426,
          ratingAfter: 1410,
          passedTests: 4,
          totalTests: 5
        },
        winner: allUsers[0]._id.toString(),
        winnerUsername: allUsers[0].username,
        reason: 'SOLVED_ALL_TESTS',
        durationSeconds: 142
      });
      console.log('[Seed] Created sample match history record.');
    }

    console.log('--- [BugRush Seeding] Completed Successfully! ---');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Database connection closed.');
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
