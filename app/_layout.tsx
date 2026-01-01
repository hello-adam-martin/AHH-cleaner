import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { initializeApp } from '@/services/initializeApp';
import { useAuthStore } from '@/stores/authStore';
import { ToastContainer } from '@/components/Toast';

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
