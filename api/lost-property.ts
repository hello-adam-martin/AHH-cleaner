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
    // Note: photoBase64 disabled for now - Airtable has request size limits
    // TODO: Upload to Cloudinary or similar first, then pass URL to Airtable
    await base(LOST_PROPERTY_TABLE).create({
      'booking': [bookingId],
      'description': description,
      'status': 'Reported',
    });

    console.log(`  -> Successfully created lost property record`);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error creating lost property record:', error);
    const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
