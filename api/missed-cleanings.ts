import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAirtableBase,
  getTodayDateString,
  getDateDaysAgo,
  BOOKINGS_TABLE,
  PROPERTIES_TABLE,
  CHECKOUT_DATE_FIELD,
  CHECKIN_DATE_FIELD,
  PROPERTY_LINK_FIELD,
  CLEANING_DURATION_FIELD,
  CONSUMABLES_COST_FIELD,
} from './_lib/airtable';

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
    const todayDate = getTodayDateString();
    const sevenDaysAgo = getDateDaysAgo(7);

    console.log(`Fetching missed cleanings from ${sevenDaysAgo} to ${todayDate}...`);

    // Query bookings from the last 7 days where Cleaning Time is 0 or empty
    const records = await base(BOOKINGS_TABLE)
      .select({
        filterByFormula: `AND(
          {${CHECKOUT_DATE_FIELD}} >= '${sevenDaysAgo}',
          {${CHECKOUT_DATE_FIELD}} < '${todayDate}',
          OR({${CLEANING_DURATION_FIELD}} = 0, {${CLEANING_DURATION_FIELD}} = BLANK())
        )`,
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
          'Guests',
        ],
        sort: [{ field: CHECKOUT_DATE_FIELD, direction: 'desc' }],
      })
      .all();

    console.log(`Found ${records.length} missed cleanings`);

    const properties = [];

    for (const record of records) {
      const fields = record.fields as any;

      let propertyName = fields['Property Name'] || fields[PROPERTY_LINK_FIELD];
      let propertyAddress = fields['Address (from Property)'] || '';

      // If property is linked, fetch details from Properties table
      if (Array.isArray(fields[PROPERTY_LINK_FIELD]) && fields[PROPERTY_LINK_FIELD][0]) {
        try {
          const propertyRecordId = fields[PROPERTY_LINK_FIELD][0];
          const propertyRecord = await base(PROPERTIES_TABLE).find(propertyRecordId);
          propertyName = propertyRecord.fields['Name'] || propertyName;
          propertyAddress = propertyRecord.fields['Address'] || propertyAddress;
        } catch (error) {
          console.warn('Could not fetch linked property details:', error);
        }
      }

      const guestCount = (fields['Guests'] as number) || undefined;

      properties.push({
        id: record.id,
        name: String(propertyName || 'Unknown Property'),
        address: String(propertyAddress || ''),
        checkoutDate: fields[CHECKOUT_DATE_FIELD] as string,
        checkinDate: fields[CHECKIN_DATE_FIELD] as string,
        notes: fields['Notes'] as string,
        cleaningTime: 0,
        consumablesCost: 0,
        guestCount,
      });
    }

    console.log(`Returning ${properties.length} missed cleaning properties`);

    res.status(200).json(properties);
  } catch (error) {
    console.error('Error fetching missed cleanings:', error);
    res.status(500).json({ error: 'Failed to fetch missed cleanings' });
  }
}
