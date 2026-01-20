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

interface NextBookingInfo {
  checkinDate?: string;
  checkoutDate?: string;
  guests?: number;
}

async function fetchNextBookingInfo(base: any, propertyId: string): Promise<NextBookingInfo | undefined> {
  try {
    const todayDate = getTodayDateString();
    console.log(`Fetching next booking for property ID: ${propertyId} (today: ${todayDate})...`);

    const records = await base(BOOKINGS_TABLE)
      .select({
        filterByFormula: `AND(
          {Property ID} = "${propertyId}",
          {${CHECKIN_DATE_FIELD}} >= '${todayDate}'
        )`,
        fields: [CHECKIN_DATE_FIELD, CHECKOUT_DATE_FIELD, 'Guests'],
        sort: [{ field: CHECKIN_DATE_FIELD, direction: 'asc' }],
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      const fields = records[0].fields as any;
      const checkinDate = fields[CHECKIN_DATE_FIELD] as string;
      const checkoutDate = fields[CHECKOUT_DATE_FIELD] as string;
      const guests = fields['Guests'] as number;
      console.log(`  -> Found next booking: check-in ${checkinDate}, checkout ${checkoutDate}, ${guests} guests`);
      return { checkinDate, checkoutDate, guests };
    }

    console.log(`  -> No future booking found`);
    return undefined;
  } catch (error) {
    console.warn('Could not fetch next booking info:', error);
    return undefined;
  }
}

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
    console.log(`Fetching checkouts from ${sevenDaysAgo} to ${todayDate}...`);

    // Fetch today's checkouts (all of them)
    // AND past 7 days checkouts where Cleaning Time = 0 (missed cleanings)
    const records = await base(BOOKINGS_TABLE)
      .select({
        filterByFormula: `OR(
          IS_SAME({${CHECKOUT_DATE_FIELD}}, '${todayDate}', 'day'),
          AND(
            {${CHECKOUT_DATE_FIELD}} >= '${sevenDaysAgo}',
            {${CHECKOUT_DATE_FIELD}} < '${todayDate}',
            OR({${CLEANING_DURATION_FIELD}} = 0, {${CLEANING_DURATION_FIELD}} = BLANK())
          )
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
      })
      .all();

    console.log(`Found ${records.length} checkouts (today + missed)`);

    const properties = [];

    for (const record of records) {
      const fields = record.fields as any;

      let propertyName = fields['Property Name'] || fields[PROPERTY_LINK_FIELD];
      let propertyAddress = fields['Address (from Property)'] || '';
      let propertyRecordId: string | undefined;
      let nextBookingInfo: NextBookingInfo | undefined;

      const propertyId = fields['Property ID'] as string;

      // If property is linked, fetch details from Properties table
      if (Array.isArray(fields[PROPERTY_LINK_FIELD]) && fields[PROPERTY_LINK_FIELD][0]) {
        try {
          propertyRecordId = fields[PROPERTY_LINK_FIELD][0];
          const propertyRecord = await base(PROPERTIES_TABLE).find(propertyRecordId);
          propertyName = propertyRecord.fields['Name'] || propertyName;
          propertyAddress = propertyRecord.fields['Address'] || propertyAddress;

          // Fetch next booking info for this property using Property Id
          if (propertyId) {
            nextBookingInfo = await fetchNextBookingInfo(base, propertyId);
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
      const guestCount = (fields['Guests'] as number) || undefined;

      // Calculate isOverdue: true if checkout date is before today
      const checkoutDate = fields[CHECKOUT_DATE_FIELD] as string;
      const isOverdue = checkoutDate < todayDate;

      properties.push({
        id: record.id,
        propertyRecordId,
        name: String(propertyName || 'Unknown Property'),
        address: String(propertyAddress || ''),
        checkoutDate,
        checkinDate: fields[CHECKIN_DATE_FIELD] as string,
        nextCheckinDate: nextBookingInfo?.checkinDate,
        nextCheckoutDate: nextBookingInfo?.checkoutDate,
        nextGuestCount: nextBookingInfo?.guests,
        notes: fields['Notes'] as string,
        cleaningTime,
        consumablesCost,
        guestCount,
        isOverdue,
      });
    }

    // Fetch blocked dates ending today
    console.log(`Fetching blocked dates ending today (${todayDate})...`);
    const blockedRecords = await base('Blocked Dates')
      .select({
        filterByFormula: `IS_SAME({To}, '${todayDate}', 'day')`,
        fields: ['Property', 'From', 'To', 'Reason', 'Description', CLEANING_DURATION_FIELD, CONSUMABLES_COST_FIELD],
      })
      .all();

    console.log(`Found ${blockedRecords.length} blocked dates ending today`);

    for (const record of blockedRecords) {
      const fields = record.fields as any;

      let propertyName = 'Unknown Property';
      let propertyAddress = '';
      let propertyRecordId: string | undefined;

      // Fetch property details from linked property
      if (Array.isArray(fields['Property']) && fields['Property'][0]) {
        try {
          propertyRecordId = fields['Property'][0];
          const propertyRecord = await base(PROPERTIES_TABLE).find(propertyRecordId);
          propertyName = (propertyRecord.fields['Name'] as string) || propertyName;
          propertyAddress = (propertyRecord.fields['Address'] as string) || propertyAddress;
        } catch (error) {
          console.warn('Could not fetch linked property details for blocked date:', error);
        }
      }

      // Get cleaning time and consumables if already recorded
      const cleaningTimeRaw = (fields[CLEANING_DURATION_FIELD] as number) || 0;
      const cleaningTime = cleaningTimeRaw / 3600; // Convert seconds to hours
      const consumablesCost = (fields[CONSUMABLES_COST_FIELD] as number) || 0;

      properties.push({
        id: record.id,
        propertyRecordId,
        name: String(propertyName),
        address: String(propertyAddress),
        checkoutDate: fields['To'] as string,
        checkinDate: fields['From'] as string,
        notes: fields['Description'] as string,
        cleaningTime,
        consumablesCost,
        isBlocked: true,
        blockedReason: fields['Reason'] as string,
      });
    }

    console.log(`Returning ${properties.length} properties (including blocked dates)`);

    res.status(200).json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
}
