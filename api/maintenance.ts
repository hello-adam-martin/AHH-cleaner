import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { getAirtableBase } from './_lib/airtable';

const MAINTENANCE_TABLE = 'Maintenance';

/**
 * Upload a base64 image to Vercel Blob and return the URL
 */
async function uploadPhotoToBlob(base64Data: string): Promise<string> {
  // Extract the base64 content (remove data:image/jpeg;base64, prefix)
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image format');
  }

  const imageType = matches[1];
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, 'base64');

  // Generate unique filename
  const filename = `maintenance/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${imageType}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: `image/${imageType}`,
  });

  return blob.url;
}

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
    const { bookingId, category, priority, description, photoBase64 } = req.body;

    // Validate required fields
    if (!bookingId || !category || !priority || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log(`Creating maintenance record for booking ${bookingId}...`);

    // Upload photo to Vercel Blob if provided
    let photoUrl: string | undefined;
    if (photoBase64) {
      console.log('  -> Uploading photo to Vercel Blob...');
      photoUrl = await uploadPhotoToBlob(photoBase64);
      console.log(`  -> Photo uploaded: ${photoUrl}`);
    }

    // Create the record
    await base(MAINTENANCE_TABLE).create({
      'booking': [bookingId],
      'category': category,
      'priority': priority === 'urgent' ? 'Urgent' : 'Normal',
      'description': description,
      'photo': photoUrl ? [{ url: photoUrl }] : undefined,
      'status': 'Reported',
    });

    console.log(`  -> Successfully created maintenance record`);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error creating maintenance record:', error);
    const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
