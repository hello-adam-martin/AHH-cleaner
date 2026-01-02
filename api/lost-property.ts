import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAirtableBase } from './_lib/airtable';

const LOST_PROPERTY_TABLE = 'Lost Property';

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
    const { bookingId, description, photoBase64 } = req.body;

    // Validate required fields
    if (!bookingId || !description) {
      return res.status(400).json({ success: false, error: 'Missing bookingId or description' });
    }

    console.log(`Creating lost property record for booking ${bookingId}...`);

    // Create the record
    await base(LOST_PROPERTY_TABLE).create({
      'booking': [bookingId],
      'description': description,
      'photo': photoBase64 ? [{ url: photoBase64 }] : undefined,
      'status': 'Reported',
    });

    console.log(`  -> Successfully created lost property record`);

    res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating lost property record:', errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
