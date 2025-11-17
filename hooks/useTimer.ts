import { useState, useEffect, useCallback } from 'react';
import type { CleaningSession } from '@/types';

export const useTimer = (session: CleaningSession | null) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  const calculateElapsedTime = useCallback(() => {
    if (!session) return 0;

    const now = Date.now();
    let elapsed = 0;

    if (session.status === 'active') {
      elapsed = now - session.startTime - session.totalPausedDuration;
    } else if (session.status === 'paused' && session.pausedAt) {
      elapsed = session.pausedAt - session.startTime - session.totalPausedDuration;
    } else if (session.status === 'completed' && session.endTime) {
      elapsed = session.endTime - session.startTime - session.totalPausedDuration;
    }

    return Math.max(0, elapsed);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setElapsedTime(0);
      return;
    }

    // Update immediately
    setElapsedTime(calculateElapsedTime());

    // Only set up interval for active sessions
    if (session.status !== 'active') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(calculateElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [session, calculateElapsedTime]);

  return elapsedTime;
};
