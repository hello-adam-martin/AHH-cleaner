import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';

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
        tabBarStyle: {
          height: 70,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      }}
    >
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Cleaning',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="timer-outline" size={size} color={color} />
              {hasRunningTimer && <View style={styles.pulseDot} />}
            </View>
          ),
          tabBarBadge: cleanerSessionCount > 0 ? cleanerSessionCount : undefined,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Done',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
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
      <Tabs.Screen
        name="lost-property/report"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="maintenance/report"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pulseDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
});
