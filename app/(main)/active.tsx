import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { TimerDisplay } from '@/components/TimerDisplay';
import { CleanerBadge } from '@/components/CleanerBadge';
import { useTimer } from '@/hooks/useTimer';
import { useHelperTimer } from '@/hooks/useHelperTimer';
import { theme } from '@/constants/theme';
import { getCategoriesWithItems, consumableItems, getFavoriteConsumables } from '@/data/consumables';
import { formatCheckinDate } from '@/utils/time';
import * as Haptics from 'expo-haptics';

export default function ActiveCleaningScreen() {
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const properties = usePropertiesStore((state) => state.properties);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const stopSession = useSessionStore((state) => state.stopSession);
  const restartSession = useSessionStore((state) => state.restartSession);
  const updateConsumables = useSessionStore((state) => state.updateConsumables);
  const startHelperTimer = useSessionStore((state) => state.startHelperTimer);
  const stopHelperTimer = useSessionStore((state) => state.stopHelperTimer);
  const completeSession = useSessionStore((state) => state.completeSession);
  const discardSession = useSessionStore((state) => state.discardSession);
  const adjustCleanerTime = useSessionStore((state) => state.adjustCleanerTime);
  const adjustHelperTime = useSessionStore((state) => state.adjustHelperTime);
  const addCompletedSession = useHistoryStore((state) => state.addCompletedSession);

  const cleanerSessions = authenticatedCleaner
    ? activeSessions.filter((s) => s.cleanerId === authenticatedCleaner.id)
    : [];

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    cleanerSessions.length > 0 ? cleanerSessions[0].id : null
  );

  const session = cleanerSessions.find((s) => s.id === selectedSessionId) || cleanerSessions[0] || null;
  const property = properties.find((p) => p.id === session?.propertyId);
  const elapsedTime = useTimer(session);
  const helperElapsedTime = useHelperTimer(session);

  const categoriesWithItems = getCategoriesWithItems();
  const favoriteConsumables = getFavoriteConsumables();

  // Track which categories are expanded (all expanded by default for faster entry)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categoriesWithItems.map(c => c.id))
  );

  // Track scroll position for sticky header
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [headerOpacity] = useState(new Animated.Value(0));

  // Completion modal state - single combined modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Stop confirmation modal state
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);

  // Discard confirmation modal state
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Success celebration modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    propertyName: string;
    totalTime: number;
  } | null>(null);

  // Time adjustment state
  const [adjustingTimer, setAdjustingTimer] = useState<'cleaner' | 'helper' | null>(null);

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

  const handleStop = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      setShowStopConfirmModal(true);
    }
  };

  const handleConfirmStop = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      stopSession(session.id);
      setShowStopConfirmModal(false);
    }
  };

  const handleRestart = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      restartSession(session.id);
    }
  };

  const handleComplete = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      // Show combined completion modal
      setShowCompleteModal(true);
    }
  };

  const handleConfirmComplete = async () => {
    if (!session || !property || !authenticatedCleaner || isCompleting) return;

    setIsCompleting(true);

    // Prefer property snapshot for display name (captured at session start)
    const displayName = session.propertySnapshot?.name || property.name;

    // Store the summary before completing (session will be removed after completion)
    const summaryData = {
      propertyName: displayName,
      totalTime: elapsedTime + helperElapsedTime,
    };

    // Validate property ID matches snapshot if available
    if (session.propertySnapshot && session.propertyId !== session.propertySnapshot.id) {
      console.error('Property ID mismatch detected:', {
        sessionPropertyId: session.propertyId,
        snapshotId: session.propertySnapshot.id,
      });
      // Continue with snapshot data for sync integrity
    }

    try {
      // Complete the session (this stops the timer)
      const completedSession = completeSession(session.id, Date.now());

      if (completedSession) {
        // Add to history (this will sync to Airtable)
        // historyStore will use session.propertySnapshot for sync if available
        await addCompletedSession(completedSession, property, authenticatedCleaner);

        // Haptic feedback
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          // Haptics not available on web
        }

        setShowCompleteModal(false);
        setIsCompleting(false);

        // Show success celebration
        setCompletedSummary(summaryData);
        setShowSuccessModal(true);

        // Auto-navigate after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          router.push('/(main)/properties');
        }, 3000);
      } else {
        setIsCompleting(false);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      setIsCompleting(false);
    }
  };

  const handleDismissSuccess = () => {
    setShowSuccessModal(false);
    router.push('/(main)/properties');
  };

  const handleAdjustCleanerTime = (minutes: number) => {
    if (!session) return;
    adjustCleanerTime(session.id, minutes);
  };

  const handleAdjustHelperTime = (minutes: number) => {
    if (!session) return;
    adjustHelperTime(session.id, minutes);
  };

  const handleStartHelper = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      startHelperTimer(session.id);
    }
  };

  const handleStopHelper = async () => {
    if (session) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
      stopHelperTimer(session.id);
    }
  };

  const handleDiscardSession = async () => {
    if (session) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {
        // Haptics not available on web
      }
      discardSession(session.id);
      setShowDiscardModal(false);
      router.push('/(main)/properties');
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

  const isStopped = session.status === 'stopped';
  const isActive = session.status === 'active';

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
              {isStopped && (
                <View style={styles.stickyStoppedBadge}>
                  <Text style={styles.stickyStoppedText}>STOPPED</Text>
                </View>
              )}
            </View>
            <Text style={styles.stickyTimer}>{formatCompactTime(elapsedTime + helperElapsedTime)}</Text>
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
            <Text style={styles.selectorLabel}>Your Jobs ({cleanerSessions.length}):</Text>
            <View style={styles.sessionButtons}>
              {cleanerSessions.map((s) => {
                const prop = properties.find((p) => p.id === s.propertyId);
                const isSessionStopped = s.status === 'stopped';
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sessionButton,
                      s.id === selectedSessionId && styles.sessionButtonActive,
                      isSessionStopped && styles.sessionButtonStopped
                    ]}
                    onPress={() => setSelectedSessionId(s.id)}
                  >
                    <Text style={[
                      styles.sessionButtonText,
                      s.id === selectedSessionId && styles.sessionButtonTextActive
                    ]}>
                      {prop?.name || 'Unknown'}
                      {isSessionStopped ? ' (stopped)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.propertyHeader}>
          <View style={styles.propertyHeaderLeft}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <Text style={styles.address}>{property.address}</Text>
            {/* Booking Info Card */}
            {(property.guestCount || property.nextCheckinDate) && (
              <View style={styles.bookingInfoCard}>
                {property.guestCount !== undefined && property.guestCount > 0 && (
                  <View style={styles.bookingInfoRow}>
                    <Text style={styles.bookingInfoLabel}>OUT</Text>
                    <Text style={styles.bookingInfoValue}>
                      {property.guestCount} {property.guestCount === 1 ? 'guest' : 'guests'}
                    </Text>
                  </View>
                )}
                {property.nextCheckinDate && (
                  <View style={styles.bookingInfoRow}>
                    <Text style={styles.bookingInfoLabelIn}>IN</Text>
                    <Text style={styles.bookingInfoValue}>
                      {property.nextGuestCount ? `${property.nextGuestCount} ${property.nextGuestCount === 1 ? 'guest' : 'guests'}` : 'Guests TBC'}
                      {property.nextCheckoutDate && property.nextCheckinDate && (() => {
                        const checkin = new Date(property.nextCheckinDate);
                        const checkout = new Date(property.nextCheckoutDate);
                        const nights = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
                        return nights > 0 ? ` • ${nights} ${nights === 1 ? 'night' : 'nights'}` : '';
                      })()}
                    </Text>
                  </View>
                )}
                {property.nextCheckinDate && (
                  <Text style={styles.checkinDate}>
                    Check-in: {formatCheckinDate(property.nextCheckinDate)}
                  </Text>
                )}
              </View>
            )}
          </View>
          {authenticatedCleaner && (
            <CleanerBadge cleaner={authenticatedCleaner} size="small" />
          )}
        </View>

        <View style={styles.timersCard}>
          {isStopped && (
            <View style={styles.stoppedBanner}>
              <Text style={styles.stoppedBannerText}>STOPPED</Text>
            </View>
          )}
          <View style={styles.totalTimeSection}>
            <Text style={styles.totalTimeLabel}>Total Time</Text>
            <Text style={styles.totalTimeValue}>{formatCompactTime(elapsedTime + helperElapsedTime)}</Text>
          </View>
          <View style={styles.timersRow}>
            <View style={styles.timerColumn}>
              <Text style={styles.timerLabel}>Cleaner Time</Text>
              <TimerDisplay elapsedTime={elapsedTime} size="small" />
              {adjustingTimer === 'cleaner' ? (
                <View style={styles.adjustmentSection}>
                  <View style={styles.adjustmentButtons}>
                    <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustCleanerTime(-5)}>
                      <Text style={styles.adjustBtnText}>-5m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustCleanerTime(5)}>
                      <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+5m</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.doneAdjustBtn} onPress={() => setAdjustingTimer(null)}>
                    <Text style={styles.doneAdjustText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.adjustLink} onPress={() => setAdjustingTimer('cleaner')}>
                  <Text style={styles.adjustLinkText}>Adjust</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.timerDivider} />
            <View style={styles.timerColumn}>
              <Text style={styles.timerLabel}>Helper Time</Text>
              <TimerDisplay elapsedTime={helperElapsedTime} size="small" />
              {helperElapsedTime > 0 && (
                adjustingTimer === 'helper' ? (
                  <View style={styles.adjustmentSection}>
                    <View style={styles.adjustmentButtons}>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustHelperTime(-5)}>
                        <Text style={styles.adjustBtnText}>-5m</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustHelperTime(5)}>
                        <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+5m</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.doneAdjustBtn} onPress={() => setAdjustingTimer(null)}>
                      <Text style={styles.doneAdjustText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.adjustLink} onPress={() => setAdjustingTimer('helper')}>
                    <Text style={styles.adjustLinkText}>Adjust</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
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
          {/* Primary action - Complete Cleaning */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <Text style={styles.buttonText}>Complete Cleaning</Text>
            </TouchableOpacity>
          </View>
          {/* Timer controls */}
          <View style={styles.controlRow}>
            {isStopped ? (
              <TouchableOpacity
                style={styles.restartButton}
                onPress={handleRestart}
              >
                <Text style={styles.buttonText}>Restart Timer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
              >
                <Text style={styles.buttonText}>Stop Timer</Text>
              </TouchableOpacity>
            )}
            {isActive && (
              <TouchableOpacity
                style={[
                  styles.helperButton,
                  session.helperActive ? styles.helperButtonStop : styles.helperButtonStart
                ]}
                onPress={session.helperActive ? handleStopHelper : handleStartHelper}
              >
                <Text style={styles.buttonText}>
                  {session.helperActive ? 'Stop Helper' : 'Start Helper'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Report buttons */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.lostPropertyButton}
              onPress={() => router.push({ pathname: '/(main)/lost-property/report', params: { propertyId: property.id } })}
            >
              <Text style={styles.lostPropertyButtonText}>Lost Property</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.maintenanceButton}
              onPress={() => router.push({ pathname: '/(main)/maintenance/report', params: { propertyId: property.id } })}
            >
              <Text style={styles.maintenanceButtonText}>Maintenance</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.discardLink}
            onPress={() => setShowDiscardModal(true)}
          >
            <Text style={styles.discardLinkText}>Discard Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Combined Completion Modal with Consumables */}
      <Modal
        visible={showCompleteModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => !isCompleting && setShowCompleteModal(false)}
      >
        <SafeAreaView style={styles.consumablesModalContainer}>
          <View style={styles.consumablesModalHeader}>
            <TouchableOpacity
              style={styles.consumablesBackBtn}
              onPress={() => !isCompleting && setShowCompleteModal(false)}
              disabled={isCompleting}
            >
              <Text style={styles.consumablesBackText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.consumablesModalTitle}>Complete Cleaning</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            style={styles.consumablesModalScroll}
            contentContainerStyle={styles.consumablesModalScrollContent}
          >
            {/* Time Summary */}
            <View style={styles.completionTimeSummary}>
              <Text style={styles.completionPropertyName}>{property?.name}</Text>
              <Text style={styles.completionTotalTime}>{formatCompactTime(elapsedTime + helperElapsedTime)}</Text>
              <Text style={styles.completionTimeBreakdown}>
                Cleaner: {formatCompactTime(elapsedTime)}
                {helperElapsedTime > 0 && ` + Helper: ${formatCompactTime(helperElapsedTime)}`}
              </Text>
            </View>

            {/* Quick Add Section */}
            <View style={styles.quickAddSection}>
              <Text style={styles.quickAddTitle}>QUICK ADD</Text>
              <View style={styles.quickAddGrid}>
                {favoriteConsumables.map((item) => (
                  <View key={item.id} style={styles.quickAddItem}>
                    <Text style={styles.quickAddLabel}>{item.name}</Text>
                    <View style={styles.quickAddControls}>
                      <TouchableOpacity
                        style={styles.quickAddBtn}
                        onPress={() => handleUpdateConsumable(item.id, Math.max(0, (session?.consumables[item.id] || 0) - 1))}
                      >
                        <Text style={styles.quickAddBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quickAddValue}>{session?.consumables[item.id] || 0}</Text>
                      <TouchableOpacity
                        style={[styles.quickAddBtn, styles.quickAddBtnPlus]}
                        onPress={() => handleUpdateConsumable(item.id, (session?.consumables[item.id] || 0) + 1)}
                      >
                        <Text style={[styles.quickAddBtnText, styles.quickAddBtnTextPlus]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* All Categories */}
            {categoriesWithItems.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const categoryTotal = category.items.reduce(
                (sum, item) => sum + (session?.consumables[item.id] || 0),
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
                    <View style={styles.categoryItemsGrid}>
                      {category.items.map((item) => (
                        <View key={item.id} style={styles.quickAddItem}>
                          <Text style={styles.quickAddLabel}>{item.name}</Text>
                          <View style={styles.quickAddControls}>
                            <TouchableOpacity
                              style={styles.quickAddBtn}
                              onPress={() => handleUpdateConsumable(item.id, Math.max(0, (session?.consumables[item.id] || 0) - 1))}
                            >
                              <Text style={styles.quickAddBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.quickAddValue}>{session?.consumables[item.id] || 0}</Text>
                            <TouchableOpacity
                              style={[styles.quickAddBtn, styles.quickAddBtnPlus]}
                              onPress={() => handleUpdateConsumable(item.id, (session?.consumables[item.id] || 0) + 1)}
                            >
                              <Text style={[styles.quickAddBtnText, styles.quickAddBtnTextPlus]}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.consumablesModalFooter}>
            <TouchableOpacity
              style={[styles.completeModalBtn, isCompleting && styles.modalConfirmBtnDisabled]}
              onPress={handleConfirmComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <View style={styles.modalBtnContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.consumablesModalNextText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.consumablesModalNextText}>Complete Cleaning</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Stop Timer Confirmation Modal */}
      <Modal
        visible={showStopConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStopConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stop Timer?</Text>
            <Text style={styles.modalProperty}>{property?.name}</Text>

            <View style={styles.modalSummary}>
              <View style={styles.modalTimeRow}>
                <Text style={styles.modalLabel}>Current Time</Text>
                <Text style={styles.modalValue}>{formatCompactTime(elapsedTime + helperElapsedTime)}</Text>
              </View>
              <Text style={styles.modalSmallText}>
                You can restart the timer later or complete the cleaning.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowStopConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, styles.modalStopBtn]}
                onPress={handleConfirmStop}
              >
                <Text style={styles.modalConfirmText}>Stop Timer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Celebration Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissSuccess}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successCheckmark}>
              <Text style={styles.successCheckmarkText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Cleaning Complete!</Text>
            {completedSummary && (
              <>
                <Text style={styles.successProperty}>{completedSummary.propertyName}</Text>
                <Text style={styles.successTime}>
                  Total time: {formatCompactTime(completedSummary.totalTime)}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleDismissSuccess}
            >
              <Text style={styles.successButtonText}>Back to Properties</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Discard Session Confirmation Modal */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Discard Session?</Text>
            <Text style={styles.modalProperty}>{property?.name}</Text>

            <View style={styles.modalSummary}>
              <Text style={styles.discardWarningText}>
                This will permanently delete this cleaning session. No time or consumables will be recorded.
              </Text>
              <Text style={styles.discardWarningSubtext}>
                Use this only if the session was started by mistake or is no longer valid.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDiscardModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, styles.modalDiscardBtn]}
                onPress={handleDiscardSession}
              >
                <Text style={styles.modalConfirmText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    paddingTop: 20,
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
  sessionButtonStopped: {
    backgroundColor: '#FFF3E0',
  },
  sessionButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  sessionButtonTextActive: {
    color: '#2196F3',
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  propertyHeaderLeft: {
    flex: 1,
  },
  propertyName: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
  },
  bookingInfoCard: {
    marginTop: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingInfoLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: '#E65100',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bookingInfoLabelIn: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bookingInfoValue: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  checkinDate: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    marginTop: 4,
  },
  timersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalTimeSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  totalTimeLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalTimeValue: {
    fontSize: 32,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  stoppedBanner: {
    backgroundColor: '#FF9800',
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 16,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
  },
  stoppedBannerText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  timersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  controls: {
    gap: 12,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  restartButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  lostPropertyButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  lostPropertyButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  maintenanceButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    alignItems: 'center',
  },
  maintenanceButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FF9800',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  consumablesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  helperButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  helperButtonStart: {
    backgroundColor: '#4CAF50',
  },
  helperButtonStop: {
    backgroundColor: '#F44336',
  },
  categorySection: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
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
    padding: 12,
    paddingTop: 8,
    gap: 10,
  },
  notesSection: {
    marginTop: 16,
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
  stickyStoppedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stickyStoppedText: {
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
  // Time adjustment styles
  adjustmentSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  adjustmentButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  adjustBtnPrimary: {
    backgroundColor: '#E3F2FD',
  },
  adjustBtnText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
  },
  adjustBtnTextPrimary: {
    color: '#2196F3',
  },
  adjustLink: {
    marginTop: 8,
  },
  adjustLinkText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#2196F3',
  },
  doneAdjustBtn: {
    marginTop: 6,
  },
  doneAdjustText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#4CAF50',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalProperty: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSummary: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  modalValue: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  modalTimeBreakdown: {
    marginBottom: 12,
  },
  modalSmallText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
  },
  modalConsumables: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  modalConsumablesTitle: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalConsumableItem: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: {
    backgroundColor: '#999999',
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  modalBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalStopBtn: {
    backgroundColor: '#FF9800',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successCheckmark: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successCheckmarkText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  successProperty: {
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    marginBottom: 4,
  },
  successTime: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  successButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  discardLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  discardLinkText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#F44336',
  },
  discardWarningText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 8,
  },
  discardWarningSubtext: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  modalDiscardBtn: {
    backgroundColor: '#F44336',
  },
  // Consumables Modal styles
  consumablesModalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  consumablesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  consumablesBackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  consumablesBackText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  consumablesModalTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  consumablesNextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  consumablesNextText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#2196F3',
  },
  consumablesModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  consumablesModalScroll: {
    flex: 1,
  },
  consumablesModalScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  consumablesModalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  consumablesModalNextBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  consumablesModalNextText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  // Combined completion modal styles
  completionTimeSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  completionPropertyName: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  completionTotalTime: {
    fontSize: 36,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  completionTimeBreakdown: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginTop: 4,
  },
  quickAddSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  quickAddTitle: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAddGrid: {
    gap: 12,
  },
  categoryItemsGrid: {
    padding: 12,
    paddingTop: 8,
    gap: 8,
  },
  quickAddItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  quickAddLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  quickAddControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddBtnPlus: {
    backgroundColor: '#E3F2FD',
  },
  quickAddBtnText: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
  },
  quickAddBtnTextPlus: {
    color: '#2196F3',
  },
  quickAddValue: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  completeModalBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
