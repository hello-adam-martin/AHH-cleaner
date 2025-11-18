import { useCleanerStore } from '@/stores/cleanerStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchTodaysCheckouts, fetchCleaners, isAirtableConfigured } from './airtableService';
import { storageHelpers, storageKeys } from './storage';
import { seedCleaners } from '@/data/seedData';

/**
 * Check if we need to fetch new data from Airtable
 * Returns true if it's a new day or first time loading
 */
function shouldFetchFromAirtable(): boolean {
  const lastFetchDate = storageHelpers.getString(storageKeys.LAST_FETCH_DATE);
  const todayDate = new Date().toDateString(); // e.g., "Mon Nov 17 2025"

  // If never fetched before, or if it's a new day
  return !lastFetchDate || lastFetchDate !== todayDate;
}

/**
 * Initialize the app - load data from storage and fetch from Airtable if needed
 */
export const initializeApp = async () => {
  // Initialize all stores from storage
  useCleanerStore.getState().initializeFromStorage();
  usePropertiesStore.getState().initializeFromStorage();
  useSessionStore.getState().initializeFromStorage();
  useHistoryStore.getState().initializeFromStorage();

  // Handle cleaners: fetch from Airtable if configured, otherwise use seed data
  const { cleaners, setCleaners } = useCleanerStore.getState();

  if (isAirtableConfigured()) {
    console.log('Fetching cleaners from Airtable...');
    const airtableCleaners = await fetchCleaners();

    if (airtableCleaners && airtableCleaners.length > 0) {
      // Successfully fetched from Airtable
      setCleaners(airtableCleaners);
      console.log(`✓ Loaded ${airtableCleaners.length} cleaners from Airtable`);
    } else if (cleaners.length === 0) {
      // Fetch failed and no cached cleaners - use seed data as fallback
      console.log('Using seed cleaners (Airtable fetch failed)');
      setCleaners(seedCleaners);
    } else {
      // Fetch failed but we have cached cleaners
      console.log(`Using ${cleaners.length} cached cleaners (Airtable fetch failed)`);
    }
  } else if (cleaners.length === 0) {
    // Airtable not configured and no cached cleaners - use seed data
    console.log('Using seed cleaners (Airtable not configured)');
    setCleaners(seedCleaners);
  } else {
    // Airtable not configured but we have cached cleaners
    console.log(`Using ${cleaners.length} cached cleaners`);
  }

  // Handle properties: fetch from Airtable if configured and it's a new day
  const { properties, setProperties } = usePropertiesStore.getState();

  if (isAirtableConfigured() && shouldFetchFromAirtable()) {
    console.log('Fetching today\'s properties from Airtable...');
    const airtableProperties = await fetchTodaysCheckouts();

    if (airtableProperties && airtableProperties.length > 0) {
      // Successfully fetched from Airtable
      setProperties(airtableProperties);
      storageHelpers.setString(storageKeys.LAST_FETCH_DATE, new Date().toDateString());
      console.log(`✓ Loaded ${airtableProperties.length} properties from Airtable`);
    } else {
      // Fetch failed or no properties for today - keep cached data
      console.log(`Using ${properties.length} cached properties (Airtable fetch failed or returned no data)`);
    }
  } else {
    // Using cached properties from previous session
    console.log(`Using ${properties.length} cached properties`);
  }
};
