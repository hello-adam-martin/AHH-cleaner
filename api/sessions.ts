import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAirtableBase,
  BOOKINGS_TABLE,
  CLEANING_DURATION_FIELD,
  CONSUMABLES_COST_FIELD,
  calculateConsumablesTotalCost,
} from './_lib/airtable';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const base = getAirtableBase();
  if (!base) {
    return res.status(500).json({ success: false, error: 'Airtable not configured' });
  }

  try {
    const session = req.body;

    // Validate required fields
    if (!session || !session.propertyId || session.duration === undefined) {
      return res.status(400).json({ success: false, error: 'Invalid session data - missing propertyId or duration' });
    }

    const bookingRecordId = session.propertyId;
    console.log(`Updating booking ${bookingRecordId} with cleaning data...`);

    // 1. Fetch current booking record
    const bookingRecord = await base(BOOKINGS_TABLE).find(bookingRecordId);
    const fields = bookingRecord.fields as any;

    // 2. Get existing values (default to 0 if not set)
    const existingDurationSeconds = (fields[CLEANING_DURATION_FIELD] as number) || 0;
    const existingCost = (fields[CONSUMABLES_COST_FIELD] as number) || 0;

    // 3. Calculate session values
    const sessionDurationMs = session.duration;
    const helperDurationMs = session.helperTotalPausedDuration || 0;
    const totalSessionDurationMs = sessionDurationMs + helperDurationMs;
    const totalSessionDurationSeconds = totalSessionDurationMs / 1000;

    // Calculate consumables cost
    const sessionCost = calculateConsumablesTotalCost(session.consumables || {});

    // 4. Calculate new totals
    const newDurationSeconds = Math.round(existingDurationSeconds + totalSessionDurationSeconds);
    const newCost = Math.round((existingCost + sessionCost) * 100) / 100;

    // Logging for debugging
    const existingDurationHours = existingDurationSeconds / 3600;
    const sessionDurationHours = sessionDurationMs / 1000 / 3600;
    const helperDurationHours = helperDurationMs / 1000 / 3600;
    const totalSessionDurationHours = totalSessionDurationMs / 1000 / 3600;
    const newDurationHours = newDurationSeconds / 3600;

    console.log(`  -> Cleaner time: ${sessionDurationHours.toFixed(2)}h, Helper time: ${helperDurationHours.toFixed(2)}h`);
    console.log(`  -> Adding ${totalSessionDurationHours.toFixed(2)}h to ${existingDurationHours.toFixed(2)}h = ${newDurationHours.toFixed(2)}h`);
    console.log(`  -> Adding $${sessionCost.toFixed(2)} to $${existingCost.toFixed(2)} = $${newCost.toFixed(2)}`);

    // 5. Update the booking record
    await base(BOOKINGS_TABLE).update(bookingRecordId, {
      [CLEANING_DURATION_FIELD]: newDurationSeconds,
      [CONSUMABLES_COST_FIELD]: newCost,
    });

    console.log(`  -> Successfully updated booking ${bookingRecordId}`);

    res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating booking with cleaning data:', errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
