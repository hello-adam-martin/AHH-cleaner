import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { initializeApp } from '@/services/initializeApp';
import { useAuthStore } from '@/stores/authStore';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

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

  if (!fontsLoaded || !appReady) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(main)" />
      </Stack>
      <DebugIndicator />
    </>
  );
}

function DebugIndicator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const [localStorageValue, setLocalStorageValue] = useState<string>('checking...');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const value = window.localStorage.getItem('authenticated_cleaner');
      setLocalStorageValue(value ? `"${JSON.parse(value)?.name}"` : 'null');
    } else {
      setLocalStorageValue('N/A (not web)');
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.debug}>
      <Text style={styles.debugText}>
        Auth: {isAuthenticated ? '✓' : '✗'} |
        Store: {authenticatedCleaner?.name || 'null'} |
        LS: {localStorageValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  debug: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  debugText: {
    color: '#0f0',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
