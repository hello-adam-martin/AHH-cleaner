import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useCleanerStore } from '@/stores/cleanerStore';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { PropertyCard } from '@/components/PropertyCard';
import { CleanerBadge } from '@/components/CleanerBadge';
import type { PropertyWithStatus, PropertySnapshot } from '@/types';
import { PropertyStatus } from '@/types';
import { theme } from '@/constants/theme';
import { fetchTodaysCheckouts, isAirtableConfigured } from '@/services/backendApiService';
import { storageHelpers, storageKeys } from '@/services/storage';
import { showToast } from '@/stores/toastStore';
import * as Haptics from 'expo-haptics';

export default function PropertiesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
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

    // Find the property to create snapshot
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available on web
    }

    // Capture property snapshot at session start for data integrity
    const propertySnapshot: PropertySnapshot = {
      id: property.id,
      propertyRecordId: property.propertyRecordId,
      name: property.name,
      address: property.address,
      isBlocked: property.isBlocked,
    };
    startSession(propertyId, authenticatedCleaner.id, propertySnapshot);
    showToast({
      type: 'success',
      title: 'Timer started!',
    });
    router.push('/(main)/active');
  };

  // Helper function to enhance a property with status info
  const enhanceProperty = (property: typeof properties[0]): PropertyWithStatus => {
    const propertySessions = activeSessions.filter(
      (session) => session.propertyId === property.id
    );

    const activeCleaners = propertySessions
      .map((session) => cleaners.find((c) => c.id === session.cleanerId))
      .filter((c) => c !== undefined);

    // Determine sync status from completed sessions for this property
    const propertyCompletedSessions = completedSessions.filter(
      (s) => s.propertyId === property.id
    );
    let syncStatus: 'synced' | 'pending' | 'none' = 'none';
    if (propertyCompletedSessions.length > 0) {
      const hasUnsynced = propertyCompletedSessions.some((s) => s.syncedToAirtable === false);
      syncStatus = hasUnsynced ? 'pending' : 'synced';
    }

    let status = PropertyStatus.PENDING;
    if (propertySessions.some((s) => s.status === 'completed')) {
      status = PropertyStatus.COMPLETED;
    } else if (propertySessions.length > 0) {
      status = PropertyStatus.IN_PROGRESS;
    } else if (propertyCompletedSessions.length > 0 || (property.cleaningTime && property.cleaningTime > 0)) {
      // Property was cleaned (either locally completed or synced to Airtable)
      status = PropertyStatus.COMPLETED;
    }

    return {
      ...property,
      status,
      activeCleaners,
      activeSessions: propertySessions,
      syncStatus,
    };
  };

  // Enhance all properties with status info (isOverdue comes from API)
  const allPropertiesWithStatus: PropertyWithStatus[] = properties.map((p) => enhanceProperty(p));

  // Split into regular and blocked properties
  const regularProperties = allPropertiesWithStatus.filter((p) => !p.isBlocked);
  const blockedProperties = allPropertiesWithStatus.filter((p) => p.isBlocked);

  // Split into pending/active and completed
  const pendingProperties = regularProperties.filter((p) => p.status !== PropertyStatus.COMPLETED);
  const completedRegularProperties = regularProperties.filter((p) => p.status === PropertyStatus.COMPLETED);

  // Sort pending: in-progress first, then overdue, then pending by next check-in
  const sortedPending = [...pendingProperties].sort((a, b) => {
    const statusOrder = {
      [PropertyStatus.IN_PROGRESS]: 0,
      [PropertyStatus.PENDING]: 1,
      [PropertyStatus.COMPLETED]: 2,
    };

    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Within pending status, overdue items come first
    if (a.status === PropertyStatus.PENDING && b.status === PropertyStatus.PENDING) {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
    }

    // Then sort by next check-in date (earliest first, no date goes last)
    const dateA = a.nextCheckinDate ? new Date(a.nextCheckinDate).getTime() : Infinity;
    const dateB = b.nextCheckinDate ? new Date(b.nextCheckinDate).getTime() : Infinity;
    return dateA - dateB;
  });

  // Apply search filter
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return sortedPending;
    const query = searchQuery.toLowerCase().trim();
    return sortedPending.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
    );
  }, [sortedPending, searchQuery]);

  const filteredCompleted = useMemo(() => {
    if (!searchQuery.trim()) return completedRegularProperties;
    const query = searchQuery.toLowerCase().trim();
    return completedRegularProperties.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
    );
  }, [completedRegularProperties, searchQuery]);

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

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
      >
        {/* Pending / Active Properties */}
        {filteredPending.length > 0 ? (
          filteredPending.map((item) => (
            <PropertyCard
              key={item.id}
              property={item}
              onQuickStart={handleQuickStart}
              canQuickStart={true}
            />
          ))
        ) : filteredCompleted.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No properties match your search'
                : 'No properties scheduled for today'}
            </Text>
          </View>
        ) : null}

        {/* Blocked Dates Section */}
        {blockedProperties.length > 0 && (
          <View style={styles.blockedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Blocked Dates Ending Today</Text>
            </View>
            {blockedProperties.map((item) => (
              <PropertyCard
                key={item.id}
                property={item}
                onQuickStart={handleQuickStart}
                canQuickStart={true}
              />
            ))}
          </View>
        )}

        {/* Completed Section */}
        {filteredCompleted.length > 0 && (
          <View style={styles.completedSection}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setShowCompleted(!showCompleted)}
              activeOpacity={0.7}
            >
              <Text style={styles.collapsibleHeaderText}>
                Completed ({filteredCompleted.length})
              </Text>
              <Text style={styles.collapsibleChevron}>
                {showCompleted ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            {showCompleted && filteredCompleted.map((item) => (
              <PropertyCard
                key={item.id}
                property={item}
                onQuickStart={handleQuickStart}
                canQuickStart={false}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
  blockedSection: {
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
  },
  completedSection: {
    marginTop: 24,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  collapsibleHeaderText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
  },
  collapsibleChevron: {
    fontSize: 12,
    color: '#999',
  },
});
