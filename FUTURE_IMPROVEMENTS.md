# Future Improvements

This document tracks features and improvements that should be implemented before production deployment.

## Critical - Security

### Backend API for Airtable Calls

**Priority:** HIGH - Required before web deployment

**Issue:**
Currently, the Airtable API key is exposed in the client-side code (`.env` file). When deployed to web, anyone can inspect the browser's network requests and extract the API key, giving them full access to your Airtable base.

**Solution:**
Move all Airtable API calls to a secure backend API. The client should call your backend, which then calls Airtable with the API key stored securely on the server.

**Implementation Steps:**

1. **Choose a backend solution:**
   - Option A: Vercel/Netlify Serverless Functions (easiest)
   - Option B: Express.js server on a VPS/hosting provider
   - Option C: Firebase Cloud Functions
   - Option D: AWS Lambda

2. **Create API endpoints:**
   ```
   POST /api/cleaners/fetch
   POST /api/properties/fetch
   POST /api/bookings/update
   POST /api/airtable/test-connection
   ```

3. **Update client code:**
   - Create new service file: `services/backendApiService.ts`
   - Replace direct Airtable calls in `services/airtableService.ts`
   - Update environment variables to use backend URL instead of Airtable credentials
   - Add error handling for API failures

4. **Environment variables:**
   ```
   # Client (.env)
   EXPO_PUBLIC_API_URL=https://your-backend.vercel.app/api

   # Server (Vercel/backend environment)
   AIRTABLE_API_KEY=patEIYMnCeiO85e1F...
   AIRTABLE_BASE_ID=appznxoEK7MOUBhTP
   ```

5. **Security considerations:**
   - Add rate limiting to prevent abuse
   - Implement authentication/authorization for API endpoints
   - Use CORS to restrict which domains can call your API
   - Consider adding request signing or API keys for client authentication

**Files to modify:**
- `services/airtableService.ts` - Update to call backend API instead of Airtable directly
- `.env` - Remove Airtable credentials, add backend API URL
- Create: `api/` folder with serverless functions or backend server

---

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
- Integration tests for Airtable service
- E2E tests for critical flows (login, cleaning session)
- Test error scenarios (network failures, invalid data)

---

## Nice-to-Have Features

### Notifications
- Push notifications for new properties added
- Reminders for incomplete sessions
- End-of-day summary

### Reporting
- Weekly/monthly reports sent to admin
- Export to PDF/Excel
- Charts and analytics dashboard

### Multi-language Support
- Add i18n for different languages
- Useful if hiring cleaners who speak different languages

### Property Photos
- Upload photos before/after cleaning
- Store in Airtable attachments or cloud storage
- Visual record of cleaning quality

---

## Notes

**Current Status:**
- ✅ PIN authentication implemented
- ✅ Airtable integration working
- ✅ Login/logout functionality complete
- ❌ Backend API not implemented (CRITICAL for production)
- ❌ Security improvements needed

**Before deploying to production web:**
1. MUST implement backend API
2. SHOULD add better error handling
3. SHOULD add data validation
4. SHOULD implement testing

**Last Updated:** 2025-11-17
