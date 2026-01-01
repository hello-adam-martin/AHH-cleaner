import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, ScrollView } from 'react-native';
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
import { showToast } from '@/stores/toastStore';
import * as Haptics from 'expo-haptics';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

export default function PropertiesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const logout = useAuthStore((state) => state.logout);
  const properties = usePropertiesStore((state) => state.properties);
  const setProperties = usePropertiesStore((state) => state.setProperties);
  const cleaners = useCleanerStore((state) => state.cleaners);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const startSession = useSessionStore((state) => state.startSession);
  const hasActiveTimerForCleaner = useSessionStore((state) => state.hasActiveTimerForCleaner);
  const completedSessions = useHistoryStore((state) => state.completedSessions);
  const isSyncing = useHistoryStore((state) => state.isSyncing);
  const syncAllPending = useHistoryStore((state) => state.syncAllPending);

  // Check if current cleaner has an active timer
  const hasActiveTimer = authenticatedCleaner
    ? hasActiveTimerForCleaner(authenticatedCleaner.id)
    : false;

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
      showToast({
        type: 'warning',
        title: 'Not configured',
        message: 'Backend API not available',
      });
      return;
    }

    // Sync pending sessions
    if (pendingCount > 0) {
      const result = await syncAllPending();
      if (result.synced === result.total) {
        showToast({
          type: 'success',
          title: 'All synced!',
          message: `${result.synced} session${result.synced > 1 ? 's' : ''} uploaded`,
        });
      } else if (result.synced > 0) {
        showToast({
          type: 'warning',
          title: 'Partially synced',
          message: `${result.synced}/${result.total} sessions uploaded`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Sync failed',
          message: 'Check your internet connection',
        });
      }
    }

    // Also refresh properties
    try {
      const airtableProperties = await fetchTodaysCheckouts();
      if (airtableProperties && airtableProperties.length > 0) {
        setProperties(airtableProperties);
        storageHelpers.setString(storageKeys.LAST_FETCH_DATE, new Date().toDateString());
        if (pendingCount === 0) {
          showToast({
            type: 'success',
            title: 'Properties updated!',
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing properties:', error);
    }
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

  const handleQuickStart = async (propertyId: string) => {
    if (!authenticatedCleaner) return;

    if (hasActiveTimer) {
      showToast({
        type: 'warning',
        title: 'Timer already running',
        message: 'Stop your current timer first',
      });
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available on web
    }

    startSession(propertyId, authenticatedCleaner.id);
    showToast({
      type: 'success',
      title: 'Timer started!',
    });
    router.push('/(main)/active');
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

    // Determine sync status from completed sessions for this property
    const propertyCompletedSessions = completedSessions.filter(
      (s) => s.propertyId === property.id
    );
    let syncStatus: 'synced' | 'pending' | 'none' = 'none';
    if (propertyCompletedSessions.length > 0) {
      const hasUnsynced = propertyCompletedSessions.some((s) => s.syncedToAirtable === false);
      syncStatus = hasUnsynced ? 'pending' : 'synced';
    }

    return {
      ...property,
      status,
      activeCleaners,
      activeSessions: propertySessions,
      syncStatus,
    };
  });

  // Sort properties: in-progress first, then pending, then completed
  // Within each status, sort by next check-in date (earliest first)
  const sortedProperties = [...propertiesWithStatus].sort((a, b) => {
    const statusOrder = {
      [PropertyStatus.IN_PROGRESS]: 0,
      [PropertyStatus.PENDING]: 1,
      [PropertyStatus.COMPLETED]: 2,
    };

    // First sort by status
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Then sort by next check-in date (earliest first, no date goes last)
    const dateA = a.nextCheckinDate ? new Date(a.nextCheckinDate).getTime() : Infinity;
    const dateB = b.nextCheckinDate ? new Date(b.nextCheckinDate).getTime() : Infinity;
    return dateA - dateB;
  });

  // Apply search filter
  const searchedProperties = useMemo(() => {
    if (!searchQuery.trim()) return sortedProperties;
    const query = searchQuery.toLowerCase().trim();
    return sortedProperties.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
    );
  }, [sortedProperties, searchQuery]);

  // Apply status filter
  const filteredProperties = useMemo(() => {
    if (statusFilter === 'all') return searchedProperties;
    return searchedProperties.filter((p) => {
      switch (statusFilter) {
        case 'pending':
          return p.status === PropertyStatus.PENDING;
        case 'in_progress':
          return p.status === PropertyStatus.IN_PROGRESS;
        case 'completed':
          return p.status === PropertyStatus.COMPLETED;
        default:
          return true;
      }
    });
  }, [searchedProperties, statusFilter]);

  // Get counts for filter chips
  const getCountForStatus = (status: StatusFilter) => {
    if (status === 'all') return searchedProperties.length;
    return searchedProperties.filter((p) => {
      switch (status) {
        case 'pending':
          return p.status === PropertyStatus.PENDING;
        case 'in_progress':
          return p.status === PropertyStatus.IN_PROGRESS;
        case 'completed':
          return p.status === PropertyStatus.COMPLETED;
        default:
          return true;
      }
    }).length;
  };

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
            style={[
              styles.syncButton,
              pendingCount > 0 && styles.syncButtonPending,
              pendingCount === 0 && styles.syncButtonSynced,
            ]}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <View style={styles.syncButtonContent}>
                <ActivityIndicator size="small" color={pendingCount > 0 ? '#FFFFFF' : '#666'} />
                <Text style={[styles.syncButtonText, pendingCount > 0 && styles.syncButtonTextPending]}>
                  Syncing...
                </Text>
              </View>
            ) : pendingCount > 0 ? (
              <Text style={[styles.syncButtonText, styles.syncButtonTextPending]}>
                Upload ({pendingCount})
              </Text>
            ) : (
              <Text style={styles.syncButtonText}>Synced ✓</Text>
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

      {/* Active Timer Banner */}
      {hasActiveTimer && (
        <TouchableOpacity
          style={styles.activeTimerBanner}
          onPress={() => router.push('/(main)/active')}
        >
          <Text style={styles.activeTimerText}>You have an active timer running</Text>
          <Text style={styles.activeTimerSubtext}>Tap to view</Text>
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {([
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ] as const).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                statusFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label} ({getCountForStatus(filter.key)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onQuickStart={handleQuickStart}
            canQuickStart={!hasActiveTimer}
          />
        )}
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
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'No properties match your filters'
                : 'No properties scheduled for today'}
            </Text>
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
  syncButtonSynced: {
    backgroundColor: '#E8F5E9',
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
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
  activeTimerBanner: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activeTimerText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  activeTimerSubtext: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
  },
  clearButton: {
    marginLeft: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  filterChipsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: theme.colors.text,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});
