import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const storeState = useAuthStore.getState();
    const info = `isAuthenticated=${isAuthenticated}, storeState.isAuthenticated=${storeState.isAuthenticated}`;
    console.log('[Index]', info);
    setDebugInfo(prev => [...prev, info]);

    // Small delay to ensure store is synced
    const timer = setTimeout(() => {
      const currentAuth = useAuthStore.getState().isAuthenticated;
      console.log('[Index] After delay, isAuthenticated=', currentAuth);
      if (currentAuth) {
        router.replace('/(main)/properties');
      } else {
        router.replace('/(auth)/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#0f0', fontFamily: 'monospace' }}>Index Debug:</Text>
      {debugInfo.map((info, i) => (
        <Text key={i} style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 10 }}>{info}</Text>
      ))}
    </View>
  );
}
