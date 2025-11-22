import type { Property, Cleaner, CompletedSession } from '@/types';

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
  console.log(`Syncing session to backend API for property ${session.propertyId}...`);

  const result = await fetchFromApi<{ success: boolean; error?: string }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      propertyId: session.propertyId,
      duration: session.duration,
      helperAccumulatedDuration: session.helperAccumulatedDuration || 0,
      consumables: session.consumables,
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
 * Backend is considered configured if EXPO_PUBLIC_API_URL env var is explicitly set
 * (not just using the /api fallback which only works on web)
 */
export function isAirtableConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_API_URL);
}
