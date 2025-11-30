# Future Improvements

This document tracks features and improvements for the production deployment.

## Recommended Improvements

### 1. Cleaner PIN Management in Airtable

**Priority:** MEDIUM

Currently, PINs are stored in plain text in Airtable. Consider:
- Hashing PINs before storing them (though this is less critical for a small team)
- Adding a "Reset PIN" feature in the app
- Admin interface to manage cleaners and PINs

### 2. Session Persistence & Auto-Login

**Priority:** LOW

Currently, the app requires re-authentication on each reload. Consider:
- Implementing "Remember Me" functionality
- Auto-login with stored credentials (with timeout for security)
- Session timeout after X hours of inactivity

### 3. Better Error Handling

**Priority:** MEDIUM

Improve user experience when things go wrong:
- Network error messages when Airtable/backend is unavailable
- Retry logic for failed API calls
- Offline mode with data sync when connection restored
- Loading states for all async operations

### 4. Audit Trail

**Priority:** LOW

Track authentication events:
- Log successful logins to Airtable (timestamp, cleaner)
- Log failed login attempts
- Track when data is synced to Airtable
- Session duration tracking

### 5. Data Validation

**Priority:** MEDIUM

Add validation for:
- PIN format (ensure 4 digits)
- Cleaner data from Airtable (ensure required fields exist)
- Property data validation
- Consumables data validation

### 6. Performance Optimizations

**Priority:** LOW

- Implement data pagination for large history lists
- Add image optimization for property photos (if added)
- Optimize bundle size for web deployment
- Add service worker for offline support

### 7. Testing

**Priority:** MEDIUM

Before production:
- Unit tests for stores (Zustand)
- Integration tests for backend API service
- E2E tests for critical flows (login, cleaning session)
- Test error scenarios (network failures, invalid data)

### 8. API Rate Limiting & Authentication

**Priority:** LOW

Add additional security to backend API:
- Rate limiting to prevent abuse
- API key authentication for client requests
- Request signing for sensitive operations

---

## Nice-to-Have Features

### Notifications
- Push notifications for new properties added
- Reminders for incomplete sessions
- End-of-day summary

### Reporting
- Weekly/monthly reports sent to admin
- Charts and analytics dashboard in Airtable or separate admin panel
- Performance metrics (average cleaning time, consumables usage trends)

### Multi-language Support
- Add i18n for different languages
- Useful if hiring cleaners who speak different languages

### Property Photos
- Upload photos before/after cleaning
- Store in Airtable attachments or cloud storage
- Visual record of cleaning quality

### Enhanced Time Tracking
- Timer history with pause/resume events
- Automatic break detection
- GPS check-in/check-out for properties (verify cleaner is on-site)
- Time comparison vs. estimated cleaning duration

---

## Notes

**Current Status:**
- PIN authentication implemented
- Backend API implemented (Vercel Serverless Functions)
- Airtable API key secured (server-side only)
- Login/logout functionality complete
- Multi-cleaner support (multiple cleaners can work on same property)
- Helper timer tracking
- Time adjustment with +/- buttons (1m, 5m, 15m increments)
- Real-time property status updates
- Consumables tracking and Airtable sync
- History view with statistics
- Deployed to Vercel (production)
- Session persistence / auto-login not implemented

**Backend API Endpoints:**
```
GET  /api/cleaners    - Fetch all active cleaners
GET  /api/properties  - Fetch today's properties (checkouts)
POST /api/sessions    - Save completed session to Airtable
GET  /api/health      - Test Airtable connection
```

**Environment Variables:**
- Server-side (Vercel): `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, etc.
- Client-side: `EXPO_PUBLIC_API_URL` (optional, defaults to `/api`)

**Production Deployment Checklist:**
1. **RECOMMENDED:** Add better error handling and retry logic
2. **RECOMMENDED:** Implement session persistence
3. **OPTIONAL:** Add comprehensive testing
4. **OPTIONAL:** Add data validation
5. **OPTIONAL:** Add API rate limiting

**Last Updated:** 2025-11-20
