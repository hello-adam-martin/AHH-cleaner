# Admin Sync Script

This directory contains the admin script for syncing completed cleaning sessions back to Airtable.

## Overview

The `syncToAirtable.js` script reads exported cleaning session data from the app and updates Airtable Bookings records with:
- Cleaning duration (in decimal hours)
- Total consumables cost (calculated from individual item counts × prices)

## Prerequisites

- Node.js installed
- `.env` file configured with Airtable credentials
- Exported sessions JSON file from the cleaner app

## Usage

### 1. Export Sessions from App

Use the "Export Today's Sessions" feature in the app to create a JSON file with all completed cleanings.

### 2. Run the Sync Script

**Dry Run (recommended first):**
```bash
node admin/syncToAirtable.js sessions-export.json --dry-run
```

This will show what changes would be made without actually updating Airtable.

**Actual Sync:**
```bash
node admin/syncToAirtable.js sessions-export.json
```

## What It Does

For each completed session in the export file:

1. **Calculates Consumables Cost:**
   - Multiplies each item quantity by its price
   - Sums up the total cost
   - Example: 2 king sheets ($5 each) + 4 towels ($2.50 each) = $20

2. **Formats Cleaning Duration:**
   - Converts milliseconds to decimal hours
   - Example: 2h 30m = 2.5 hours

3. **Updates Airtable:**
   - Finds the Booking record by property ID
   - Updates the "Cleaning Time" field with duration
   - Updates the "Linen Cost" field with consumables cost

## Example Output

```
🚀 Airtable Sync Script
========================

📄 Reading sessions from: sessions-2025-01-17.json
Found 3 session(s) to sync

📍 Beachside Villa
   Cleaner: Adam
   Duration: 2h 30m (2.5 hours)
   Consumables Cost: $35.50
   ✓ Updated successfully

📍 Harbour View Apartment
   Cleaner: Betti
   Duration: 1h 45m (1.75 hours)
   Consumables Cost: $22.00
   ✓ Updated successfully

========================
📊 Sync Summary
========================
✓ Successful: 3
```

## Troubleshooting

### "Airtable credentials not configured"
- Make sure `.env` file exists in the root directory
- Check that `EXPO_PUBLIC_AIRTABLE_API_KEY` and `EXPO_PUBLIC_AIRTABLE_BASE_ID` are set

### "Record not found"
- The property ID in the export doesn't match any Airtable record
- This can happen if properties were synced from Airtable on a different day
- Check the Airtable record IDs

### "Permission denied"
- Your Airtable API key may not have write access
- Generate a new Personal Access Token with write permissions

## Updating Prices

If consumable prices change, update the `consumableItems` array in the script with the new prices.

Better yet, keep prices in sync with `data/consumables.ts` in the main app.

## Scheduling

You can schedule this script to run automatically each evening:

**macOS/Linux (crontab):**
```
0 18 * * * cd /path/to/ahh-cleaner && node admin/syncToAirtable.js ~/exports/latest.json
```

**Windows (Task Scheduler):**
Create a task that runs the script at your desired time.

## Security

- Never commit the `.env` file or API keys to git
- Keep session export files private (they contain cleaning details)
- Use secure file transfer methods if emailing exports
