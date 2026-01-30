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
  propertyRecordId?: string; // Airtable Property record ID (for updating status)
  propertyStatus?: string; // "Ready for guests" or "Needs Cleaning" from Airtable
  name: string;
  address: string;
  checkoutDate?: string;
  checkinDate?: string;
  nextCheckinDate?: string; // Next booking's check-in date
  notes?: string;
  imageUrl?: string;
  cleaningTime?: number; // Total cleaning time in hours (from Airtable)
  consumablesCost?: number; // Total consumables cost in dollars (from Airtable)
  guestCount?: number; // Number of guests staying (from Airtable) - checkout guests
  nextGuestCount?: number; // Number of guests in next booking (checking in)
  nextCheckoutDate?: string; // When next booking ends (to calculate nights)
  isOverdue?: boolean; // True if checkout date is before today (missed cleaning)
  isBlocked?: boolean; // True if from Blocked Dates table
  blockedReason?: string; // Reason field from Blocked Dates
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

// Immutable snapshot of property data captured at session start
// This ensures session data integrity even if properties list changes
export interface PropertySnapshot {
  id: string;           // Booking ID for Airtable sync
  propertyRecordId?: string; // Property record ID for status updates
  name: string;         // Property name at session start
  address: string;      // Address at session start
  isBlocked?: boolean;  // Whether this was a blocked date
}

export interface CleaningSession {
  id: string;
  propertyId: string;
  cleanerId: string;
  startTime: number; // Unix timestamp when current timing segment started
  endTime?: number; // Unix timestamp when completed
  accumulatedDuration: number; // Time accumulated from previous stop/starts in milliseconds
  consumables: Consumables;
  status: 'active' | 'stopped' | 'completed';
  notes?: string;
  // Helper tracking
  helperStartTime?: number; // When helper timer was started
  helperAccumulatedDuration: number; // Time accumulated from previous stop/starts
  helperActive: boolean; // Whether helper timer is currently running
  // Property snapshot - captured at session start for data integrity
  propertySnapshot?: PropertySnapshot;
  sessionDate?: string; // ISO date (YYYY-MM-DD) when session was created
}

export interface PropertyWithStatus extends Property {
  status: PropertyStatus;
  activeCleaners: Cleaner[];
  activeSessions: CleaningSession[];
  syncStatus?: 'synced' | 'pending' | 'none'; // Sync status for completed sessions
}

export interface CompletedSession extends CleaningSession {
  endTime: number;
  property: Property;
  cleaner: Cleaner;
  duration: number; // Total duration in milliseconds (accumulated from all stop/starts)
  syncedToAirtable?: boolean; // Whether this session has been synced to Airtable
  syncError?: string; // Error message if sync failed
}

export interface LostPropertyItem {
  id: string;
  bookingId: string; // Links to the booking record in Airtable
  description: string;
  reportedAt: number;
}

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'appliance'
  | 'hvac'
  | 'structural'
  | 'furniture'
  | 'outdoor'
  | 'other';

export type MaintenancePriority = 'urgent' | 'normal';

export interface MaintenanceIssue {
  id: string;
  bookingId: string; // Links to the booking record in Airtable
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  reportedAt: number;
}

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  appliance: 'Appliance',
  hvac: 'Heating/Cooling',
  structural: 'Structural/Building',
  furniture: 'Furniture',
  outdoor: 'Outdoor/Garden',
  other: 'Other',
};
