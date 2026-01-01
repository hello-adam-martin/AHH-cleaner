import { Tabs, Redirect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { TabBarIcon } from '@/components/TabBarIcon';

export default function MainLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const activeSessions = useSessionStore((state) => state.activeSessions);

  // Get sessions for current cleaner
  const cleanerSessions = authenticatedCleaner
    ? activeSessions.filter((s) => s.cleanerId === authenticatedCleaner.id)
    : [];

  // Count active sessions for badge
  const cleanerSessionCount = cleanerSessions.length;

  // Check if any session has an active (running) timer
  const hasRunningTimer = cleanerSessions.some((s) => s.status === 'active');

  // Protect all main routes - redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Nunito_600SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" size={24} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Cleaning',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="timer" color={color} showPulse={hasRunningTimer} />
          ),
          tabBarBadge: cleanerSessionCount > 0 ? cleanerSessionCount : undefined,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Done',
          tabBarIcon: ({ color }) => (
            <SymbolView name="checkmark.circle.fill" size={24} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="property/[id]"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="complete/[sessionId]"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
