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
      const updated = state.activeSessions.map((session) =>
        session.id === sessionId
          ? { ...session, status: 'paused' as const, pausedAt: Date.now() }
          : session
      );
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    }),

  resumeSession: (sessionId) =>
    set((state) => {
      const updated = state.activeSessions.map((session) => {
        if (session.id === sessionId && session.pausedAt) {
          const pausedDuration = Date.now() - session.pausedAt;
          return {
            ...session,
            status: 'active' as const,
            totalPausedDuration: session.totalPausedDuration + pausedDuration,
            pausedAt: undefined,
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

    const completedSession: CleaningSession = {
      ...session,
      endTime,
      status: 'completed',
    };

    set((state) => {
      const updated = state.activeSessions.filter((s) => s.id !== sessionId);
      storageHelpers.setObject(storageKeys.ACTIVE_SESSIONS, updated);
      return { activeSessions: updated };
    });

    return completedSession;
  },

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
