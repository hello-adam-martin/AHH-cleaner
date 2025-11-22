import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAirtableBase, CLEANERS_TABLE } from './_lib/airtable';

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
    return res.status(500).json({ error: 'Airtable not configured' });
  }

  try {
    console.log('Fetching cleaners from Airtable...');

    const records = await base(CLEANERS_TABLE)
      .select({
        fields: ['Name', 'PIN', 'Avatar Color', 'Active'],
      })
      .all();

    console.log(`Found ${records.length} cleaners`);

    const cleaners = records
      .filter((record: any) => record.fields['Active'] !== false)
      .map((record: any) => ({
        id: record.id,
        name: String(record.fields['Name'] || 'Unknown'),
        avatarColor: String(record.fields['Avatar Color'] || '#999999'),
        pin: String(record.fields['PIN'] || '0000'),
      }));

    console.log(`Returning ${cleaners.length} active cleaners`);

    res.status(200).json(cleaners);
  } catch (error) {
    console.error('Error fetching cleaners:', error);
    res.status(500).json({ error: 'Failed to fetch cleaners' });
  }
}
