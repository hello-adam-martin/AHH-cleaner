import { consumableItems } from '@/data/consumables';
import type { Consumables } from '@/types';

/**
 * Calculate the total dollar value of consumables used
 * @param consumables - Object mapping consumable IDs to quantities used
 * @returns Total cost in dollars
 */
export function calculateConsumablesValue(consumables: Consumables): number {
  let total = 0;

  // Iterate through all consumed items
  for (const [itemId, quantity] of Object.entries(consumables)) {
    if (quantity > 0) {
      // Find the item in our consumables list
      const item = consumableItems.find((i) => i.id === itemId);
      if (item) {
        total += item.price * quantity;
      }
    }
  }

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}

/**
 * Get a detailed breakdown of consumables used with costs
 * @param consumables - Object mapping consumable IDs to quantities used
 * @returns Array of items with quantities and costs
 */
export function getConsumablesBreakdown(consumables: Consumables) {
  const breakdown: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }> = [];

  for (const [itemId, quantity] of Object.entries(consumables)) {
    if (quantity > 0) {
      const item = consumableItems.find((i) => i.id === itemId);
      if (item) {
        breakdown.push({
          id: item.id,
          name: item.name,
          quantity,
          price: item.price,
          total: Math.round(item.price * quantity * 100) / 100,
        });
      }
    }
  }

  return breakdown;
}

/**
 * Format duration from milliseconds to human-readable format
 * @param durationMs - Duration in milliseconds
 * @returns Formatted string (e.g., "2h 30m" or "45m")
 */
export function formatDurationForSync(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format duration in decimal hours (for Airtable number fields)
 * @param durationMs - Duration in milliseconds
 * @returns Duration in decimal hours (e.g., 2.5 for 2h 30m)
 */
export function formatDurationAsDecimalHours(durationMs: number): number {
  const hours = durationMs / 1000 / 60 / 60;
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
}
