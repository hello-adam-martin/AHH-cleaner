import { Platform } from 'react-native';
import type { Property, Cleaner, CompletedSession, LostPropertyItem, MaintenanceIssue } from '@/types';

// Backend API URL (set via environment variable)
// In development, this might be http://localhost:3000/api
// In production, this will be your Vercel app URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || '/api';

/**
 * Generic fetch helper with error handling
 */
async function fetchFromApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error (${endpoint}):`, errorData.error || response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Network Error (${endpoint}):`, error);
    return null;
  }
}

/**
 * Fetch cleaners from backend API
 * @returns Array of Cleaner objects or null if fetch fails
 */
export async function fetchCleaners(): Promise<Cleaner[] | null> {
  console.log('Fetching cleaners from backend API...');
  const cleaners = await fetchFromApi<Cleaner[]>('/cleaners');
  if (cleaners) {
    console.log(`Fetched ${cleaners.length} cleaners from API`);
  }
  return cleaners;
}

/**
 * Fetch today's checkout properties from backend API
 * @returns Array of Property objects or null if fetch fails
 */
export async function fetchTodaysCheckouts(): Promise<Property[] | null> {
  console.log('Fetching properties from backend API...');
  const properties = await fetchFromApi<Property[]>('/properties');
  if (properties) {
    console.log(`Fetched ${properties.length} properties from API`);
  }
  return properties;
}

/**
 * Update booking record with completed cleaning session data
 * @param session The completed session to sync
 * @returns Success status and optional error message
 */
export async function updateBookingWithCleaningData(
  session: CompletedSession
): Promise<{ success: boolean; error?: string }> {
  const isBlocked = session.property?.isBlocked === true;
  console.log(`Syncing session to backend API for ${isBlocked ? 'blocked date' : 'property'} ${session.propertyId}...`);

  const result = await fetchFromApi<{ success: boolean; error?: string }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: session.id,
      propertyId: session.propertyId,
      duration: session.duration,
      helperAccumulatedDuration: session.helperAccumulatedDuration || 0,
      consumables: session.consumables,
      isBlocked,
    }),
  });

  if (result) {
    if (result.success) {
      console.log('  -> Successfully synced session to backend');
    } else {
      console.error('  -> Failed to sync session:', result.error);
    }
    return result;
  }

  return { success: false, error: 'Failed to connect to backend API' };
}

/**
 * Test backend API connection
 * @returns true if connected, false otherwise
 */
export async function testAirtableConnection(): Promise<boolean> {
  const result = await fetchFromApi<{ connected: boolean }>('/health');
  return result?.connected || false;
}

/**
 * Check if backend API is configured
 * On web: /api fallback works (same-domain Vercel deployment)
 * On native: requires explicit EXPO_PUBLIC_API_URL env var
 */
export function isAirtableConfigured(): boolean {
  if (Platform.OS === 'web') {
    // On web, /api fallback works since we're on the same domain
    return true;
  }
  // On native, we need an explicit API URL
  return Boolean(process.env.EXPO_PUBLIC_API_URL);
}

/**
 * Sync a new lost property item to Airtable
 * @param item The lost property item to sync
 * @param photoBase64 Optional base64 encoded photo
 * @returns Success status, optional error message, and photo URL if uploaded
 */
export async function syncLostProperty(
  item: LostPropertyItem,
  photoBase64?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`Syncing lost property to backend API for booking ${item.bookingId}...`);

  const result = await fetchFromApi<{ success: boolean; error?: string }>(
    '/lost-property',
    {
      method: 'POST',
      body: JSON.stringify({
        bookingId: item.bookingId,
        description: item.description,
        photoBase64,
      }),
    }
  );

  if (result) {
    if (result.success) {
      console.log('  -> Successfully synced lost property to backend');
    } else {
      console.error('  -> Failed to sync lost property:', result.error);
    }
    return result;
  }

  return { success: false, error: 'Failed to connect to backend API' };
}

/**
 * Sync a new maintenance issue to Airtable
 * @param item The maintenance issue to sync
 * @param photoBase64 Optional base64 encoded photo
 * @returns Success status and optional error message
 */
export async function syncMaintenanceIssue(
  item: MaintenanceIssue,
  photoBase64?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`Syncing maintenance issue to backend API for booking ${item.bookingId}...`);

  const result = await fetchFromApi<{ success: boolean; error?: string }>(
    '/maintenance',
    {
      method: 'POST',
      body: JSON.stringify({
        bookingId: item.bookingId,
        category: item.category,
        priority: item.priority,
        description: item.description,
        photoBase64,
      }),
    }
  );

  if (result) {
    if (result.success) {
      console.log('  -> Successfully synced maintenance issue to backend');
    } else {
      console.error('  -> Failed to sync maintenance issue:', result.error);
    }
    return result;
  }

  return { success: false, error: 'Failed to connect to backend API' };
}

/**
 * Update property status in Airtable
 * @param propertyRecordId The Airtable Property record ID
 * @param status The new status ('Ready for guests' or 'Needs Cleaning')
 * @returns Success status and optional error message
 */
export async function updatePropertyStatus(
  propertyRecordId: string,
  status: 'Ready for guests' | 'Needs Cleaning'
): Promise<{ success: boolean; error?: string }> {
  console.log(`Updating property ${propertyRecordId} status to "${status}"...`);

  const result = await fetchFromApi<{ success: boolean; error?: string }>(
    '/property-status',
    {
      method: 'POST',
      body: JSON.stringify({
        propertyRecordId,
        status,
      }),
    }
  );

  if (result) {
    if (result.success) {
      console.log('  -> Successfully updated property status');
    } else {
      console.error('  -> Failed to update property status:', result.error);
    }
    return result;
  }

  return { success: false, error: 'Failed to connect to backend API' };
}
