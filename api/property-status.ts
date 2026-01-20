import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAirtableBase, PROPERTIES_TABLE } from './_lib/airtable';

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
    const { propertyRecordId, status } = req.body;

    // Validate required fields
    if (!propertyRecordId) {
      return res.status(400).json({ success: false, error: 'Missing propertyRecordId' });
    }

    if (!status) {
      return res.status(400).json({ success: false, error: 'Missing status' });
    }

    // Validate status value
    const validStatuses = ['Ready for guests', 'Needs Cleaning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`Updating property ${propertyRecordId} status to "${status}"...`);

    // Update the property status
    await base(PROPERTIES_TABLE).update(propertyRecordId, {
      'Status': status,
    });

    console.log(`  -> Property status updated successfully`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating property status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update property status' });
  }
}
