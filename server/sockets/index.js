const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const { registerMatchmakingHandlers, startMatcherLoop } = require('./matchManager');
const { registerMatchHandlers } = require('./match');
const { handlePlayerDisconnect, handlePlayerReconnect } = require('./room');
const { removeFromQueue } = require('../services/matchmaking');

/**
 * Socket.IO Initialization
 * PDF Section 2 & 5:
 * Real-time authoritative server with JWT authentication in handshake
 */
function initSocketServer(io) {
  // Handshake authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.id) {
          const user = await User.findById(decoded.id).select('-password');
          if (user) {
            socket.user = user;
            socket.userId = user._id.toString();
            socket.username = user.username;
            socket.rating = user.rating;
            return next();
          }
        }
      }

      // Guest / Demo session
      const guestId = socket.handshake.auth?.guestId || socket.id;
      const guestName = socket.handshake.auth?.guestName || `Player_${socket.id.slice(0, 4)}`;
      const guestRating = socket.handshake.auth?.rating || 1000;

      socket.userId = guestId;
      socket.username = guestName;
      socket.rating = Number(guestRating) || 1000;
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const username = socket.username;
    console.log(`[Socket] User connected: ${username} (${userId})`);

    // Personal user channel for targeted notifications
    socket.join(`user_${userId}`);

    // Check and handle reconnection if reconnecting to active match
    handlePlayerReconnect(io, socket);

    // Register modular handlers
    registerMatchmakingHandlers(io, socket);
    registerMatchHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${username} (${userId})`);
      removeFromQueue(userId);
      handlePlayerDisconnect(io, socket);
    });
  });

  // Start background rating matcher loop
  startMatcherLoop(io);
}

module.exports = initSocketServer;
