import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(main)/properties');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  return null;
}
