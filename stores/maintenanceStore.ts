import { create } from 'zustand';
import type { MaintenanceIssue, MaintenanceCategory, MaintenancePriority } from '@/types';
import { syncMaintenanceIssue, isAirtableConfigured } from '@/services/backendApiService';

interface MaintenanceState {
  isSyncing: boolean;
  addMaintenanceIssue: (
    item: Omit<MaintenanceIssue, 'id' | 'reportedAt'>,
    photoBase64?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  isSyncing: false,

  addMaintenanceIssue: async (itemData, photoBase64) => {
    if (!isAirtableConfigured()) {
      return { success: false, error: 'Not connected to server' };
    }

    const newItem: MaintenanceIssue = {
      ...itemData,
      id: `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportedAt: Date.now(),
    };

    set({ isSyncing: true });

    const result = await syncMaintenanceIssue(newItem, photoBase64);

    set({ isSyncing: false });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to save maintenance issue' };
    }
  },
}));
