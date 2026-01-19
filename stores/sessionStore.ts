import { create } from 'zustand';
import type { CleaningSession, Consumables, PropertySnapshot } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';
import { consumableItems } from '@/data/consumables';

interface SessionState {
  activeSessions: CleaningSession[];
  startSession: (propertyId: string, cleanerId: string, propertySnapshot: PropertySnapshot) => CleaningSession | null;
  stopSession: (sessionId: string) => void;
  restartSession: (sessionId: string) => void;
  updateSessionTime: (sessionId: string, startTime: number, endTime: number) => void;
  updateConsumables: (sessionId: string, consumables: Partial<Consumables>) => void;
  completeSession: (sessionId: string, endTime: number) => CleaningSession | null;
  discardSession: (sessionId: string) => void;
  startHelperTimer: (sessionId: string) => void;
  stopHelperTimer: (sessionId: string) => void;
  adjustCleanerTime: (sessionId: string, minutes: number) => void;
  adjustHelperTime: (sessionId: string, minutes: number) => void;
  getActiveSessionForProperty: (propertyId: string) => CleaningSession[];
  getActiveSessionForCleaner: (cleanerId: string) => CleaningSession | null;
  hasActiveTimerForCleaner: (cleanerId: string) => boolean;
  initializeFromStorage: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSessions: [],

  startSession: (propertyId, cleanerId, propertySnapshot) => {
    // Check if cleaner already has an ACTIVE timer running
    const existingActive = get().activeSessions.find(
      (s) => s.cleanerId === cleanerId && s.status === 'active'
    );
    if (existingActive) {
      console.warn('Cleaner already has an active session running');
      return null;
    }

    // Initialize all consumables to 0
    const initialConsumables: Consumables = {};
    consumableItems.forEach((item) => {
      initialConsumables[item.id] = 0;
    });

    const newSession: CleaningSession = {
      id: `${Date.now()}-${cleanerId}`,
      propertyId,
      cleanerId,
      startTime: Date.now(),
      accumulatedDuration: 0,
      consumables: initialConsumables,
      status: 'active',
      // Initialize helper fields
      helperAccumulatedDuration: 0,
      helperActive: false,
      // Store property snapshot for data integrity
      propertySnapshot,
      sessionDate: new Date().toISOString().split('T')[0],
    };

    set((state) => {
      const updated = [...state.activeSessions, newSession];
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    });

    return newSession;
  },

