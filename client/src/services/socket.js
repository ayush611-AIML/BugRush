import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('bugrush_token');
    const guestUserStr = localStorage.getItem('bugrush_user');
    let guestUser = null;
    if (guestUserStr) {
      try {
        guestUser = JSON.parse(guestUserStr);
      } catch (e) {}
    }

    socket = io('/', {
      auth: {
        token: token || null,
        guestId: guestUser?._id || guestUser?.id || null,
        guestName: guestUser?.username || null,
        rating: guestUser?.rating || 1000
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to BugRush server. ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  return socket;
}

export function reconnectSocketWithAuth(token, user) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (token) localStorage.setItem('bugrush_token', token);
  if (user) localStorage.setItem('bugrush_user', JSON.stringify(user));
  return getSocket();
}
