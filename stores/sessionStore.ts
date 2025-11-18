import { create } from 'zustand';
import type { CleaningSession, Consumables } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';
import { consumableItems } from '@/data/consumables';

interface SessionState {
  activeSessions: CleaningSession[];
  startSession: (propertyId: string, cleanerId: string) => CleaningSession;
  pauseSession: (sessionId: string) => void;
  resumeSession: (sessionId: string) => void;
  updateSessionTime: (sessionId: string, startTime: number, endTime: number) => void;
  updateConsumables: (sessionId: string, consumables: Partial<Consumables>) => void;
  completeSession: (sessionId: string, endTime: number) => CleaningSession | null;
  startHelperTimer: (sessionId: string) => void;
  stopHelperTimer: (sessionId: string) => void;
  getActiveSessionForProperty: (propertyId: string) => CleaningSession[];
  getActiveSessionForCleaner: (cleanerId: string) => CleaningSession | null;
  initializeFromStorage: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSessions: [],

  startSession: (propertyId, cleanerId) => {
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
      totalPausedDuration: 0,
      consumables: initialConsumables,
      status: 'active',
      // Initialize helper fields
      helperTotalPausedDuration: 0,
      helperActive: false,
    };

    set((state) => {
      const updated = [...state.activeSessions, newSession];
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    });

    return newSession;
  },

  pauseSession: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId) {
          const now = Date.now();
          let updatedSession = { ...session, status: 'paused' as const, pausedAt: now };

          // If helper timer is running, pause it too
          if (session.helperActive && session.helperStartTime) {
            const currentHelperDuration = now - session.helperStartTime;
            updatedSession = {
              ...updatedSession,
              helperPausedAt: now,
              helperTotalPausedDuration: session.helperTotalPausedDuration + currentHelperDuration,
              helperStartTime: undefined,
            };
          }

          return updatedSession;
        }
        return session;
      });
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  resumeSession: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId && session.pausedAt) {
          const now = Date.now();
          const pausedDuration = now - session.pausedAt;
          let updatedSession = {
            ...session,
            status: 'active' as const,
            totalPausedDuration: session.totalPausedDuration + pausedDuration,
            pausedAt: undefined,
          };

          // If helper timer was paused, resume it
          if (session.helperPausedAt) {
            updatedSession = {
              ...updatedSession,
              helperActive: true,
              helperStartTime: now,
              helperPausedAt: undefined,
            };
          }

          return updatedSession;
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

    // If helper timer is still active, stop it and calculate final duration
    let finalHelperDuration = session.helperTotalPausedDuration;
    if (session.helperActive && session.helperStartTime) {
      const currentSessionDuration = endTime - session.helperStartTime;
      finalHelperDuration = session.helperTotalPausedDuration + currentSessionDuration;
    }

    const completedSession: CleaningSession = {
      ...session,
      endTime,
      status: 'completed',
      helperActive: false,
      helperStartTime: undefined,
      helperTotalPausedDuration: finalHelperDuration,
    };

    set((state) => {
      const updated = state.activeSessions.filter((s) => s.id !== sessionId);
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    });

    return completedSession;
  },

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
          // Calculate current session duration and add to accumulated time
          const currentSessionDuration = Date.now() - session.helperStartTime;
          const newTotalDuration = session.helperTotalPausedDuration + currentSessionDuration;
          return {
            ...session,
            helperActive: false,
            helperPausedAt: undefined,
            helperStartTime: undefined,
            // Store the total helper duration accumulated so far
            helperTotalPausedDuration: newTotalDuration,
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

  initializeFromStorage: () => {
    const activeSessions =
      storageHelpers.getObject<CleaningSession[]>(storageKeys.ACTIVE_SESSIONS) || [];
    set({ activeSessions });
  },

  reset: () => {
    set({ activeSessions: [] });
  },
}));
