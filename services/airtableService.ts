import Airtable from 'airtable';
import type { Property, CompletedSession, Cleaner } from '@/types';
import { calculateConsumablesTotalCost } from '@/data/consumables';

// Environment variables (these will be loaded from .env)
const AIRTABLE_API_KEY = process.env.EXPO_PUBLIC_AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID || '';
const BOOKINGS_TABLE = process.env.EXPO_PUBLIC_AIRTABLE_BOOKINGS_TABLE || 'Bookings';
const PROPERTIES_TABLE = process.env.EXPO_PUBLIC_AIRTABLE_PROPERTIES_TABLE || 'Properties';
const CLEANERS_TABLE = process.env.EXPO_PUBLIC_AIRTABLE_CLEANERS_TABLE || 'Cleaners';

// Field names (configurable via env vars)
const CHECKOUT_DATE_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_CHECKOUT_DATE_FIELD || 'Check Out';
const CHECKIN_DATE_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_CHECKIN_DATE_FIELD || 'Check In';
const PROPERTY_LINK_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_PROPERTY_LINK_FIELD || 'Property';
const CLEANING_DURATION_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_CLEANING_DURATION_FIELD || 'Cleaning Time';
const CONSUMABLES_COST_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_CONSUMABLES_COST_FIELD || 'Linen Costs';

// Initialize Airtable (only if API key is provided)
let base: Airtable.Base | null = null;

function initializeAirtable() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('Airtable not configured - missing API key or Base ID');
    return null;
  }

  try {
    Airtable.configure({
      apiKey: AIRTABLE_API_KEY,
    });
    return Airtable.base(AIRTABLE_BASE_ID);
  } catch (error) {
    console.error('Failed to initialize Airtable:', error);
    return null;
  }
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetch the next check-in date for a property
 */