  stopSession: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId && session.status === 'active') {
          const now = Date.now();
          // Calculate elapsed time for this segment and add to accumulated
          const segmentDuration = now - session.startTime;
          const newAccumulated = session.accumulatedDuration + segmentDuration;

          let updatedSession: CleaningSession = {
            ...session,
            status: 'stopped',
            accumulatedDuration: newAccumulated,
          };

          // If helper timer is running, stop it too
          if (session.helperActive && session.helperStartTime) {
            const helperSegmentDuration = now - session.helperStartTime;
            updatedSession = {
              ...updatedSession,
              helperActive: false,
              helperStartTime: undefined,
              helperAccumulatedDuration: session.helperAccumulatedDuration + helperSegmentDuration,
            };
          }

          return updatedSession;
        }
        return session;
      });
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  restartSession: (sessionId) =>
    set((state) => {
      // First check if cleaner already has another active session
      const sessionToRestart = state.activeSessions.find((s) => s.id === sessionId);
      if (!sessionToRestart) return state;

      const hasOtherActive = state.activeSessions.some(
        (s) => s.cleanerId === sessionToRestart.cleanerId && s.status === 'active' && s.id !== sessionId
      );
      if (hasOtherActive) {
        console.warn('Cleaner already has another active session');
        return state;
      }

      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId && session.status === 'stopped') {
          return {
            ...session,
            status: 'active' as const,
            startTime: Date.now(), // Reset start time for new segment
          };
        }
        return session;
      });
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  updateSessionTime: (sessionId, startTime, endTime) =>
    set((state) => {
      const updated = state.activeSessions.map((session) =>
        session.id === sessionId
          ? { ...session, startTime, endTime }
          : session
      );
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  updateConsumables: (sessionId, consumables) =>
    set((state) => {
      const updated = state.activeSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              consumables: { ...session.consumables, ...consumables },
            }
          : session
      );
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  completeSession: (sessionId, endTime) => {
    const session = get().activeSessions.find((s) => s.id === sessionId);
    if (!session) return null;

    // Calculate final cleaner duration
    let finalDuration = session.accumulatedDuration;
    if (session.status === 'active') {
      // If still active, add current segment
      finalDuration += endTime - session.startTime;
    }

    // Calculate final helper duration
    let finalHelperDuration = session.helperAccumulatedDuration;
    if (session.helperActive && session.helperStartTime) {
      finalHelperDuration += endTime - session.helperStartTime;
    }

    const completedSession: CleaningSession = {
      ...session,
      endTime,
      status: 'completed',
      accumulatedDuration: finalDuration,
      helperActive: false,
      helperStartTime: undefined,
      helperAccumulatedDuration: finalHelperDuration,
    };

    set((state) => {
      const updated = state.activeSessions.filter((s) => s.id !== sessionId);
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    });

    return completedSession;
  },

  discardSession: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.filter((s) => s.id !== sessionId);
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  startHelperTimer: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              helperStartTime: Date.now(),
              helperActive: true,
            }
          : session
      );
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  stopHelperTimer: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId && session.helperStartTime) {
          // Calculate current segment duration and add to accumulated time
          const segmentDuration = Date.now() - session.helperStartTime;
          const newAccumulated = session.helperAccumulatedDuration + segmentDuration;
          return {
            ...session,
            helperActive: false,
            helperStartTime: undefined,
            helperAccumulatedDuration: newAccumulated,
          };
        }
        return session;
      });
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  adjustCleanerTime: (sessionId, minutes) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId) {
          const adjustmentMs = minutes * 60 * 1000;

          if (session.status === 'active') {
            // If active, adjust start time (earlier = more time)
            const newStartTime = session.startTime - adjustmentMs;
            const currentTime = Date.now();
            const newDuration = session.accumulatedDuration + (currentTime - newStartTime);

            // Prevent negative durations
            if (newDuration < 0) return session;

            return { ...session, startTime: newStartTime };
          } else {
            // If stopped, adjust accumulated duration directly
            const newAccumulated = session.accumulatedDuration + adjustmentMs;

            // Prevent negative durations
            if (newAccumulated < 0) return session;

            return { ...session, accumulatedDuration: newAccumulated };
          }
        }
        return session;
      });
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  adjustHelperTime: (sessionId, minutes) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId) {
          const adjustmentMs = minutes * 60 * 1000;
          const newHelperDuration = session.helperAccumulatedDuration + adjustmentMs;

          // Prevent negative durations
          if (newHelperDuration < 0) return session;

          return {
            ...session,
            helperAccumulatedDuration: newHelperDuration,
            helperActive: false,
            helperStartTime: undefined,
          };
        }
        return session;
      });
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  getActiveSessionForProperty: (propertyId) => {
    return get().activeSessions.filter((s) => s.propertyId === propertyId);
  },

  getActiveSessionForCleaner: (cleanerId) => {
    return get().activeSessions.find((s) => s.cleanerId === cleanerId) || null;
  },

  hasActiveTimerForCleaner: (cleanerId) => {
    return get().activeSessions.some(
      (s) => s.cleanerId === cleanerId && s.status === 'active'
    );
  },

  initializeFromStorage: () => {
    const activeSessions =
      storageHelpers.getObject<CleaningSession[]>(storageKeys.ACTIVE_SESSIONS) || [];

    // Migrate sessions that don't have sessionDate (backward compatibility)
    let needsSave = false;
    const migratedSessions = activeSessions.map(session => {
      if (!session.sessionDate) {
        needsSave = true;
        return {
          ...session,
          sessionDate: new Date(session.startTime).toISOString().split('T')[0],
        };
      }
      return session;
    });

    // Save migrated sessions if any were changed
    if (needsSave) {
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, migratedSessions);
    }

    set({ activeSessions: migratedSessions });
  },

  reset: () => {
    set({ activeSessions: [] });
  },
}));
