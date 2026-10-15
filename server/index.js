require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const leaderboardRoutes = require('./routes/leaderboard');
const profileRoutes = require('./routes/profile');
const initSocketServer = require('./sockets');

const app = express();
const server = http.createServer(app);

// CORS configuration for REST & Socket.IO
const CORS_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Initialize Database and Redis
connectDB();
initRedis();

// API Routes (PDF Section 10: auth, leaderboard, profile)
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'BugRush Server',
    judge0Target: process.env.JUDGE0_URL || 'CE Local / Sandboxed'
  });
});

// Initialize Authoritative Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

initSocketServer(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[BugRush Server] Running at http://localhost:${PORT}`);
});
