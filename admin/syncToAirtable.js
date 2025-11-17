#!/usr/bin/env node

/**
 * Admin Script: Sync Completed Cleaning Sessions to Airtable
 *
 * Usage: node admin/syncToAirtable.js <sessions-export.json>
 *
 * This script:
 * 1. Reads exported completed sessions from a JSON file
 * 2. Calculates total consumable costs
 * 3. Formats cleaning duration
 * 4. Updates Airtable Bookings records with cleaning data
 */

require('dotenv').config();
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// Load consumables data with prices
const consumablesData = require('../data/consumables.ts');

// Configuration from environment variables
const AIRTABLE_API_KEY = process.env.EXPO_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID;
const BOOKINGS_TABLE = process.env.EXPO_PUBLIC_AIRTABLE_BOOKINGS_TABLE || 'Bookings';
const CLEANING_DURATION_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_CLEANING_DURATION_FIELD || 'Cleaning Time';
const CONSUMABLES_COST_FIELD = process.env.EXPO_PUBLIC_AIRTABLE_CONSUMABLES_COST_FIELD || 'Linen Cost';

// Validate configuration
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: Airtable credentials not configured');
  console.error('Please set EXPO_PUBLIC_AIRTABLE_API_KEY and EXPO_PUBLIC_AIRTABLE_BASE_ID in .env file');
  process.exit(1);
}

// Initialize Airtable
Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

/**
 * Calculate total consumables cost
 */
function calculateConsumablesCost(consumables, consumableItems) {
  let total = 0;

  for (const [itemId, quantity] of Object.entries(consumables)) {
    if (quantity > 0) {
      const item = consumableItems.find(i => i.id === itemId);
      if (item) {
        total += item.price * quantity;
      }
    }
  }

  return Math.round(total * 100) / 100;
}

/**
 * Format duration from milliseconds to decimal hours
 */
function formatDurationAsDecimalHours(durationMs) {
  const hours = durationMs / 1000 / 60 / 60;
  return Math.round(hours * 100) / 100;
}

/**
 * Format duration as human-readable string (e.g., "2h 30m")
 */
function formatDurationHumanReadable(durationMs) {
  const totalMinutes = Math.floor(durationMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Sync a single session to Airtable
 */
async function syncSessionToAirtable(session, consumableItems, dryRun = false) {
  try {
    const recordId = session.propertyId; // Using property ID as Airtable record ID
    const consumablesCost = calculateConsumablesCost(session.consumables, consumableItems);
    const durationHours = formatDurationAsDecimalHours(session.duration);
    const durationReadable = formatDurationHumanReadable(session.duration);

    console.log(`\n📍 ${session.property.name}`);
    console.log(`   Cleaner: ${session.cleaner.name}`);
    console.log(`   Duration: ${durationReadable} (${durationHours} hours)`);
    console.log(`   Consumables Cost: $${consumablesCost.toFixed(2)}`);

    if (dryRun) {
      console.log(`   [DRY RUN] Would update record: ${recordId}`);
      return { success: true, dryRun: true };
    }

    // Update Airtable record
    await base(BOOKINGS_TABLE).update(recordId, {
      [CLEANING_DURATION_FIELD]: durationHours,
      [CONSUMABLES_COST_FIELD]: consumablesCost,
    });

    console.log(`   ✓ Updated successfully`);
    return { success: true };

  } catch (error) {
    console.error(`   ❌ Error updating record:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main sync function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Get JSON file path
  let jsonFilePath = args.find(arg => arg.endsWith('.json'));

  if (!jsonFilePath) {
    console.error('❌ Error: No JSON file provided');
    console.error('Usage: node admin/syncToAirtable.js <sessions-export.json>');
    console.error('   or: node admin/syncToAirtable.js <sessions-export.json> --dry-run');
    process.exit(1);
  }

  // Resolve file path
  jsonFilePath = path.resolve(jsonFilePath);

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ Error: File not found: ${jsonFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Airtable Sync Script');
  console.log('========================\n');
  console.log(`📄 Reading sessions from: ${path.basename(jsonFilePath)}`);

  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made to Airtable\n');
  }

  // Load sessions data
  const sessionsData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  const sessions = Array.isArray(sessionsData) ? sessionsData : [sessionsData];

  console.log(`Found ${sessions.length} session(s) to sync\n`);

  // Load consumables items (with prices)
  // Note: This assumes the consumables.ts file exports consumableItems
  // If it's TypeScript, you may need to compile it first or use a different approach
  const consumableItems = [
    // You'll need to paste the consumable items with prices here
    // or import them from the compiled JavaScript
    { id: 'king_sheets', price: 5.00 },
    { id: 'queen_sheets', price: 4.50 },
    { id: 'single_sheets', price: 3.50 },
    { id: 'pillowcases', price: 1.00 },
    { id: 'duvet_covers', price: 4.00 },
    { id: 'bath_towels', price: 2.50 },
    { id: 'hand_towels', price: 1.50 },
    { id: 'face_cloths', price: 0.75 },
    { id: 'bath_mats', price: 2.00 },
    { id: 'toilet_paper', price: 0.50 },
    { id: 'hand_soap', price: 1.25 },
    { id: 'body_wash', price: 1.50 },
    { id: 'shampoo', price: 1.50 },
    { id: 'conditioner', price: 1.50 },
    { id: 'coffee', price: 2.00 },
    { id: 'tea', price: 1.50 },
    { id: 'sugar', price: 1.00 },
    { id: 'milk', price: 2.50 },
    { id: 'dishwashing_liquid', price: 2.00 },
  ];

  // Sync each session
  const results = [];
  for (const session of sessions) {
    const result = await syncSessionToAirtable(session, consumableItems, dryRun);
    results.push(result);
  }

  // Summary
  console.log('\n========================');
  console.log('📊 Sync Summary');
  console.log('========================');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✓ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }

  if (dryRun) {
    console.log('\n🧪 This was a DRY RUN - no changes were made');
    console.log('Run without --dry-run to apply changes');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
