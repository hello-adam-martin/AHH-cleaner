import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAirtableBase, BOOKINGS_TABLE } from './_lib/airtable';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const base = getAirtableBase();
  if (!base) {
    return res.status(500).json({ connected: false, error: 'Airtable not configured' });
  }

  try {
    // Try to fetch a single record to test connection
    await base(BOOKINGS_TABLE).select({ maxRecords: 1 }).firstPage();

    res.status(200).json({ connected: true });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ connected: false, error: 'Connection test failed' });
  }
}
