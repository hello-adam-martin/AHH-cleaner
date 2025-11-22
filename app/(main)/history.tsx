import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useHistoryStore } from '@/stores/historyStore';
import { CleanerBadge } from '@/components/CleanerBadge';
import { formatDuration, formatTime } from '@/utils/time';
import { theme } from '@/constants/theme';
import { consumableItems } from '@/data/consumables';
import type { CompletedSession } from '@/types';

function SessionCard({ session }: { session: CompletedSession }) {
  // Get all consumables that have been used
  const usedConsumables = consumableItems.filter(
    (item) => (session.consumables[item.id] || 0) > 0
  );
  const isUnsynced = session.syncedToAirtable === false;

  return (
    <View style={[styles.card, isUnsynced && styles.cardUnsynced]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.propertyNameRow}>
            <Text style={styles.propertyName}>{session.property.name}</Text>
            {isUnsynced && (
              <View style={styles.unsyncedBadge}>
                <Text style={styles.unsyncedBadgeText}>Not synced</Text>
              </View>
            )}
          </View>
          <Text style={styles.propertyAddress}>{session.property.address}</Text>
        </View>
        <CleanerBadge cleaner={session.cleaner} size="medium" />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Duration:</Text>
          <Text style={styles.value}>{formatDuration(session.duration)}</Text>
        </View>
        {session.helperAccumulatedDuration > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Helper Time:</Text>
            <Text style={styles.value}>{formatDuration(session.helperAccumulatedDuration)}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>
            {formatTime(session.startTime)} - {formatTime(session.endTime)}
          </Text>
        </View>
      </View>

      {usedConsumables.length > 0 && (
        <View style={styles.consumablesSection}>
          <Text style={styles.consumablesTitle}>Consumables Used:</Text>
          <View style={styles.consumablesList}>
            {usedConsumables.map((item) => (
              <Text key={item.id} style={styles.consumableItem}>
                {item.name}: {session.consumables[item.id]}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { authenticatedCleaner, logout } = useAuthStore();
  const { getTodaysSessions } = useHistoryStore();

  const todaysSessions = getTodaysSessions();

  // Filter to show only current cleaner's sessions
  const displaySessions = authenticatedCleaner
    ? todaysSessions.filter((s) => s.cleanerId === authenticatedCleaner.id)
    : todaysSessions;

  // Calculate totals
  const totalDuration = displaySessions.reduce(
    (sum, session) => sum + session.duration,
    0
  );
  const totalProperties = displaySessions.length;

  const handleLogout = () => {
    const doLogout = () => {
      logout();
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{"Today's History"}</Text>
          {authenticatedCleaner && (
            <View style={styles.cleanerInfo}>
              <CleanerBadge cleaner={authenticatedCleaner} size="small" />
              <Text style={styles.cleanerName}>{authenticatedCleaner.name}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {displaySessions.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalProperties}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>
      )}

      <FlatList
        data={displaySessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionCard session={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No completed cleanings today</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  cleanerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cleanerName: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardUnsynced: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  propertyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  propertyName: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  unsyncedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unsyncedBadgeText: {
    fontSize: 10,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  propertyAddress: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  consumablesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  consumablesTitle: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 6,
  },
  consumablesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  consumableItem: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
  },
});
