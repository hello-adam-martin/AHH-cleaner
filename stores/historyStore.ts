import { create } from 'zustand';
import type { CompletedSession, CleaningSession, Property, Cleaner } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';
import { updateBookingWithCleaningData, isAirtableConfigured } from '@/services/airtableService';

interface HistoryState {
  completedSessions: CompletedSession[];
  addCompletedSession: (
    session: CleaningSession,
    property: Property,
    cleaner: Cleaner
  ) => Promise<void>;
  getSessionsByProperty: (propertyId: string) => CompletedSession[];
  getSessionsByCleaner: (cleanerId: string) => CompletedSession[];
  getTodaysSessions: () => CompletedSession[];
  initializeFromStorage: () => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  completedSessions: [],

  addCompletedSession: async (session, property, cleaner) => {
    if (!session.endTime) return;

    const completedSession: CompletedSession = {
      ...session,
      endTime: session.endTime,
      property,
      cleaner,
      duration: session.endTime - session.startTime - session.totalPausedDuration,
    };

    // Try to sync to Airtable if configured
    if (isAirtableConfigured()) {
      console.log(`Syncing session ${session.id} to Airtable...`);
      const result = await updateBookingWithCleaningData(completedSession);

      if (result.success) {
        completedSession.syncedToAirtable = true;
        console.log(`  ✓ Session ${session.id} synced successfully`);
      } else {
        completedSession.syncedToAirtable = false;
        completedSession.syncError = result.error;
        console.warn(`  ✗ Failed to sync session ${session.id}: ${result.error}`);
      }
    } else {
      console.log('Airtable not configured - session saved locally only');
      completedSession.syncedToAirtable = false;
    }

    set((state) => {
      const updated = [completedSession, ...state.completedSessions];
      storageHelpers.setObject(storageKeys.COMPLETED_SESSIONS, updated);
      return { completedSessions: updated };
    });
  },

  getSessionsByProperty: (propertyId) => {
    return get().completedSessions.filter((s) => s.propertyId === propertyId);
  },

  getSessionsByCleaner: (cleanerId) => {
    return get().completedSessions.filter((s) => s.cleanerId === cleanerId);
  },

  getTodaysSessions: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return get().completedSessions.filter(
      (s) => s.startTime >= todayTimestamp
    );
  },

  initializeFromStorage: () => {
    const completedSessions =
      storageHelpers.getObject<CompletedSession[]>(
        storageKeys.COMPLETED_SESSIONS
      ) || [];
    set({ completedSessions });
  },

  reset: () => {
    set({ completedSessions: [] });
  },
}));
