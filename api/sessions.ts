import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAirtableBase,
  BOOKINGS_TABLE,
  CLEANING_DURATION_FIELD,
  CONSUMABLES_COST_FIELD,
  SYNCED_SESSION_IDS_FIELD,
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

    // Validate session ID for idempotency
    if (!session.sessionId) {
      return res.status(400).json({ success: false, error: 'Missing sessionId for idempotency check' });
    }

    const recordId = session.propertyId;
    const isBlocked = session.isBlocked === true;
    const tableName = isBlocked ? 'Blocked Dates' : BOOKINGS_TABLE;

    console.log(`Updating ${isBlocked ? 'blocked date' : 'booking'} ${recordId} with cleaning data...`);

    // 1. Fetch current record
    const record = await base(tableName).find(recordId);
    const fields = record.fields as any;

    // 2. Check if this session was already synced (idempotency)
    const syncedIdsRaw = fields[SYNCED_SESSION_IDS_FIELD] as string | undefined;
    const syncedIds: string[] = syncedIdsRaw?.split(',').filter(Boolean) || [];
    if (syncedIds.includes(session.sessionId)) {
      console.log(`  -> Session ${session.sessionId} already synced, skipping (idempotent)`);
      return res.status(200).json({ success: true, alreadySynced: true });
    }

    // 3. Get existing values (default to 0 if not set)
    const existingDurationSeconds = (fields[CLEANING_DURATION_FIELD] as number) || 0;
    const existingCost = (fields[CONSUMABLES_COST_FIELD] as number) || 0;

    // 4. Calculate session values
    // Note: session.duration already includes cleaner + helper time (combined on client in historyStore.ts)
    // We receive helperAccumulatedDuration separately only for logging purposes
    const totalSessionDurationMs = session.duration;
    const totalSessionDurationSeconds = totalSessionDurationMs / 1000;
    // Helper time is already included in duration - this is just for logging
    const helperDurationMs = session.helperAccumulatedDuration || 0;
    const cleanerDurationMs = totalSessionDurationMs - helperDurationMs;

    // Calculate consumables cost
    const sessionCost = calculateConsumablesTotalCost(session.consumables || {});

    // 4. Calculate new totals
    const newDurationSeconds = Math.round(existingDurationSeconds + totalSessionDurationSeconds);
    const newCost = Math.round((existingCost + sessionCost) * 100) / 100;

    // Logging for debugging
    const existingDurationHours = existingDurationSeconds / 3600;
    const cleanerDurationHours = cleanerDurationMs / 1000 / 3600;
    const helperDurationHours = helperDurationMs / 1000 / 3600;
    const totalSessionDurationHours = totalSessionDurationMs / 1000 / 3600;
    const newDurationHours = newDurationSeconds / 3600;

    console.log(`  -> Session ID: ${session.sessionId}`);
    console.log(`  -> Cleaner time: ${cleanerDurationHours.toFixed(2)}h, Helper time: ${helperDurationHours.toFixed(2)}h (combined: ${totalSessionDurationHours.toFixed(2)}h)`);
    console.log(`  -> Adding ${totalSessionDurationHours.toFixed(2)}h to ${existingDurationHours.toFixed(2)}h = ${newDurationHours.toFixed(2)}h`);
    console.log(`  -> Adding $${sessionCost.toFixed(2)} to $${existingCost.toFixed(2)} = $${newCost.toFixed(2)}`);

    // 5. Update the record with session ID tracking for idempotency
    const newSyncedIds = [...syncedIds, session.sessionId].join(',');
    await base(tableName).update(recordId, {
      [CLEANING_DURATION_FIELD]: newDurationSeconds,
      [CONSUMABLES_COST_FIELD]: newCost,
      [SYNCED_SESSION_IDS_FIELD]: newSyncedIds,
    });

    console.log(`  -> Successfully updated ${isBlocked ? 'blocked date' : 'booking'} ${recordId}`);

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
