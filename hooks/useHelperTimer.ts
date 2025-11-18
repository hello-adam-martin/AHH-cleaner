import { useState, useEffect, useCallback } from 'react';
import type { CleaningSession } from '@/types';

export const useHelperTimer = (session: CleaningSession | null) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  const calculateHelperElapsedTime = useCallback(() => {
    if (!session) return 0;

    const now = Date.now();
    let elapsed = 0;

    if (session.helperActive && session.helperStartTime) {
      // Helper timer is currently running - add current session time to accumulated time
      const currentSessionTime = now - session.helperStartTime;
      elapsed = currentSessionTime + session.helperTotalPausedDuration;
    } else if (session.helperTotalPausedDuration > 0) {
      // Helper timer has been stopped, show accumulated time
      elapsed = session.helperTotalPausedDuration;
    }

    return Math.max(0, elapsed);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setElapsedTime(0);
      return;
    }

    // Update immediately
    setElapsedTime(calculateHelperElapsedTime());

    // Only set up interval if helper timer is active
    if (!session.helperActive) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(calculateHelperElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [session, calculateHelperElapsedTime]);

  return elapsedTime;
};
