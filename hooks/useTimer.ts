import { useState, useEffect, useCallback } from 'react';
import type { CleaningSession } from '@/types';

export const useTimer = (session: CleaningSession | null) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  const calculateElapsedTime = useCallback(() => {
    if (!session) return 0;

    if (session.status === 'active') {
      // Active: accumulated + current segment
      const now = Date.now();
      return session.accumulatedDuration + (now - session.startTime);
    } else if (session.status === 'stopped') {
      // Stopped: just the accumulated time
      return session.accumulatedDuration;
    } else if (session.status === 'completed') {
      // Completed: accumulated already includes everything
      return session.accumulatedDuration;
    }

    return 0;
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
