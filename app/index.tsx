import { Redirect } from 'expo-router';

export default function Index() {
  // This is just a fallback - auth routing is handled in _layout.tsx
  return <Redirect href="/(auth)/login" />;
}
