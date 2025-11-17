import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { TimerDisplay } from '@/components/TimerDisplay';
import { ConsumableCounter } from '@/components/ConsumableCounter';
import { useTimer } from '@/hooks/useTimer';
import { theme } from '@/constants/theme';
import { getCategoriesWithItems } from '@/data/consumables';
import * as Haptics from 'expo-haptics';

export default function ActiveCleaningScreen() {
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const properties = usePropertiesStore((state) => state.properties);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const pauseSession = useSessionStore((state) => state.pauseSession);
  const resumeSession = useSessionStore((state) => state.resumeSession);
  const updateConsumables = useSessionStore((state) => state.updateConsumables);

  const cleanerSessions = authenticatedCleaner
    ? activeSessions.filter((s) => s.cleanerId === authenticatedCleaner.id)
    : [];

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    cleanerSessions.length > 0 ? cleanerSessions[0].id : null
  );

  const session = cleanerSessions.find((s) => s.id === selectedSessionId) || cleanerSessions[0] || null;
  const property = properties.find((p) => p.id === session?.propertyId);
  const elapsedTime = useTimer(session);

  const categoriesWithItems = getCategoriesWithItems();

  // Track which categories are expanded (all expanded by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categoriesWithItems.map(c => c.id))
  );

  // Track scroll position for sticky header
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [headerOpacity] = useState(new Animated.Value(0));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleUpdateConsumable = (itemId: string, value: number) => {
    if (session) {
      updateConsumables(session.id, { [itemId]: value });
    }
  };

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const shouldShow = scrollY > 100;

    if (shouldShow !== showStickyHeader) {
      setShowStickyHeader(shouldShow);
      Animated.timing(headerOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePause = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      pauseSession(session.id);
    }
  };

  const handleResume = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      resumeSession(session.id);
    }
  };

  const handleComplete = async () => {
    if (session) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available on web
      }
      router.push(`/(main)/complete/${session.id}`);
    }
  };

  if (!session || !property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Active Cleaning</Text>
          <Text style={styles.emptyText}>
            Start cleaning a property to see the timer here
          </Text>
          <TouchableOpacity
            style={styles.goToPropertiesButton}
            onPress={() => router.push('/(main)/properties')}
          >
            <Text style={styles.goToPropertiesText}>View Properties</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPaused = session.status === 'paused';

  const formatCompactTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header - appears when scrolling */}
      {showStickyHeader && (
        <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
          <View style={styles.stickyHeaderContent}>
            <View style={styles.stickyHeaderLeft}>
              <Text style={styles.stickyPropertyName} numberOfLines={1}>
                {property.name}
              </Text>
              {isPaused && (
                <View style={styles.stickyPausedBadge}>
                  <Text style={styles.stickyPausedText}>PAUSED</Text>
                </View>
              )}
            </View>
            <Text style={styles.stickyTimer}>{formatCompactTime(elapsedTime)}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {cleanerSessions.length > 1 && (
          <View style={styles.sessionSelector}>
            <Text style={styles.selectorLabel}>Active Properties ({cleanerSessions.length}):</Text>
            <View style={styles.sessionButtons}>
              {cleanerSessions.map((s) => {
                const prop = properties.find((p) => p.id === s.propertyId);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sessionButton,
                      s.id === selectedSessionId && styles.sessionButtonActive
                    ]}
                    onPress={() => setSelectedSessionId(s.id)}
                  >
                    <Text style={[
                      styles.sessionButtonText,
                      s.id === selectedSessionId && styles.sessionButtonTextActive
                    ]}>
                      {prop?.name || 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.label}>Currently Cleaning</Text>
        <Text style={styles.propertyName}>{property.name}</Text>
        <Text style={styles.address}>{property.address}</Text>

        <View style={styles.cleanerIndicator}>
          <Text style={styles.cleanerLabel}>Cleaner:</Text>
          <Text style={styles.cleanerNameText}>{selectedCleaner.name}</Text>
        </View>

        <View style={styles.timerContainer}>
          <TimerDisplay elapsedTime={elapsedTime} size="large" />
          {isPaused && (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}
        </View>

        <View style={styles.consumablesSection}>
          <Text style={styles.sectionTitle}>Consumables Used</Text>
          {categoriesWithItems.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const categoryTotal = category.items.reduce(
              (sum, item) => sum + (session.consumables[item.id] || 0),
              0
            );

            return (
              <View key={category.id} style={styles.categorySection}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <Text style={styles.categoryTitle}>{category.name}</Text>
                    {categoryTotal > 0 && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{categoryTotal}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.consumablesGrid}>
                    {category.items.map((item) => (
                      <ConsumableCounter
                        key={item.id}
                        label={item.name}
                        value={session.consumables[item.id] || 0}
                        onIncrement={() => handleUpdateConsumable(item.id, (session.consumables[item.id] || 0) + 1)}
                        onDecrement={() => handleUpdateConsumable(item.id, Math.max(0, (session.consumables[item.id] || 0) - 1))}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {property.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Property Notes</Text>
            <Text style={styles.notesText}>{property.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer - always visible */}
      <View style={styles.stickyFooter}>
        <View style={styles.controls}>
          {isPaused ? (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResume}
            >
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={handlePause}
            >
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Text style={styles.buttonText}>Complete Cleaning</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 140, // Extra padding for sticky footer
  },
  sessionSelector: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  sessionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sessionButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  sessionButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  sessionButtonTextActive: {
    color: '#2196F3',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  cleanerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  cleanerLabel: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#999',
  },
  cleanerNameText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  pausedBadge: {
    marginTop: 16,
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pausedText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  controls: {
    gap: 12,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  consumablesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 20,
  },
  categorySection: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  chevron: {
    fontSize: 12,
    color: '#666',
  },
  consumablesGrid: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  notesSection: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  goToPropertiesButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goToPropertiesText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 50, // Account for status bar
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  stickyPropertyName: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    flexShrink: 1,
  },
  stickyPausedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stickyPausedText: {
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  stickyTimer: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
});
