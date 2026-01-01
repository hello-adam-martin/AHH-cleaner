import Airtable from 'airtable';

// Server-side environment variables (NO EXPO_PUBLIC_ prefix)
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

// Table names
export const BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';
export const PROPERTIES_TABLE = process.env.AIRTABLE_PROPERTIES_TABLE || 'Properties';
export const CLEANERS_TABLE = process.env.AIRTABLE_CLEANERS_TABLE || 'Cleaners';

// Field names
export const CHECKOUT_DATE_FIELD = process.env.AIRTABLE_CHECKOUT_DATE_FIELD || 'Check Out';
export const CHECKIN_DATE_FIELD = process.env.AIRTABLE_CHECKIN_DATE_FIELD || 'Check In';
export const PROPERTY_LINK_FIELD = process.env.AIRTABLE_PROPERTY_LINK_FIELD || 'Property';
export const CLEANING_DURATION_FIELD = process.env.AIRTABLE_CLEANING_DURATION_FIELD || 'Cleaning Time';
export const CONSUMABLES_COST_FIELD = process.env.AIRTABLE_CONSUMABLES_COST_FIELD || 'Linen Costs';

let base: Airtable.Base | null = null;

export function getAirtableBase(): Airtable.Base | null {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('Airtable not configured - missing API key or Base ID');
    return null;
  }

  if (!base) {
    try {
      Airtable.configure({ apiKey: AIRTABLE_API_KEY });
      base = Airtable.base(AIRTABLE_BASE_ID);
    } catch (error) {
      console.error('Failed to initialize Airtable:', error);
      return null;
    }
  }

  return base;
}

export function getTodayDateString(): string {
  // Use New Zealand timezone since properties are in Akaroa, NZ
  const nzDate = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Pacific/Auckland'
  });
  // en-CA locale gives us YYYY-MM-DD format
  return nzDate;
}

export function getDateDaysAgo(days: number): string {
  // Get date N days ago in NZ timezone
  const date = new Date();
  date.setDate(date.getDate() - days);
  const nzDate = date.toLocaleDateString('en-CA', {
    timeZone: 'Pacific/Auckland'
  });
  return nzDate;
}

// Consumable prices (duplicated from client for server-side calculation)
export const consumablePrices: { [key: string]: number } = {
  king_sheets: 3.00,
  queen_sheets: 2.50,
  single_sheets: 2.50,
  pillowcases: 1.20,
  bath_towels: 1.65,
  hand_towels: 0.00,
  face_cloths: 0.00,
  bath_mats: 0.00,
  tea_towels: 0.00,
  toilet_paper: 0.50,
  hand_soap: 1.25,
  body_wash: 1.50,
  shampoo: 1.50,
  conditioner: 1.50,
  instant_coffee: 2.00,
  coffee_pods: 2.00,
  tea: 1.50,
  sugar: 1.00,
  milk: 1.79,
  dishwashing_liquid: 2.00,
};

export function calculateConsumablesTotalCost(consumables: { [key: string]: number }): number {
  let total = 0;
  Object.entries(consumables).forEach(([itemId, quantity]) => {
    if (quantity > 0 && consumablePrices[itemId] !== undefined) {
      total += consumablePrices[itemId] * quantity;
    }
  });
  return total;
}
