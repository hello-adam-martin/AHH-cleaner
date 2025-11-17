export enum PropertyStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Cleaner {
  id: string;
  name: string;
  avatarColor: string;
  pin: string; // 4-digit PIN for authentication
}

export interface Property {
  id: string;
  name: string;
  address: string;
  checkoutDate?: string;
  checkinDate?: string;
  nextCheckinDate?: string; // Next booking's check-in date
  notes?: string;
  imageUrl?: string;
  cleaningTime?: number; // Total cleaning time in hours (from Airtable)
  consumablesCost?: number; // Total consumables cost in dollars (from Airtable)
}

export interface ConsumableItem {
  id: string;
  category: string;
  name: string;
  order: number;
  price: number; // Price in dollars per unit
}

export interface ConsumableCategory {
  id: string;
  name: string;
  order: number;
}

export interface Consumables {
  [key: string]: number; // consumable item id -> quantity
}

export interface CleaningSession {
  id: string;
  propertyId: string;
  cleanerId: string;
  startTime: number; // Unix timestamp
  endTime?: number; // Unix timestamp
  pausedAt?: number; // Unix timestamp when paused
  totalPausedDuration: number; // Total time paused in milliseconds
  consumables: Consumables;
  status: 'active' | 'paused' | 'completed';
  notes?: string;
}

export interface PropertyWithStatus extends Property {
  status: PropertyStatus;
  activeCleaners: Cleaner[];
  activeSessions: CleaningSession[];
}

export interface CompletedSession extends CleaningSession {
  endTime: number;
  property: Property;
  cleaner: Cleaner;
  duration: number; // Total duration in milliseconds (excluding paused time)
  syncedToAirtable?: boolean; // Whether this session has been synced to Airtable
  syncError?: string; // Error message if sync failed
}
