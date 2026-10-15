import { useState, useEffect } from 'react';
import { getSocket } from '../services/socket';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const s = getSocket();

    function onConnect() {
      setIsConnected(true);
      setSocketId(s.id);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    if (s.connected) {
      setIsConnected(true);
      setSocketId(s.id);
    }

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  return {
    socket: getSocket(),
    isConnected,
    socketId
  };
}