async function fetchNextCheckinDate(propertyId: string): Promise<string | undefined> {
  if (!base) return undefined;

  try {
    const todayDate = getTodayDateString();
    console.log(`Fetching next check-in for property ID: ${propertyId}...`);

    // Query for future bookings for this property using Property ID field
    const records = await base(BOOKINGS_TABLE)
      .select({
        filterByFormula: `AND(
          {Property ID} = "${propertyId}",
          IS_AFTER({${CHECKIN_DATE_FIELD}}, DATEADD('${todayDate}', -1, 'days'))
        )`,
        fields: [CHECKIN_DATE_FIELD],
        sort: [{ field: CHECKIN_DATE_FIELD, direction: 'asc' }],
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      const nextDate = records[0].fields[CHECKIN_DATE_FIELD] as string;
      console.log(`  → Found next check-in: ${nextDate}`);
      return nextDate;
    }

    console.log(`  → No future check-in found`);
    return undefined;
  } catch (error) {
    console.warn('Could not fetch next check-in date:', error);
    return undefined;
  }
}

/**
 * Fetch properties that have checkouts today from Airtable
 * @returns Array of Property objects or null if fetch fails
 */
export async function fetchTodaysCheckouts(): Promise<Property[] | null> {
  // Initialize Airtable if not already done
  if (!base) {
    base = initializeAirtable();
  }

  // If Airtable is not configured, return null
  if (!base) {
    console.log('Airtable not configured - using local data');
    return null;
  }

  try {
    const todayDate = getTodayDateString();
    console.log(`Fetching checkouts for ${todayDate}...`);

    const properties: Property[] = [];

    // Query Bookings table for records with checkout date = today
    const records = await base(BOOKINGS_TABLE)
      .select({
        filterByFormula: `IS_SAME({${CHECKOUT_DATE_FIELD}}, '${todayDate}', 'day')`,
        fields: [
          CHECKOUT_DATE_FIELD,
          CHECKIN_DATE_FIELD,
          PROPERTY_LINK_FIELD,
          'Property Name',
          'Address (from Property)',
          'Notes',
          'Property ID',
          CLEANING_DURATION_FIELD,
          CONSUMABLES_COST_FIELD,
        ],
      })
      .all();

    console.log(`Found ${records.length} checkouts for today`);

    // Map Airtable records to Property interface
    for (const record of records) {
      const fields = record.fields as any;

      // Get property details - might come from linked record or directly from booking
      let propertyName = fields['Property Name'] || fields[PROPERTY_LINK_FIELD];
      let propertyAddress = fields['Address (from Property)'] || '';
      let nextCheckinDate: string | undefined;

      // Get Property ID from the booking record
      const propertyId = fields['Property ID'] as string;

      // If property is linked, fetch details from Properties table
      if (Array.isArray(fields[PROPERTY_LINK_FIELD]) && fields[PROPERTY_LINK_FIELD][0]) {
        try {
          const propertyRecordId = fields[PROPERTY_LINK_FIELD][0];
          const propertyRecord = await base(PROPERTIES_TABLE).find(propertyRecordId);
          propertyName = propertyRecord.fields['Name'] || propertyName;
          propertyAddress = propertyRecord.fields['Address'] || propertyAddress;

          // Fetch next check-in date for this property using Property Id
          if (propertyId) {
            nextCheckinDate = await fetchNextCheckinDate(propertyId);
          }
        } catch (error) {
          console.warn('Could not fetch linked property details:', error);
        }
      }

      // Get current cleaning time and consumables cost
      // Note: If Cleaning Time is a Duration field in Airtable, it's stored in seconds
      const cleaningTimeRaw = (fields[CLEANING_DURATION_FIELD] as number) || 0;
      const cleaningTime = cleaningTimeRaw / 3600; // Convert seconds to hours
      const consumablesCost = (fields[CONSUMABLES_COST_FIELD] as number) || 0;

      // Create Property object
      const property: Property = {
        id: record.id, // Use Airtable record ID as property ID
        name: String(propertyName || 'Unknown Property'),
        address: String(propertyAddress || ''),
        checkoutDate: fields[CHECKOUT_DATE_FIELD] as string,
        checkinDate: fields[CHECKIN_DATE_FIELD] as string,
        nextCheckinDate,
        notes: fields['Notes'] as string,
        cleaningTime,
        consumablesCost,
      };

      properties.push(property);
    }

    return properties;
  } catch (error) {
    console.error('Error fetching from Airtable:', error);
    return null; // Return null to indicate fetch failed (caller can use cached data)
  }
}

/**
 * Check if Airtable is configured
 */
export function isAirtableConfigured(): boolean {
  return Boolean(AIRTABLE_API_KEY && AIRTABLE_BASE_ID);
}

/**
 * Fetch cleaners from Airtable
 * @returns Array of Cleaner objects or null if fetch fails
 */
export async function fetchCleaners(): Promise<Cleaner[] | null> {
  // Initialize Airtable if not already done
  if (!base) {
    base = initializeAirtable();
  }

  // If Airtable is not configured, return null
  if (!base) {
    console.log('Airtable not configured - cannot fetch cleaners');
    return null;
  }

  try {
    console.log('Fetching cleaners from Airtable...');

    const cleaners: Cleaner[] = [];

    // Query Cleaners table
    const records = await base(CLEANERS_TABLE)
      .select({
        fields: ['Name', 'PIN', 'Avatar Color', 'Active'],
      })
      .all();

    console.log(`Found ${records.length} cleaners`);

    // Map Airtable records to Cleaner interface
    for (const record of records) {
      const fields = record.fields as any;

      // Skip inactive cleaners
      if (fields['Active'] === false) {
        console.log(`  Skipping inactive cleaner: ${fields['Name']}`);
        continue;
      }

      const cleaner: Cleaner = {
        id: record.id, // Use Airtable record ID
        name: String(fields['Name'] || 'Unknown'),
        avatarColor: String(fields['Avatar Color'] || '#999999'),
        pin: String(fields['PIN'] || '0000'),
      };

      cleaners.push(cleaner);
    }

    return cleaners;
  } catch (error) {
    console.error('Error fetching cleaners from Airtable:', error);
    return null;
  }
}

/**
 * Test Airtable connection
 */
export async function testAirtableConnection(): Promise<boolean> {
  if (!base) {
    base = initializeAirtable();
  }

  if (!base) {
    return false;
  }

  try {
    // Try to fetch a single record to test connection
    await base(BOOKINGS_TABLE).select({ maxRecords: 1 }).firstPage();
    return true;
  } catch (error) {
    console.error('Airtable connection test failed:', error);
    return false;
  }
}

/**
 * Update booking record with completed cleaning session data
 * Collates duration and consumables costs by adding to existing values
 */
export async function updateBookingWithCleaningData(
  session: CompletedSession
): Promise<{ success: boolean; error?: string }> {
  // Initialize Airtable if not already done
  if (!base) {
    base = initializeAirtable();
  }

  // If Airtable is not configured, return error
  if (!base) {
    return {
      success: false,
      error: 'Airtable not configured',
    };
  }

  try {
    const bookingRecordId = session.propertyId; // Property ID is the booking record ID
    console.log(`Updating booking ${bookingRecordId} with cleaning data...`);

    // 1. Fetch current booking record
    const bookingRecord = await base(BOOKINGS_TABLE).find(bookingRecordId);
    const fields = bookingRecord.fields as any;

    // 2. Get existing values (default to 0 if not set)
    // Note: Duration field in Airtable stores values in seconds
    const existingDurationSeconds = (fields[CLEANING_DURATION_FIELD] as number) || 0;
    const existingCost = (fields[CONSUMABLES_COST_FIELD] as number) || 0;

    // 3. Calculate session values
    const sessionDurationMs = session.duration; // Duration in milliseconds
    const helperDurationMs = session.helperTotalPausedDuration || 0; // Helper duration in milliseconds
    const totalSessionDurationMs = sessionDurationMs + helperDurationMs; // Total time including helper
    const totalSessionDurationSeconds = totalSessionDurationMs / 1000; // Convert ms to seconds
    const sessionCost = calculateConsumablesTotalCost(session.consumables);

    // 4. Calculate new totals (in seconds for duration)
    const newDurationSeconds = Math.round(existingDurationSeconds + totalSessionDurationSeconds);
    const newCost = Math.round((existingCost + sessionCost) * 100) / 100; // Round to 2 decimals

    // For logging, convert to hours for readability
    const existingDurationHours = existingDurationSeconds / 3600;
    const sessionDurationHours = sessionDurationMs / 1000 / 3600;
    const helperDurationHours = helperDurationMs / 1000 / 3600;
    const totalSessionDurationHours = totalSessionDurationMs / 1000 / 3600;
    const newDurationHours = newDurationSeconds / 3600;

    console.log(`  → Cleaner time: ${sessionDurationHours.toFixed(2)}h, Helper time: ${helperDurationHours.toFixed(2)}h`);
    console.log(`  → Adding ${totalSessionDurationHours.toFixed(2)}h to ${existingDurationHours.toFixed(2)}h = ${newDurationHours.toFixed(2)}h`);
    console.log(`  → Adding $${sessionCost.toFixed(2)} to $${existingCost.toFixed(2)} = $${newCost.toFixed(2)}`);

    // 5. Update the booking record (write duration in seconds)
    await base(BOOKINGS_TABLE).update(bookingRecordId, {
      [CLEANING_DURATION_FIELD]: newDurationSeconds,
      [CONSUMABLES_COST_FIELD]: newCost,
    });

    console.log(`  ✓ Successfully updated booking ${bookingRecordId}`);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating booking with cleaning data:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
