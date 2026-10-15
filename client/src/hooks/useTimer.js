import { useState, useEffect } from 'react';

export function useTimer(endsAt, onExpire) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (!endsAt) return 0;
    return Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!endsAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endsAt - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isUrgent = secondsRemaining < 60 && secondsRemaining > 0;

  return {
    secondsRemaining,
    formatted,
    isUrgent,
    isExpired: secondsRemaining <= 0
  };
}
