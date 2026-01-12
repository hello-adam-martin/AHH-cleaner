import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { initializeApp } from '@/services/initializeApp';
import { useAuthStore } from '@/stores/authStore';
import { ToastContainer } from '@/components/Toast';
import { onStorageChange, storageKeys } from '@/services/storage';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const segments = useSegments();

  useEffect(() => {
    if (fontsLoaded) {
      // Initialize app data (async)
      initializeApp().then(() => {
        setAppReady(true);
        // Hide splash screen after initialization completes
        SplashScreen.hideAsync();
      });
    }
  }, [fontsLoaded]);

  // Handle auth-based routing
  useEffect(() => {
    if (!appReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    if (isAuthenticated && (inAuthGroup || segments[0] === undefined)) {
      // User is authenticated but on auth screen or index - redirect to main
      router.replace('/(main)/properties');
    } else if (!isAuthenticated && inMainGroup) {
      // User is not authenticated but on main screen - redirect to login
      router.replace('/(auth)/login');
    }
  }, [appReady, isAuthenticated, segments]);

  // Cross-tab synchronization and visibility change handler (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Re-initialize stores when tab becomes visible (handles PWA resume)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh state from localStorage when tab becomes visible
        useSessionStore.getState().initializeFromStorage();
        useHistoryStore.getState().initializeFromStorage();
      }
    };

    // Listen for storage changes from other tabs
    const unsubscribe = onStorageChange((key) => {
      if (key === storageKeys.ACTIVE_SESSIONS) {
        useSessionStore.getState().initializeFromStorage();
      } else if (key === storageKeys.COMPLETED_SESSIONS) {
        useHistoryStore.getState().initializeFromStorage();
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }, []);

  if (!fontsLoaded || !appReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(main)" />
      </Stack>
      <ToastContainer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
