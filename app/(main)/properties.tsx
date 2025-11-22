import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useCleanerStore } from '@/stores/cleanerStore';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { PropertyCard } from '@/components/PropertyCard';
import { CleanerBadge } from '@/components/CleanerBadge';
import type { PropertyWithStatus } from '@/types';
import { PropertyStatus } from '@/types';
import { theme } from '@/constants/theme';
import { fetchTodaysCheckouts, isAirtableConfigured } from '@/services/backendApiService';
import { storageHelpers, storageKeys } from '@/services/storage';

export default function PropertiesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const logout = useAuthStore((state) => state.logout);
  const properties = usePropertiesStore((state) => state.properties);
  const setProperties = usePropertiesStore((state) => state.setProperties);
  const cleaners = useCleanerStore((state) => state.cleaners);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const completedSessions = useHistoryStore((state) => state.completedSessions);
  const isSyncing = useHistoryStore((state) => state.isSyncing);
  const syncAllPending = useHistoryStore((state) => state.syncAllPending);

  // Calculate pending count from completed sessions (avoid calling getPendingSessions in selector)
  const pendingCount = useMemo(
    () => completedSessions.filter((s) => s.syncedToAirtable === false).length,
    [completedSessions]
  );

  const handleSwitchCleaner = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const handleSync = async () => {
    if (!isAirtableConfigured()) {
      setSyncMessage('Not configured');
      setTimeout(() => setSyncMessage(null), 2000);
      return;
    }

    // Sync pending sessions
    if (pendingCount > 0) {
      const result = await syncAllPending();
      if (result.synced === result.total) {
        setSyncMessage('All synced!');
      } else if (result.synced > 0) {
        setSyncMessage(`${result.synced}/${result.total} synced`);
      } else {
        setSyncMessage('Sync failed - offline?');
      }
    }

    // Also refresh properties
    try {
      const airtableProperties = await fetchTodaysCheckouts();
      if (airtableProperties && airtableProperties.length > 0) {
        setProperties(airtableProperties);
        storageHelpers.setString(storageKeys.LAST_FETCH_DATE, new Date().toDateString());
        if (pendingCount === 0) {
          setSyncMessage('Properties updated!');
        }
      }
    } catch (error) {
      console.error('Error refreshing properties:', error);
    }

    setTimeout(() => setSyncMessage(null), 2500);
  };

  const handleRefresh = async () => {
    if (!isAirtableConfigured()) {
      console.log('Airtable not configured - cannot refresh');
      return;
    }

    setRefreshing(true);
    try {
      const airtableProperties = await fetchTodaysCheckouts();
      if (airtableProperties && airtableProperties.length > 0) {
        setProperties(airtableProperties);
        storageHelpers.setString(storageKeys.LAST_FETCH_DATE, new Date().toDateString());
        console.log(`Refreshed ${airtableProperties.length} properties from Airtable`);
      } else {
        console.log('No properties returned from Airtable');
      }
    } catch (error) {
      console.error('Error refreshing properties:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Enhance properties with status and active cleaners
  const propertiesWithStatus: PropertyWithStatus[] = properties.map((property) => {
    const propertySessions = activeSessions.filter(
      (session) => session.propertyId === property.id
    );

    const activeCleaners = propertySessions
      .map((session) => cleaners.find((c) => c.id === session.cleanerId))
      .filter((c) => c !== undefined);

    let status = PropertyStatus.PENDING;
    if (propertySessions.some((s) => s.status === 'completed')) {
      status = PropertyStatus.COMPLETED;
    } else if (propertySessions.length > 0) {
      status = PropertyStatus.IN_PROGRESS;
    }

    return {
      ...property,
      status,
      activeCleaners,
      activeSessions: propertySessions,
    };
  });

  // Sort properties: in-progress first, then pending, then completed
  const sortedProperties = [...propertiesWithStatus].sort((a, b) => {
    const statusOrder = {
      [PropertyStatus.IN_PROGRESS]: 0,
      [PropertyStatus.PENDING]: 1,
      [PropertyStatus.COMPLETED]: 2,
    };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{"Today's Properties"}</Text>
          {authenticatedCleaner && (
            <View style={styles.cleanerInfo}>
              <CleanerBadge cleaner={authenticatedCleaner} size="small" />
              <Text style={styles.cleanerName}>{authenticatedCleaner.name}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={handleSync}
            style={[styles.syncButton, pendingCount > 0 && styles.syncButtonPending]}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.syncButtonText, pendingCount > 0 && styles.syncButtonTextPending]}>
                Sync{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSwitchCleaner}
            style={styles.switchButton}
          >
            <Text style={styles.switchButtonText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {syncMessage && (
        <View style={styles.syncMessageBanner}>
          <Text style={styles.syncMessageText}>{syncMessage}</Text>
        </View>
      )}

      <FlatList
        data={sortedProperties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PropertyCard property={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No properties scheduled for today</Text>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
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
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonPending: {
    backgroundColor: '#FF9800',
  },
  syncButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  syncButtonTextPending: {
    color: '#FFFFFF',
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  switchButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  syncMessageBanner: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncMessageText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
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
