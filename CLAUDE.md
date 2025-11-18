# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native mobile application built with Expo for managing cleaning operations for Akaroa Holiday Homes. Cleaners use this app to:
- View properties scheduled for cleaning today
- Track time spent cleaning each property with start/pause/resume functionality
- Record consumables used (sheets, towels, toiletries, coffee/supplies)
- View their cleaning history and statistics
- Support multiple cleaners working on the same property simultaneously

The app uses Expo Router for navigation and supports iOS, Android, and web platforms.

## Development Commands

### Running the Application
```bash
npm start                # Start Expo development server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run web              # Run in web browser
```

### Code Quality
```bash
npm run lint             # Run ESLint checks
```

### Project Management
```bash
npm run reset-project    # Move starter code to app-example/ and create blank app/
```

## Tech Stack

- **Framework**: Expo SDK ~54.0
- **React**: 19.1.0 (with React 19 features)
- **React Native**: 0.81.5
- **Navigation**: Expo Router (~6.0) with typed routes
- **State Management**: Zustand (^5.0.8)
- **Data Fetching**: TanStack React Query (^5.90.9)
- **Storage**: AsyncStorage (web uses localStorage)
- **Fonts**: @expo-google-fonts/nunito
- **Animations**: React Native Reanimated (~4.1.1)
- **New Architecture**: Enabled (newArchEnabled: true)
- **React Compiler**: Enabled (experimental)

## Project Structure

```
ahh-cleaner/
├── app/                           # File-based routing (Expo Router)
│   ├── _layout.tsx               # Root layout with font loading and initialization
│   ├── index.tsx                 # Routing logic (redirect to select or main)
│   ├── (auth)/
│   │   └── select.tsx            # Cleaner selection screen
│   └── (main)/
│       ├── _layout.tsx           # Tab navigation layout
│       ├── properties.tsx        # List of properties to clean today
│       ├── active.tsx            # Active cleaning timer screen
│       ├── history.tsx           # Completed cleanings history
│       ├── property/[id].tsx     # Property details and start cleaning
│       └── complete/[sessionId].tsx  # Complete cleaning form
├── components/                    # Reusable UI components
│   ├── PropertyCard.tsx          # Property list item with status
│   ├── CleanerBadge.tsx          # Cleaner avatar component
│   ├── TimerDisplay.tsx          # Timer display component
│   └── ConsumableCounter.tsx     # Counter for consumables
├── stores/                        # Zustand state management
│   ├── cleanerStore.ts           # Selected cleaner and cleaner list
│   ├── propertiesStore.ts        # Properties data
│   ├── sessionStore.ts           # Active cleaning sessions
│   └── historyStore.ts           # Completed cleaning sessions
├── types/                         # TypeScript type definitions
│   └── index.ts                  # All app types and interfaces
├── hooks/                         # Custom React hooks
│   └── useTimer.ts               # Timer logic with pause/resume
├── utils/                         # Utility functions
│   └── time.ts                   # Time formatting helpers
├── services/                      # Business logic and services
│   ├── storage.ts                # MMKV storage helpers
│   └── initializeApp.ts          # App initialization logic
├── data/                          # Static data and seed data
│   └── seedData.ts               # Sample properties and cleaners
├── constants/                     # App-wide constants
│   └── theme.ts                  # Theme colors and styling
└── assets/                        # Images, fonts, and static assets
```

## Architecture

### State Management
The app uses Zustand for state management with MMKV for persistence:
- **cleanerStore**: Manages selected cleaner and cleaner list
- **propertiesStore**: Manages property data
- **sessionStore**: Manages active cleaning sessions with timer state
- **historyStore**: Manages completed cleaning sessions

All stores persist to MMKV automatically and initialize on app launch via `initializeApp()`.

### Data Flow
1. **App Launch**: Root layout initializes stores from MMKV storage
2. **Cleaner Selection**: User selects identity (no password required)
3. **Properties View**: Displays all scheduled properties with real-time status based on active sessions
4. **Start Cleaning**: Creates a new session in sessionStore with timestamp
5. **Timer**: useTimer hook calculates elapsed time accounting for paused duration
6. **Complete**: Moves session from activeSessions to completedSessions with consumables data

### Routing
- Uses Expo Router's file-based routing system with groups
- `(auth)` group: Cleaner selection (not in tabs)
- `(main)` group: Tab navigation (Properties, Active, History)
- Dynamic routes for property details `[id]` and completion form `[sessionId]`
- Typed routes enabled via `experiments.typedRoutes`

### Styling
- Theme constants defined in `constants/theme.ts`
- Uses black/white color scheme with primary/secondary variants
- Nunito font family (Regular, SemiBold, Bold)
- Path alias `@/*` configured for cleaner imports (e.g., `@/constants/theme`)

### Configuration
- **TypeScript**: Strict mode enabled
- **Expo Config**: app.json contains platform-specific settings
  - iOS: Supports tablets
  - Android: Edge-to-edge enabled, adaptive icon configured
  - Web: Static output mode
- **Splash Screen**: Custom splash screen plugin with light/dark mode support
- **Scheme**: Deep linking via `ahhcleaner://`

### Code Quality
- ESLint with Expo config (flat config format)
- Auto-fix on save, organize imports, and sort members (VSCode settings)

## Key Dependencies

- **UI/UX**: expo-symbols (SF Symbols), expo-haptics, expo-image
- **Performance**: React Native Nitro Modules, React Native Worklets
- **Navigation**: React Navigation bottom tabs, native stack
- **Utilities**: expo-constants, expo-linking, expo-system-ui

## Development Notes

- **New Architecture**: This project uses React Native's new architecture - be mindful of compatibility when adding dependencies
- **React 19**: The project uses React 19, which may affect hooks usage and concurrent features
- **React Compiler**: Experimental React compiler is enabled - avoid manual memoization patterns that might conflict
- **Path Aliases**: Use `@/` prefix for imports (e.g., `import { theme } from '@/constants/theme'`)
- **Bun**: Project uses bun.lock, suggesting Bun as the package manager (though npm scripts are used)

## Current Implementation

### Data Storage
- **Local Only**: Currently uses AsyncStorage for native, localStorage for web
- **Expo Go Compatible**: Works in both development and production
- **Seed Data**: Includes sample properties and cleaners in `data/seedData.ts`
- **Designed for API**: Store architecture is ready for backend integration
- **In-Memory Cache**: AsyncStorage wrapper maintains cache for synchronous access

### Timer Implementation
- Tracks start time, pause duration, and calculates elapsed time
- Persists across app restarts via AsyncStorage
- useTimer hook updates every second for active sessions
- Supports pause/resume with accurate time tracking

### Multi-Cleaner Support
- Multiple cleaners can work on the same property simultaneously
- Each cleaner sees active sessions from all cleaners
- Sessions are tracked independently per cleaner

## Future Enhancements

When integrating with a backend API:
1. Replace AsyncStorage persistence with API calls in store actions
2. Add TanStack Query for data fetching and caching (already installed)
3. Update `propertiesStore.setProperties()` to fetch from API
4. Add sync logic to push completed sessions to backend
5. Consider adding authentication (currently uses simple cleaner selection)
6. Add real-time updates using WebSockets or polling for multi-device sync
