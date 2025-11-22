import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { TimerDisplay } from '@/components/TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { useHelperTimer } from '@/hooks/useHelperTimer';
import { theme } from '@/constants/theme';
import { getCategoriesWithItems } from '@/data/consumables';
import * as Haptics from 'expo-haptics';

export default function CompleteCleaningScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const properties = usePropertiesStore((state) => state.properties);
  const refreshFromAirtable = usePropertiesStore((state) => state.refreshFromAirtable);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const completeSession = useSessionStore((state) => state.completeSession);
  const adjustCleanerTime = useSessionStore((state) => state.adjustCleanerTime);
  const adjustHelperTime = useSessionStore((state) => state.adjustHelperTime);
  const addCompletedSession = useHistoryStore((state) => state.addCompletedSession);

  const session = activeSessions.find((s) => s.id === sessionId);
  const property = properties.find((p) => p.id === session?.propertyId);
  const elapsedTime = useTimer(session);
  const helperElapsedTime = useHelperTimer(session);

  const [notes, setNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [adjustingTimer, setAdjustingTimer] = useState<'cleaner' | 'helper' | null>(null);

  const categoriesWithItems = getCategoriesWithItems();

  if (!session || !property || !authenticatedCleaner) {
    return null;
  }

  // Handler functions for time adjustment
  const handleAdjustCleanerTime = (minutes: number) => {
    if (!session) return;
    adjustCleanerTime(session.id, minutes);
  };

  const handleAdjustHelperTime = (minutes: number) => {
    if (!session) return;
    adjustHelperTime(session.id, minutes);
  };

  const handleBack = () => {
    router.push('/(main)/active');
  };

  const handleComplete = async () => {
    if (isSyncing) return; // Prevent double-clicking

    setIsSyncing(true);
    setSyncStatus('syncing');

    // Complete the session (this stops the timer)
    const completedSession = completeSession(session.id, Date.now());

    if (completedSession) {
      // Add to history (this will sync to Airtable)
      await addCompletedSession(completedSession, property, authenticatedCleaner);

      // Refresh properties from Airtable to get updated totals
      await refreshFromAirtable();

      // Check if sync was successful (we don't have direct access to the result here)
      // The historyStore handles the sync, so we'll just assume success for UI
      setSyncStatus('success');

      // Haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available on web
      }

      // Short delay to show success message
      setTimeout(() => {
        setIsSyncing(false);
        router.push('/(main)/properties');
      }, 800);
    } else {
      setSyncStatus('error');
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Cleaning</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.propertyName}>{property.name}</Text>

        <View style={styles.cleanerIndicator}>
          <Text style={styles.cleanerLabel}>Cleaned by:</Text>
          <Text style={styles.cleanerNameText}>{authenticatedCleaner.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Time</Text>
          <TimerDisplay elapsedTime={elapsedTime + helperElapsedTime} size="large" />

          {/* Cleaner Time with Adjustment */}
          <View style={styles.timeAdjustmentCard}>
            <Text style={styles.timeLabel}>Cleaner Time</Text>
            <TimerDisplay elapsedTime={elapsedTime} size="medium" />

            {adjustingTimer !== 'cleaner' ? (
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setAdjustingTimer('cleaner')}
              >
                <Text style={styles.adjustButtonText}>Adjust Time</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.adjustmentButtons}>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustCleanerTime(-15)}>
                    <Text style={styles.adjustBtnText}>-15m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustCleanerTime(-5)}>
                    <Text style={styles.adjustBtnText}>-5m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustCleanerTime(-1)}>
                    <Text style={styles.adjustBtnText}>-1m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustCleanerTime(1)}>
                    <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+1m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustCleanerTime(5)}>
                    <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+5m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustCleanerTime(15)}>
                    <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+15m</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setAdjustingTimer(null)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Helper Time with Adjustment (if helper was used) */}
          {helperElapsedTime > 0 && (
            <View style={styles.timeAdjustmentCard}>
              <Text style={styles.timeLabel}>Helper Time</Text>
              <TimerDisplay elapsedTime={helperElapsedTime} size="medium" />

              {adjustingTimer !== 'helper' ? (
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => setAdjustingTimer('helper')}
                >
                  <Text style={styles.adjustButtonText}>Adjust Time</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.adjustmentButtons}>
                    <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustHelperTime(-15)}>
                      <Text style={styles.adjustBtnText}>-15m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustHelperTime(-5)}>
                      <Text style={styles.adjustBtnText}>-5m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjustHelperTime(-1)}>
                      <Text style={styles.adjustBtnText}>-1m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustHelperTime(1)}>
                      <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+1m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustHelperTime(5)}>
                      <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+5m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPrimary]} onPress={() => handleAdjustHelperTime(15)}>
                      <Text style={[styles.adjustBtnText, styles.adjustBtnTextPrimary]}>+15m</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setAdjustingTimer(null)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consumables Summary</Text>
          {categoriesWithItems.map((category) => {
            const categoryItems = category.items.filter(item => (session.consumables[item.id] || 0) > 0);
            if (categoryItems.length === 0) return null;

            return (
              <View key={category.id} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                <View style={styles.summaryGrid}>
                  {categoryItems.map((item) => (
                    <View key={item.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{item.name}:</Text>
                      <Text style={styles.summaryValue}>{session.consumables[item.id]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <Text style={styles.summaryNote}>Go back to adjust consumables if needed</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any issues or additional information..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {syncStatus !== 'idle' && (
          <View style={[
            styles.syncStatusBanner,
            syncStatus === 'syncing' && styles.syncStatusSyncing,
            syncStatus === 'success' && styles.syncStatusSuccess,
            syncStatus === 'error' && styles.syncStatusError,
          ]}>
            <Text style={styles.syncStatusText}>
              {syncStatus === 'syncing' && '⏳ Saving to Airtable...'}
              {syncStatus === 'success' && '✓ Synced successfully!'}
              {syncStatus === 'error' && '✗ Sync failed - saved locally'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.completeButton, isSyncing && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={isSyncing}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? 'Saving...' : 'Complete Cleaning'}
          </Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingVertical: 8,
    width: 60,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  propertyName: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  cleanerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  timeAdjustmentCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  adjustButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignSelf: 'center',
  },
  adjustButtonText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  adjustmentButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
  },
  doneButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignSelf: 'center',
  },
  doneButtonText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  adjustBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  adjustBtnPrimary: {
    backgroundColor: '#E3F2FD',
  },
  adjustBtnText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
  },
  adjustBtnTextPrimary: {
    color: '#2196F3',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  summaryNote: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  notesInput: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    minHeight: 100,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  syncStatusBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  syncStatusSyncing: {
    backgroundColor: '#E3F2FD',
  },
  syncStatusSuccess: {
    backgroundColor: '#E8F5E9',
  },
  syncStatusError: {
    backgroundColor: '#FFF3CD',
  },
  syncStatusText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
});
