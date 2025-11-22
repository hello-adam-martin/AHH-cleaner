import { create } from 'zustand';
import type { CompletedSession, CleaningSession, Property, Cleaner } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';
import { updateBookingWithCleaningData, isAirtableConfigured } from '@/services/backendApiService';

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
}

interface HistoryState {
  completedSessions: CompletedSession[];
  isSyncing: boolean;
  addCompletedSession: (
    session: CleaningSession,
    property: Property,
    cleaner: Cleaner
  ) => Promise<void>;
  getSessionsByProperty: (propertyId: string) => CompletedSession[];
  getSessionsByCleaner: (cleanerId: string) => CompletedSession[];
  getTodaysSessions: () => CompletedSession[];
  getPendingSessions: () => CompletedSession[];
  retrySyncSession: (sessionId: string) => Promise<boolean>;
  syncAllPending: () => Promise<SyncResult>;
  initializeFromStorage: () => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  completedSessions: [],
  isSyncing: false,

  addCompletedSession: async (session, property, cleaner) => {
    if (!session.endTime) return;

    const completedSession: CompletedSession = {
      ...session,
      endTime: session.endTime,
      property,
      cleaner,
      duration: session.accumulatedDuration + session.helperAccumulatedDuration,
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

  getPendingSessions: () => {
    return get().completedSessions.filter((s) => s.syncedToAirtable === false);
  },

  retrySyncSession: async (sessionId) => {
    const session = get().completedSessions.find((s) => s.id === sessionId);
    if (!session || session.syncedToAirtable) {
      return session?.syncedToAirtable ?? false;
    }

    if (!isAirtableConfigured()) {
      return false;
    }

    console.log(`Retrying sync for session ${sessionId}...`);
    const result = await updateBookingWithCleaningData(session);

    if (result.success) {
      console.log(`  ✓ Session ${sessionId} synced successfully`);
      set((state) => {
        const updated = state.completedSessions.map((s) =>
          s.id === sessionId
            ? { ...s, syncedToAirtable: true, syncError: undefined }
            : s
        );
        storageHelpers.setObject(storageKeys.COMPLETED_SESSIONS, updated);
        return { completedSessions: updated };
      });
      return true;
    } else {
      console.warn(`  ✗ Retry failed for session ${sessionId}: ${result.error}`);
      set((state) => {
        const updated = state.completedSessions.map((s) =>
          s.id === sessionId
            ? { ...s, syncError: result.error }
            : s
        );
        storageHelpers.setObject(storageKeys.COMPLETED_SESSIONS, updated);
        return { completedSessions: updated };
      });
      return false;
    }
  },

  syncAllPending: async () => {
    const pending = get().getPendingSessions();
    const result: SyncResult = {
      total: pending.length,
      synced: 0,
      failed: 0,
    };

    if (pending.length === 0) {
      return result;
    }

    set({ isSyncing: true });
    console.log(`Syncing ${pending.length} pending sessions...`);

    for (const session of pending) {
      const success = await get().retrySyncSession(session.id);
      if (success) {
        result.synced++;
      } else {
        result.failed++;
      }
    }

    set({ isSyncing: false });
    console.log(`Sync complete: ${result.synced}/${result.total} synced`);
    return result;
  },

  initializeFromStorage: () => {
    const completedSessions =
      storageHelpers.getObject<CompletedSession[]>(
        storageKeys.COMPLETED_SESSIONS
      ) || [];
    set({ completedSessions });
  },

  reset: () => {
    set({ completedSessions: [], isSyncing: false });
  },
}));
